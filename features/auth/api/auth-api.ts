'use client'

import { API_ENDPOINTS } from '@/lib/api/endpoints'
import {
  buildApiUrl,
  sessionApiClient,
} from '@/lib/api/client'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { clearPostLoginDestination } from '@/features/auth/lib/post-login-destination'
import { beginOAuthTransaction } from '@/features/auth/lib/oauth-transaction'
import { navigateBrowser } from '@/features/auth/lib/auth-navigation'

export function buildGoogleLoginUrl() {
  const callbackUrl = new URL('/auth/callback', window.location.origin)
  const loginUrl = new URL(buildApiUrl(API_ENDPOINTS.auth.login))
  loginUrl.searchParams.set('redirect', callbackUrl.toString())
  return loginUrl.toString()
}

export function navigateToGoogleLogin() {
  clearPostLoginDestination()
  useAuthStore.getState().setRegistrationToken(null)
  useAuthStore.getState().setSetupStage(null)
  useAuthStore.getState().setAuthNotice(null)
  beginOAuthTransaction()
  navigateBrowser(buildGoogleLoginUrl())
}

export async function logout() {
  clearPostLoginDestination()
  useAuthStore.getState().setAuthNotice(null)
  // Revoke every client-held credential before waiting for the cookie logout request.
  // This also advances the session epoch so an in-flight refresh cannot restore a token.
  useAuthStore.getState().clearSession()

  try {
    await sessionApiClient.post(API_ENDPOINTS.auth.logout)
  } catch (error) {
    useAuthStore.getState().setAuthNotice('logout-failed')
    throw error
  }
}
