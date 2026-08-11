import { afterEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/features/auth/stores/auth-store'

afterEach(() => {
  useAuthStore.setState({
    accessToken: null,
    authNotice: null,
    registrationToken: null,
    sessionEpoch: 0,
    setupStage: null,
    status: 'idle',
  })
})

describe('auth store', () => {
  it('keeps access and registration tokens only in memory state', () => {
    useAuthStore.getState().setAccessToken('access-token')
    useAuthStore.getState().setRegistrationToken('registration-token')

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'access-token',
      authNotice: null,
      registrationToken: 'registration-token',
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

    useAuthStore.getState().clearSession()

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: null,
      authNotice: null,
      registrationToken: null,
      sessionEpoch: 1,
      setupStage: null,
      status: 'unauthenticated',
    })
  })
})
