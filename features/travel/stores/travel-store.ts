import { create } from 'zustand'
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
  markReviewSaved: (waypointId: string, reviewId: string) => void
  setOverallReview: (overallReview: string) => void
  clearTravelDrafts: () => void
  resetTravel: () => void
}

const TRAVEL_DRAFT_CACHE_KEY = 'chapchu.travel-drafts'

interface TravelDraftCache {
  courseId: string
  noteDrafts: TravelNoteDraft[]
  overallReview: string
}

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

function readTravelDraftCache(): TravelDraftCache | null {
  if (typeof window === 'undefined') return null
  try {
    const value = JSON.parse(window.sessionStorage.getItem(TRAVEL_DRAFT_CACHE_KEY) ?? 'null') as unknown
    if (!value || typeof value !== 'object') return null
    const cache = value as Partial<TravelDraftCache>
    if (
      typeof cache.courseId !== 'string' ||
      !cache.courseId.trim() ||
      cache.courseId.length > 500 ||
      !Array.isArray(cache.noteDrafts) ||
      cache.noteDrafts.length > 100 ||
      !cache.noteDrafts.every(isTravelNoteDraft) ||
      typeof cache.overallReview !== 'string' ||
      cache.overallReview.length > 20_000
    ) {
      return null
    }
    return cache as TravelDraftCache
  } catch {
    return null
  }
}

function writeTravelDraftCache(cache: TravelDraftCache | null) {
  if (typeof window === 'undefined') return
  if (!cache) {
    window.sessionStorage.removeItem(TRAVEL_DRAFT_CACHE_KEY)
    return
  }
  window.sessionStorage.setItem(TRAVEL_DRAFT_CACHE_KEY, JSON.stringify(cache))
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
  draftCourseId: null,
  overallReview: '',
  draftTripTitle: '골든이와의 서울 성수 여행',
  draftTripImage: '/images/album-cover.png',
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
        overallReview: '',
      }
      writeTravelDraftCache({ courseId: normalizedCourseId, noteDrafts: [], overallReview: '' })
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
        writeTravelDraftCache({
          courseId: state.draftCourseId,
          noteDrafts,
          overallReview: state.overallReview,
        })
      }
      return { noteDrafts }
    }),
  markReviewSaved: (waypointId, reviewId) =>
    set((state) => {
      const noteDrafts = state.noteDrafts.map((draft) =>
        draft.waypointId === waypointId ? { ...draft, reviewId } : draft
      )
      if (state.draftCourseId) {
        writeTravelDraftCache({
          courseId: state.draftCourseId,
          noteDrafts,
          overallReview: state.overallReview,
        })
      }
      return { noteDrafts }
    }),
  setOverallReview: (overallReview) =>
    set((state) => {
      if (state.draftCourseId) {
        writeTravelDraftCache({
          courseId: state.draftCourseId,
          noteDrafts: state.noteDrafts,
          overallReview,
        })
      }
      return { overallReview }
    }),
  clearTravelDrafts: () => {
    writeTravelDraftCache(null)
    set({ draftCourseId: null, noteDrafts: [], overallReview: '' })
  },
  resetTravel: () => {
    writeTravelDraftCache(null)
    set(initialTravelState)
  },
}))
