import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MapRouteOptionsScreen, {
  type CourseRecommendationStatus,
} from '@/components/screens/map-route-options-screen'

const origin = {
  id: 'origin',
  name: '서울역',
  address: '서울 용산구 한강대로 405',
  latitude: 37.5547,
  longitude: 126.9706,
}

const destination = {
  id: 'destination',
  name: '서울숲',
  address: '서울 성동구 뚝섬로 273',
  latitude: 37.5444,
  longitude: 127.0374,
}

function Harness({
  onPetSelect = vi.fn(),
  onRecommend = vi.fn(),
  pets = [
    { id: 'pet-1', name: '초코' },
    { id: 'pet-2', name: '보리' },
  ],
  recommendationError = null,
  recommendationStatus = 'idle',
}: {
  onPetSelect?: (petId: string) => void
  onRecommend?: () => void
  pets?: Array<{ id: string; name: string }>
  recommendationError?: string | null
  recommendationStatus?: CourseRecommendationStatus
} = {}) {
  const [options, setOptions] = useState({
    waypointCount: 0,
  })
  const [selectedPetId, setSelectedPetId] = useState<string | null>('pet-1')

  return (
    <MapRouteOptionsScreen
      destination={destination}
      onBack={vi.fn()}
      onOptionsChange={setOptions}
      onPetSelect={(petId) => {
        setSelectedPetId(petId)
        onPetSelect(petId)
      }}
      onRecommend={onRecommend}
      origin={origin}
      petLoadStatus="success"
      pets={pets}
      recommendationError={recommendationError}
      recommendationStatus={recommendationStatus}
      selectedPetId={selectedPetId}
      waypointCount={options.waypointCount}
    />
  )
}

describe('MapRouteOptionsScreen', () => {
  afterEach(() => cleanup())

  it('offers zero to seven intermediate stops without showing walking time', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.getByRole('button', { name: '0개 · 직행' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: '0개 · 직행' })).toHaveClass(
      'focus-visible:ring-2',
      'rounded-xl'
    )
    expect(screen.getByRole('button', { name: '7개' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '8개' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '0개 · 직행' }).parentElement).toHaveClass(
      'grid-cols-4'
    )
    expect(screen.queryByRole('heading', { name: '여행 시간' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '최소 도보 이동 시간' })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '7개' }))

    expect(screen.getByRole('button', { name: '7개' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: '추천 코스 받기' })).toBeEnabled()
    expect(screen.getByText(/선택한 반려동물·출발지·도착지와/)).toBeInTheDocument()
  })

  it('shows pets and changes the selected pet', async () => {
    const user = userEvent.setup()
    const onPetSelect = vi.fn()
    render(<Harness onPetSelect={onPetSelect} />)

    expect(screen.getByRole('button', { name: '초코' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await user.click(screen.getByRole('button', { name: '보리' }))

    expect(onPetSelect).toHaveBeenCalledWith('pet-2')
    expect(screen.getByRole('button', { name: '보리' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('disables duplicate submissions and exposes recommendation failures', async () => {
    const onRecommend = vi.fn()
    const { rerender } = render(
      <Harness onRecommend={onRecommend} recommendationStatus="loading" />
    )

    expect(
      await screen.findByRole('button', { name: '추천 코스 생성 중' })
    ).toBeDisabled()

    rerender(
      <Harness
        onRecommend={onRecommend}
        recommendationStatus="error"
        recommendationError="추천 서버에 연결하지 못했습니다."
      />
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '추천 서버에 연결하지 못했습니다.'
    )
    expect(screen.getByRole('button', { name: '추천 코스 다시 받기' })).toBeEnabled()
  })
})
