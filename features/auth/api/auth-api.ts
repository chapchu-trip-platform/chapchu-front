'use client'

import { API_ENDPOINTS } from '@/lib/api/endpoints'
import {
  buildApiUrl,
  publicApiClient,
  sessionApiClient,
} from '@/lib/api/client'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { clearPostLoginDestination } from '@/features/auth/lib/post-login-destination'
import { beginOAuthTransaction } from '@/features/auth/lib/oauth-transaction'
import { navigateBrowser } from '@/features/auth/lib/auth-navigation'

interface RegisterRequest {
  registrationToken: string
  nickname: string
}

export function buildGoogleLoginUrl() {
  const callbackUrl = new URL('/auth/callback', window.location.origin)
  const loginUrl = new URL(buildApiUrl(API_ENDPOINTS.auth.login))
  loginUrl.searchParams.set('redirect', callbackUrl.toString())
  return loginUrl.toString()
}

export function navigateToGoogleLogin(options?: { preservePostLoginDestination?: boolean }) {
  if (!options?.preservePostLoginDestination) clearPostLoginDestination()
  useAuthStore.getState().setAuthNotice(null)
  beginOAuthTransaction()
  navigateBrowser(buildGoogleLoginUrl())
}

export async function registerMember(registrationToken: string, nickname: string) {
  await publicApiClient.post(API_ENDPOINTS.auth.register, {
    registrationToken,
    nickname,
  } satisfies RegisterRequest)
}

export async function logout() {
  try {
    await sessionApiClient.post(API_ENDPOINTS.auth.logout)
  } catch (error) {
    useAuthStore.getState().setAuthNotice('logout-failed')
    throw error
  } finally {
    useAuthStore.getState().clearSession()
  }
}
