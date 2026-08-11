import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import AuthCallbackRoute from '@/features/auth/components/auth-callback-route'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { mockRouter, resetNextNavigationMocks } from '@/test/mocks/next-navigation'

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
  resetNextNavigationMocks()
})

describe('AuthCallbackRoute', () => {
  it('consumes and scrubs the access token fragment before routing home', async () => {
    window.history.replaceState(null, '', '/auth/callback#access_token=test-jwt')

    render(<AuthCallbackRoute />)

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/home'))
    expect(useAuthStore.getState().accessToken).toBe('test-jwt')
    expect(window.location.hash).toBe('')
  })

  it('continues to the fixed pet setup route after registration', async () => {
    sessionStorage.setItem('chapchu.auth.post-login-destination', 'pet-setup')
    window.history.replaceState(null, '', '/auth/callback#access_token=test-jwt')

    render(<AuthCallbackRoute />)

    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith('/setup?step=pet')
    )
    expect(sessionStorage).toHaveLength(0)
  })

  it('scrubs invalid callback data and lets the user return to login', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().setAccessToken('previous-token')
    sessionStorage.setItem('chapchu.auth.post-login-destination', 'pet-setup')
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
})
