import { afterEach, describe, expect, it, vi } from 'vitest'
import { webLocationProvider } from '@/features/location/providers/web-location-provider'

const originalSecureContextDescriptor = Object.getOwnPropertyDescriptor(
  window,
  'isSecureContext'
)

function stubNavigator({
  permission = 'granted',
  getCurrentPosition = vi.fn(),
}: {
  permission?: PermissionState
  getCurrentPosition?: Geolocation['getCurrentPosition']
} = {}) {
  vi.stubGlobal('navigator', {
    geolocation: { getCurrentPosition },
    permissions: {
      query: vi.fn().mockResolvedValue({ state: permission }),
    },
  })
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: true,
  })
  return getCurrentPosition
}

afterEach(() => {
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
    const getCurrentPosition = stubNavigator({ permission: 'prompt' })

    await expect(webLocationProvider.checkPermission()).resolves.toBe('prompt')
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it('requests one foreground position with privacy-focused Home defaults', async () => {
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
        enableHighAccuracy: false,
        maximumAge: 300_000,
        timeout: 10_000,
      }
    )
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
