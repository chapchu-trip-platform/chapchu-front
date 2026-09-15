'use client'

import { convertLatLngToKmaGrid } from '@/features/home/lib/kma-grid'
import type { SearchableLocation } from '@/features/location/types/location'
import type { CourseWeatherInput } from '@/features/map/types/course-api'

interface CourseWeatherResponse {
  temperatureC: number | null
  humidityPercent: number | null
  conditionLabel: string
}

function isNullableFiniteNumber(value: unknown) {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isCourseWeatherResponse(value: unknown): value is CourseWeatherResponse {
  if (!value || typeof value !== 'object') return false
  const weather = value as Partial<CourseWeatherResponse>
  return (
    isNullableFiniteNumber(weather.temperatureC) &&
    isNullableFiniteNumber(weather.humidityPercent) &&
    typeof weather.conditionLabel === 'string'
  )
}

export async function fetchCourseWeather(
  origin: SearchableLocation,
  signal?: AbortSignal
): Promise<CourseWeatherInput> {
  const grid = convertLatLngToKmaGrid(origin.latitude, origin.longitude)
  const query = new URLSearchParams({
    nx: String(grid.nx),
    ny: String(grid.ny),
  })
  const response = await fetch(`/api/weather/current?${query}`, { signal })
  const data: unknown = await response.json()

  if (!response.ok || !isCourseWeatherResponse(data)) {
    throw new Error('Course weather response was invalid.')
  }

  return {
    ...(data.temperatureC !== null ? { temperature: data.temperatureC } : {}),
    ...(data.humidityPercent !== null ? { humidity: data.humidityPercent } : {}),
    ...(data.conditionLabel.trim()
      ? { weatherStatus: data.conditionLabel.trim() }
      : {}),
  }
}
