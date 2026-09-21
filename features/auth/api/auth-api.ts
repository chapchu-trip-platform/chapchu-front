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

const APP_SESSION_STORAGE_KEYS = [
  'chapchu.auth.post-login-destination',
  'chapchu.auth.oauth-transaction',
  'chapchu.travel-drafts',
] as const

const APP_LOCAL_STORAGE_KEYS = [
  'chapchu.travel-drafts',
  'chapchu.album-cover-preferences',
  'chapchu.hidden-travel-photo-ids',
  'chapchu.location.recent-searches.v1',
] as const

function removeStorageKeys(storage: Storage, keys: readonly string[]) {
  for (const key of keys) {
    try {
      storage.removeItem(key)
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  }
}

function clearAppBrowserStorage() {
  try {
    removeStorageKeys(window.sessionStorage, APP_SESSION_STORAGE_KEYS)
  } catch {
    // Access to browser storage itself can be blocked.
  }
  try {
    removeStorageKeys(window.localStorage, APP_LOCAL_STORAGE_KEYS)
  } catch {
    // Local logout and cookie revocation must still proceed.
  }
}

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
  clearAppBrowserStorage()
  const logoutEpoch = useAuthStore.getState().sessionEpoch

  try {
    await sessionApiClient.post(API_ENDPOINTS.auth.logout)
  } catch (error) {
    const currentAuth = useAuthStore.getState()
    if (
      currentAuth.sessionEpoch === logoutEpoch &&
      currentAuth.status === 'unauthenticated'
    ) {
      currentAuth.setAuthNotice('logout-failed')
    }
    throw error
  }
}
