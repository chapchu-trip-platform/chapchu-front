import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildGoogleLoginUrl,
  logout,
  navigateToGoogleLogin,
} from '@/features/auth/api/auth-api'
import { navigateBrowser } from '@/features/auth/lib/auth-navigation'
import { consumeOAuthTransaction } from '@/features/auth/lib/oauth-transaction'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { sessionApiClient } from '@/lib/api/client'

vi.mock('@/features/auth/lib/auth-navigation', () => ({
  navigateBrowser: vi.fn(),
  redirectToLogin: vi.fn(),
}))

const originalSessionAdapter = sessionApiClient.defaults.adapter

function okResponse(config: InternalAxiosRequestConfig): AxiosResponse {
  return {
    config,
    data: {},
    headers: {},
    status: 200,
    statusText: 'OK',
  }
}

afterEach(() => {
  sessionApiClient.defaults.adapter = originalSessionAdapter
  sessionStorage.clear()
  useAuthStore.setState({
    accessToken: null,
    authNotice: null,
    registrationToken: null,
    sessionEpoch: 0,
    setupStage: null,
    status: 'idle',
  })
  vi.mocked(navigateBrowser).mockReset()
})

describe('Google login URL', () => {
  it('uses the current frontend origin for the callback without environment branches', () => {
    const loginUrl = new URL(buildGoogleLoginUrl())

    expect(loginUrl.origin).toBe('http://localhost:8080')
    expect(loginUrl.pathname).toBe('/auth/login')
    expect(loginUrl.searchParams.get('redirect')).toBe(
      `${window.location.origin}/auth/callback`
    )
  })

  it('creates the one-time transaction before navigating to Google login', () => {
    let hadTransactionAtNavigation = false
    vi.mocked(navigateBrowser).mockImplementation(() => {
      hadTransactionAtNavigation = consumeOAuthTransaction()
    })

    navigateToGoogleLogin()

    expect(hadTransactionAtNavigation).toBe(true)
    expect(navigateBrowser).toHaveBeenCalledWith(buildGoogleLoginUrl())
  })

  it('clears the obsolete post-login destination before every login', () => {
    sessionStorage.setItem('chapchu.auth.post-login-destination', 'pet-setup')
    useAuthStore.setState({
      registrationToken: 'stale-registration-token',
      setupStage: 'registration',
    })

    navigateToGoogleLogin()

    expect(sessionStorage.getItem('chapchu.auth.post-login-destination')).toBeNull()
    expect(useAuthStore.getState().registrationToken).toBeNull()
    expect(useAuthStore.getState().setupStage).toBeNull()
    expect(consumeOAuthTransaction()).toBe(true)
  })
})

describe('logout', () => {
  it('clears every client-held token before the cookie logout request finishes', async () => {
    let finishLogoutRequest!: (response: AxiosResponse) => void
    const pendingResponse = new Promise<AxiosResponse>((resolve) => {
      finishLogoutRequest = resolve
    })
    let logoutConfig!: InternalAxiosRequestConfig
    sessionApiClient.defaults.adapter = async (config) => {
      logoutConfig = config
      return pendingResponse
    }
    sessionStorage.setItem('chapchu.auth.post-login-destination', 'pet-setup')
    useAuthStore.setState({
      accessToken: 'access-token',
      registrationToken: 'registration-token',
      sessionEpoch: 4,
      setupStage: 'registration',
      status: 'authenticated',
    })

    const logoutRequest = logout()

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: null,
      registrationToken: null,
      sessionEpoch: 5,
      setupStage: null,
      status: 'unauthenticated',
    })
    expect(
      sessionStorage.getItem('chapchu.auth.post-login-destination')
    ).toBeNull()

    await vi.waitFor(() => expect(logoutConfig).toBeDefined())
    finishLogoutRequest(okResponse(logoutConfig))
    await expect(logoutRequest).resolves.toBeUndefined()
    expect(logoutConfig.method).toBe('post')
    expect(logoutConfig.url).toBe('/auth/logout')
    expect(useAuthStore.getState().authNotice).toBeNull()
  })

  it('keeps tokens deleted and reports a safe notice when cookie logout fails', async () => {
    sessionApiClient.defaults.adapter = async () => {
      throw new Error('network unavailable')
    }
    useAuthStore.setState({
      accessToken: 'access-token',
      registrationToken: 'registration-token',
      setupStage: 'registration',
      status: 'authenticated',
    })

    await expect(logout()).rejects.toThrow('network unavailable')

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: null,
      authNotice: 'logout-failed',
      registrationToken: null,
      setupStage: null,
      status: 'unauthenticated',
    })
  })
})
