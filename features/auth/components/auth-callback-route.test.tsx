import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import AuthCallbackRoute from '@/features/auth/components/auth-callback-route'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { useLocationStore } from '@/features/location/stores/location-store'
import { mockRouter, resetNextNavigationMocks } from '@/test/mocks/next-navigation'
import { beginOAuthTransaction } from '@/features/auth/lib/oauth-transaction'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  useAuthStore.setState({
    accessToken: null,
    authNotice: null,
    registrationToken: null,
    sessionEpoch: 0,
    setupStage: null,
    status: 'idle',
  })
  useLocationStore.getState().reset()
  resetNextNavigationMocks()
})

describe('AuthCallbackRoute', () => {
  it('consumes and scrubs the access token fragment before routing home', async () => {
    useAuthStore.setState({
      registrationToken: 'stale-registration-token',
      setupStage: 'registration',
    })
    sessionStorage.setItem('chapchu.auth.post-login-destination', 'pet-setup')
    useLocationStore.setState({
      position: {
        latitude: 35.858,
        longitude: 128.63,
        accuracyMeters: 20,
        capturedAt: '2026-08-26T05:00:00.000Z',
        precision: 'precise',
        source: 'web',
      },
      status: 'success',
    })
    beginOAuthTransaction()
    window.history.replaceState(null, '', '/auth/callback#access_token=test-jwt')

    render(<AuthCallbackRoute />)

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/home'))
    expect(useAuthStore.getState().accessToken).toBe('test-jwt')
    expect(useAuthStore.getState().registrationToken).toBeNull()
    expect(useAuthStore.getState().setupStage).toBeNull()
    expect(useLocationStore.getState().position).toBeNull()
    expect(window.location.hash).toBe('')
    expect(sessionStorage).toHaveLength(0)
  })

  it('consumes a new-user registration token and routes to setup', async () => {
    sessionStorage.setItem('chapchu.auth.post-login-destination', 'pet-setup')
    beginOAuthTransaction()
    window.history.replaceState(
      null,
      '',
      '/auth/callback?registration_token=registration-token'
    )

    render(<AuthCallbackRoute />)

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/setup'))
    expect(window.location.pathname).toBe('/auth/callback')
    expect(window.location.search).toBe('')
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().registrationToken).toBe('registration-token')
    expect(useAuthStore.getState().setupStage).toBe('registration')
    expect(sessionStorage).toHaveLength(0)
  })

  it('rejects a callback containing both auth result types', async () => {
    beginOAuthTransaction()
    window.history.replaceState(
      null,
      '',
      '/auth/callback?registration_token=registration-token#access_token=test-jwt'
    )

    render(<AuthCallbackRoute />)

    expect(await screen.findByText('로그인을 완료하지 못했어요')).toBeInTheDocument()
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('')
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().registrationToken).toBeNull()
  })

  it('scrubs invalid callback data and lets the user return to login', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().setAccessToken('previous-token')
    sessionStorage.setItem('chapchu.auth.post-login-destination', 'pet-setup')
    beginOAuthTransaction()
    window.history.replaceState(
      null,
      '',
      '/auth/callback#access_token=one&access_token='
    )

    render(<AuthCallbackRoute />)

    expect(await screen.findByText('로그인을 완료하지 못했어요')).toBeInTheDocument()
    expect(window.location.hash).toBe('')
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(sessionStorage).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: '로그인으로 돌아가기' }))
    expect(mockRouter.replace).toHaveBeenCalledWith('/login')
  })

  it('rejects an unsolicited valid token when this tab did not start login', async () => {
    window.history.replaceState(null, '', '/auth/callback#access_token=test-jwt')

    render(<AuthCallbackRoute />)

    expect(await screen.findByText('로그인을 완료하지 못했어요')).toBeInTheDocument()
    expect(window.location.hash).toBe('')
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })
})
