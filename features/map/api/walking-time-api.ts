import type { SearchableLocation } from '@/features/location/types/location'

interface WalkingTimeResponse {
  totalTimeSeconds: number
}

function isWalkingTimeResponse(value: unknown): value is WalkingTimeResponse {
  if (!value || typeof value !== 'object') return false
  const response = value as Partial<WalkingTimeResponse>
  return (
    typeof response.totalTimeSeconds === 'number' &&
    Number.isFinite(response.totalTimeSeconds) &&
    response.totalTimeSeconds >= 0
  )
}

export async function getMinimumWalkingTimeSeconds(
  origin: SearchableLocation,
  destination: SearchableLocation,
  signal?: AbortSignal
) {
  const response = await fetch('/api/tmap/routes/pedestrian', {
    method: 'POST',
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      origin: {
        name: origin.name,
        latitude: origin.latitude,
        longitude: origin.longitude,
      },
      destination: {
        name: destination.name,
        latitude: destination.latitude,
        longitude: destination.longitude,
      },
    }),
  })

  const data: unknown = await response.json()
  if (!response.ok || !isWalkingTimeResponse(data)) {
    throw new Error('Minimum walking time request failed.')
  }

  return data.totalTimeSeconds
}
