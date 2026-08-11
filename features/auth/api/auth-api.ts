'use client'

import { API_ENDPOINTS } from '@/lib/api/endpoints'
import {
  buildApiUrl,
  publicApiClient,
  sessionApiClient,
} from '@/lib/api/client'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { clearPostLoginDestination } from '@/features/auth/lib/post-login-destination'

interface RegisterRequest {
  registrationToken: string
  nickname: string
}

export function navigateToGoogleLogin(options?: { preservePostLoginDestination?: boolean }) {
  if (!options?.preservePostLoginDestination) clearPostLoginDestination()
  useAuthStore.getState().setAuthNotice(null)
  window.location.assign(buildApiUrl(API_ENDPOINTS.auth.login))
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
