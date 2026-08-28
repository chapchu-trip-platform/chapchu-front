'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import HomeScreen from '@/components/screens/home-screen'
import { fetchHomeSummary, fetchPopularPosts } from '@/features/home/api/home-api'
import { convertLatLngToKmaGrid } from '@/features/home/lib/kma-grid'
import type { HomeDataStatus, HomeSummary, HotPost } from '@/features/home/types/home'
import { useLocationStore } from '@/features/location/stores/location-store'
import type { CurrentWeather, WeatherLoadStatus } from '@/types/weather'

const DEFAULT_HOME_LOCATION = {
  center: { lat: 35.8552083333333, lng: 128.632866666666 },
  label: '대구 수성구 기준 · 위치 확인 전',
} as const

const WEATHER_CONDITION_CODES = new Set([
  'CLEAR',
  'MOSTLY_CLOUDY',
  'CLOUDY',
  'RAIN',
  'RAIN_SNOW',
  'SNOW',
  'SHOWER',
  'DRIZZLE',
  'RAIN_SNOW_FLURRY',
  'SNOW_FLURRY',
  'UNKNOWN',
])

function isNullableFiniteNumber(value: unknown) {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isCurrentWeather(value: unknown): value is CurrentWeather {
  if (!value || typeof value !== 'object') return false
  const weather = value as Partial<CurrentWeather>
  return (
    typeof weather.observedAt === 'string' &&
    (weather.forecastAt === null || typeof weather.forecastAt === 'string') &&
    typeof weather.locationName === 'string' &&
    isNullableFiniteNumber(weather.temperatureC) &&
    typeof weather.conditionCode === 'string' &&
    WEATHER_CONDITION_CODES.has(weather.conditionCode) &&
    typeof weather.conditionLabel === 'string' &&
    isNullableFiniteNumber(weather.humidityPercent) &&
    isNullableFiniteNumber(weather.windSpeedMps) &&
    isNullableFiniteNumber(weather.precipitationMm) &&
    isNullableFiniteNumber(weather.uvIndex) &&
    typeof weather.walkAdvice === 'string' &&
    weather.source === '기상청'
  )
}

async function requestCurrentWeather(
  grid: { nx: number; ny: number } | null,
  signal?: AbortSignal
) {
  const query = new URLSearchParams()
  if (grid) {
    query.set('nx', String(grid.nx))
    query.set('ny', String(grid.ny))
  }
  const endpoint = query.size > 0 ? `/api/weather/current?${query}` : '/api/weather/current'
  const response = await fetch(endpoint, { signal })
  if (!response.ok) throw new Error('Weather request failed.')

  const data: unknown = await response.json()
  if (!isCurrentWeather(data)) throw new Error('Weather response was invalid.')
  return data
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export default function HomeRoute() {
  const router = useRouter()
  const locationPosition = useLocationStore((state) => state.position)
  const weatherPosition = useLocationStore((state) => state.weatherPosition)
  const locationStatus = useLocationStore((state) => state.status)
  const locationError = useLocationStore((state) => state.error)
  const refreshLocation = useLocationStore((state) => state.refreshLocation)
  const cancelLocationRequest = useLocationStore((state) => state.cancelLocationRequest)
  const [summary, setSummary] = useState<HomeSummary | null>(null)
  const [summaryStatus, setSummaryStatus] = useState<HomeDataStatus>('loading')
  const [hotPosts, setHotPosts] = useState<HotPost[]>([])
  const [hotPostsStatus, setHotPostsStatus] = useState<HomeDataStatus>('loading')
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [weatherStatus, setWeatherStatus] = useState<WeatherLoadStatus>('loading')
  const weatherControllerRef = useRef<AbortController | null>(null)
  const postsControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const summaryController = new AbortController()
    const postsController = new AbortController()

    void fetchHomeSummary(summaryController.signal)
      .then((data) => {
        if (summaryController.signal.aborted) return
        setSummary(data)
        setSummaryStatus('success')
      })
      .catch(() => {
        if (summaryController.signal.aborted) return
        setSummary(null)
        setSummaryStatus('error')
      })

    postsControllerRef.current = postsController
    void fetchPopularPosts(postsController.signal)
      .then((posts) => {
        if (postsController.signal.aborted) return
        setHotPosts(posts)
        setHotPostsStatus('success')
      })
      .catch(() => {
        if (postsController.signal.aborted) return
        setHotPosts([])
        setHotPostsStatus('error')
      })

    return () => {
      summaryController.abort()
      postsControllerRef.current?.abort()
      postsControllerRef.current = null
    }
  }, [])

  useEffect(() => {
    void refreshLocation()

    return () => {
      cancelLocationRequest()
      weatherControllerRef.current?.abort()
      weatherControllerRef.current = null
    }
  }, [cancelLocationRequest, refreshLocation])

  const weatherGrid = useMemo(
    () =>
      weatherPosition
        ? convertLatLngToKmaGrid(weatherPosition.latitude, weatherPosition.longitude)
        : null,
    [weatherPosition]
  )
  const weatherNx = weatherGrid?.nx ?? null
  const weatherNy = weatherGrid?.ny ?? null
  const weatherRequestKey =
    weatherNx !== null && weatherNy !== null
      ? `${weatherNx}:${weatherNy}`
      : locationStatus === 'error'
        ? 'default'
        : null

  useEffect(() => {
    if (weatherRequestKey === null) return

    const latestLocationState = useLocationStore.getState()
    if (weatherRequestKey === 'default') {
      if (latestLocationState.status !== 'error') return
    } else {
      const latestPosition = latestLocationState.weatherPosition
      if (!latestPosition) return
      const latestGrid = convertLatLngToKmaGrid(
        latestPosition.latitude,
        latestPosition.longitude
      )
      if (`${latestGrid.nx}:${latestGrid.ny}` !== weatherRequestKey) return
    }

    weatherControllerRef.current?.abort()
    const controller = new AbortController()
    weatherControllerRef.current = controller

    const grid =
      weatherNx !== null && weatherNy !== null ? { nx: weatherNx, ny: weatherNy } : null

    void requestCurrentWeather(grid, controller.signal)
      .then((data) => {
        if (weatherControllerRef.current !== controller) return
        setWeather(data)
        setWeatherStatus('success')
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || weatherControllerRef.current !== controller) return
        setWeather(null)
        setWeatherStatus('error')
      })

    return () => controller.abort()
  }, [weatherNx, weatherNy, weatherRequestKey])

  const retryWeather = () => {
    weatherControllerRef.current?.abort()
    const controller = new AbortController()
    weatherControllerRef.current = controller
    setWeatherStatus('loading')
    const latestWeatherPosition = useLocationStore.getState().weatherPosition
    const latestWeatherGrid = latestWeatherPosition
      ? convertLatLngToKmaGrid(
          latestWeatherPosition.latitude,
          latestWeatherPosition.longitude
        )
      : null
    void requestCurrentWeather(latestWeatherGrid, controller.signal)
      .then((data) => {
        if (weatherControllerRef.current !== controller) return
        setWeather(data)
        setWeatherStatus('success')
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || weatherControllerRef.current !== controller) return
        setWeather(null)
        setWeatherStatus('error')
      })
  }

  const retryHotPosts = () => {
    postsControllerRef.current?.abort()
    const controller = new AbortController()
    postsControllerRef.current = controller
    setHotPostsStatus('loading')
    void fetchPopularPosts(controller.signal)
      .then((posts) => {
        if (postsControllerRef.current !== controller) return
        setHotPosts(posts)
        setHotPostsStatus('success')
      })
      .catch(() => {
        if (postsControllerRef.current !== controller) return
        setHotPosts([])
        setHotPostsStatus('error')
      })
  }

  const mapCenter = locationPosition
    ? { lat: locationPosition.latitude, lng: locationPosition.longitude }
    : DEFAULT_HOME_LOCATION.center
  const mapLocationLabel =
    locationStatus === 'success' && locationPosition
      ? `현재 위치 · 정확도 약 ${Math.max(1, Math.round(locationPosition.accuracyMeters))}m`
      : locationStatus === 'requesting'
        ? '더 정확한 위치 확인 중'
        : locationError === 'low_accuracy'
          ? '대구 수성구 기준 · 위치 정확도 부족'
          : DEFAULT_HOME_LOCATION.label

  return (
    <HomeScreen
      onStartTrip={() => router.push('/map')}
      onViewAllPosts={() => router.push('/community')}
      mapCenter={mapCenter}
      mapLocationLabel={mapLocationLabel}
      locationStatus={locationStatus}
      petNames={summary?.petNames ?? []}
      petNamesStatus={summaryStatus}
      hotPosts={hotPosts}
      hotPostsStatus={hotPostsStatus}
      onRetryHotPosts={retryHotPosts}
      weather={weather}
      weatherStatus={weatherStatus}
      onRetryWeather={retryWeather}
    />
  )
}
