'use client'

import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { normalizeApiError } from '@/lib/api/errors'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { redirectToLogin } from '@/features/auth/lib/auth-navigation'
import { useAuthStore } from '@/features/auth/stores/auth-store'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()

function requireApiBaseUrl() {
  if (!apiBaseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is required to configure the API client.')
  }

  const url = new URL(apiBaseUrl)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL must be a safe HTTP(S) URL.')
  }
  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  if (process.env.NODE_ENV === 'production' && !isLocalhost && url.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_API_BASE_URL must use HTTPS in production.')
  }

  return url
}

export function buildApiUrl(path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('API navigation paths must be root-relative.')
  }

  const baseUrl = requireApiBaseUrl()
  const url = new URL(path, baseUrl)
  if (url.origin !== baseUrl.origin) throw new Error('API navigation must stay on the BFF origin.')
  return url.toString()
}

const sharedConfig = {
  baseURL: apiBaseUrl,
  allowAbsoluteUrls: false,
  timeout: 10_000,
  headers: {
    Accept: 'application/json',
  },
}

export const apiClient = axios.create(sharedConfig)
export const publicApiClient = axios.create(sharedConfig)
export const sessionApiClient = axios.create({
  ...sharedConfig,
  // The BFF keeps the refresh token in a cookie-based HttpOnly session.
  withCredentials: true,
})

function requireConfiguredBaseUrl(config: InternalAxiosRequestConfig) {
  requireApiBaseUrl()
  return config
}

apiClient.interceptors.request.use((config) => {
  requireConfiguredBaseUrl(config)
  const accessToken = useAuthStore.getState().accessToken

  if (accessToken) {
    const headers = AxiosHeaders.from(config.headers)
    headers.set('Authorization', `Bearer ${accessToken}`)
    config.headers = headers
  }

  return config
})

publicApiClient.interceptors.request.use(requireConfiguredBaseUrl)
sessionApiClient.interceptors.request.use(requireConfiguredBaseUrl)

interface AccessTokenResponse {
  access_token: string
}

let refreshRequest: Promise<string> | null = null

export function refreshAccessToken() {
  if (refreshRequest) return refreshRequest
  const sessionEpoch = useAuthStore.getState().sessionEpoch

  refreshRequest = sessionApiClient
    .post<AccessTokenResponse>(API_ENDPOINTS.auth.refresh)
    .then(({ data }) => {
      const accessToken = data.access_token?.trim()
      if (!accessToken) throw new Error('The refresh response did not include an access token.')
      if (useAuthStore.getState().sessionEpoch !== sessionEpoch) {
        throw new Error('The auth session changed while the token was refreshing.')
      }

      useAuthStore.getState().setAccessToken(accessToken)
      return accessToken
    })
    .catch((error) => {
      if (useAuthStore.getState().sessionEpoch === sessionEpoch) {
        useAuthStore.getState().clearSession()
      }
      throw error
    })
    .finally(() => {
      refreshRequest = null
    })

  return refreshRequest
}

type RetryableConfig = InternalAxiosRequestConfig & { _authRetry?: boolean }

function canReplayRequest(config: RetryableConfig) {
  return ['get', 'head', 'options'].includes(config.method?.toLowerCase() ?? '')
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetryableConfig | undefined

    if (error.response?.status === 401 && config?._authRetry) {
      useAuthStore.getState().clearSession()
      redirectToLogin()
      return Promise.reject(normalizeApiError(error))
    }

    if (error.response?.status === 401 && config && !config._authRetry) {
      config._authRetry = true

      let accessToken: string
      try {
        accessToken = await refreshAccessToken()
      } catch {
        useAuthStore.getState().clearSession()
        redirectToLogin()
        return Promise.reject(normalizeApiError(error))
      }

      if (!canReplayRequest(config)) {
        return Promise.reject(normalizeApiError(error))
      }

      const headers = AxiosHeaders.from(config.headers)
      headers.set('Authorization', `Bearer ${accessToken}`)
      config.headers = headers
      return apiClient(config)
    }

    return Promise.reject(normalizeApiError(error))
  }
)

publicApiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error))
)
