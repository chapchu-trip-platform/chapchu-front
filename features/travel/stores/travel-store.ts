import { create } from 'zustand'
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
  selectedWaypoints: Waypoint[]
  candidatePlaces: Place[]
  noteDrafts: TravelNoteDraft[]
  draftTripTitle: string
  draftTripImage: string
  setSelectedPet: (pet: { id: string; name: string } | null) => void
  setTravelStage: (stage: TravelStage) => void
  setSelectedWaypoints: (waypoints: Waypoint[]) => void
  setCandidatePlaces: (places: Place[]) => void
  upsertNoteDraft: (draft: TravelNoteDraft) => void
  resetTravel: () => void
}

const initialTravelState = {
  selectedPetId: null,
  selectedPetName: '골든이',
  travelStage: 'idle' as TravelStage,
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
