import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MapRouteOptionsScreen, {
  type MinimumWalkingTimeStatus,
  type PlaceRecommendationStatus,
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
  minimumWalkingTimeSeconds = null,
  minimumWalkingTimeStatus = 'idle',
}: {
  onPetSelect?: (petId: string) => void
  onRecommend?: () => void
  pets?: Array<{ id: string; name: string }>
  recommendationError?: string | null
  recommendationStatus?: PlaceRecommendationStatus
  minimumWalkingTimeSeconds?: number | null
  minimumWalkingTimeStatus?: MinimumWalkingTimeStatus
} = {}) {
  const [selectedPetId, setSelectedPetId] = useState<string | null>('pet-1')

  return (
    <MapRouteOptionsScreen
      destination={destination}
      onBack={vi.fn()}
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
      minimumWalkingTimeSeconds={minimumWalkingTimeSeconds}
      minimumWalkingTimeStatus={minimumWalkingTimeStatus}
    />
  )
}

describe('MapRouteOptionsScreen', () => {
  afterEach(() => cleanup())

  it('requests destination candidates without offering an intermediate stop count', () => {
    render(<Harness />)

    expect(screen.queryByText('중간 거점 개수')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '추천 장소 받기' })).toBeEnabled()
    expect(screen.getByText(/방문할 장소 5곳을 추천/)).toBeInTheDocument()
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

  it('shortens pet names longer than ten characters for display', () => {
    render(<Harness pets={[{ id: 'pet-1', name: '가나다라마바사아자차카' }]} />)

    expect(screen.getByText('가나다라마바사아자차...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '가나다라마바사아자차카' })).toHaveAttribute(
      'title',
      '가나다라마바사아자차카'
    )
  })

  it('shows the minimum walking time between the selected endpoints', () => {
    render(
      <Harness
        minimumWalkingTimeSeconds={4120}
        minimumWalkingTimeStatus="success"
      />
    )

    expect(screen.getByTestId('minimum-walking-time')).toHaveTextContent(
      '최소 소요 시간'
    )
    expect(screen.getByTestId('minimum-walking-time')).toHaveTextContent('약 1시간 9분')
  })

  it('disables duplicate submissions and exposes recommendation failures', async () => {
    const onRecommend = vi.fn()
    const { rerender } = render(
      <Harness onRecommend={onRecommend} recommendationStatus="loading" />
    )

    expect(
      await screen.findByRole('button', { name: '추천 장소 찾는 중' })
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
    expect(screen.getByRole('button', { name: '추천 장소 다시 받기' })).toBeEnabled()
  })
})
