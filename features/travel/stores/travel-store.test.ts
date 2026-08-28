import { beforeEach, describe, expect, it } from 'vitest'
import { useTravelStore } from '@/features/travel/stores/travel-store'

describe('useTravelStore', () => {
  beforeEach(() => {
    useTravelStore.getState().resetTravel()
  })

  it('starts with idle travel state', () => {
    const state = useTravelStore.getState()

    expect(state.selectedPetId).toBeNull()
    expect(state.travelStage).toBe('idle')
    expect(state.selectedWaypoints).toEqual([])
    expect(state.noteDrafts).toEqual([])
  })

  it('updates selected pet and travel stage', () => {
    useTravelStore.getState().setSelectedPet({ id: 'pet-1', name: 'Golden' })
    useTravelStore.getState().setTravelStage('planning')

    expect(useTravelStore.getState()).toMatchObject({
      selectedPetId: 'pet-1',
      selectedPetName: 'Golden',
      travelStage: 'planning',
    })
  })

  it('replaces existing note draft for the same waypoint', () => {
    useTravelStore.getState().upsertNoteDraft({
      waypointId: 'waypoint-1',
      content: 'first note',
      photoUrls: [],
    })
    useTravelStore.getState().upsertNoteDraft({
      waypointId: 'waypoint-1',
      content: 'updated note',
      photoUrls: ['/images/place-cafe.png'],
    })

    expect(useTravelStore.getState().noteDrafts).toEqual([
      {
        waypointId: 'waypoint-1',
        content: 'updated note',
        photoUrls: ['/images/place-cafe.png'],
      },
    ])
  })
})
