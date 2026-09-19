import type { SearchableLocation } from '@/features/location/types/location'

export interface PedestrianRoutePoint {
  name: string
  latitude: number
  longitude: number
}

export interface PedestrianRouteCoordinate {
  lat: number
  lng: number
}

export interface PedestrianRoute {
  totalTimeSeconds: number
  totalDistanceMeters: number
  path: PedestrianRouteCoordinate[]
}

export function formatWalkingTime(totalTimeSeconds: number) {
  const totalMinutes = Math.max(1, Math.ceil(totalTimeSeconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `약 ${totalMinutes}분`
  if (minutes === 0) return `약 ${hours}시간`
  return `약 ${hours}시간 ${minutes}분`
}

function isRouteCoordinate(value: unknown): value is PedestrianRouteCoordinate {
  if (!value || typeof value !== 'object') return false
  const coordinate = value as Partial<PedestrianRouteCoordinate>
  return (
    typeof coordinate.lat === 'number' &&
    Number.isFinite(coordinate.lat) &&
    coordinate.lat >= -90 &&
    coordinate.lat <= 90 &&
    typeof coordinate.lng === 'number' &&
    Number.isFinite(coordinate.lng) &&
    coordinate.lng >= -180 &&
    coordinate.lng <= 180
  )
}

function isPedestrianRoute(value: unknown): value is PedestrianRoute {
  if (!value || typeof value !== 'object') return false
  const response = value as Partial<PedestrianRoute>
  return (
    typeof response.totalTimeSeconds === 'number' &&
    Number.isFinite(response.totalTimeSeconds) &&
    response.totalTimeSeconds >= 0 &&
    typeof response.totalDistanceMeters === 'number' &&
    Number.isFinite(response.totalDistanceMeters) &&
    response.totalDistanceMeters >= 0 &&
    Array.isArray(response.path) &&
    response.path.length <= 50_000 &&
    response.path.every(isRouteCoordinate)
  )
}

export async function getPedestrianRoute(
  origin: PedestrianRoutePoint,
  destination: PedestrianRoutePoint,
  waypoints: PedestrianRoutePoint[] = [],
  signal?: AbortSignal
): Promise<PedestrianRoute> {
  const toRequestPoint = (point: PedestrianRoutePoint) => ({
    name: point.name,
    latitude: point.latitude,
    longitude: point.longitude,
  })
  const response = await fetch('/api/tmap/routes/pedestrian', {
    method: 'POST',
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      origin: toRequestPoint(origin),
      destination: toRequestPoint(destination),
      waypoints: waypoints.map(toRequestPoint),
    }),
  })

  const data: unknown = await response.json()
  if (!response.ok || !isPedestrianRoute(data)) {
    throw new Error('Pedestrian route request failed.')
  }

  return data
}

export async function getMinimumWalkingTimeSeconds(
  origin: SearchableLocation,
  destination: SearchableLocation,
  signal?: AbortSignal
) {
  const route = await getPedestrianRoute(origin, destination, [], signal)
  return route.totalTimeSeconds
}
