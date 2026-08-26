import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HomeRoute from '@/features/home/components/home-route'
import { fetchHomeSummary, fetchPopularPosts } from '@/features/home/api/home-api'
import { webLocationProvider } from '@/features/location/providers/web-location-provider'
import { useLocationStore } from '@/features/location/stores/location-store'
import type { CurrentWeather } from '@/types/weather'

vi.mock('@/features/home/api/home-api', () => ({
  fetchHomeSummary: vi.fn(),
  fetchPopularPosts: vi.fn(),
}))

vi.mock('@/features/location/providers/web-location-provider', () => ({
  webLocationProvider: {
    checkPermission: vi.fn(),
    requestCurrentPosition: vi.fn(),
  },
}))

vi.mock('@/features/map/components/tmap-map', () => ({
  default: ({
    center,
    locationLabel,
  }: {
    center: { lat: number; lng: number }
    locationLabel: string
  }) => (
    <div
      data-testid="home-map"
      data-lat={center.lat}
      data-lng={center.lng}
      data-location-label={locationLabel}
    />
  ),
}))

const weather: CurrentWeather = {
  observedAt: '2026-08-22T12:00:00+09:00',
  forecastAt: '2026-08-22T13:00:00+09:00',
  locationName: '현재 위치 주변',
  temperatureC: 27,
  conditionCode: 'CLEAR',
  conditionLabel: '맑음',
  humidityPercent: 58,
  windSpeedMps: 2.4,
  precipitationMm: 0,
  uvIndex: null,
  walkAdvice: '오늘은 가병게 걷기 좋은 날이에요.',
  source: '기상청',
}

function weatherResponse(data: unknown = weather) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  useLocationStore.getState().reset()
  vi.mocked(fetchHomeSummary).mockReset().mockResolvedValue({
    nickname: '초롱',
    petNames: ['루이', '바다'],
  })
  vi.mocked(fetchPopularPosts).mockReset().mockResolvedValue([
    {
      id: 'post-1',
      title: '인기 여행기',
      content: '즐거운 여행',
      viewCount: 30,
      recommendationCount: 10,
      createdAt: null,
      hasPhoto: false,
    },
  ])
  vi.mocked(webLocationProvider.checkPermission).mockReset().mockResolvedValue('granted')
  vi.mocked(webLocationProvider.requestCurrentPosition).mockReset().mockResolvedValue({
    ok: true,
    position: {
      latitude: 35.8552083333333,
      longitude: 128.632866666666,
      accuracyMeters: 20,
      capturedAt: '2026-08-26T05:00:00.000Z',
      precision: 'precise',
      source: 'web',
    },
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('HomeRoute data and location flow', () => {
  it('loads Home, popular posts, a fresh position, and grid-scoped weather', async () => {
    const fetchMock = vi.fn().mockResolvedValue(weatherResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(<HomeRoute />)

    expect(await screen.findByText('루이와 1마리')).toBeInTheDocument()
    expect(await screen.findByText('인기 여행기')).toBeInTheDocument()
    expect(await screen.findByText('27°C')).toBeInTheDocument()
    expect(fetchHomeSummary).toHaveBeenCalledOnce()
    expect(fetchPopularPosts).toHaveBeenCalledOnce()
    expect(screen.getByTestId('home-map')).toHaveAttribute('data-lat', '35.8552083333333')
    expect(screen.getByTestId('home-map')).toHaveAttribute('data-lng', '128.632866666666')
    expect(screen.getByTestId('home-map')).toHaveAttribute(
      'data-location-label',
      '현재 위치 · 정확도 약 20m'
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/weather/current?nx=89&ny=90',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('falls back to the default weather location when device permission is denied', async () => {
    vi.mocked(webLocationProvider.checkPermission).mockResolvedValue('denied')
    const fetchMock = vi.fn().mockResolvedValue(
      weatherResponse({ ...weather, locationName: '대구광역시 수성구' })
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<HomeRoute />)

    expect(await screen.findByText('27°C')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/weather/current',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
    expect(webLocationProvider.requestCurrentPosition).not.toHaveBeenCalled()
  })

  it('requests the device position automatically when the browser permission can prompt', async () => {
    vi.mocked(webLocationProvider.checkPermission).mockResolvedValue('prompt')
    const fetchMock = vi.fn().mockResolvedValue(weatherResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(<HomeRoute />)

    await waitFor(() => expect(webLocationProvider.requestCurrentPosition).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/weather/current?nx=89&ny=90',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('can retry HOT posts without blocking the rest of Home', async () => {
    vi.mocked(fetchPopularPosts)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([
        {
          id: 'post-2',
          title: '다시 불러온 게시글',
          content: '내용',
          viewCount: 1,
          recommendationCount: 1,
          createdAt: null,
          hasPhoto: false,
        },
      ])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(weatherResponse()))

    render(<HomeRoute />)
    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }))

    expect(await screen.findByText('다시 불러온 게시글')).toBeInTheDocument()
    expect(fetchPopularPosts).toHaveBeenCalledTimes(2)
  })

  it('rejects an invalid weather response contract', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(weatherResponse({ ...weather, temperatureC: '27' }))
    )

    render(<HomeRoute />)
    expect(await screen.findByText('날씨를 잠시 불러오지 못했어요.')).toBeInTheDocument()
  })

  it('aborts the active weather request when Home unmounts', async () => {
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>(() => undefined))
    vi.stubGlobal('fetch', fetchMock)

    const { unmount } = render(<HomeRoute />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const signal = fetchMock.mock.calls[0][1]?.signal as AbortSignal
    expect(signal.aborted).toBe(false)

    act(() => unmount())
    expect(signal.aborted).toBe(true)
  })
})
