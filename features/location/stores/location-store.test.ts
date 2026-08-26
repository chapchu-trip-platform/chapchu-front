import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocationStore } from '@/features/location/stores/location-store'
import type { DevicePosition, LocationProvider } from '@/features/location/types/location'

const position: DevicePosition = {
  latitude: 35.858,
  longitude: 128.63,
  accuracyMeters: 24,
  capturedAt: '2026-08-26T05:00:00.000Z',
  precision: 'precise',
  source: 'web',
}

beforeEach(() => {
  useLocationStore.getState().reset()
})

describe('location store', () => {
  it('keeps a fresh position in Zustand memory after an automatic foreground request', async () => {
    const provider: LocationProvider = {
      checkPermission: vi.fn().mockResolvedValue('granted'),
      requestCurrentPosition: vi.fn().mockResolvedValue({ ok: true, position }),
    }

    await expect(useLocationStore.getState().refreshLocation(provider)).resolves.toEqual(position)
    expect(useLocationStore.getState()).toMatchObject({
      position,
      permission: 'granted',
      status: 'success',
      error: null,
    })
    expect(provider.requestCurrentPosition).toHaveBeenCalledWith({
      enableHighAccuracy: false,
      maximumAgeMs: 0,
      timeoutMs: 10_000,
    })
  })

  it('requests the device permission automatically after required signup consent', async () => {
    const provider: LocationProvider = {
      checkPermission: vi.fn().mockResolvedValue('prompt'),
      requestCurrentPosition: vi.fn().mockResolvedValue({ ok: true, position }),
    }

    await expect(useLocationStore.getState().refreshLocation(provider)).resolves.toEqual(position)
    expect(provider.requestCurrentPosition).toHaveBeenCalledOnce()
    expect(useLocationStore.getState()).toMatchObject({
      permission: 'granted',
      status: 'success',
    })
  })

  it('does not request coordinates after the browser reports denied permission', async () => {
    const provider: LocationProvider = {
      checkPermission: vi.fn().mockResolvedValue('denied'),
      requestCurrentPosition: vi.fn(),
    }

    await expect(useLocationStore.getState().refreshLocation(provider)).resolves.toBeNull()
    expect(provider.requestCurrentPosition).not.toHaveBeenCalled()
    expect(useLocationStore.getState()).toMatchObject({
      position: null,
      permission: 'denied',
      status: 'error',
      error: 'denied',
    })
  })

  it('shares one browser position request across overlapping route entries', async () => {
    let resolvePosition!: (value: { ok: true; position: DevicePosition }) => void
    const provider: LocationProvider = {
      checkPermission: vi.fn().mockResolvedValue('granted'),
      requestCurrentPosition: vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolvePosition = resolve
        })
      ),
    }
    const firstRequest = useLocationStore.getState().refreshLocation(provider)
    const secondRequest = useLocationStore.getState().refreshLocation(provider)
    await vi.waitFor(() => expect(provider.requestCurrentPosition).toHaveBeenCalledOnce())
    resolvePosition({ ok: true, position })

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([position, position])
    expect(provider.checkPermission).toHaveBeenCalledOnce()
    expect(provider.requestCurrentPosition).toHaveBeenCalledOnce()
  })
})
