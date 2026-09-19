import { create } from 'zustand'
import { DEFAULT_ALBUM_COVER_URL } from '@/features/album/constants'
import type { SearchableLocation } from '@/features/location/types/location'
import type { RecommendedCourse } from '@/features/map/types/course'
import type { Place, Waypoint } from '@/types'

export type TravelStage = 'idle' | 'planning' | 'in-progress' | 'completed'

export interface TravelDraftPhoto {
  photoId: string
  downloadUrl: string
  takenAt: string | null
}

export interface TravelNoteDraft {
  waypointId: string
  content: string
  photoUrls: string[]
  externalPlaceId?: string
  rating?: number
  photos?: TravelDraftPhoto[]
  saved?: boolean
  reviewId?: string
}

interface TravelState {
  selectedPetId: string | null
  selectedPetName: string
  travelStage: TravelStage
  routeOrigin: SearchableLocation | null
  routeDestination: SearchableLocation | null
  recommendedCourse: RecommendedCourse | null
  selectedWaypoints: Waypoint[]
  candidatePlaces: Place[]
  noteDrafts: TravelNoteDraft[]
  visitedPlaceIds: string[]
  skippedPlaceIds: string[]
  draftCourseId: string | null
  overallReview: string
  draftTripTitle: string
  draftTripImage: string
  setSelectedPet: (pet: { id: string; name: string } | null) => void
  setTravelStage: (stage: TravelStage) => void
  setRouteEndpoints: (
    origin: SearchableLocation,
    destination: SearchableLocation
  ) => void
  setRecommendedCourse: (course: RecommendedCourse | null) => void
  setSelectedWaypoints: (waypoints: Waypoint[]) => void
  setCandidatePlaces: (places: Place[]) => void
  beginTravelDrafts: (courseId: string) => void
  hydrateTravelDrafts: (courseId: string) => void
  upsertNoteDraft: (draft: TravelNoteDraft) => void
  removeDraftPhoto: (waypointId: string, photoId: string) => void
  markPlaceVisited: (placeId: string) => void
  markPlaceSkipped: (placeId: string) => void
  markReviewSaved: (waypointId: string, reviewId: string) => void
  setOverallReview: (overallReview: string) => void
  clearTravelDrafts: () => void
  resetTravel: () => void
}

const TRAVEL_DRAFT_CACHE_KEY = 'chapchu.travel-drafts'

interface TravelDraftCache {
  courseId: string
  noteDrafts: TravelNoteDraft[]
  visitedPlaceIds: string[]
  skippedPlaceIds: string[]
  overallReview: string
  expiresAt: number
}

export const TRAVEL_DRAFT_CACHE_TTL_MS = 24 * 60 * 60 * 1_000

function isOptionalString(value: unknown, maxLength: number) {
  return value === undefined || (typeof value === 'string' && value.length <= maxLength)
}

function isTravelDraftPhoto(value: unknown): value is TravelDraftPhoto {
  if (!value || typeof value !== 'object') return false
  const photo = value as Partial<TravelDraftPhoto>
  return (
    typeof photo.photoId === 'string' &&
    photo.photoId.trim().length > 0 &&
    photo.photoId.length <= 500 &&
    typeof photo.downloadUrl === 'string' &&
    photo.downloadUrl.length <= 4_096 &&
    (photo.takenAt === null ||
      (typeof photo.takenAt === 'string' && photo.takenAt.length <= 100))
  )
}

function isTravelNoteDraft(value: unknown): value is TravelNoteDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<TravelNoteDraft>
  return (
    typeof draft.waypointId === 'string' &&
    draft.waypointId.trim().length > 0 &&
    draft.waypointId.length <= 500 &&
    typeof draft.content === 'string' &&
    draft.content.length <= 20_000 &&
    Array.isArray(draft.photoUrls) &&
    draft.photoUrls.length <= 10 &&
    draft.photoUrls.every((url) => typeof url === 'string' && url.length <= 4_096) &&
    isOptionalString(draft.externalPlaceId, 500) &&
    (draft.rating === undefined ||
      (typeof draft.rating === 'number' &&
        Number.isInteger(draft.rating) &&
        draft.rating >= 0 &&
        draft.rating <= 5)) &&
    (draft.photos === undefined ||
      (Array.isArray(draft.photos) &&
        draft.photos.length <= 10 &&
        draft.photos.every(isTravelDraftPhoto))) &&
    (draft.saved === undefined || typeof draft.saved === 'boolean') &&
    isOptionalString(draft.reviewId, 500)
  )
}

function isPlaceIdList(value: unknown) {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every(
      (placeId) =>
        typeof placeId === 'string' &&
        placeId.trim().length > 0 &&
        placeId.length <= 500
    )
  )
}

function readTravelDraftCache(): TravelDraftCache | null {
  if (typeof window === 'undefined') return null
  try {
    const serialized =
      window.localStorage.getItem(TRAVEL_DRAFT_CACHE_KEY) ??
      window.sessionStorage.getItem(TRAVEL_DRAFT_CACHE_KEY)
    const value = JSON.parse(serialized ?? 'null') as unknown
    if (!value || typeof value !== 'object') return null
    const cache = value as Partial<TravelDraftCache>
    if (
      typeof cache.courseId !== 'string' ||
      !cache.courseId.trim() ||
      cache.courseId.length > 500 ||
      !Array.isArray(cache.noteDrafts) ||
      cache.noteDrafts.length > 100 ||
      !cache.noteDrafts.every(isTravelNoteDraft) ||
      (cache.visitedPlaceIds !== undefined && !isPlaceIdList(cache.visitedPlaceIds)) ||
      (cache.skippedPlaceIds !== undefined && !isPlaceIdList(cache.skippedPlaceIds)) ||
      typeof cache.overallReview !== 'string' ||
      cache.overallReview.length > 20_000 ||
      (cache.expiresAt !== undefined &&
        (typeof cache.expiresAt !== 'number' || !Number.isFinite(cache.expiresAt)))
    ) {
      return null
    }
    const expiresAt = cache.expiresAt ?? Date.now() + TRAVEL_DRAFT_CACHE_TTL_MS
    if (expiresAt <= Date.now()) {
      window.localStorage.removeItem(TRAVEL_DRAFT_CACHE_KEY)
      window.sessionStorage.removeItem(TRAVEL_DRAFT_CACHE_KEY)
      return null
    }
    const visitedPlaceIds = cache.visitedPlaceIds ?? []
    const visitedPlaceIdSet = new Set(visitedPlaceIds)
    window.sessionStorage.removeItem(TRAVEL_DRAFT_CACHE_KEY)
    return {
      courseId: cache.courseId,
      noteDrafts: cache.noteDrafts,
      visitedPlaceIds,
      skippedPlaceIds: (cache.skippedPlaceIds ?? []).filter(
        (placeId) => !visitedPlaceIdSet.has(placeId)
      ),
      overallReview: cache.overallReview,
      expiresAt,
    }
  } catch {
    return null
  }
}

function writeTravelDraftCache(cache: TravelDraftCache | null) {
  if (typeof window === 'undefined') return
  try {
    if (!cache) {
      window.localStorage.removeItem(TRAVEL_DRAFT_CACHE_KEY)
      window.sessionStorage.removeItem(TRAVEL_DRAFT_CACHE_KEY)
      return
    }
    window.localStorage.setItem(TRAVEL_DRAFT_CACHE_KEY, JSON.stringify(cache))
    window.sessionStorage.removeItem(TRAVEL_DRAFT_CACHE_KEY)
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}

function createTravelDraftCache(
  courseId: string,
  noteDrafts: TravelNoteDraft[],
  visitedPlaceIds: string[],
  skippedPlaceIds: string[],
  overallReview: string
): TravelDraftCache {
  return {
    courseId,
    noteDrafts,
    visitedPlaceIds,
    skippedPlaceIds,
    overallReview,
    expiresAt: Date.now() + TRAVEL_DRAFT_CACHE_TTL_MS,
  }
}

const initialTravelState = {
  selectedPetId: null,
  selectedPetName: '골든이',
  travelStage: 'idle' as TravelStage,
  routeOrigin: null,
  routeDestination: null,
  recommendedCourse: null,
  selectedWaypoints: [],
  candidatePlaces: [],
  noteDrafts: [],
  visitedPlaceIds: [],
  skippedPlaceIds: [],
  draftCourseId: null,
  overallReview: '',
  draftTripTitle: '골든이와의 서울 성수 여행',
  draftTripImage: DEFAULT_ALBUM_COVER_URL,
}

export const useTravelStore = create<TravelState>((set) => ({
  ...initialTravelState,
  setSelectedPet: (pet) =>
    set({
      selectedPetId: pet?.id ?? null,
      selectedPetName: pet?.name ?? initialTravelState.selectedPetName,
    }),
  setTravelStage: (travelStage) => set({ travelStage }),
  setRouteEndpoints: (routeOrigin, routeDestination) =>
    set({
      routeOrigin,
      routeDestination,
      recommendedCourse: null,
    }),
  setRecommendedCourse: (recommendedCourse) => set({ recommendedCourse }),
  setSelectedWaypoints: (selectedWaypoints) => set({ selectedWaypoints }),
  setCandidatePlaces: (candidatePlaces) => set({ candidatePlaces }),
  beginTravelDrafts: (courseId) =>
    set((state) => {
      const normalizedCourseId = courseId.trim()
      if (!normalizedCourseId || state.draftCourseId === normalizedCourseId) return state
      const next = {
        draftCourseId: normalizedCourseId,
        noteDrafts: [],
        visitedPlaceIds: [],
        skippedPlaceIds: [],
        overallReview: '',
      }
      writeTravelDraftCache(createTravelDraftCache(normalizedCourseId, [], [], [], ''))
      return next
    }),
  hydrateTravelDrafts: (courseId) =>
    set((state) => {
      const normalizedCourseId = courseId.trim()
      const cache = readTravelDraftCache()
      if (!normalizedCourseId || cache?.courseId !== normalizedCourseId) return state
      return {
        draftCourseId: normalizedCourseId,
        noteDrafts: cache.noteDrafts,
        visitedPlaceIds: cache.visitedPlaceIds,
        skippedPlaceIds: cache.skippedPlaceIds,
        overallReview: cache.overallReview,
      }
    }),
  upsertNoteDraft: (draft) =>
    set((state) => {
      const noteDrafts = [
        ...state.noteDrafts.filter((item) => item.waypointId !== draft.waypointId),
        draft,
      ]
      if (state.draftCourseId) {
        writeTravelDraftCache(createTravelDraftCache(
          state.draftCourseId,
          noteDrafts,
          state.visitedPlaceIds,
          state.skippedPlaceIds,
          state.overallReview
        ))
      }
      return { noteDrafts }
    }),
  removeDraftPhoto: (waypointId, photoId) =>
    set((state) => {
      const noteDrafts = state.noteDrafts.map((draft) => {
        if (draft.waypointId !== waypointId) return draft
        const photos = (draft.photos ?? []).filter((photo) => photo.photoId !== photoId)
        return {
          ...draft,
          photos,
          photoUrls: photos.map((photo) => photo.downloadUrl),
          saved: false,
        }
      })
      if (state.draftCourseId) {
        writeTravelDraftCache(createTravelDraftCache(
          state.draftCourseId,
          noteDrafts,
          state.visitedPlaceIds,
          state.skippedPlaceIds,
          state.overallReview
        ))
      }
      return { noteDrafts }
    }),
  markPlaceVisited: (placeId) =>
    set((state) => {
      const normalizedPlaceId = placeId.trim()
      if (!normalizedPlaceId) return state
      const visitedPlaceIds = state.visitedPlaceIds.includes(normalizedPlaceId)
        ? state.visitedPlaceIds
        : [...state.visitedPlaceIds, normalizedPlaceId]
      const skippedPlaceIds = state.skippedPlaceIds.filter(
        (id) => id !== normalizedPlaceId
      )
      if (
        visitedPlaceIds === state.visitedPlaceIds &&
        skippedPlaceIds.length === state.skippedPlaceIds.length
      ) return state
      if (state.draftCourseId) {
        writeTravelDraftCache(createTravelDraftCache(
          state.draftCourseId,
          state.noteDrafts,
          visitedPlaceIds,
          skippedPlaceIds,
          state.overallReview
        ))
      }
      return { visitedPlaceIds, skippedPlaceIds }
    }),
  markPlaceSkipped: (placeId) =>
    set((state) => {
      const normalizedPlaceId = placeId.trim()
      if (!normalizedPlaceId) return state
      const skippedPlaceIds = state.skippedPlaceIds.includes(normalizedPlaceId)
        ? state.skippedPlaceIds
        : [...state.skippedPlaceIds, normalizedPlaceId]
      const visitedPlaceIds = state.visitedPlaceIds.filter(
        (id) => id !== normalizedPlaceId
      )
      if (
        skippedPlaceIds === state.skippedPlaceIds &&
        visitedPlaceIds.length === state.visitedPlaceIds.length
      ) return state
      if (state.draftCourseId) {
        writeTravelDraftCache(createTravelDraftCache(
          state.draftCourseId,
          state.noteDrafts,
          visitedPlaceIds,
          skippedPlaceIds,
          state.overallReview
        ))
      }
      return { visitedPlaceIds, skippedPlaceIds }
    }),
  markReviewSaved: (waypointId, reviewId) =>
    set((state) => {
      const noteDrafts = state.noteDrafts.map((draft) =>
        draft.waypointId === waypointId ? { ...draft, reviewId } : draft
      )
      if (state.draftCourseId) {
        writeTravelDraftCache(createTravelDraftCache(
          state.draftCourseId,
          noteDrafts,
          state.visitedPlaceIds,
          state.skippedPlaceIds,
          state.overallReview
        ))
      }
      return { noteDrafts }
    }),
  setOverallReview: (overallReview) =>
    set((state) => {
      if (state.draftCourseId) {
        writeTravelDraftCache(createTravelDraftCache(
          state.draftCourseId,
          state.noteDrafts,
          state.visitedPlaceIds,
          state.skippedPlaceIds,
          overallReview
        ))
      }
      return { overallReview }
    }),
  clearTravelDrafts: () => {
    writeTravelDraftCache(null)
    set({
      draftCourseId: null,
      noteDrafts: [],
      visitedPlaceIds: [],
      skippedPlaceIds: [],
      overallReview: '',
    })
  },
  resetTravel: () => {
    writeTravelDraftCache(null)
    set(initialTravelState)
  },
}))
