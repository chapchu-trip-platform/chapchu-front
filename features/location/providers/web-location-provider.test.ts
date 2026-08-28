import { afterEach, describe, expect, it, vi } from 'vitest'
import { webLocationProvider } from '@/features/location/providers/web-location-provider'

const originalSecureContextDescriptor = Object.getOwnPropertyDescriptor(
  window,
  'isSecureContext'
)

function stubNavigator({
  permission = 'granted',
  getCurrentPosition = vi.fn(),
  watchPosition,
  clearWatch,
}: {
  permission?: PermissionState
  getCurrentPosition?: Geolocation['getCurrentPosition']
  watchPosition?: Geolocation['watchPosition']
  clearWatch?: Geolocation['clearWatch']
} = {}) {
  vi.stubGlobal('navigator', {
    geolocation: { getCurrentPosition, watchPosition, clearWatch },
    permissions: {
      query: vi.fn().mockResolvedValue({ state: permission }),
    },
  })
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: true,
  })
  return { clearWatch, getCurrentPosition, watchPosition }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()

  if (originalSecureContextDescriptor) {
    Object.defineProperty(window, 'isSecureContext', originalSecureContextDescriptor)
  } else {
    Reflect.deleteProperty(window, 'isSecureContext')
  }
})

describe('webLocationProvider', () => {
  it('reads the current browser permission without requesting a position', async () => {
    const { getCurrentPosition } = stubNavigator({ permission: 'prompt' })

    await expect(webLocationProvider.checkPermission()).resolves.toBe('prompt')
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it('falls back to one high-accuracy position when watch mode is unavailable', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          accuracy: 280,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 35.8584,
          longitude: 128.6304,
          speed: null,
        },
        timestamp: Date.parse('2026-08-22T07:00:00Z'),
      } as GeolocationPosition)
    })
    stubNavigator({ getCurrentPosition })

    await expect(webLocationProvider.requestCurrentPosition()).resolves.toEqual({
      ok: true,
      position: {
        latitude: 35.8584,
        longitude: 128.6304,
        accuracyMeters: 280,
        capturedAt: '2026-08-22T07:00:00.000Z',
        precision: 'approximate',
        source: 'web',
      },
    })
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 12_000,
      }
    )
  })

  it('keeps sampling until a position reaches the target accuracy', async () => {
    let reportPosition!: PositionCallback
    const onSample = vi.fn()
    const clearWatch = vi.fn()
    const watchPosition = vi.fn((success: PositionCallback) => {
      reportPosition = success
      return 17
    })
    stubNavigator({ clearWatch, watchPosition })

    const resultPromise = webLocationProvider.requestCurrentPosition({ onSample })
    reportPosition({
      coords: {
        accuracy: 5_000,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude: 35.8,
        longitude: 128.6,
        speed: null,
      },
      timestamp: Date.parse('2026-08-22T07:00:00Z'),
    } as GeolocationPosition)
    reportPosition({
      coords: {
        accuracy: 72,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude: 35.8584,
        longitude: 128.6304,
        speed: null,
      },
      timestamp: Date.parse('2026-08-22T07:00:04Z'),
    } as GeolocationPosition)

    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      position: {
        latitude: 35.8584,
        longitude: 128.6304,
        accuracyMeters: 72,
        precision: 'precise',
      },
    })
    expect(onSample).toHaveBeenCalledTimes(2)
    expect(onSample.mock.calls.map(([sample]) => sample.accuracyMeters)).toEqual([5_000, 72])
    expect(clearWatch).toHaveBeenCalledWith(17)
  })

  it('rejects a best sample that remains less accurate than one kilometer', async () => {
    vi.useFakeTimers()
    let reportPosition!: PositionCallback
    const clearWatch = vi.fn()
    stubNavigator({
      clearWatch,
      watchPosition: vi.fn((success: PositionCallback) => {
        reportPosition = success
        return 21
      }),
    })

    const resultPromise = webLocationProvider.requestCurrentPosition({ timeoutMs: 1_000 })
    reportPosition({
      coords: {
        accuracy: 5_000,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude: 35.8,
        longitude: 128.6,
        speed: null,
      },
      timestamp: Date.parse('2026-08-22T07:00:00Z'),
    } as GeolocationPosition)
    await vi.advanceTimersByTimeAsync(1_000)

    await expect(resultPromise).resolves.toEqual({ ok: false, code: 'low_accuracy' })
    expect(clearWatch).toHaveBeenCalledWith(21)
  })

  it('returns the best usable sample when the quality window ends', async () => {
    vi.useFakeTimers()
    let reportPosition!: PositionCallback
    stubNavigator({
      clearWatch: vi.fn(),
      watchPosition: vi.fn((success: PositionCallback) => {
        reportPosition = success
        return 25
      }),
    })

    const resultPromise = webLocationProvider.requestCurrentPosition({ timeoutMs: 1_000 })
    reportPosition({
      coords: {
        accuracy: 640,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude: 35.86,
        longitude: 128.64,
        speed: null,
      },
      timestamp: Date.parse('2026-08-22T07:00:00Z'),
    } as GeolocationPosition)
    reportPosition({
      coords: {
        accuracy: 320,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude: 35.858,
        longitude: 128.63,
        speed: null,
      },
      timestamp: Date.parse('2026-08-22T07:00:05Z'),
    } as GeolocationPosition)
    await vi.advanceTimersByTimeAsync(1_000)

    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      position: {
        latitude: 35.858,
        longitude: 128.63,
        accuracyMeters: 320,
      },
    })
  })

  it('continues sampling after a transient unavailable error and accepts a later precise sample', async () => {
    let reportPosition!: PositionCallback
    let reportError!: PositionErrorCallback
    const clearWatch = vi.fn()
    stubNavigator({
      clearWatch,
      watchPosition: vi.fn((success: PositionCallback, error: PositionErrorCallback) => {
        reportPosition = success
        reportError = error
        return 31
      }),
    })

    const resultPromise = webLocationProvider.requestCurrentPosition()
    reportPosition({
      coords: {
        accuracy: 5_000,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude: 35.8,
        longitude: 128.6,
        speed: null,
      },
      timestamp: Date.parse('2026-08-22T07:00:00Z'),
    } as GeolocationPosition)
    reportError({ code: 2, message: 'temporary unavailable' } as GeolocationPositionError)
    expect(clearWatch).not.toHaveBeenCalled()

    reportPosition({
      coords: {
        accuracy: 70,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude: 35.8584,
        longitude: 128.6304,
        speed: null,
      },
      timestamp: Date.parse('2026-08-22T07:00:04Z'),
    } as GeolocationPosition)

    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      position: { accuracyMeters: 70 },
    })
    expect(clearWatch).toHaveBeenCalledTimes(1)
    expect(clearWatch).toHaveBeenCalledWith(31)
  })

  it('clears the active watch and timer when the request is cancelled', async () => {
    vi.useFakeTimers()
    let reportPosition!: PositionCallback
    const onSample = vi.fn()
    const clearWatch = vi.fn()
    stubNavigator({
      clearWatch,
      watchPosition: vi.fn((success: PositionCallback) => {
        reportPosition = success
        return 44
      }),
    })
    const controller = new AbortController()

    const resultPromise = webLocationProvider.requestCurrentPosition({
      signal: controller.signal,
      timeoutMs: 1_000,
      onSample,
    })
    controller.abort()

    await expect(resultPromise).resolves.toEqual({ ok: false, code: 'cancelled' })
    expect(clearWatch).toHaveBeenCalledTimes(1)
    expect(clearWatch).toHaveBeenCalledWith(44)
    reportPosition({
      coords: {
        accuracy: 50,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        latitude: 35.8584,
        longitude: 128.6304,
        speed: null,
      },
      timestamp: Date.parse('2026-08-22T07:00:04Z'),
    } as GeolocationPosition)
    expect(onSample).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(clearWatch).toHaveBeenCalledTimes(1)
  })

  it.each([
    [1, 'denied'],
    [2, 'unavailable'],
    [3, 'timeout'],
  ] as const)('normalizes browser error %s as %s', async (code, expectedCode) => {
    stubNavigator({
      getCurrentPosition: vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code, message: 'browser error' } as GeolocationPositionError)
      }),
    })

    await expect(webLocationProvider.requestCurrentPosition()).resolves.toEqual({
      ok: false,
      code: expectedCode,
    })
  })

  it('fails safely when location is unavailable in the runtime', async () => {
    vi.stubGlobal('navigator', {})

    await expect(webLocationProvider.checkPermission()).resolves.toBe('unavailable')
    await expect(webLocationProvider.requestCurrentPosition()).resolves.toEqual({
      ok: false,
      code: 'unsupported',
    })
  })
})
