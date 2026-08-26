'use client'

import { create } from 'zustand'
import { webLocationProvider } from '@/features/location/providers/web-location-provider'
import type {
  DevicePosition,
  LocationFailureCode,
  LocationPermissionState,
  LocationProvider,
} from '@/features/location/types/location'

export type LocationLoadStatus = 'idle' | 'requesting' | 'success' | 'error'

interface LocationState {
  position: DevicePosition | null
  permission: LocationPermissionState
  status: LocationLoadStatus
  error: LocationFailureCode | null
  requestId: number
  refreshLocation: (provider?: LocationProvider) => Promise<DevicePosition | null>
  reset: () => void
}

const initialState = {
  position: null,
  permission: 'unknown' as LocationPermissionState,
  status: 'idle' as LocationLoadStatus,
  error: null,
  requestId: 0,
}

let activeRequest: { id: number; promise: Promise<DevicePosition | null> } | null = null

export const useLocationStore = create<LocationState>((set, get) => ({
  ...initialState,
  async refreshLocation(provider = webLocationProvider) {
    if (activeRequest) return activeRequest.promise

    const requestId = get().requestId + 1
    set({
      status: 'requesting',
      error: null,
      requestId,
    })

    const promise = (async () => {
      const permission = await provider.checkPermission()
      if (get().requestId !== requestId) return null

      if (permission === 'denied' || permission === 'unavailable') {
        set({
          position: null,
          permission,
          status: 'error',
          error: permission === 'denied' ? 'denied' : 'unsupported',
        })
        return null
      }

      set({ permission })
      const result = await provider.requestCurrentPosition({
        enableHighAccuracy: true,
        maximumAgeMs: 0,
        timeoutMs: 15_000,
      })
      if (get().requestId !== requestId) return null

      if (!result.ok) {
        set({ status: 'error', error: result.code })
        return null
      }

      set({
        position: result.position,
        permission: 'granted',
        status: 'success',
        error: null,
      })
      return result.position
    })().finally(() => {
      if (activeRequest?.id === requestId) activeRequest = null
    })

    activeRequest = { id: requestId, promise }
    return promise
  },
  reset: () => {
    activeRequest = null
    set((state) => ({ ...initialState, requestId: state.requestId + 1 }))
  },
}))
