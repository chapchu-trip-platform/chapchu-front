import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MapRouteFlow from '@/features/map/components/map-route-flow'
import { fetchCourseWeather } from '@/features/map/api/course-weather-api'
import { createRecommendedCourse } from '@/features/map/api/courses-api'
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

vi.mock('@/features/map/api/courses-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/map/api/courses-api')>()
  return {
    ...actual,
    createRecommendedCourse: vi.fn(),
  }
})

vi.mock('@/features/map/api/course-weather-api', () => ({
  fetchCourseWeather: vi.fn(),
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
    onRecommend,
    pets,
    recommendationError,
    recommendationStatus,
    selectedPetId,
  }: {
    origin: { name: string }
    destination: { name: string }
    onPetSelect: (petId: string) => void
    onRecommend: () => void
    pets: Array<{ id: string; name: string }>
    recommendationError: string | null
    recommendationStatus: string
    selectedPetId: string | null
  }) => (
    <div data-testid="map-options">
      {origin.name} → {destination.name}
      <span data-testid="recommendation-status">{recommendationStatus}</span>
      {recommendationError && <span>{recommendationError}</span>}
      {pets.map((pet) => (
        <button key={pet.id} type="button" onClick={() => onPetSelect(pet.id)}>
          {pet.name}{selectedPetId === pet.id ? ' 선택됨' : ''}
        </button>
      ))}
      <button type="button" onClick={onRecommend}>
        추천 코스 요청
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
  default: ({ onEndTrip }: { onEndTrip: () => void }) => (
    <button type="button" onClick={onEndTrip}>여행 종료</button>
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
  vi.mocked(fetchSelectablePets).mockReset().mockResolvedValue([
    { id: 'pet-1', name: '골든이' },
  ])
  vi.mocked(fetchCourseWeather).mockReset().mockResolvedValue({
    temperature: 25,
    humidity: 60,
    weatherStatus: '맑음',
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
    id: 'course-1',
    travelDate: '2026-09-01',
    startLocation: '서울역',
    endLocation: '서울숲',
    places: [
      {
        id: 'course-place-1',
        externalPlaceId: 'external-1',
        name: '실제 추천 장소',
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

function setValidRouteOptions() {
  useTravelStore.getState().setRouteOptions({
    waypointCount: 1,
  })
}

describe('MapRouteFlow location entry', () => {
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

  it('uses the pet selected on the route options screen', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchSelectablePets).mockResolvedValueOnce([
      { id: 'pet-1', name: '골든이' },
      { id: 'pet-2', name: '보리' },
    ])
    render(<MapRouteFlow />)

    await waitFor(() => expect(useTravelStore.getState().selectedPetId).toBe('pet-1'))
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    await user.click(screen.getByRole('button', { name: '보리' }))
    setValidRouteOptions()
    await user.click(screen.getByRole('button', { name: '추천 코스 요청' }))

    expect(createRecommendedCourse).toHaveBeenCalledWith(
      expect.objectContaining({ petId: 'pet-2' }),
      expect.any(AbortSignal)
    )
  })

  it('creates a course with the documented request and shows the API result', async () => {
    const user = userEvent.setup()
    render(<MapRouteFlow />)

    await waitFor(() => expect(useTravelStore.getState().selectedPetId).toBe('pet-1'))
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    setValidRouteOptions()
    await user.click(screen.getByRole('button', { name: '추천 코스 요청' }))

    expect(await screen.findByTestId('map-route')).toHaveTextContent('실제 추천 장소')
    expect(createRecommendedCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        petId: 'pet-1',
        startLocation: '서울역',
        startLat: 37.5547,
        startLng: 126.9706,
        endLocation: '서울숲',
        endLat: 37.5444,
        endLng: 127.0374,
        intermediateStopCount: 1,
        temperature: 25,
        humidity: 60,
        weatherStatus: '맑음',
        travelDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
      expect.any(AbortSignal)
    )
    expect(fetchCourseWeather).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'origin' }),
      expect.any(AbortSignal)
    )
  })

  it('keeps an empty recommendation on the options step', async () => {
    const user = userEvent.setup()
    vi.mocked(createRecommendedCourse).mockResolvedValueOnce({
      id: 'empty-course',
      travelDate: '2026-09-01',
      startLocation: '서울역',
      endLocation: '서울숲',
      places: [],
    })
    render(<MapRouteFlow />)

    await waitFor(() => expect(useTravelStore.getState().selectedPetId).toBe('pet-1'))
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    setValidRouteOptions()
    await user.click(screen.getByRole('button', { name: '추천 코스 요청' }))
    expect(await screen.findByTestId('recommendation-status')).toHaveTextContent('empty')
    expect(screen.queryByTestId('map-route')).not.toBeInTheDocument()
  })

  it('keeps failed recommendations on the options step', async () => {
    const user = userEvent.setup()
    vi.mocked(createRecommendedCourse).mockRejectedValueOnce({ type: 'network' })
    render(<MapRouteFlow />)

    await waitFor(() => expect(useTravelStore.getState().selectedPetId).toBe('pet-1'))
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    setValidRouteOptions()
    await user.click(screen.getByRole('button', { name: '추천 코스 요청' }))

    expect(await screen.findByTestId('recommendation-status')).toHaveTextContent('error')
    expect(screen.getByText(/네트워크 연결을 확인/)).toBeInTheDocument()
  })

  it('continues course creation without weather fields when weather refresh fails', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchCourseWeather).mockRejectedValueOnce(new Error('weather failed'))
    render(<MapRouteFlow />)

    await waitFor(() => expect(useTravelStore.getState().selectedPetId).toBe('pet-1'))
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    setValidRouteOptions()
    await user.click(screen.getByRole('button', { name: '추천 코스 요청' }))

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

  it('does not call the course API when the user has no registered pet', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchSelectablePets).mockResolvedValueOnce([])
    render(<MapRouteFlow />)

    await waitFor(() => expect(fetchSelectablePets).toHaveBeenCalledOnce())
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    setValidRouteOptions()
    await user.click(screen.getByRole('button', { name: '추천 코스 요청' }))

    expect(await screen.findByText(/등록된 반려동물이 없습니다/)).toBeInTheDocument()
    expect(createRecommendedCourse).not.toHaveBeenCalled()
  })

  it('shows the empty state when the backend reports no nearby places', async () => {
    const user = userEvent.setup()
    vi.mocked(createRecommendedCourse).mockRejectedValueOnce({
      type: 'not-found',
      status: 404,
      message: '주변에 반려동물 동반 가능 장소가 없습니다.',
    })
    render(<MapRouteFlow />)

    await waitFor(() => expect(useTravelStore.getState().selectedPetId).toBe('pet-1'))
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    setValidRouteOptions()
    await user.click(screen.getByRole('button', { name: '추천 코스 요청' }))

    expect(await screen.findByTestId('recommendation-status')).toHaveTextContent('empty')
    expect(screen.queryByTestId('map-route')).not.toBeInTheDocument()
  })

  it('keeps the trip end screen mounted and passes its overall review to the share sheet', async () => {
    const user = userEvent.setup()
    render(<MapRouteFlow />)

    await waitFor(() => expect(useTravelStore.getState().selectedPetId).toBe('pet-1'))
    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    setValidRouteOptions()
    await user.click(screen.getByRole('button', { name: '추천 코스 요청' }))
    await user.click(screen.getByRole('button', { name: '여행 시작' }))
    await user.click(screen.getByRole('button', { name: '여행 종료' }))
    await user.click(screen.getByRole('button', { name: '후기 공유' }))

    expect(screen.getByTestId('trip-end')).toBeInTheDocument()
    expect(screen.getByTestId('post-share-sheet')).toHaveTextContent('전체 후기 내용')
  })
})
