import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MapRouteScreen from '@/components/screens/map-route-screen'

const tmapMapMock = vi.fn((props: unknown) => {
  void props
  return <div data-testid="route-tmap" />
})

vi.mock('@/features/map/components/tmap-map', () => ({
  default: (props: unknown) => tmapMapMock(props),
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
  places: [
    {
      id: 'course-place-1',
      externalPlaceId: 'external-1',
      name: '반려견 카페',
      visitOrder: 1,
      isFinal: false,
    },
    {
      id: 'course-place-2',
      externalPlaceId: 'external-2',
      name: '서울숲',
      visitOrder: 2,
      isFinal: true,
    },
  ],
}

afterEach(() => {
  cleanup()
  tmapMapMock.mockClear()
})

describe('MapRouteScreen', () => {
  it('shows the selected endpoints and documented course response without mock metrics', () => {
    render(
      <MapRouteScreen
        course={course}
        origin={origin}
        destination={destination}
        onBack={vi.fn()}
        onStartTrip={vi.fn()}
      />
    )

    const mapProps = tmapMapMock.mock.calls[0][0] as {
      center: { lat: number; lng: number }
      locationLabel: string
      markers: unknown[]
    }
    expect(mapProps.center.lat).toBeCloseTo(37.54955)
    expect(mapProps.center.lng).toBeCloseTo(127.004)
    expect(mapProps.locationLabel).toBe('서울역 추천 코스')
    expect(mapProps.markers).toEqual([
      {
        id: 'origin-seoul-station',
        position: { lat: 37.5547, lng: 126.9706 },
        title: '출발지: 서울역',
      },
      {
        id: 'destination-seoul-forest',
        position: { lat: 37.5444, lng: 127.0374 },
        title: '도착지: 서울숲',
      },
    ])
    expect(screen.getByRole('status')).toHaveTextContent(
      'POST /courses에서 생성된 실제 추천 코스입니다.'
    )
    expect(screen.getByText(/선택한 도착지, 거점 수, 여행 시간/)).toBeInTheDocument()
    expect(screen.queryByText('약 12.4km')).not.toBeInTheDocument()
    expect(screen.queryByText('반려동물 적합')).not.toBeInTheDocument()

    const summaryDock = screen.getByTestId('route-summary-dock')
    expect(summaryDock).toHaveTextContent('서울역 추천 코스')
    expect(summaryDock).toHaveTextContent('장소 2개')
    expect(summaryDock).toHaveTextContent('2026-09-01')
    expect(summaryDock).toHaveTextContent('추천 완료')
    expect(screen.getByRole('button', { name: '이 코스로 여행 시작' })).toBeEnabled()

    const handle = screen.getByRole('button', { name: '추천 코스 상세 펼치기' })
    expect(handle).toHaveAttribute('aria-expanded', 'false')
    const detailsSheet = document.querySelector('#route-details-sheet') as HTMLDivElement
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

    const handle = screen.getByRole('button', { name: '추천 코스 상세 펼치기' })
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
    expect(screen.getByRole('button', { name: '추천 코스 상세 접기' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(sheet).toHaveStyle({ transform: 'translate3d(0, 0, 0)' })
  })

  it('renders only the places and fields returned by the course API', () => {
    render(
      <MapRouteScreen
        course={course}
        origin={origin}
        destination={destination}
        onBack={vi.fn()}
        onStartTrip={vi.fn()}
      />
    )

    expect(screen.getByText('반려견 카페')).toBeInTheDocument()
    expect(screen.getByText('서울숲')).toBeInTheDocument()
    expect(screen.getByText('방문 순서 1')).toBeInTheDocument()
    expect(screen.getByText('방문 순서 2')).toBeInTheDocument()
    expect(screen.getByText('마지막 장소')).toBeInTheDocument()
    expect(screen.queryByText('대표 리뷰')).not.toBeInTheDocument()
    expect(screen.queryByText('목줄 착용 필수')).not.toBeInTheDocument()
  })
})
