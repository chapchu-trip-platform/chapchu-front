import type {
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import {
  checkNicknameAvailability,
  fetchSignupOptions,
  getNicknameAvailabilityErrorMessage,
  getSignupErrorMessage,
  submitIntegratedSignup,
} from '@/features/auth/api/signup-api'
import { publicApiClient } from '@/lib/api/client'

const originalAdapter = publicApiClient.defaults.adapter

function response(
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200
): AxiosResponse {
  return {
    config,
    data,
    headers: {},
    status,
    statusText: status === 201 ? 'Created' : 'OK',
  }
}

afterEach(() => {
  publicApiClient.defaults.adapter = originalAdapter
})

describe('integrated signup API', () => {
  it('checks nickname availability with the documented GET query', async () => {
    let requestMethod: string | undefined
    let requestUrl = ''
    let requestParams: unknown
    let requestBody: unknown
    publicApiClient.defaults.adapter = async (config) => {
      requestMethod = config.method
      requestUrl = config.url ?? ''
      requestParams = config.params
      requestBody = config.data
      return response(config, { nickname: '햇살이', available: true })
    }

    await expect(checkNicknameAvailability(' 햇살이 ')).resolves.toEqual({
      nickname: '햇살이',
      available: true,
    })
    expect(requestMethod).toBe('get')
    expect(requestUrl).toBe('/users/nickname/availability')
    expect(requestParams).toEqual({ nickname: '햇살이' })
    expect(requestBody).toBeUndefined()
  })

  it('rejects a malformed nickname availability response', async () => {
    publicApiClient.defaults.adapter = async (config) =>
      response(config, { nickname: '햇살이', available: 'false' })

    await expect(checkNicknameAvailability('햇살이')).rejects.toThrow(
      'Invalid nickname availability response.'
    )
  })

  it('loads every public option source and combines the response', async () => {
    const requests: Array<{ method?: string; url: string }> = []
    publicApiClient.defaults.adapter = async (config) => {
      requests.push({ method: config.method, url: config.url ?? '' })
      if (config.url === '/preferences/options') {
        return response(config, {
          regions: [{ id: 'region-id', name: '서울' }],
          themes: [{ id: 'theme-id', name: '자연' }],
          transportMethods: [{ id: 'transport-id', name: '자가용' }],
        })
      }
      if (config.url === '/breeds') {
        return response(config, [{ id: 7, name: '골든리트리버' }])
      }
      return response(config, [{ id: 'activity-id', name: '산책' }])
    }

    await expect(fetchSignupOptions()).resolves.toEqual({
      regions: [{ id: 'region-id', name: '서울' }],
      themes: [{ id: 'theme-id', name: '자연' }],
      transportMethods: [{ id: 'transport-id', name: '자가용' }],
      breeds: [{ id: 7, name: '골든리트리버' }],
      activities: [{ id: 'activity-id', name: '산책' }],
    })
    expect(requests).toEqual([
      { method: 'get', url: '/preferences/options' },
      { method: 'get', url: '/breeds' },
      { method: 'get', url: '/activities' },
    ])
  })

  it('posts the documented signup body and returns the 201 response', async () => {
    let requestBody: unknown
    let requestMethod: string | undefined
    let requestUrl = ''
    publicApiClient.defaults.adapter = async (config) => {
      requestMethod = config.method
      requestUrl = config.url ?? ''
      requestBody = JSON.parse(config.data as string)
      return response(
        config,
        {
          userId: 'user-id',
          nickname: '햇살이',
          email: 'user@example.com',
          petIds: ['pet-id'],
        },
        201
      )
    }

    const request = {
      registrationToken: 'registration-token',
      user: {
        nickname: '햇살이',
        regionIds: ['region-id'],
        themeIds: ['theme-id'],
        transportMethodIds: ['transport-id'],
      },
      pets: [
        {
          petName: '초코',
          breedId: 7,
          size: 'MEDIUM' as const,
          age: 3,
          activityIds: ['activity-id'],
        },
      ],
    }

    await expect(submitIntegratedSignup(request)).resolves.toEqual({
      userId: 'user-id',
      nickname: '햇살이',
      email: 'user@example.com',
      petIds: ['pet-id'],
    })
    expect(requestMethod).toBe('post')
    expect(requestUrl).toBe('/auth/signup')
    expect(requestBody).toEqual(request)
  })

  it('maps signup failures to safe user messages', () => {
    expect(getSignupErrorMessage({ status: 401 })).toContain('만료')
    expect(getSignupErrorMessage({ status: 409 })).toContain('이미')
    expect(getSignupErrorMessage({ status: 404 })).toContain('선택지가 변경')
    expect(getSignupErrorMessage({ type: 'network' })).toContain('네트워크')
    expect(getSignupErrorMessage({ status: 502 })).toContain('잠시 후')
  })

  it('maps nickname availability failures to safe user messages', () => {
    expect(getNicknameAvailabilityErrorMessage({ type: 'network' })).toContain(
      '네트워크'
    )
    expect(getNicknameAvailabilityErrorMessage({ type: 'timeout' })).toContain(
      '서버'
    )
    expect(getNicknameAvailabilityErrorMessage({ status: 503 })).toContain(
      '잠시 후'
    )
    expect(getNicknameAvailabilityErrorMessage({ status: 400 })).toContain(
      '확인하지 못했습니다'
    )
  })
})
