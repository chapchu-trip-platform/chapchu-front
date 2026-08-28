'use client'

import { create } from 'zustand'
import { webLocationProvider } from '@/features/location/providers/web-location-provider'
import { LOCATION_QUALITY_SAMPLING_WINDOW_MS } from '@/features/location/config/location-quality'
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
  cancelLocationRequest: () => void
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
let activeAbortController: AbortController | null = null

export const useLocationStore = create<LocationState>((set, get) => ({
  ...initialState,
  async refreshLocation(provider = webLocationProvider) {
    if (activeRequest) return activeRequest.promise

    const requestId = get().requestId + 1
    const abortController = new AbortController()
    activeAbortController = abortController
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
        timeoutMs: LOCATION_QUALITY_SAMPLING_WINDOW_MS,
        signal: abortController.signal,
      })
      if (get().requestId !== requestId) return null

      if (!result.ok) {
        set({ position: null, status: 'error', error: result.code })
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
      if (activeAbortController === abortController) activeAbortController = null
    })

    activeRequest = { id: requestId, promise }
    return promise
  },
  cancelLocationRequest: () => {
    activeAbortController?.abort()
    activeAbortController = null
    activeRequest = null
    set((state) => ({
      requestId: state.requestId + 1,
      status: state.position ? 'success' : 'idle',
      error: null,
    }))
  },
  reset: () => {
    activeAbortController?.abort()
    activeAbortController = null
    activeRequest = null
    set((state) => ({ ...initialState, requestId: state.requestId + 1 }))
  },
}))
