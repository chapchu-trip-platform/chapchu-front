'use client'

import type { SearchableLocation } from '@/features/location/types/location'

interface SearchLocationsOptions {
  signal?: AbortSignal
}

const MAX_RESULTS = 10
const LOCATION_SEARCH_ENDPOINT = '/api/tmap/pois'

interface LocationSearchResponse {
  items: SearchableLocation[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isSearchableLocation(value: unknown): value is SearchableLocation {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    typeof value.address === 'string' &&
    typeof value.latitude === 'number' &&
    Number.isFinite(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180
  )
}

function isLocationSearchResponse(value: unknown): value is LocationSearchResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isSearchableLocation)
  )
}

export async function searchLocations(
  query: string,
  { signal }: SearchLocationsOptions = {}
): Promise<SearchableLocation[]> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 2) return []

  const response = await fetch(LOCATION_SEARCH_ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: normalizedQuery, limit: MAX_RESULTS }),
  })

  const data: unknown = await response.json()
  if (!response.ok || !isLocationSearchResponse(data)) {
    throw new Error('Location search request failed.')
  }

  return data.items
}
