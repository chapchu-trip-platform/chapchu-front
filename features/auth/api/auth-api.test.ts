import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildGoogleLoginUrl,
  navigateToGoogleLogin,
} from '@/features/auth/api/auth-api'
import { navigateBrowser } from '@/features/auth/lib/auth-navigation'
import { consumeOAuthTransaction } from '@/features/auth/lib/oauth-transaction'

vi.mock('@/features/auth/lib/auth-navigation', () => ({
  navigateBrowser: vi.fn(),
  redirectToLogin: vi.fn(),
}))

afterEach(() => {
  sessionStorage.clear()
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

  it('preserves only the fixed post-login destination during registration re-login', () => {
    sessionStorage.setItem('chapchu.auth.post-login-destination', 'pet-setup')

    navigateToGoogleLogin({ preservePostLoginDestination: true })

    expect(sessionStorage.getItem('chapchu.auth.post-login-destination')).toBe(
      'pet-setup'
    )
    expect(consumeOAuthTransaction()).toBe(true)
  })
})
