import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import {
  compareAlbumPhotos,
  compareAlbumSummaries,
  fetchAlbumDetail,
  fetchAlbumsByPet,
  fetchMyAlbums,
} from '@/features/album/api/albums-api'
import type { AlbumSummary } from '@/features/album/types/album'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { hideTravelPhoto } from '@/features/travel/lib/hidden-travel-photos'

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
  useAuthStore.setState({ status: 'idle' })
  localStorage.clear()
  sessionStorage.clear()
})

describe('album API', () => {
  it('returns an empty album list for the development session without local mock data', async () => {
    useAuthStore.getState().startDemoSession()
    let requestedBackend = false
    apiClient.defaults.adapter = async (config) => {
      requestedBackend = true
      return response(config, [])
    }

    await expect(fetchMyAlbums()).resolves.toEqual([])
    expect(requestedBackend).toBe(false)
  })

  it('loads the authenticated album groups from the documented endpoint', async () => {
    const captured: InternalAxiosRequestConfig[] = []
    apiClient.defaults.adapter = async (config) => {
      captured.push(config)
      if (config.url === '/users/me/album') return response(config, [summary])
      return response(config, [{
        courseId: 'course-1',
        travelDate: '2026-09-15',
        startLocation: '서울역',
        isCompleted: true,
        placeCount: 1,
      }])
    }

    await expect(fetchMyAlbums()).resolves.toEqual([summary])
    expect(captured.map((request) => [request.method, request.url])).toEqual([
      ['get', '/users/me/album'],
      ['get', '/users/me/courses'],
    ])
  })

  it('loads and sorts the documented pet album groups', async () => {
    const olderAlbum = { ...summary, courseId: 'course-older', travelDate: '2026-08-01' }
    const captured: InternalAxiosRequestConfig[] = []
    apiClient.defaults.adapter = async (config) => {
      captured.push(config)
      return response(config, [olderAlbum, summary])
    }

    await expect(fetchAlbumsByPet('pet/1')).resolves.toEqual([summary, olderAlbum])
    expect(captured.map((request) => [request.method, request.url])).toEqual([
      ['get', '/users/me/pets/pet%2F1/album'],
    ])
  })

  it('keeps album photos that are not linked to a specific place', async () => {
    const unassignedPhoto = {
      ...summary.photos[0],
      createdAt: '2026-09-15T12:00:00.123456',
      externalPlaceId: null,
    }
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/users/me/album') {
        return response(config, [{ ...summary, photos: [unassignedPhoto] }])
      }
      return response(config, [])
    }

    await expect(fetchMyAlbums()).resolves.toEqual([{
      ...summary,
      photos: [unassignedPhoto],
    }])
  })

  it.each([
    'http://bucket.example/private.jpg',
    'javascript:alert(1)',
    'https://user:secret@bucket.example/private.jpg',
    'not-a-url',
  ])('rejects an unsafe album photo URL: %s', async (downloadUrl) => {
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/users/me/album') {
        return response(config, [{
          ...summary,
          photos: [{ ...summary.photos[0], downloadUrl }],
        }])
      }
      return response(config, [])
    }

    await expect(fetchMyAlbums()).rejects.toThrow('Album response was invalid.')
  })

  it('rejects a malformed album photo creation timestamp', async () => {
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/users/me/album') {
        return response(config, [{
          ...summary,
          photos: [{ ...summary.photos[0], createdAt: 'not-a-date' }],
        }])
      }
      return response(config, [])
    }

    await expect(fetchMyAlbums()).rejects.toThrow('Album response was invalid.')
  })

  it('sorts albums by real travel time with deterministic fallbacks', async () => {
    const albums: AlbumSummary[] = [
      { ...summary, courseId: 'course-z', travelDate: '2026-9-2' },
      { ...summary, courseId: 'course-a', travelDate: '2026-10-01' },
      { ...summary, courseId: 'course-null', travelDate: null },
      { ...summary, courseId: 'course-invalid', travelDate: 'not-a-date' },
    ]
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/users/me/album') return response(config, albums)
      return response(config, [])
    }

    await expect(fetchMyAlbums()).resolves.toEqual([
      albums[1],
      albums[0],
      albums[3],
      albums[2],
    ])
  })

  it('sorts equal-time album cards and photos by stable identifiers', () => {
    expect(compareAlbumSummaries(
      { ...summary, courseId: 'course-b' },
      { ...summary, courseId: 'course-a' },
    )).toBeGreaterThan(0)
    expect(compareAlbumPhotos(
      { ...summary.photos[0], photoId: 'photo-b' },
      { ...summary.photos[0], photoId: 'photo-a' },
    )).toBeGreaterThan(0)
    expect(compareAlbumPhotos(
      { ...summary.photos[0], photoId: 'photo-a', createdAt: '2026-09-15T12:00:01' },
      { ...summary.photos[0], photoId: 'photo-b', createdAt: '2026-09-15T12:00:02' },
    )).toBeLessThan(0)
  })

  it('creates an album entry for a completed course even when it has no photos', async () => {
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/users/me/album') return response(config, [])
      return response(config, [
        {
          courseId: 'completed-course',
          travelDate: '2026-09-16',
          startLocation: '서울역',
          isCompleted: true,
          placeCount: 2,
        },
        {
          courseId: 'active-course',
          travelDate: '2026-09-17',
          startLocation: '부산역',
          isCompleted: false,
          placeCount: 1,
        },
      ])
    }

    await expect(fetchMyAlbums()).resolves.toEqual([{
      courseId: 'completed-course',
      travelDate: '2026-09-16',
      petId: null,
      photos: [],
    }])
  })

  it('keeps a locally deleted travel photo out of the album response', async () => {
    hideTravelPhoto('photo-1')
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/users/me/album') return response(config, [summary])
      return response(config, [{
        courseId: 'course-1',
        travelDate: '2026-09-15',
        startLocation: '서울역',
        isCompleted: true,
        placeCount: 1,
      }])
    }

    await expect(fetchMyAlbums()).resolves.toEqual([{ ...summary, photos: [] }])
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
              takenAt: '2026-09-14',
            }],
          },
        }],
      })
    }

    const detail = await fetchAlbumDetail(summary)

    expect(detail.course.endLocation).toBe('서울숲')
    expect(detail.stops[0].review?.contents).toBe('산책하기 좋았어요.')
    expect(detail.stops[0].photos).toEqual([
      expect.objectContaining({ photoId: 'photo-2', isPublic: true }),
      summary.photos[0],
    ])
  })

  it('orders album stops by visit order even when the course response is shuffled', async () => {
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/courses/course-1') {
        return response(config, {
          courseId: 'course-1',
          travelDate: '2026-09-15',
          startLocation: '서울역',
          endLocation: '서울숲',
          places: [
            {
              coursePlaceId: 'course-place-2',
              externalPlaceId: 'place-2',
              placeName: '뚝섬',
              placeImageUrl: null,
              latitude: 37.5,
              longitude: 127,
              visitOrder: 2,
            },
            {
              coursePlaceId: 'course-place-1',
              externalPlaceId: 'place-1',
              placeName: '서울숲',
              placeImageUrl: null,
              latitude: 37.5,
              longitude: 127,
              visitOrder: 1,
            },
          ],
        })
      }

      return response(config, { courseId: 'course-1', stops: [] })
    }

    const detail = await fetchAlbumDetail(summary)

    expect(detail.stops.map((stop) => stop.visitOrder)).toEqual([1, 2])
  })

  it('keeps the album usable when the course has no available review response', async () => {
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
          }],
        })
      }

      throw { status: 404 }
    }

    const detail = await fetchAlbumDetail(summary)

    expect(detail.course.endLocation).toBe('서울숲')
    expect(detail.stops).toHaveLength(1)
    expect(detail.stops[0].review).toBeNull()
    expect(detail.stops[0].photos).toEqual(summary.photos)
  })

  it('ignores malformed individual review stops instead of failing the album', async () => {
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
          review: { contents: '평점이 누락된 기존 후기' },
        }],
      })
    }

    const detail = await fetchAlbumDetail(summary)

    expect(detail.stops[0].review).toBeNull()
    expect(detail.stops[0].photos).toEqual(summary.photos)
  })
})
