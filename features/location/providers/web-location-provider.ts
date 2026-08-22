import { normalizeWebPosition } from '@/features/location/lib/location-payload'
import type {
  LocationFailureCode,
  LocationPermissionState,
  LocationProvider,
  LocationRequestOptions,
} from '@/features/location/types/location'

const DEFAULT_LOCATION_OPTIONS = {
  enableHighAccuracy: false,
  timeoutMs: 10_000,
  maximumAgeMs: 5 * 60 * 1000,
} as const

function isWebLocationAvailable() {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    window.isSecureContext !== false &&
    'geolocation' in navigator
  )
}

function mapPermissionState(value: PermissionState): LocationPermissionState {
  if (value === 'granted' || value === 'prompt' || value === 'denied') return value
  return 'unknown'
}

function mapGeolocationError(error: GeolocationPositionError): LocationFailureCode {
  if (error.code === 1) return 'denied'
  if (error.code === 2) return 'unavailable'
  if (error.code === 3) return 'timeout'
  return 'unknown'
}

export const webLocationProvider: LocationProvider = {
  async checkPermission() {
    if (!isWebLocationAvailable()) return 'unavailable'
    if (!navigator.permissions?.query) return 'unknown'

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' })
      return mapPermissionState(permission.state)
    } catch {
      return 'unknown'
    }
  },

  async requestCurrentPosition(options: LocationRequestOptions = {}) {
    if (!isWebLocationAvailable()) {
      return { ok: false, code: 'unsupported' }
    }

    const resolvedOptions = {
      enableHighAccuracy:
        options.enableHighAccuracy ?? DEFAULT_LOCATION_OPTIONS.enableHighAccuracy,
      timeout: options.timeoutMs ?? DEFAULT_LOCATION_OPTIONS.timeoutMs,
      maximumAge: options.maximumAgeMs ?? DEFAULT_LOCATION_OPTIONS.maximumAgeMs,
    }

    return new Promise((resolve) => {
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const normalizedPosition = normalizeWebPosition(position)
            resolve(
              normalizedPosition
                ? { ok: true, position: normalizedPosition }
                : { ok: false, code: 'invalid' }
            )
          },
          (error) => resolve({ ok: false, code: mapGeolocationError(error) }),
          resolvedOptions
        )
      } catch {
        resolve({ ok: false, code: 'unknown' })
      }
    })
  },
}
