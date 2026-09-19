import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TRAVEL_DRAFT_CACHE_TTL_MS,
  useTravelStore,
} from '@/features/travel/stores/travel-store'

describe('useTravelStore', () => {
  beforeEach(() => {
    useTravelStore.getState().resetTravel()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => vi.useRealTimers())

  it('starts with idle travel state', () => {
    const state = useTravelStore.getState()

    expect(state.selectedPetId).toBeNull()
    expect(state.travelStage).toBe('idle')
    expect(state.routeOrigin).toBeNull()
    expect(state.routeDestination).toBeNull()
    expect(state.recommendedCourse).toBeNull()
    expect(state.selectedWaypoints).toEqual([])
    expect(state.noteDrafts).toEqual([])
    expect(state.visitedPlaceIds).toEqual([])
    expect(state.skippedPlaceIds).toEqual([])
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

  it('clears a previously created course when endpoints change', () => {
    useTravelStore.getState().setRecommendedCourse({
      id: 'previous-course',
      travelDate: '2026-09-01',
      startLocation: '이전 출발지',
      endLocation: '이전 도착지',
      places: [],
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

    expect(useTravelStore.getState().recommendedCourse).toBeNull()
  })

  it('stores a recommended course separately', () => {
    useTravelStore.getState().setRecommendedCourse({
      id: 'course-1',
      travelDate: '2026-09-01',
      startLocation: '서울역',
      endLocation: '서울숲',
      places: [
        {
          id: 'course-place-1',
          externalPlaceId: 'external-1',
          name: '서울숲',
          imageUrl: null,
          latitude: 37.5444,
          longitude: 127.0374,
          visitOrder: 1,
          isFinal: true,
          petPolicy: null,
        },
      ],
    })

    expect(useTravelStore.getState().recommendedCourse?.id).toBe('course-1')
  })

  it('keeps travel state in memory instead of persisting a local recovery copy', () => {
    localStorage.clear()

    useTravelStore.getState().setRecommendedCourse({
      id: 'memory-only-course',
      travelDate: '2026-09-12',
      startLocation: '서울역',
      endLocation: '서울숲',
      places: [],
    })

    expect(localStorage.getItem('chapchu.travel-session')).toBeNull()
  })

  it('keeps in-progress review drafts in local storage for 24 hours', () => {
    const now = new Date('2026-09-16T00:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)
    useTravelStore.getState().beginTravelDrafts('course-1')
    useTravelStore.getState().markPlaceVisited('course-place-1')
    useTravelStore.getState().upsertNoteDraft({
      waypointId: 'course-place-1',
      externalPlaceId: 'place-1',
      content: '함께 걷기 좋았어요.',
      rating: 5,
      photoUrls: [],
      photos: [],
      saved: true,
    })

    const serialized = localStorage.getItem('chapchu.travel-drafts')
    expect(serialized).toContain('함께 걷기 좋았어요.')
    expect(JSON.parse(serialized ?? '{}').expiresAt).toBe(
      now.getTime() + TRAVEL_DRAFT_CACHE_TTL_MS
    )

    useTravelStore.setState({
      draftCourseId: null,
      noteDrafts: [],
      overallReview: '',
      visitedPlaceIds: [],
    })
    useTravelStore.getState().hydrateTravelDrafts('course-1')

    expect(useTravelStore.getState().noteDrafts[0]).toMatchObject({
      waypointId: 'course-place-1',
      rating: 5,
      saved: true,
    })
    expect(useTravelStore.getState().visitedPlaceIds).toEqual(['course-place-1'])
  })

  it('persists skipped places without treating them as visited', () => {
    useTravelStore.getState().beginTravelDrafts('course-1')
    useTravelStore.getState().markPlaceSkipped('course-place-1')

    expect(useTravelStore.getState().skippedPlaceIds).toEqual(['course-place-1'])
    expect(useTravelStore.getState().visitedPlaceIds).toEqual([])

    useTravelStore.setState({
      draftCourseId: null,
      skippedPlaceIds: [],
      visitedPlaceIds: [],
    })
    useTravelStore.getState().hydrateTravelDrafts('course-1')

    expect(useTravelStore.getState().skippedPlaceIds).toEqual(['course-place-1'])
    expect(useTravelStore.getState().visitedPlaceIds).toEqual([])
  })

  it('discards an expired review cache', () => {
    useTravelStore.getState().beginTravelDrafts('course-1')
    const cache = JSON.parse(localStorage.getItem('chapchu.travel-drafts') ?? '{}')
    localStorage.setItem(
      'chapchu.travel-drafts',
      JSON.stringify({ ...cache, expiresAt: Date.now() - 1 })
    )
    useTravelStore.setState({ draftCourseId: null, noteDrafts: [], visitedPlaceIds: [] })

    useTravelStore.getState().hydrateTravelDrafts('course-1')

    expect(useTravelStore.getState().draftCourseId).toBeNull()
    expect(localStorage.getItem('chapchu.travel-drafts')).toBeNull()
  })

  it('removes a temporary travel photo from its cached draft', () => {
    useTravelStore.getState().beginTravelDrafts('course-1')
    useTravelStore.getState().upsertNoteDraft({
      waypointId: 'course-place-1',
      content: '후기',
      photoUrls: ['/images/photo-1.jpg', '/images/photo-2.jpg'],
      photos: [
        { photoId: 'photo-1', downloadUrl: '/images/photo-1.jpg', takenAt: null },
        { photoId: 'photo-2', downloadUrl: '/images/photo-2.jpg', takenAt: null },
      ],
      saved: true,
    })

    useTravelStore.getState().removeDraftPhoto('course-place-1', 'photo-1')

    expect(useTravelStore.getState().noteDrafts[0]).toMatchObject({
      photos: [{ photoId: 'photo-2' }],
      photoUrls: ['/images/photo-2.jpg'],
      saved: false,
    })
  })
})
