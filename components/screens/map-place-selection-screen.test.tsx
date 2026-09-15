import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MapPlaceSelectionScreen from '@/components/screens/map-place-selection-screen'
import { fetchRecommendedPlaceDetails } from '@/features/map/api/place-details-api'

vi.mock('@/features/map/api/place-details-api', () => ({
  fetchRecommendedPlaceDetails: vi.fn(),
}))

vi.mock('@/features/map/components/tmap-map', () => ({
  default: ({ markers }: { markers: Array<{ title: string }> }) => (
    <div data-testid="candidate-map">{markers.map((marker) => marker.title).join(', ')}</div>
  ),
}))

const destinationArea = {
  id: 'destination-area',
  name: '성수동',
  address: '서울 성동구',
  latitude: 37.5444,
  longitude: 127.0374,
}

const places = [
  {
    externalPlaceId: 'place-1',
    name: '성수 펫 카페',
    imageUrl: null,
    latitude: 37.5447,
    longitude: 127.0438,
    address: '서울 성동구 성수동 2가',
    category: '카페',
    indoorOutdoorType: '실내',
    allowedPetSize: '소형견',
    leashRequired: true,
    carrierRequired: false,
    caution: '매장 안에서 목줄을 착용해주세요.',
  },
  {
    externalPlaceId: 'place-2',
    name: '서울숲',
    imageUrl: null,
    latitude: 37.546,
    longitude: 127.039,
    address: '서울 성동구 뚝섬로 273',
    category: '관광지',
    indoorOutdoorType: '실외',
    allowedPetSize: null,
    leashRequired: null,
    carrierRequired: null,
    caution: null,
  },
  {
    externalPlaceId: 'place-3',
    name: '성수 반려견 운동장',
    imageUrl: null,
    latitude: 37.547,
    longitude: 127.041,
    address: '서울 성동구 성수일로',
    category: '레포츠',
    indoorOutdoorType: '실외',
    allowedPetSize: null,
    leashRequired: false,
    carrierRequired: false,
    caution: null,
  },
  {
    externalPlaceId: 'place-4',
    name: '뚝섬 펜트리',
    imageUrl: null,
    latitude: 37.548,
    longitude: 127.042,
    address: '서울 성동구 뚝섬로',
    category: '편의시설',
    indoorOutdoorType: '실내',
    allowedPetSize: null,
    leashRequired: null,
    carrierRequired: null,
    caution: null,
  },
]

function Harness({
  onConfirm = vi.fn(),
  travelDate = '2026-09-12',
}: {
  onConfirm?: () => void
  travelDate?: string
} = {}) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  return (
    <MapPlaceSelectionScreen
      destinationArea={destinationArea}
      onBack={vi.fn()}
      onConfirm={onConfirm}
      onToggle={(placeId) => {
        setSelectedPlaceId((current) => current === placeId ? null : placeId)
      }}
      places={places}
      selectedPlaceId={selectedPlaceId}
      travelDate={travelDate}
    />
  )
}

afterEach(() => {
  cleanup()
  vi.mocked(fetchRecommendedPlaceDetails).mockReset()
})

describe('MapPlaceSelectionScreen', () => {
  it('keeps the selection dock fixed and toggles the place list sheet', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const dock = screen.getByTestId('place-selection-dock')
    expect(dock).toHaveTextContent('최종 도착지')
    expect(dock).toHaveTextContent('후보 4개')
    expect(dock).toHaveTextContent('2026-09-12')
    expect(dock).toHaveTextContent('선택 필요')
    expect(dock).toHaveClass('h-[156px]', 'min-h-[156px]')
    const confirmButton = screen.getByRole('button', {
      name: '선택한 도착지로 코스 생성',
    })
    expect(confirmButton).toHaveClass('map-flow-dock-button')
    expect(confirmButton).toBeDisabled()

    const handle = screen.getByRole('button', { name: '추천 장소 목록 펼치기' })
    const sheet = document.querySelector('#place-selection-sheet') as HTMLDivElement
    expect(sheet).toHaveClass('map-flow-detail-sheet')
    expect(handle).toHaveAttribute('aria-expanded', 'false')
    expect(sheet).toHaveStyle({
      transform: 'translate3d(0, calc(100% - 32px), 0)',
    })

    await user.click(handle)
    expect(screen.getByRole('button', { name: '추천 장소 목록 접기' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(sheet).toHaveStyle({ transform: 'translate3d(0, 0, 0)' })
  })

  it('follows an upward drag and expands the place list sheet', () => {
    render(<Harness />)

    const handle = screen.getByRole('button', { name: '추천 장소 목록 펼치기' })
    const sheet = document.querySelector('#place-selection-sheet') as HTMLDivElement
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
    expect(screen.getByRole('button', { name: '추천 장소 목록 접기' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(sheet).toHaveStyle({ transform: 'translate3d(0, 0, 0)' })
  })

  it('selects exactly one final destination and replaces the previous selection', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.getByTestId('candidate-map')).toHaveTextContent('1. 성수 펫 카페, 2. 서울숲')
    await user.click(screen.getByRole('button', { name: '추천 장소 목록 펼치기' }))
    expect(screen.getByText('선택 필요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '선택한 도착지로 코스 생성' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '성수 펫 카페 선택' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 선택' }))
    await user.click(screen.getByRole('button', { name: '서울숲 선택' }))

    expect(screen.getByText('1곳 선택')).toBeInTheDocument()
    expect(screen.getByTestId('place-selection-stats')).toHaveTextContent('후보 4개')
    expect(screen.getByRole('button', { name: '성수 펫 카페 선택' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(screen.getByRole('button', { name: '서울숲 선택' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: '뚝섬 펜트리 선택' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '선택한 도착지로 코스 생성' })).toBeEnabled()
    expect(screen.getByText('허용 크기 소형견')).toBeInTheDocument()
    expect(screen.getByText('목줄 필수')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '서울숲 선택' }))
    expect(screen.getByText('선택 필요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '선택한 도착지로 코스 생성' })).toBeDisabled()
  })

  it('loads reviews and practical details inside the selection card', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchRecommendedPlaceDetails).mockResolvedValue({
      businessHours: '10:00 - 21:00',
      phoneNumber: '02-123-4567',
      rating: 4.8,
      reviewCount: 124,
      visitCount: 356,
      petPolicy: '실내에서는 목줄을 착용해주세요.',
    })
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: '추천 장소 목록 펼치기' }))
    const trigger = screen.getByRole('button', { name: '성수 펫 카페 상세 펼치기' })
    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(fetchRecommendedPlaceDetails).toHaveBeenCalledWith('place-1', expect.any(AbortSignal))
    const details = document.getElementById(trigger.getAttribute('aria-controls') ?? '') as HTMLElement
    await waitFor(() => expect(within(details).getByText('4.8')).toBeInTheDocument())
    expect(within(details).getByText('리뷰 124개')).toBeInTheDocument()
    expect(within(details).getByText('방문 356회')).toBeInTheDocument()
    expect(within(details).getByText('10:00 - 21:00')).toBeInTheDocument()
    expect(within(details).getByText('02-123-4567')).toBeInTheDocument()
    expect(within(details).getByText('허용 크기 소형견')).toBeInTheDocument()
    expect(within(details).getByText('목줄 필수')).toBeInTheDocument()
    expect(within(details).getByText('실내에서는 목줄을 착용해주세요.')).toBeInTheDocument()
  })

  it('shows returned zero counts and line-separated pet rules without a rating', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchRecommendedPlaceDetails).mockResolvedValue({
      businessHours: null,
      phoneNumber: null,
      rating: null,
      reviewCount: 0,
      visitCount: 0,
      petPolicy: {
        placeCaution: '- 맹견의 경우, 입마개 착용 필수 - 배변봉투 지참 및 배변처리 필수',
      },
    })
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: '추천 장소 목록 펼치기' }))
    await user.click(screen.getByRole('button', { name: '성수 펫 카페 상세 펼치기' }))

    expect(await screen.findByText('평점 정보 없음')).toBeInTheDocument()
    expect(screen.getByText('리뷰 0개')).toBeInTheDocument()
    expect(screen.getByText('방문 0회')).toBeInTheDocument()
    expect(screen.getByText(/맹견의 경우/)).toHaveClass('whitespace-pre-line')
  })

  it('retries a failed detail request when the card is reopened', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchRecommendedPlaceDetails)
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        businessHours: null,
        phoneNumber: null,
        rating: 4.5,
        reviewCount: 10,
        visitCount: null,
        petPolicy: null,
      })
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: '성수 펫 카페 상세 펼치기' }))
    expect(await screen.findByText('리뷰 정보를 불러오지 못했어요.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '성수 펫 카페 상세 접기' }))
    await user.click(screen.getByRole('button', { name: '성수 펫 카페 상세 펼치기' }))

    expect(await screen.findByText('4.5')).toBeInTheDocument()
    expect(fetchRecommendedPlaceDetails).toHaveBeenCalledTimes(2)
  })

  it('requires a selected final destination before creating the course', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)

    expect(screen.getByRole('button', { name: '선택한 도착지로 코스 생성' })).toBeDisabled()
    expect(onConfirm).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '서울숲 선택' }))
    await user.click(screen.getByRole('button', { name: '선택한 도착지로 코스 생성' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
