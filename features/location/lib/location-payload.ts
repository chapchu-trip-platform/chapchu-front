import type { DevicePosition, LocationPrecision } from '@/features/location/types/location'
import { LOCATION_TARGET_ACCURACY_METERS } from '@/features/location/config/location-quality'

export const HOME_LOCATION_COORDINATE_DECIMALS = 3
export const PRECISE_LOCATION_ACCURACY_THRESHOLD_METERS = LOCATION_TARGET_ACCURACY_METERS

const HOME_LOCATION_PURPOSES = ['MAP_CENTER', 'WEATHER', 'NEARBY_PLACES'] as const

export interface HomeLocationContextCandidate {
  position: {
    latitude: number
    longitude: number
    accuracyMeters: number
    capturedAt: string
    precision: LocationPrecision
  }
  purposes: typeof HOME_LOCATION_PURPOSES
}

function isFiniteCoordinate(value: number, minimum: number, maximum: number) {
  return Number.isFinite(value) && value >= minimum && value <= maximum
}

export function normalizeWebPosition(position: GeolocationPosition): DevicePosition | null {
  const { accuracy, latitude, longitude } = position.coords

  if (
    !isFiniteCoordinate(latitude, -90, 90) ||
    !isFiniteCoordinate(longitude, -180, 180) ||
    !Number.isFinite(accuracy) ||
    accuracy < 0 ||
    !Number.isFinite(position.timestamp)
  ) {
    return null
  }

  const capturedDate = new Date(position.timestamp)
  if (!Number.isFinite(capturedDate.getTime())) return null
  const capturedAt = capturedDate.toISOString()

  return {
    latitude,
    longitude,
    accuracyMeters: accuracy,
    capturedAt,
    precision:
      accuracy <= PRECISE_LOCATION_ACCURACY_THRESHOLD_METERS ? 'precise' : 'approximate',
    source: 'web',
  }
}

function roundCoordinate(value: number) {
  const scale = 10 ** HOME_LOCATION_COORDINATE_DECIMALS
  return Math.round(value * scale) / scale
}

function isValidDevicePosition(position: DevicePosition) {
  return (
    isFiniteCoordinate(position.latitude, -90, 90) &&
    isFiniteCoordinate(position.longitude, -180, 180) &&
    Number.isFinite(position.accuracyMeters) &&
    position.accuracyMeters >= 0 &&
    ['approximate', 'precise'].includes(position.precision) &&
    ['web', 'native'].includes(position.source) &&
    Number.isFinite(Date.parse(position.capturedAt))
  )
}

export function createHomeLocationContextCandidate(
  position: DevicePosition
): HomeLocationContextCandidate | null {
  if (!isValidDevicePosition(position)) return null

  return {
    position: {
      latitude: roundCoordinate(position.latitude),
      longitude: roundCoordinate(position.longitude),
      accuracyMeters: Math.round(position.accuracyMeters),
      capturedAt: position.capturedAt,
      precision: position.precision,
    },
    purposes: HOME_LOCATION_PURPOSES,
  }
}
