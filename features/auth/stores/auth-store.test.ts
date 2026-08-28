import { afterEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { useLocationStore } from '@/features/location/stores/location-store'

afterEach(() => {
  useAuthStore.setState({
    accessToken: null,
    authNotice: null,
    registrationToken: null,
    sessionEpoch: 0,
    setupStage: null,
    status: 'idle',
  })
  localStorage.clear()
  sessionStorage.clear()
  useLocationStore.getState().reset()
})

describe('auth store', () => {
  it('accepts an access token and clears stale registration state', () => {
    useAuthStore.getState().setRegistrationToken('registration-token')
    useAuthStore.getState().setSetupStage('registration')
    useAuthStore.getState().setAccessToken('access-token')

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'access-token',
      authNotice: null,
      registrationToken: null,
      sessionEpoch: 0,
      setupStage: null,
      status: 'authenticated',
    })
    expect(localStorage).toHaveLength(0)
    expect(sessionStorage).toHaveLength(0)
  })

  it('clears every credential when the session ends', () => {
    useAuthStore.getState().setAccessToken('access-token')
    useAuthStore.getState().setRegistrationToken('registration-token')
    useLocationStore.setState({
      position: {
        latitude: 35.858,
        longitude: 128.63,
        accuracyMeters: 20,
        capturedAt: '2026-08-26T05:00:00.000Z',
        precision: 'precise',
        source: 'web',
      },
      permission: 'granted',
      status: 'success',
    })

    useAuthStore.getState().clearSession()

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: null,
      authNotice: null,
      registrationToken: null,
      sessionEpoch: 1,
      setupStage: null,
      status: 'unauthenticated',
    })
    expect(useLocationStore.getState()).toMatchObject({
      position: null,
      permission: 'unknown',
      status: 'idle',
    })
  })
})
