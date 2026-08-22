'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import HomeScreen from '@/components/screens/home-screen'
import type { CurrentWeather, WeatherLoadStatus } from '@/types/weather'

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
    typeof weather.latitude === 'number' &&
    Number.isFinite(weather.latitude) &&
    typeof weather.longitude === 'number' &&
    Number.isFinite(weather.longitude) &&
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

async function requestCurrentWeather(signal?: AbortSignal) {
  const response = await fetch('/api/weather/current', { signal })
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
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [weatherStatus, setWeatherStatus] = useState<WeatherLoadStatus>('loading')
  const requestControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    requestControllerRef.current = controller
    void requestCurrentWeather(controller.signal)
      .then((data) => {
        if (requestControllerRef.current !== controller) return
        setWeather(data)
        setWeatherStatus('success')
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || requestControllerRef.current !== controller) return
        setWeather(null)
        setWeatherStatus('error')
      })
    return () => {
      requestControllerRef.current?.abort()
      requestControllerRef.current = null
    }
  }, [])

  const retryWeather = () => {
    requestControllerRef.current?.abort()
    const controller = new AbortController()
    requestControllerRef.current = controller
    setWeatherStatus('loading')
    void requestCurrentWeather(controller.signal)
      .then((data) => {
        if (requestControllerRef.current !== controller) return
        setWeather(data)
        setWeatherStatus('success')
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || requestControllerRef.current !== controller) return
        setWeather(null)
        setWeatherStatus('error')
      })
  }

  return (
    <HomeScreen
      onStartTrip={() => router.push('/map')}
      onViewPost={(postId) => router.push(`/community?post=${postId}`)}
      weather={weather}
      weatherStatus={weatherStatus}
      onRetryWeather={retryWeather}
    />
  )
}
