import { create } from 'zustand'
import type { SearchableLocation } from '@/features/location/types/location'
import type { RecommendedCourse } from '@/features/map/types/course'
import type { Place, Waypoint } from '@/types'

export type TravelStage = 'idle' | 'planning' | 'in-progress' | 'completed'

interface TravelNoteDraft {
  waypointId: string
  content: string
  photoUrls: string[]
}

interface TravelState {
  selectedPetId: string | null
  selectedPetName: string
  travelStage: TravelStage
  routeOrigin: SearchableLocation | null
  routeDestination: SearchableLocation | null
  minimumWalkingTimeHours: number | null
  waypointCount: number | null
  travelTimeHours: number | null
  recommendedCourse: RecommendedCourse | null
  selectedWaypoints: Waypoint[]
  candidatePlaces: Place[]
  noteDrafts: TravelNoteDraft[]
  draftTripTitle: string
  draftTripImage: string
  setSelectedPet: (pet: { id: string; name: string } | null) => void
  setTravelStage: (stage: TravelStage) => void
  setRouteEndpoints: (
    origin: SearchableLocation,
    destination: SearchableLocation
  ) => void
  setRouteOptions: (options: {
    minimumWalkingTimeHours: number
    waypointCount: number
    travelTimeHours: number
  }) => void
  setRecommendedCourse: (course: RecommendedCourse | null) => void
  setSelectedWaypoints: (waypoints: Waypoint[]) => void
  setCandidatePlaces: (places: Place[]) => void
  upsertNoteDraft: (draft: TravelNoteDraft) => void
  resetTravel: () => void
}

const initialTravelState = {
  selectedPetId: null,
  selectedPetName: '골든이',
  travelStage: 'idle' as TravelStage,
  routeOrigin: null,
  routeDestination: null,
  minimumWalkingTimeHours: null,
  waypointCount: null,
  travelTimeHours: null,
  recommendedCourse: null,
  selectedWaypoints: [],
  candidatePlaces: [],
  noteDrafts: [],
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
      minimumWalkingTimeHours: null,
      waypointCount: null,
      travelTimeHours: null,
      recommendedCourse: null,
    }),
  setRouteOptions: (options) => set({ ...options, recommendedCourse: null }),
  setRecommendedCourse: (recommendedCourse) => set({ recommendedCourse }),
  setSelectedWaypoints: (selectedWaypoints) => set({ selectedWaypoints }),
  setCandidatePlaces: (candidatePlaces) => set({ candidatePlaces }),
  upsertNoteDraft: (draft) =>
    set((state) => ({
      noteDrafts: [
        ...state.noteDrafts.filter((item) => item.waypointId !== draft.waypointId),
        draft,
      ],
    })),
  resetTravel: () => set(initialTravelState),
}))
