import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { fetchRecommendedPlaceDetails } from '@/features/map/api/place-details-api'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { apiClient } from '@/lib/api/client'

const originalAdapter = apiClient.defaults.adapter

function response(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { config, data, headers: {}, status: 200, statusText: 'OK' }
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  useAuthStore.setState({ status: 'idle' })
  sessionStorage.clear()
})

describe('place details API', () => {
  it('gets and maps review and practical place information', async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined
    apiClient.defaults.adapter = async (config) => {
      capturedConfig = config
      return response(config, {
        externalPlaceId: 'place/1',
        address: ' 서울 성동구 ',
        businessHours: ' 10:00 - 21:00 ',
        categoryLabel: ' 카페 ',
        phoneNumber: ' 02-123-4567 ',
        rating: 4.8,
        reviewNum: 124,
        visitNum: 356,
        petPolicy: { leashRequired: true },
      })
    }

    await expect(fetchRecommendedPlaceDetails('place/1')).resolves.toEqual({
      address: '서울 성동구',
      businessHours: '10:00 - 21:00',
      category: '카페',
      phoneNumber: '02-123-4567',
      rating: 4.8,
      reviewCount: 124,
      visitCount: 356,
      petPolicy: { leashRequired: true },
    })
    expect(capturedConfig?.url).toBe('/places/place%2F1')
    expect(capturedConfig?.method).toBe('get')
  })

  it('accepts missing optional display information', async () => {
    apiClient.defaults.adapter = async (config) => response(config, {})

    await expect(fetchRecommendedPlaceDetails('place-1')).resolves.toEqual({
      address: null,
      businessHours: null,
      category: null,
      phoneNumber: null,
      rating: null,
      reviewCount: null,
      visitCount: null,
      petPolicy: null,
    })
  })

  it('rejects malformed numeric details', async () => {
    apiClient.defaults.adapter = async (config) => response(config, { rating: '4.8' })

    await expect(fetchRecommendedPlaceDetails('place-1')).rejects.toThrow(
      'Place details response was invalid.'
    )
  })

  it('uses local detail data for the development test account', async () => {
    useAuthStore.getState().startDemoSession()
    let requestedBackend = false
    apiClient.defaults.adapter = async (config) => {
      requestedBackend = true
      return response(config, {})
    }

    await expect(fetchRecommendedPlaceDetails('demo-place-1')).resolves.toMatchObject({
      rating: 4.9,
      reviewCount: 320,
    })
    expect(requestedBackend).toBe(false)
  })
})
