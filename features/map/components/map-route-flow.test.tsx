import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MapRouteFlow from '@/features/map/components/map-route-flow'
import { createRecommendedCourse } from '@/features/map/api/courses-api'
import { webLocationProvider } from '@/features/location/providers/web-location-provider'
import { useLocationStore } from '@/features/location/stores/location-store'
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
    onRecommend,
    recommendationError,
    recommendationStatus,
  }: {
    origin: { name: string }
    destination: { name: string }
    onRecommend: () => void
    recommendationError: string | null
    recommendationStatus: string
  }) => (
    <div data-testid="map-options">
      {origin.name} → {destination.name}
      <span data-testid="recommendation-status">{recommendationStatus}</span>
      {recommendationError && <span>{recommendationError}</span>}
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
    places: [
      {
        id: 'course-place-1',
        externalPlaceId: 'external-1',
        name: '실제 추천 장소',
        visitOrder: 1,
        isFinal: true,
      },
    ],
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

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

  it('creates a course with the documented request and shows the API result', async () => {
    const user = userEvent.setup()
    render(<MapRouteFlow />)

    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    await user.click(screen.getByRole('button', { name: '추천 코스 요청' }))

    expect(await screen.findByTestId('map-route')).toHaveTextContent('실제 추천 장소')
    expect(createRecommendedCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        lat: 37.5547,
        lng: 126.9706,
        radiusMeters: 5000,
        startLocation: '서울역',
        travelDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
      expect.any(AbortSignal)
    )
  })

  it('keeps empty and failed recommendations on the options step', async () => {
    const user = userEvent.setup()
    vi.mocked(createRecommendedCourse).mockResolvedValueOnce({
      id: 'empty-course',
      travelDate: '2026-09-01',
      startLocation: '서울역',
      places: [],
    })
    render(<MapRouteFlow />)

    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    await user.click(screen.getByRole('button', { name: '추천 코스 요청' }))
    expect(await screen.findByTestId('recommendation-status')).toHaveTextContent('empty')
    expect(screen.queryByTestId('map-route')).not.toBeInTheDocument()

    vi.mocked(createRecommendedCourse).mockRejectedValueOnce({ type: 'network' })
    await user.click(screen.getByRole('button', { name: '추천 코스 요청' }))
    expect(await screen.findByTestId('recommendation-status')).toHaveTextContent('error')
    expect(screen.getByText(/네트워크 연결을 확인/)).toBeInTheDocument()
  })

  it('shows the empty state when the backend reports no nearby places', async () => {
    const user = userEvent.setup()
    vi.mocked(createRecommendedCourse).mockRejectedValueOnce({
      type: 'not-found',
      status: 404,
      message: '주변에 반려동물 동반 가능 장소가 없습니다.',
    })
    render(<MapRouteFlow />)

    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    await user.click(screen.getByRole('button', { name: '추천 코스 요청' }))

    expect(await screen.findByTestId('recommendation-status')).toHaveTextContent('empty')
    expect(screen.queryByTestId('map-route')).not.toBeInTheDocument()
  })

  it('keeps the trip end screen mounted and passes its overall review to the share sheet', async () => {
    const user = userEvent.setup()
    render(<MapRouteFlow />)

    await user.click(screen.getByRole('button', { name: '조건 설정으로 이동' }))
    await user.click(screen.getByRole('button', { name: '추천 코스 요청' }))
    await user.click(screen.getByRole('button', { name: '여행 시작' }))
    await user.click(screen.getByRole('button', { name: '여행 종료' }))
    await user.click(screen.getByRole('button', { name: '후기 공유' }))

    expect(screen.getByTestId('trip-end')).toBeInTheDocument()
    expect(screen.getByTestId('post-share-sheet')).toHaveTextContent('전체 후기 내용')
  })
})
