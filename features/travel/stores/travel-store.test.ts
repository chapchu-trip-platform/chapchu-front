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
    expect(state.routeOrigin).toBeNull()
    expect(state.routeDestination).toBeNull()
    expect(state.minimumWalkingTimeHours).toBeNull()
    expect(state.waypointCount).toBeNull()
    expect(state.travelTimeHours).toBeNull()
    expect(state.recommendedCourse).toBeNull()
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

  it('stores selected route endpoints with coordinates', () => {
    const origin = {
      id: 'origin-1',
      name: '서울역',
      address: '서울 용산구 한강대로 405',
      latitude: 37.5547,
      longitude: 126.9706,
    }
    const destination = {
      id: 'destination-1',
      name: '서울숲',
      address: '서울 성동구 뚝섬로 273',
      latitude: 37.5444,
      longitude: 127.0374,
    }

    useTravelStore.getState().setRouteEndpoints(origin, destination)

    expect(useTravelStore.getState()).toMatchObject({
      routeOrigin: origin,
      routeDestination: destination,
    })
  })

  it('stores route options and clears them when endpoints change', () => {
    useTravelStore.getState().setRouteOptions({
      minimumWalkingTimeHours: 2,
      waypointCount: 3,
      travelTimeHours: 4,
    })

    expect(useTravelStore.getState()).toMatchObject({
      minimumWalkingTimeHours: 2,
      waypointCount: 3,
      travelTimeHours: 4,
    })

    useTravelStore.getState().setRouteEndpoints(
      {
        id: 'origin-2',
        name: '출발지',
        address: '출발지 주소',
        latitude: 37.5,
        longitude: 127,
      },
      {
        id: 'destination-2',
        name: '도착지',
        address: '도착지 주소',
        latitude: 37.6,
        longitude: 127.1,
      }
    )

    expect(useTravelStore.getState()).toMatchObject({
      minimumWalkingTimeHours: null,
      waypointCount: null,
      travelTimeHours: null,
    })
  })

  it('stores a recommended course separately and clears it when options change', () => {
    useTravelStore.getState().setRecommendedCourse({
      id: 'course-1',
      travelDate: '2026-09-01',
      startLocation: '서울역',
      places: [
        {
          id: 'course-place-1',
          externalPlaceId: 'external-1',
          name: '서울숲',
          visitOrder: 1,
          isFinal: true,
        },
      ],
    })

    expect(useTravelStore.getState().recommendedCourse?.id).toBe('course-1')

    useTravelStore.getState().setRouteOptions({
      minimumWalkingTimeHours: 2,
      waypointCount: 2,
      travelTimeHours: 3,
    })

    expect(useTravelStore.getState().recommendedCourse).toBeNull()
  })
})
