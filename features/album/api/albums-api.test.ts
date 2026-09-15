import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { fetchAlbumDetail, fetchMyAlbums } from '@/features/album/api/albums-api'
import type { AlbumSummary } from '@/features/album/types/album'
import { apiClient } from '@/lib/api/client'

const originalAdapter = apiClient.defaults.adapter

function response(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { config, data, headers: {}, status: 200, statusText: 'OK' }
}

const summary: AlbumSummary = {
  courseId: 'course-1',
  travelDate: '2026-09-15',
  petId: 'pet-1',
  photos: [{
    photoId: 'photo-1',
    downloadUrl: 'https://bucket.example/private.jpg',
    takenAt: '2026-09-15',
    externalPlaceId: 'place-1',
    isPublic: false,
  }],
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

describe('album API', () => {
  it('loads the authenticated album groups from the documented endpoint', async () => {
    let captured!: InternalAxiosRequestConfig
    apiClient.defaults.adapter = async (config) => {
      captured = config
      return response(config, [summary])
    }

    await expect(fetchMyAlbums()).resolves.toEqual([summary])
    expect(captured.url).toBe('/users/me/album')
    expect(captured.method).toBe('get')
  })

  it('combines course, review, and album photos for the actual detail screen', async () => {
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/courses/course-1') {
        return response(config, {
          courseId: 'course-1',
          travelDate: '2026-09-15',
          startLocation: '서울역',
          endLocation: '서울숲',
          places: [{
            coursePlaceId: 'course-place-1',
            externalPlaceId: 'place-1',
            placeName: '서울숲',
            placeImageUrl: null,
            latitude: 37.5,
            longitude: 127,
            visitOrder: 1,
            finalPlace: true,
            reason: null,
            petPolicy: null,
          }],
        })
      }
      return response(config, {
        courseId: 'course-1',
        stops: [{
          coursePlaceId: 'course-place-1',
          externalPlaceId: 'place-1',
          placeName: '서울숲',
          visitOrder: 1,
          review: {
            reviewId: 'review-1',
            rating: 5,
            contents: '산책하기 좋았어요.',
            weather: 'SUNNY',
            createdAt: '2026-09-15T12:00:00',
            photos: [{
              photoId: 'photo-2',
              downloadUrl: 'https://bucket.example/public.jpg',
              takenAt: '2026-09-15',
            }],
          },
        }],
      })
    }

    const detail = await fetchAlbumDetail(summary)

    expect(detail.course.endLocation).toBe('서울숲')
    expect(detail.stops[0].review?.contents).toBe('산책하기 좋았어요.')
    expect(detail.stops[0].photos).toEqual([
      summary.photos[0],
      expect.objectContaining({ photoId: 'photo-2', isPublic: true }),
    ])
  })
})
