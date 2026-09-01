import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HomeRoute from '@/features/home/components/home-route'
import { fetchHomeSummary, fetchPopularPosts } from '@/features/home/api/home-api'
import { webLocationProvider } from '@/features/location/providers/web-location-provider'
import { useLocationStore } from '@/features/location/stores/location-store'
import type {
  DevicePosition,
  LocationRequestOptions,
  LocationResult,
} from '@/features/location/types/location'
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
      nickname: '멍멍이아빠',
      title: '인기 여행기',
      content: '즐거운 여행',
      viewCount: 30,
      recommendationCount: 10,
      commentCount: 3,
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

  it('loads weather from the first coarse grid before the final map position resolves', async () => {
    let locationOptions!: LocationRequestOptions
    let resolveLocation!: (result: LocationResult) => void
    const coarsePosition: DevicePosition = {
      latitude: 35.8552083333333,
      longitude: 128.632866666666,
      accuracyMeters: 4_000,
      capturedAt: '2026-08-26T05:00:00.000Z',
      precision: 'approximate',
      source: 'web',
    }
    vi.mocked(webLocationProvider.requestCurrentPosition).mockImplementation((options) => {
      locationOptions = options ?? {}
      return new Promise<LocationResult>((resolve) => {
        resolveLocation = resolve
      })
    })
    const fetchMock = vi.fn().mockResolvedValue(weatherResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(<HomeRoute />)
    await waitFor(() => expect(webLocationProvider.requestCurrentPosition).toHaveBeenCalledOnce())
    act(() => locationOptions.onSample?.(coarsePosition))

    expect(await screen.findByText('27°C')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/weather/current?nx=89&ny=90',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
    expect(screen.getByTestId('home-map')).toHaveAttribute(
      'data-location-label',
      '더 정확한 위치 확인 중'
    )

    act(() => {
      resolveLocation({
        ok: true,
        position: { ...coarsePosition, accuracyMeters: 70, precision: 'precise' },
      })
    })
    await waitFor(() =>
      expect(screen.getByTestId('home-map')).toHaveAttribute(
        'data-location-label',
        '현재 위치 · 정확도 약 70m'
      )
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refreshes weather once for a changed final grid and ignores the older response', async () => {
    let locationOptions!: LocationRequestOptions
    let resolveLocation!: (result: LocationResult) => void
    let resolveFirstWeather!: (response: Response) => void
    const coarsePosition: DevicePosition = {
      latitude: 35.8552083333333,
      longitude: 128.632866666666,
      accuracyMeters: 4_000,
      capturedAt: '2026-08-26T05:00:00.000Z',
      precision: 'approximate',
      source: 'web',
    }
    vi.mocked(webLocationProvider.requestCurrentPosition).mockImplementation((options) => {
      locationOptions = options ?? {}
      return new Promise<LocationResult>((resolve) => {
        resolveLocation = resolve
      })
    })
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveFirstWeather = resolve
        })
      )
      .mockResolvedValueOnce(weatherResponse({ ...weather, temperatureC: 18 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<HomeRoute />)
    await waitFor(() => expect(webLocationProvider.requestCurrentPosition).toHaveBeenCalledOnce())
    act(() => locationOptions.onSample?.(coarsePosition))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    act(() => {
      resolveLocation({
        ok: true,
        position: {
          ...coarsePosition,
          latitude: 37.5665,
          longitude: 126.978,
          accuracyMeters: 70,
          precision: 'precise',
        },
      })
    })

    expect(await screen.findByText('18°C')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/weather/current?nx=89&ny=90',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/weather/current?nx=60&ny=127',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )

    act(() => resolveFirstWeather(weatherResponse()))
    await waitFor(() => expect(screen.getByText('18°C')).toBeInTheDocument())
    expect(screen.queryByText('27°C')).not.toBeInTheDocument()
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

  it('rejects a low-quality position and explains the fallback map location', async () => {
    vi.mocked(webLocationProvider.requestCurrentPosition).mockResolvedValue({
      ok: false,
      code: 'low_accuracy',
    })
    const fetchMock = vi.fn().mockResolvedValue(
      weatherResponse({ ...weather, locationName: '대구광역시 수성구' })
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<HomeRoute />)

    expect(await screen.findByText('27°C')).toBeInTheDocument()
    expect(screen.getByTestId('home-map')).toHaveAttribute(
      'data-location-label',
      '대구 수성구 기준 · 위치 정확도 부족'
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/weather/current',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('does not request weather with a stale position when a fresh attempt has no sample', async () => {
    useLocationStore.setState({
      position: {
        latitude: 37.5665,
        longitude: 126.978,
        accuracyMeters: 50,
        capturedAt: '2026-08-26T04:00:00.000Z',
        precision: 'precise',
        source: 'web',
      },
      weatherPosition: {
        latitude: 37.5665,
        longitude: 126.978,
        accuracyMeters: 50,
        capturedAt: '2026-08-26T04:00:00.000Z',
        precision: 'precise',
        source: 'web',
      },
      status: 'success',
    })
    vi.mocked(webLocationProvider.requestCurrentPosition).mockResolvedValue({
      ok: false,
      code: 'low_accuracy',
    })
    const fetchMock = vi.fn().mockResolvedValue(weatherResponse())
    vi.stubGlobal('fetch', fetchMock)

    render(<HomeRoute />)

    expect(await screen.findByText('27°C')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/weather/current',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('can retry HOT posts without blocking the rest of Home', async () => {
    vi.mocked(fetchPopularPosts)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([
        {
          id: 'post-2',
          nickname: '재시도작성자',
          title: '다시 불러온 게시글',
          content: '내용',
          viewCount: 1,
          recommendationCount: 1,
          commentCount: 2,
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
