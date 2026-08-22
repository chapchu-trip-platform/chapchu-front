import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomeRoute from '@/features/home/components/home-route'
import type { CurrentWeather } from '@/types/weather'

const weather: CurrentWeather = {
  observedAt: '2026-08-22T12:00:00+09:00',
  forecastAt: '2026-08-22T13:00:00+09:00',
  locationName: '대구광역시 수성구',
  latitude: 35.8552083333333,
  longitude: 128.632866666666,
  temperatureC: 27,
  conditionCode: 'CLEAR',
  conditionLabel: '맑음',
  humidityPercent: 58,
  windSpeedMps: 2.4,
  precipitationMm: 0,
  uvIndex: 5,
  walkAdvice: '오늘은 가볍게 걷기 좋은 날이에요.',
  source: '기상청',
}

function weatherResponse(data: unknown = weather) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('HomeRoute weather flow', () => {
  it('moves from loading to the current weather', async () => {
    let resolveRequest!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveRequest = resolve
        })
      )
    )

    render(<HomeRoute />)
    expect(screen.getByText('수성구 날씨를 불러오고 있어요.')).toBeInTheDocument()

    await act(async () => resolveRequest(weatherResponse()))
    expect(await screen.findByText('27°C')).toBeInTheDocument()
  })

  it('shows an isolated error when the internal API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 502 })))

    render(<HomeRoute />)
    expect(await screen.findByText('날씨를 잠시 불러오지 못했어요.')).toBeInTheDocument()
    expect(screen.getByText('주변 추천 장소')).toBeInTheDocument()
  })

  it('rejects an invalid response contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(weatherResponse({ ...weather, temperatureC: '27' }))
    )

    render(<HomeRoute />)
    expect(await screen.findByText('날씨를 잠시 불러오지 못했어요.')).toBeInTheDocument()
  })

  it('can retry successfully after a failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(weatherResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(<HomeRoute />)
    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }))

    expect(await screen.findByText('27°C')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('aborts the active request when Home unmounts', () => {
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>(() => undefined))
    vi.stubGlobal('fetch', fetchMock)

    const { unmount } = render(<HomeRoute />)
    const signal = fetchMock.mock.calls[0][1]?.signal as AbortSignal
    expect(signal.aborted).toBe(false)

    unmount()
    expect(signal.aborted).toBe(true)
  })
})
