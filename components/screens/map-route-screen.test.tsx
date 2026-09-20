import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MapRouteScreen from '@/components/screens/map-route-screen'
import { fetchRecommendedPlaceDetails } from '@/features/map/api/place-details-api'

const tmapMapMock = vi.fn((props: unknown) => {
  void props
  return <div data-testid="route-tmap" />
})

vi.mock('@/features/map/components/tmap-map', () => ({
  default: (props: unknown) => tmapMapMock(props),
}))

vi.mock('@/features/map/api/place-details-api', () => ({
  fetchRecommendedPlaceDetails: vi.fn(),
}))

const origin = {
  id: 'seoul-station',
  name: '서울역',
  address: '서울 용산구 한강대로 405',
  latitude: 37.5547,
  longitude: 126.9706,
}

const destination = {
  id: 'seoul-forest',
  name: '서울숲',
  address: '서울 성동구 뚝섬로 273',
  latitude: 37.5444,
  longitude: 127.0374,
}

const course = {
  id: 'course-1',
  travelDate: '2026-09-01',
  startLocation: '서울역',
  endLocation: '서울숲',
  places: [
    {
      id: 'course-place-1',
      externalPlaceId: 'external-1',
      name: '반려견 카페',
      imageUrl: null,
      latitude: 37.55,
      longitude: 127.01,
      visitOrder: 1,
      isFinal: false,
      reason: '산책 후 쉬어가기 좋은 반려견 카페예요.',
      petPolicy: {
        allowedPetSize: '소형견과 중형견',
        leashRequired: true,
        caution: '실내에서는 목줄을 착용하고 다른 반려동물과 충분한 거리를 유지해주세요.',
      },
      details: {
        address: '서울 성동구 성수동 2가',
        rating: 4.7,
        reviewCount: 80,
      },
    },
    {
      id: 'course-place-2',
      externalPlaceId: 'external-2',
      name: '서울숲',
      imageUrl: null,
      latitude: 37.5444,
      longitude: 127.0374,
      visitOrder: 2,
      isFinal: true,
      petPolicy: null,
    },
  ],
}

afterEach(() => {
  cleanup()
  tmapMapMock.mockClear()
  vi.mocked(fetchRecommendedPlaceDetails).mockReset()
})

describe('MapRouteScreen', () => {
  it('expands each stop to show place details and wrapping pet conditions', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchRecommendedPlaceDetails).mockResolvedValue({
      address: '서울 성동구 성수동 2가',
      businessHours: '10:00 - 21:00',
      category: '반려동물 카페',
      phoneNumber: '02-123-4567',
      rating: 4.8,
      reviewCount: 124,
      visitCount: 356,
      petPolicy: null,
    })
    render(
      <MapRouteScreen
        course={course}
        origin={origin}
        destination={destination}
        onBack={vi.fn()}
        onStartTrip={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: '장소 순서 확정' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '방문 순서' })).toBeInTheDocument()
    expect(screen.getByText('중간 방문지')).toBeInTheDocument()
    expect(screen.getByText('최종 도착지')).toBeInTheDocument()
    const detailButton = screen.getByRole('button', { name: '반려견 카페 상세 펼치기' })
    expect(within(detailButton).getByText('서울 성동구 성수동 2가')).toBeInTheDocument()
    expect(within(detailButton).queryByText('산책 후 쉬어가기 좋은 반려견 카페예요.')).not.toBeInTheDocument()
    await user.click(detailButton)

    expect(detailButton).toHaveAttribute('aria-expanded', 'true')
    expect(fetchRecommendedPlaceDetails).toHaveBeenCalledWith(
      'external-1',
      expect.any(AbortSignal)
    )
    const panel = document.getElementById(detailButton.getAttribute('aria-controls') ?? '') as HTMLElement
    await waitFor(() => expect(within(panel).getByText('10:00 - 21:00')).toBeInTheDocument())
    expect(within(panel).getByText('산책 후 쉬어가기 좋은 반려견 카페예요.')).toBeInTheDocument()
    expect(within(panel).getByText('02-123-4567')).toBeInTheDocument()
    expect(within(panel).getByText('4.8')).toBeInTheDocument()
    expect(within(panel).getByText('허용 크기 소형견과 중형견')).toHaveClass(
      'whitespace-normal',
      'break-words'
    )
    expect(within(panel).getByText(/실내에서는 목줄을 착용/)).toHaveClass(
      'whitespace-pre-line',
      'break-words'
    )
  })

  it('shows zero review and visit counts even when the rating is missing', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchRecommendedPlaceDetails).mockResolvedValue({
      address: '서울특별시 중구 퇴계로 67',
      businessHours: null,
      category: null,
      phoneNumber: null,
      rating: null,
      reviewCount: 0,
      visitCount: 0,
      petPolicy: {
        placeCaution: '- 맹견의 경우, 입마개 착용 필수 - 배변봉투 지참 및 배변처리 필수',
      },
    })
    render(
      <MapRouteScreen
        course={course}
        origin={origin}
        destination={destination}
        onBack={vi.fn()}
        onStartTrip={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: '서울숲 상세 펼치기' }))

    expect(await screen.findAllByText('서울특별시 중구 퇴계로 67')).toHaveLength(2)
    expect(screen.getByText('평점 정보 없음')).toBeInTheDocument()
    expect(screen.getByText('리뷰 0개')).toBeInTheDocument()
    expect(screen.getByText('방문 0회')).toBeInTheDocument()
    expect(screen.getByText(/맹견의 경우/)).toHaveTextContent(
      '- 맹견의 경우, 입마개 착용 필수 - 배변봉투 지참 및 배변처리 필수'
    )
  })

  it('shows the selected endpoints and documented course response without mock metrics', () => {
    render(
      <MapRouteScreen
        course={course}
        origin={origin}
        destination={destination}
        onBack={vi.fn()}
        onStartTrip={vi.fn()}
        pedestrianRoute={{
          totalDistanceMeters: 5100,
          totalTimeSeconds: 4120,
          path: [
            { lat: 37.5547, lng: 126.9706 },
            { lat: 37.5444, lng: 127.0374 },
          ],
        }}
        pedestrianRouteStatus="success"
      />
    )

    const mapProps = tmapMapMock.mock.calls[0][0] as {
      center: { lat: number; lng: number }
      locationLabel: string
      markers: unknown[]
      routePath: unknown[]
    }
    expect(mapProps.center.lat).toBeCloseTo(37.5497)
    expect(mapProps.center.lng).toBeCloseTo(127.006)
    expect(mapProps.locationLabel).toBe('서울역 → 서울숲')
    expect(mapProps.routePath).toEqual([
      { lat: 37.5547, lng: 126.9706 },
      { lat: 37.5444, lng: 127.0374 },
    ])
    expect(mapProps.markers).toEqual([
      {
        id: 'origin-seoul-station',
        position: { lat: 37.5547, lng: 126.9706 },
        title: '출발지: 서울역',
        label: '출발',
        variant: 'origin',
      },
      {
        id: 'course-place-course-place-1',
        position: { lat: 37.55, lng: 127.01 },
        title: '1번 방문지: 반려견 카페',
        label: '1',
        variant: 'candidate',
      },
      {
        id: 'course-place-course-place-2',
        position: { lat: 37.5444, lng: 127.0374 },
        title: '2번 방문지: 서울숲',
        label: '도착',
        variant: 'destination',
      },
    ])
    expect(screen.getByRole('status')).toHaveTextContent(
      '입력한 최종 도착지는 고정하고, 서버가 중간 경유지를 구성한 코스입니다.'
    )
    expect(screen.getByText('5.1km')).toBeInTheDocument()
    expect(screen.getByText('약 1시간 9분')).toBeInTheDocument()
    expect(screen.queryByText('약 12.4km')).not.toBeInTheDocument()

    const summaryDock = screen.getByTestId('route-summary-dock')
    expect(summaryDock).toHaveTextContent('서울역 → 서울숲')
    expect(summaryDock).toHaveTextContent('장소 2개')
    expect(summaryDock).toHaveTextContent('2026-09-01')
    expect(summaryDock).toHaveTextContent('코스 구성 완료')
    expect(summaryDock).toHaveClass('h-[156px]', 'min-h-[156px]')
    const startTripButton = screen.getByRole('button', { name: '이 코스로 여행 시작' })
    expect(startTripButton).toBeEnabled()
    expect(startTripButton).toHaveClass('map-flow-dock-button')
    expect(startTripButton.parentElement).toBe(summaryDock)

    const handle = screen.getByRole('button', { name: '방문 순서 펼치기' })
    expect(handle).toHaveAttribute('aria-expanded', 'false')
    const detailsSheet = document.querySelector('#route-details-sheet') as HTMLDivElement
    expect(detailsSheet).toHaveClass('map-flow-detail-sheet')
    expect(detailsSheet).toHaveStyle({
      transform: 'translate3d(0, calc(100% - 32px), 0)',
    })
    expect(handle.parentElement).toBe(detailsSheet)
  })

  it('follows an upward drag and snaps to the expanded position', () => {
    render(
      <MapRouteScreen
        course={course}
        origin={origin}
        destination={destination}
        onBack={vi.fn()}
        onStartTrip={vi.fn()}
      />
    )

    const handle = screen.getByRole('button', { name: '방문 순서 펼치기' })
    const sheet = document.querySelector('#route-details-sheet') as HTMLDivElement
    vi.spyOn(sheet, 'getBoundingClientRect').mockReturnValue({
      bottom: 600,
      height: 500,
      left: 0,
      right: 430,
      top: 100,
      width: 430,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    })

    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 500 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 350 })
    expect(sheet).toHaveStyle({ transform: 'translate3d(0, 318px, 0)' })

    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 350 })
    expect(screen.getByRole('button', { name: '방문 순서 접기' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(sheet).toHaveStyle({ transform: 'translate3d(0, 0, 0)' })
  })
})
