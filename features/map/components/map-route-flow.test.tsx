import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MapRouteFlow from '@/features/map/components/map-route-flow'
import {
  createRecommendedCourse,
  fetchActiveCourse,
} from '@/features/map/api/courses-api'
import { fetchCourseWeather } from '@/features/map/api/course-weather-api'
import {
  getMinimumWalkingTimeSeconds,
  getPedestrianRoute,
} from '@/features/map/api/walking-time-api'
import { webLocationProvider } from '@/features/location/providers/web-location-provider'
import { useLocationStore } from '@/features/location/stores/location-store'
import { fetchSelectablePets } from '@/features/profile/api/pets-api'
import { useTravelStore } from '@/features/travel/stores/travel-store'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/features/location/providers/web-location-provider', () => ({
  webLocationProvider: {
    checkPermission: vi.fn(),
    requestCurrentPosition: vi.fn(),
  },
}))

vi.mock('@/features/map/api/course-weather-api', () => ({
  fetchCourseWeather: vi.fn(),
}))

vi.mock('@/features/map/api/courses-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/map/api/courses-api')>()
  return {
    ...actual,
    createRecommendedCourse: vi.fn(),
    fetchActiveCourse: vi.fn(),
  }
})

vi.mock('@/features/map/api/walking-time-api', () => ({
  getMinimumWalkingTimeSeconds: vi.fn(),
  getPedestrianRoute: vi.fn(),
}))

vi.mock('@/features/profile/api/pets-api', () => ({
  fetchSelectablePets: vi.fn(),
}))

vi.mock('@/components/screens/map-setup-screen', () => ({
  default: ({
    currentLocation,
    onNext,
  }: {
    currentLocation?: { lat: number; lng: number }
    onNext: (
      origin: {
        id: string
        name: string
        address: string
        latitude: number
        longitude: number
      },
      destination: {
        id: string
        name: string
        address: string
        latitude: number
        longitude: number
      }
    ) => void
  }) => (
    <div data-testid="map-setup" data-lat={currentLocation?.lat} data-lng={currentLocation?.lng}>
      <button
        type="button"
        onClick={() =>
          onNext(
            {
              id: 'origin',
              name: '서울역',
              address: '출발지 주소',
              latitude: 37.5547,
              longitude: 126.9706,
            },
            {
              id: 'destination',
              name: '서울숲',
              address: '도착지 주소',
              latitude: 37.5444,
              longitude: 127.0374,
            }
          )
        }
      >
        조건 설정으로 이동
      </button>
    </div>
  ),
}))

vi.mock('@/components/screens/map-route-options-screen', () => ({
  default: ({
    origin,
    destination,
    onPetSelect,
    onCreateCourse,
    pets,
    courseCreationError,
    courseCreationStatus,
    selectedPetId,
  }: {
    origin: { name: string }
    destination: { name: string }
    onPetSelect: (petId: string) => void
    onCreateCourse: () => void
    pets: Array<{ id: string; name: string }>
    courseCreationError: string | null
    courseCreationStatus: string
    selectedPetId: string | null
  }) => (
    <div data-testid="map-options">
      {origin.name} → {destination.name}
      <span data-testid="course-creation-status">{courseCreationStatus}</span>
      {courseCreationError && <span>{courseCreationError}</span>}
      {pets.map((pet) => (
        <button key={pet.id} type="button" onClick={() => onPetSelect(pet.id)}>
          {pet.name}{selectedPetId === pet.id ? ' 선택됨' : ''}
        </button>
      ))}
      <button type="button" onClick={onCreateCourse}>
        중간 경유지 생성
      </button>
    </div>
  ),
}))

vi.mock('@/components/screens/map-route-screen', () => ({
  default: ({
    course,
    onStartTrip,
  }: {
    course: { places: Array<{ name: string }> }
    onStartTrip: () => void
  }) => (
    <div data-testid="map-route">
      {course.places.map((place) => place.name).join(', ')}
      <button type="button" onClick={onStartTrip}>여행 시작</button>
    </div>
  ),
}))
vi.mock('@/components/screens/travel-progress-screen', () => ({
  default: ({
    onAbort,
    onEndTrip,
    onLeave,
  }: {
    onAbort: () => void
    onEndTrip: () => void
    onLeave: () => void
  }) => (
    <div>
      <button type="button" onClick={onEndTrip}>여행 종료</button>
      <button type="button" onClick={onAbort}>여행 중단</button>
      <button type="button" onClick={onLeave}>홈으로 이동</button>
    </div>
  ),
}))
vi.mock('@/components/screens/trip-end-screen', () => ({
  default: ({ onShare }: { onShare: (review: string) => void }) => (
    <div data-testid="trip-end">
      <button type="button" onClick={() => onShare('전체 후기 내용')}>후기 공유</button>
    </div>
  ),
}))
vi.mock('@/components/screens/post-share-sheet', () => ({
  default: ({ tripReview }: { tripReview: string }) => (
    <div data-testid="post-share-sheet">{tripReview}</div>
  ),
}))
vi.mock('@/components/screens/error-screen', () => ({ default: () => null }))

beforeEach(() => {
  useLocationStore.getState().reset()
  useTravelStore.getState().resetTravel()
  vi.mocked(fetchActiveCourse).mockReset().mockResolvedValue(null)
  vi.mocked(fetchSelectablePets).mockReset().mockResolvedValue([
    { id: 'pet-1', name: '골든이' },
  ])
  vi.mocked(fetchCourseWeather).mockReset().mockResolvedValue({
    temperature: 25,
    humidity: 60,
    weatherStatus: '맑음',
  })
  vi.mocked(getMinimumWalkingTimeSeconds).mockReset().mockResolvedValue(4120)
  vi.mocked(getPedestrianRoute).mockReset().mockResolvedValue({
    totalDistanceMeters: 5100,
    totalTimeSeconds: 4120,
    path: [
      { lat: 37.5547, lng: 126.9706 },
      { lat: 37.5444, lng: 127.0374 },
    ],
  })
  vi.mocked(webLocationProvider.checkPermission).mockReset().mockResolvedValue('granted')
  vi.mocked(webLocationProvider.requestCurrentPosition).mockReset().mockResolvedValue({
    ok: true,
    position: {
      latitude: 35.858,
      longitude: 128.63,
      accuracyMeters: 25,
      capturedAt: '2026-08-26T05:00:00.000Z',
      precision: 'precise',
      source: 'web',
    },
  })
  vi.mocked(createRecommendedCourse).mockReset().mockResolvedValue({
    id: 'server-course-1',
    travelDate: '2026-09-12',
    startLocation: '서울역',
    endLocation: '서울숲',
    places: [
      {
        id: 'server-course-place-1',
        externalPlaceId: 'destination',
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
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

async function createCourse(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '중간 경유지 생성' }))
}

describe('MapRouteFlow location entry', () => {
  it('wraps every map step in the shared page transition', async () => {
    const user = userEvent.setup()
    render(<MapRouteFlow />)

    expect(document.querySelector('[data-map-flow-step="setup"]')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    expect(await screen.findByTestId('map-options')).toBeInTheDocument()
    expect(document.querySelector('[data-map-flow-step="options"]')).toBeInTheDocument()
  })

  it('restores a server-side active trip when local state is empty', async () => {
    vi.mocked(fetchActiveCourse).mockResolvedValueOnce({
      id: 'server-active-course',
      travelDate: '2026-09-12',
      startLocation: '서울역',
      endLocation: '서울숲',
      places: [],
    })

    render(<MapRouteFlow />)

    expect(await screen.findByRole('button', { name: '여행 종료' })).toBeInTheDocument()
    expect(useTravelStore.getState()).toMatchObject({
      recommendedCourse: expect.objectContaining({ id: 'server-active-course' }),
      travelStage: 'in-progress',
    })
  })

  it('does not restore a trip from the local travel store', async () => {
    useTravelStore.getState().setRecommendedCourse({
      id: 'active-course',
      travelDate: '2026-09-12',
      startLocation: '서울역',
      endLocation: '서울숲',
      places: [],
    })
    useTravelStore.getState().setTravelStage('in-progress')

    render(<MapRouteFlow />)

    expect(screen.getByTestId('map-setup')).toBeInTheDocument()
    await waitFor(() => expect(fetchActiveCourse).toHaveBeenCalledOnce())
  })

  it('ignores a late local travel-state update', async () => {
    render(<MapRouteFlow />)

    useTravelStore.getState().setRecommendedCourse({
      id: 'hydrated-active-course',
      travelDate: '2026-09-12',
      startLocation: '서울역',
      endLocation: '서울숲',
      places: [],
    })
    useTravelStore.getState().setTravelStage('in-progress')

    expect(screen.getByTestId('map-setup')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '여행 종료' })).not.toBeInTheDocument()
  })

  it('refreshes location on entry and passes it to the map setup screen', async () => {
    render(<MapRouteFlow />)

    await waitFor(() => {
      expect(screen.getByTestId('map-setup')).toHaveAttribute('data-lat', '35.858')
    })
    expect(screen.getByTestId('map-setup')).toHaveAttribute('data-lng', '128.63')
    expect(webLocationProvider.requestCurrentPosition).toHaveBeenCalledOnce()
  })

  it('requests the device position automatically when permission can prompt', async () => {
    vi.mocked(webLocationProvider.checkPermission).mockResolvedValue('prompt')

    render(<MapRouteFlow />)

    await waitFor(() => expect(webLocationProvider.requestCurrentPosition).toHaveBeenCalledOnce())
  })

  it('does not access location while an error route is displayed', () => {
    render(<MapRouteFlow initialErrorType="location-denied" />)

    expect(webLocationProvider.checkPermission).not.toHaveBeenCalled()
    expect(webLocationProvider.requestCurrentPosition).not.toHaveBeenCalled()
  })

  it('moves from endpoint setup to the route options step', async () => {
    const user = userEvent.setup()
    render(<MapRouteFlow />)

    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))

    expect(await screen.findByTestId('map-options')).toHaveTextContent(
      '서울역 → 서울숲'
    )
    expect(useTravelStore.getState()).toMatchObject({
      routeOrigin: expect.objectContaining({ name: '서울역' }),
      routeDestination: expect.objectContaining({ name: '서울숲' }),
      travelStage: 'planning',
    })
    await waitFor(() => expect(getMinimumWalkingTimeSeconds).toHaveBeenCalledOnce())
    expect(getMinimumWalkingTimeSeconds).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'origin' }),
      expect.objectContaining({ id: 'destination' }),
      expect.any(AbortSignal)
    )
  })

  it('loads the current user pets and selects the first pet for course creation', async () => {
    render(<MapRouteFlow />)

    await waitFor(() => {
      expect(useTravelStore.getState()).toMatchObject({
        selectedPetId: 'pet-1',
        selectedPetName: '골든이',
      })
    })
    expect(fetchSelectablePets).toHaveBeenCalledOnce()
  })

  it('uses the pet selected on the options screen to create the course', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchSelectablePets).mockResolvedValueOnce([
      { id: 'pet-1', name: '골든이' },
      { id: 'pet-2', name: '보리' },
    ])
    render(<MapRouteFlow />)

    await waitFor(() => expect(useTravelStore.getState().selectedPetId).toBe('pet-1'))
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    await user.click(screen.getByRole('button', { name: '보리' }))
    await createCourse(user)

    expect(createRecommendedCourse).toHaveBeenCalledWith(
      expect.objectContaining({ petId: 'pet-2' }),
      expect.any(AbortSignal)
    )
  })

  it('fixes the entered destination and creates intermediate stops directly', async () => {
    const user = userEvent.setup()
    render(<MapRouteFlow />)

    await waitFor(() => expect(useTravelStore.getState().selectedPetId).toBe('pet-1'))
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    await createCourse(user)

    expect(await screen.findByTestId('map-route')).toHaveTextContent('서울숲')
    expect(createRecommendedCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        petId: 'pet-1',
        startLocation: '서울역',
        temperature: 25,
        humidity: 60,
        weatherStatus: '맑음',
        destination: expect.objectContaining({
          externalPlaceId: 'destination',
          placeName: '서울숲',
          latitude: 37.5444,
          longitude: 127.0374,
        }),
      }),
      expect.any(AbortSignal)
    )
    expect(getPedestrianRoute).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'origin' }),
      expect.objectContaining({ id: 'server-course-place-1', isFinal: true }),
      [],
      expect.any(AbortSignal)
    )
    expect(fetchCourseWeather).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'destination' }),
      expect.any(AbortSignal)
    )
  })

  it('keeps failed course creation on the options step', async () => {
    const user = userEvent.setup()
    vi.mocked(createRecommendedCourse).mockRejectedValueOnce({ type: 'network' })
    render(<MapRouteFlow />)

    await waitFor(() => expect(useTravelStore.getState().selectedPetId).toBe('pet-1'))
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    await createCourse(user)

    expect(await screen.findByTestId('course-creation-status')).toHaveTextContent('error')
    expect(screen.getByText('코스 생성에 실패했습니다. 다시 시도해주세요.')).toBeInTheDocument()
    expect(screen.queryByTestId('map-route')).not.toBeInTheDocument()
  })

  it('continues course creation when weather refresh fails', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchCourseWeather).mockRejectedValueOnce(new Error('weather failed'))
    render(<MapRouteFlow />)

    await waitFor(() => expect(useTravelStore.getState().selectedPetId).toBe('pet-1'))
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    await createCourse(user)

    expect(await screen.findByTestId('map-route')).toBeInTheDocument()
    expect(createRecommendedCourse).toHaveBeenCalledWith(
      expect.not.objectContaining({
        temperature: expect.anything(),
        humidity: expect.anything(),
        weatherStatus: expect.anything(),
      }),
      expect.any(AbortSignal)
    )
  })

  it('does not create a course when the user has no registered pet', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchSelectablePets).mockResolvedValueOnce([])
    render(<MapRouteFlow />)

    await waitFor(() => expect(fetchSelectablePets).toHaveBeenCalledOnce())
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    await createCourse(user)

    expect(createRecommendedCourse).not.toHaveBeenCalled()
  })

  it('keeps the active course state when leaving progress for home', async () => {
    const user = userEvent.setup()
    render(<MapRouteFlow />)

    await waitFor(() => expect(useTravelStore.getState().selectedPetId).toBe('pet-1'))
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    await createCourse(user)
    await user.click(await screen.findByRole('button', { name: '여행 시작' }))
    await user.click(screen.getByRole('button', { name: '홈으로 이동' }))

    expect(useTravelStore.getState()).toMatchObject({
      draftCourseId: 'server-course-1',
      recommendedCourse: expect.objectContaining({ id: 'server-course-1' }),
      travelStage: 'in-progress',
    })
  })

  it('clears the local course state after an aborted course is deleted', async () => {
    const user = userEvent.setup()
    render(<MapRouteFlow />)

    await waitFor(() => expect(useTravelStore.getState().selectedPetId).toBe('pet-1'))
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    await createCourse(user)
    await user.click(await screen.findByRole('button', { name: '여행 시작' }))

    expect(useTravelStore.getState().recommendedCourse?.id).toBe('server-course-1')
    await user.click(screen.getByRole('button', { name: '여행 중단' }))

    expect(useTravelStore.getState()).toMatchObject({
      draftCourseId: null,
      recommendedCourse: null,
      travelStage: 'idle',
      visitedPlaceIds: [],
    })
  })

  it('keeps the trip end screen mounted and passes its overall review to the share sheet', async () => {
    const user = userEvent.setup()
    render(<MapRouteFlow />)

    await waitFor(() => expect(useTravelStore.getState().selectedPetId).toBe('pet-1'))
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    await createCourse(user)
    await user.click(screen.getByRole('button', { name: '여행 시작' }))
    await waitFor(() => expect(createRecommendedCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        petId: 'pet-1',
        startLocation: '서울역',
        temperature: 25,
        humidity: 60,
        weatherStatus: '맑음',
        destination: expect.objectContaining({
          externalPlaceId: 'destination',
          placeName: '서울숲',
        }),
      }),
      expect.any(AbortSignal)
    ))
    await user.click(screen.getByRole('button', { name: '여행 종료' }))
    await user.click(screen.getByRole('button', { name: '후기 공유' }))

    expect(screen.getByTestId('trip-end')).toBeInTheDocument()
    expect(screen.getByTestId('post-share-sheet')).toHaveTextContent('전체 후기 내용')
  })
})
