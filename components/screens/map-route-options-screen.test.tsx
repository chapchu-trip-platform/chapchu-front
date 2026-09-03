import { useState } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MapRouteOptionsScreen, {
  type CourseRecommendationStatus,
} from '@/components/screens/map-route-options-screen'
import { getMinimumWalkingTimeSeconds } from '@/features/map/api/walking-time-api'

vi.mock('@/features/map/api/walking-time-api', () => ({
  getMinimumWalkingTimeSeconds: vi.fn(),
}))

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
  onRecommend = vi.fn(),
  recommendationError = null,
  recommendationStatus = 'idle',
}: {
  onRecommend?: () => void
  recommendationError?: string | null
  recommendationStatus?: CourseRecommendationStatus
} = {}) {
  const [options, setOptions] = useState({
    minimumWalkingTimeHours: null as number | null,
    waypointCount: null as number | null,
    travelTimeHours: null as number | null,
  })

  return (
    <MapRouteOptionsScreen
      destination={destination}
      minimumWalkingTimeHours={options.minimumWalkingTimeHours}
      onBack={vi.fn()}
      onOptionsChange={setOptions}
      onRecommend={onRecommend}
      origin={origin}
      recommendationError={recommendationError}
      recommendationStatus={recommendationStatus}
      travelTimeHours={options.travelTimeHours}
      waypointCount={options.waypointCount}
    />
  )
}

describe('MapRouteOptionsScreen', () => {
  beforeEach(() => {
    vi.mocked(getMinimumWalkingTimeSeconds).mockReset().mockResolvedValue(3900)
  })

  afterEach(() => cleanup())

  it('rounds the TMAP result up and limits waypoint/time choices', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(await screen.findByRole('button', { name: '2H' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1개' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: '1개' })).toHaveClass(
      'focus-visible:ring-2',
      'rounded-xl'
    )
    expect(screen.queryByRole('button', { name: '0개 · 직행' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '5개' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2H' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: '2H' })).toHaveClass(
      'focus-visible:ring-2',
      'rounded-xl'
    )
    expect(screen.getByRole('button', { name: '5H' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '6H' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2H' }).parentElement).toHaveClass(
      'grid-cols-4'
    )

    await user.click(screen.getByRole('button', { name: '4개' }))
    await user.click(screen.getByRole('button', { name: '5H' }))

    expect(screen.getByRole('button', { name: '4개' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: '5H' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: '추천 코스 받기' })).toBeEnabled()
    expect(screen.getByText(/현재 API는 출발 위치 주변 추천만 지원하며/)).toBeInTheDocument()
  })

  it('shows an error and retries the TMAP request', async () => {
    const user = userEvent.setup()
    vi.mocked(getMinimumWalkingTimeSeconds)
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce(3600)

    render(<Harness />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '최소 이동 시간을 확인하지 못했어요.'
    )
    await user.click(screen.getByRole('button', { name: '다시 시도' }))

    await waitFor(() => expect(getMinimumWalkingTimeSeconds).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('button', { name: '1H' })).toBeInTheDocument()
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
