import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { fetchSelectablePets } from '@/features/profile/api/pets-api'
import { apiClient } from '@/lib/api/client'

const originalAdapter = apiClient.defaults.adapter

function response(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { config, data, headers: {}, status: 200, statusText: 'OK' }
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

describe('pets API', () => {
  it('loads authenticated pets and maps them to course selection options', async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined
    apiClient.defaults.adapter = async (config) => {
      capturedConfig = config
      return response(config, [
        {
          id: 'pet-1',
          petName: ' 초코 ',
          breedId: null,
          breedName: '골든리트리버',
          size: 'MEDIUM',
          age: 3,
          activities: [],
          createdAt: null,
          updatedAt: null,
        },
      ])
    }

    await expect(fetchSelectablePets()).resolves.toEqual([
      { id: 'pet-1', name: '초코' },
    ])
    expect(capturedConfig?.url).toBe('/pets')
    expect(capturedConfig?.method).toBe('get')
  })

  it('rejects malformed pet identifiers', async () => {
    apiClient.defaults.adapter = async (config) =>
      response(config, [{ id: '', petName: '초코' }])

    await expect(fetchSelectablePets()).rejects.toThrow('Pets response was invalid.')
  })
})
