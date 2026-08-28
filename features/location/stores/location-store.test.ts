import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocationStore } from '@/features/location/stores/location-store'
import type {
  DevicePosition,
  LocationProvider,
  LocationResult,
} from '@/features/location/types/location'

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
      weatherPosition: position,
      permission: 'granted',
      status: 'success',
      error: null,
    })
    expect(provider.requestCurrentPosition).toHaveBeenCalledWith({
      enableHighAccuracy: true,
      maximumAgeMs: 0,
      timeoutMs: 12_000,
      signal: expect.any(AbortSignal),
      onSample: expect.any(Function),
    })
  })

  it('publishes the first weather-usable sample before the final map position', async () => {
    let reportSample!: (sample: DevicePosition) => void
    let resolvePosition!: (result: LocationResult) => void
    const coarsePosition: DevicePosition = {
      ...position,
      latitude: 35.86,
      longitude: 128.64,
      accuracyMeters: 4_000,
      precision: 'approximate',
    }
    const provider: LocationProvider = {
      checkPermission: vi.fn().mockResolvedValue('granted'),
      requestCurrentPosition: vi.fn((options) => {
        reportSample = options!.onSample!
        return new Promise<LocationResult>((resolve) => {
          resolvePosition = resolve
        })
      }),
    }

    useLocationStore.setState({ weatherPosition: position })
    const request = useLocationStore.getState().refreshLocation(provider)
    await vi.waitFor(() => expect(provider.requestCurrentPosition).toHaveBeenCalledOnce())
    expect(useLocationStore.getState().weatherPosition).toBeNull()
    reportSample({ ...coarsePosition, accuracyMeters: 5_001 })
    expect(useLocationStore.getState().weatherPosition).toBeNull()

    reportSample(coarsePosition)
    expect(useLocationStore.getState()).toMatchObject({
      position: null,
      weatherPosition: coarsePosition,
      status: 'requesting',
    })

    reportSample({ ...coarsePosition, accuracyMeters: 2_000 })
    expect(useLocationStore.getState().weatherPosition).toEqual(coarsePosition)

    resolvePosition({ ok: true, position })
    await expect(request).resolves.toEqual(position)
    expect(useLocationStore.getState()).toMatchObject({
      position,
      weatherPosition: position,
      status: 'success',
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

  it('clears an older position when the fresh result has unusable accuracy', async () => {
    useLocationStore.setState({ position, status: 'success' })
    const provider: LocationProvider = {
      checkPermission: vi.fn().mockResolvedValue('granted'),
      requestCurrentPosition: vi.fn().mockResolvedValue({
        ok: false,
        code: 'low_accuracy',
      }),
    }

    await expect(useLocationStore.getState().refreshLocation(provider)).resolves.toBeNull()
    expect(useLocationStore.getState()).toMatchObject({
      position: null,
      status: 'error',
      error: 'low_accuracy',
    })
  })

  it('cancels an active hardware request when the store is reset', async () => {
    let requestedSignal: AbortSignal | undefined
    const provider: LocationProvider = {
      checkPermission: vi.fn().mockResolvedValue('granted'),
      requestCurrentPosition: vi.fn((options) => {
        requestedSignal = options?.signal
        return new Promise<LocationResult>((resolve) => {
          options?.signal?.addEventListener(
            'abort',
            () => resolve({ ok: false, code: 'cancelled' }),
            { once: true }
          )
        })
      }),
    }

    const request = useLocationStore.getState().refreshLocation(provider)
    await vi.waitFor(() => expect(provider.requestCurrentPosition).toHaveBeenCalledOnce())
    useLocationStore.getState().reset()

    expect(requestedSignal?.aborted).toBe(true)
    await expect(request).resolves.toBeNull()
    expect(useLocationStore.getState()).toMatchObject({
      position: null,
      status: 'idle',
      error: null,
    })
  })
})
