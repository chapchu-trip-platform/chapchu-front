export type LocationPermissionState =
  | 'granted'
  | 'prompt'
  | 'denied'
  | 'unknown'
  | 'unavailable'

export type LocationPrecision = 'approximate' | 'precise'
export type LocationSource = 'web' | 'native'

export type LocationFailureCode =
  | 'denied'
  | 'timeout'
  | 'unavailable'
  | 'unsupported'
  | 'invalid'
  | 'unknown'

export interface DevicePosition {
  latitude: number
  longitude: number
  accuracyMeters: number
  capturedAt: string
  precision: LocationPrecision
  source: LocationSource
}

export type LocationResult =
  | { ok: true; position: DevicePosition }
  | { ok: false; code: LocationFailureCode }

export interface LocationRequestOptions {
  enableHighAccuracy?: boolean
  timeoutMs?: number
  maximumAgeMs?: number
}

export interface LocationProvider {
  checkPermission(): Promise<LocationPermissionState>
  /** Call only for a user whose required Chapchu service-location consent is complete. */
  requestCurrentPosition(options?: LocationRequestOptions): Promise<LocationResult>
}
