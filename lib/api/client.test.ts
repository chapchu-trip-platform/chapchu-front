import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { redirectToLogin } from '@/features/auth/lib/auth-navigation'
import {
  apiClient,
  refreshAccessToken,
  sessionApiClient,
} from '@/lib/api/client'
import { useAuthStore } from '@/features/auth/stores/auth-store'

vi.mock('@/features/auth/lib/auth-navigation', () => ({
  redirectToLogin: vi.fn(),
}))

const apiAdapter = apiClient.defaults.adapter
const sessionAdapter = sessionApiClient.defaults.adapter

function okResponse(
  config: InternalAxiosRequestConfig,
  data: unknown = {},
): AxiosResponse {
  return {
    config,
    data,
    headers: {},
    status: 200,
    statusText: 'OK',
  }
}

afterEach(() => {
  apiClient.defaults.adapter = apiAdapter
  sessionApiClient.defaults.adapter = sessionAdapter
  useAuthStore.setState({
    accessToken: null,
    authNotice: null,
    registrationToken: null,
    sessionEpoch: 0,
    setupStage: null,
    status: 'idle',
  })
  vi.mocked(redirectToLogin).mockReset()
})

describe('authenticated API client', () => {
  it('attaches the in-memory access token as a Bearer header', async () => {
    useAuthStore.getState().setAccessToken('memory-token')
    let authorization: string | undefined

    apiClient.defaults.adapter = async (config) => {
      authorization = AxiosHeaders.from(config.headers).get('Authorization') as string
      return okResponse(config)
    }

    await apiClient.get('/users/me')

    expect(authorization).toBe('Bearer memory-token')
  })

  it('refreshes once and retries a 401 request with the new token', async () => {
    let protectedCalls = 0
    let retriedAuthorization: string | undefined

    sessionApiClient.defaults.adapter = async (config) =>
      okResponse(config, { access_token: 'refreshed-token' })

    apiClient.defaults.adapter = async (config) => {
      protectedCalls += 1
      if (protectedCalls === 1) {
        const response = { ...okResponse(config), status: 401, statusText: 'Unauthorized' }
        throw new AxiosError('Unauthorized', undefined, config, undefined, response)
      }

      retriedAuthorization = AxiosHeaders.from(config.headers).get('Authorization') as string
      return okResponse(config)
    }

    await apiClient.get('/users/me')

    expect(protectedCalls).toBe(2)
    expect(retriedAuthorization).toBe('Bearer refreshed-token')
    expect(useAuthStore.getState().accessToken).toBe('refreshed-token')
  })

  it('shares one refresh request between concurrent callers', async () => {
    let refreshCalls = 0
    sessionApiClient.defaults.adapter = async (config) => {
      refreshCalls += 1
      return okResponse(config, { access_token: 'shared-token' })
    }

    const first = refreshAccessToken()
    const second = refreshAccessToken()

    expect(first).toBe(second)
    await Promise.all([first, second])
    expect(refreshCalls).toBe(1)
  })

  it('ignores a refresh response that completes after the session is cleared', async () => {
    let resolveRefresh!: (response: AxiosResponse) => void
    sessionApiClient.defaults.adapter = (config) =>
      new Promise<AxiosResponse>((resolve) => {
        resolveRefresh = resolve
      }).then((response) => ({ ...response, config }))

    const refresh = refreshAccessToken()
    await vi.waitFor(() => expect(resolveRefresh).toBeTypeOf('function'))
    useAuthStore.getState().clearSession()
    resolveRefresh(
      okResponse({ headers: new AxiosHeaders() } as InternalAxiosRequestConfig, {
        access_token: 'stale-token',
      })
    )

    await expect(refresh).rejects.toThrow('auth session changed')
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('refreshes but does not automatically replay a non-idempotent request', async () => {
    let protectedCalls = 0
    sessionApiClient.defaults.adapter = async (config) =>
      okResponse(config, { access_token: 'refreshed-token' })
    apiClient.defaults.adapter = async (config) => {
      protectedCalls += 1
      const response = { ...okResponse(config), status: 401, statusText: 'Unauthorized' }
      throw new AxiosError('Unauthorized', undefined, config, undefined, response)
    }

    await expect(apiClient.post('/pets', { name: '몽이' })).rejects.toMatchObject({
      type: 'unauthorized',
    })
    expect(protectedCalls).toBe(1)
    expect(useAuthStore.getState().accessToken).toBe('refreshed-token')
    expect(redirectToLogin).not.toHaveBeenCalled()
  })

  it('clears auth when a replayed request is still unauthorized', async () => {
    let protectedCalls = 0
    let refreshCalls = 0
    useAuthStore.getState().setAccessToken('expired-token')
    sessionApiClient.defaults.adapter = async (config) => {
      refreshCalls += 1
      return okResponse(config, { access_token: 'refreshed-token' })
    }
    apiClient.defaults.adapter = async (config) => {
      protectedCalls += 1
      const response = { ...okResponse(config), status: 401, statusText: 'Unauthorized' }
      throw new AxiosError('Unauthorized', undefined, config, undefined, response)
    }

    await expect(apiClient.get('/users/me')).rejects.toMatchObject({
      type: 'unauthorized',
    })

    expect(protectedCalls).toBe(2)
    expect(refreshCalls).toBe(1)
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(redirectToLogin).toHaveBeenCalledOnce()
  })

  it('clears auth and redirects without replay when refresh fails', async () => {
    let protectedCalls = 0
    useAuthStore.getState().setAccessToken('expired-token')
    sessionApiClient.defaults.adapter = async (config) => {
      const response = { ...okResponse(config), status: 401, statusText: 'Unauthorized' }
      throw new AxiosError('Refresh rejected', undefined, config, undefined, response)
    }
    apiClient.defaults.adapter = async (config) => {
      protectedCalls += 1
      const response = { ...okResponse(config), status: 401, statusText: 'Unauthorized' }
      throw new AxiosError('Unauthorized', undefined, config, undefined, response)
    }

    await expect(apiClient.get('/users/me')).rejects.toMatchObject({
      type: 'unauthorized',
    })

    expect(protectedCalls).toBe(1)
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(redirectToLogin).toHaveBeenCalledOnce()
  })

  it('rejects a blank refresh token response and clears auth', async () => {
    useAuthStore.getState().setAccessToken('expired-token')
    sessionApiClient.defaults.adapter = async (config) =>
      okResponse(config, { access_token: '   ' })

    await expect(refreshAccessToken()).rejects.toThrow(
      'The refresh response did not include an access token.'
    )
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().status).toBe('unauthenticated')
  })
})
