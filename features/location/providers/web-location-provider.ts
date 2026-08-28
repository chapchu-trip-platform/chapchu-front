import { normalizeWebPosition } from '@/features/location/lib/location-payload'
import {
  LOCATION_MAX_USABLE_ACCURACY_METERS,
  LOCATION_QUALITY_SAMPLING_WINDOW_MS,
  LOCATION_TARGET_ACCURACY_METERS,
} from '@/features/location/config/location-quality'
import type {
  DevicePosition,
  LocationFailureCode,
  LocationPermissionState,
  LocationProvider,
  LocationRequestOptions,
  LocationResult,
} from '@/features/location/types/location'

const DEFAULT_LOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeoutMs: LOCATION_QUALITY_SAMPLING_WINDOW_MS,
  maximumAgeMs: 0,
} as const

function isWebLocationAvailable() {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    window.isSecureContext === true &&
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

function toQualityResult(position: DevicePosition | null): LocationResult {
  if (!position) return { ok: false, code: 'invalid' } as const
  if (position.accuracyMeters > LOCATION_MAX_USABLE_ACCURACY_METERS) {
    return { ok: false, code: 'low_accuracy' } as const
  }
  return { ok: true, position } as const
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
    if (options.signal?.aborted) {
      return { ok: false, code: 'cancelled' }
    }

    if (!isWebLocationAvailable()) {
      return { ok: false, code: 'unsupported' }
    }

    const resolvedOptions = {
      enableHighAccuracy:
        options.enableHighAccuracy ?? DEFAULT_LOCATION_OPTIONS.enableHighAccuracy,
      timeout: options.timeoutMs ?? DEFAULT_LOCATION_OPTIONS.timeoutMs,
      maximumAge: options.maximumAgeMs ?? DEFAULT_LOCATION_OPTIONS.maximumAgeMs,
    }

    const geolocation = navigator.geolocation
    if (!geolocation.watchPosition || !geolocation.clearWatch) {
      return new Promise<LocationResult>((resolve) => {
        let settled = false
        const finish = (result: LocationResult) => {
          if (settled) return
          settled = true
          options.signal?.removeEventListener('abort', handleAbort)
          resolve(result)
        }
        function handleAbort() {
          finish({ ok: false, code: 'cancelled' })
        }

        options.signal?.addEventListener('abort', handleAbort, { once: true })
        if (options.signal?.aborted) {
          handleAbort()
          return
        }

        try {
          geolocation.getCurrentPosition(
            (position) => finish(toQualityResult(normalizeWebPosition(position))),
            (error) => finish({ ok: false, code: mapGeolocationError(error) }),
            resolvedOptions
          )
        } catch {
          finish({ ok: false, code: 'unknown' })
        }
      })
    }

    return new Promise<LocationResult>((resolve) => {
      let bestPosition: DevicePosition | null = null
      let watchId: number | null = null
      let shouldClearWatchWhenReady = false
      let settled = false
      let samplingTimer: ReturnType<typeof setTimeout> | null = null
      let lastErrorCode: LocationFailureCode = 'timeout'

      const stopWatch = () => {
        if (watchId === null) {
          shouldClearWatchWhenReady = true
          return
        }
        geolocation.clearWatch(watchId)
      }

      const finish = (result: LocationResult) => {
        if (settled) return
        settled = true
        if (samplingTimer !== null) clearTimeout(samplingTimer)
        options.signal?.removeEventListener('abort', handleAbort)
        stopWatch()
        resolve(result)
      }

      function handleAbort() {
        finish({ ok: false, code: 'cancelled' })
      }

      const finishWithBest = (fallbackCode: LocationFailureCode) => {
        if (bestPosition) {
          finish(toQualityResult(bestPosition))
          return
        }
        finish({ ok: false, code: fallbackCode })
      }

      samplingTimer = setTimeout(
        () => finishWithBest(lastErrorCode),
        resolvedOptions.timeout
      )

      options.signal?.addEventListener('abort', handleAbort, { once: true })
      if (options.signal?.aborted) {
        handleAbort()
        return
      }

      try {
        watchId = geolocation.watchPosition(
          (position) => {
            const normalizedPosition = normalizeWebPosition(position)
            if (!normalizedPosition) return

            if (!bestPosition || normalizedPosition.accuracyMeters < bestPosition.accuracyMeters) {
              bestPosition = normalizedPosition
            }
            if (normalizedPosition.accuracyMeters <= LOCATION_TARGET_ACCURACY_METERS) {
              finish({ ok: true, position: normalizedPosition })
            }
          },
          (error) => {
            const code = mapGeolocationError(error)
            if (code === 'denied') {
              finish({ ok: false, code })
              return
            }
            // GPS/네트워크 기반 측위는 일시적으로 실패할 수 있으므로 품질 수집
            // 창이 끝날 때까지 더 나은 좌표를 기다린다.
            lastErrorCode = code
          },
          resolvedOptions
        )
        if (shouldClearWatchWhenReady) geolocation.clearWatch(watchId)
      } catch {
        finish({ ok: false, code: 'unknown' })
      }
    })
  },
}
