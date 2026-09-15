import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { createTravelReview } from '@/features/travel/api/travel-reviews-api'
import { apiClient } from '@/lib/api/client'

const originalAdapter = apiClient.defaults.adapter

function response(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { config, data, headers: {}, status: 201, statusText: 'Created' }
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

describe('travel review API', () => {
  it('creates a course-place review with the uploaded photo IDs', async () => {
    let captured!: InternalAxiosRequestConfig
    apiClient.defaults.adapter = async (config) => {
      captured = config
      return response(config, {
        id: 'review-1',
        placeId: 'place-1',
        petId: 'pet-1',
        rating: 5,
        contents: '함께 걷기 좋았어요.',
        coursePlaceId: 'course-place-1',
        photos: [{
          photoId: 'photo-1',
          downloadUrl: 'https://bucket.example/photo.jpg',
          takenAt: '2026-09-15',
        }],
      })
    }

    await expect(createTravelReview({
      coursePlaceId: 'course-place-1',
      placeId: 'place-1',
      petId: 'pet-1',
      rating: 5,
      contents: '함께 걷기 좋았어요.',
      photoIds: ['photo-1'],
    })).resolves.toEqual({ reviewId: 'review-1', coursePlaceId: 'course-place-1' })

    expect(captured.url).toBe('/reviews')
    expect(JSON.parse(String(captured.data))).toEqual({
      placeId: 'place-1',
      petId: 'pet-1',
      rating: 5,
      contents: '함께 걷기 좋았어요.',
      coursePlaceId: 'course-place-1',
      photoIds: ['photo-1'],
    })
  })
})
