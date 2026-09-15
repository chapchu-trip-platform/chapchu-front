'use client'

import { isDemoSessionActive } from '@/features/auth/stores/auth-store'
import { fetchCourseById } from '@/features/map/api/courses-api'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  AlbumDetail,
  AlbumPhoto,
  AlbumReview,
  AlbumSummary,
} from '@/features/album/types/album'

const MAX_ALBUMS = 500
const MAX_PHOTOS = 1_000
const MAX_STOPS = 100
const MAX_STRING_LENGTH = 20_000
const MAX_URL_LENGTH = 4_096

interface CourseReviewStopDto {
  coursePlaceId: string
  externalPlaceId: string
  placeName: string
  visitOrder: number
  review: (AlbumReview & { photos: Array<Omit<AlbumPhoto, 'externalPlaceId' | 'isPublic'>> }) | null
}

function isString(value: unknown, max = MAX_STRING_LENGTH): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

function isNullableString(value: unknown, max = MAX_STRING_LENGTH) {
  return value === null || isString(value, max)
}

function isAlbumPhotoDto(value: unknown): value is AlbumPhoto {
  if (!value || typeof value !== 'object') return false
  const photo = value as Partial<AlbumPhoto>
  return (
    isString(photo.photoId, 500) &&
    isString(photo.downloadUrl, MAX_URL_LENGTH) &&
    isNullableString(photo.takenAt, 100) &&
    isString(photo.externalPlaceId, 500) &&
    typeof photo.isPublic === 'boolean'
  )
}

function isAlbumSummaryDto(value: unknown): value is AlbumSummary {
  if (!value || typeof value !== 'object') return false
  const album = value as Partial<AlbumSummary>
  return (
    isString(album.courseId, 500) &&
    isNullableString(album.travelDate, 100) &&
    isNullableString(album.petId, 500) &&
    Array.isArray(album.photos) &&
    album.photos.length <= MAX_PHOTOS &&
    album.photos.every(isAlbumPhotoDto)
  )
}

function isCourseReviewPhoto(value: unknown) {
  if (!value || typeof value !== 'object') return false
  const photo = value as { photoId?: unknown; downloadUrl?: unknown; takenAt?: unknown }
  return (
    isString(photo.photoId, 500) &&
    isString(photo.downloadUrl, MAX_URL_LENGTH) &&
    isNullableString(photo.takenAt, 100)
  )
}

function isCourseReview(value: unknown) {
  if (!value || typeof value !== 'object') return false
  const review = value as {
    reviewId?: unknown
    rating?: unknown
    contents?: unknown
    weather?: unknown
    createdAt?: unknown
    photos?: unknown
  }
  return (
    isString(review.reviewId, 500) &&
    typeof review.rating === 'number' &&
    Number.isFinite(review.rating) &&
    review.rating >= 1 &&
    review.rating <= 5 &&
    isString(review.contents) &&
    isNullableString(review.weather, 100) &&
    isNullableString(review.createdAt, 100) &&
    Array.isArray(review.photos) &&
    review.photos.length <= 10 &&
    review.photos.every(isCourseReviewPhoto)
  )
}

function isCourseReviewStop(value: unknown): value is CourseReviewStopDto {
  if (!value || typeof value !== 'object') return false
  const stop = value as Partial<CourseReviewStopDto>
  return (
    isString(stop.coursePlaceId, 500) &&
    isString(stop.externalPlaceId, 500) &&
    isString(stop.placeName, 500) &&
    typeof stop.visitOrder === 'number' &&
    Number.isInteger(stop.visitOrder) &&
    stop.visitOrder > 0 &&
    (stop.review === null || isCourseReview(stop.review))
  )
}

const DEMO_ALBUMS: AlbumSummary[] = [
  {
    courseId: 'demo-course-1',
    travelDate: '2026-09-12',
    petId: 'demo-pet-1',
    photos: [
      {
        photoId: 'demo-photo-1',
        downloadUrl: '/images/album-cover.png',
        takenAt: '2026-09-12',
        externalPlaceId: 'demo-place-1',
        isPublic: false,
      },
    ],
  },
]

export async function fetchMyAlbums(signal?: AbortSignal): Promise<AlbumSummary[]> {
  if (isDemoSessionActive()) return DEMO_ALBUMS

  const { data }: { data: unknown } = await apiClient.get(API_ENDPOINTS.albums.mine, {
    signal,
  })
  if (!Array.isArray(data) || data.length > MAX_ALBUMS || !data.every(isAlbumSummaryDto)) {
    throw new Error('Album response was invalid.')
  }
  return data
}

export async function fetchAlbumDetail(
  summary: AlbumSummary,
  signal?: AbortSignal
): Promise<AlbumDetail> {
  if (isDemoSessionActive()) {
    return {
      summary,
      course: {
        id: summary.courseId,
        travelDate: summary.travelDate ?? '',
        startLocation: '서울역',
        endLocation: '서울숲',
        places: [
          {
            id: 'demo-course-place-1',
            externalPlaceId: 'demo-place-1',
            name: '서울숲',
            imageUrl: '/images/place-park.png',
            latitude: 37.5444,
            longitude: 127.0374,
            visitOrder: 1,
            isFinal: true,
            petPolicy: null,
          },
        ],
      },
      stops: [
        {
          coursePlaceId: 'demo-course-place-1',
          externalPlaceId: 'demo-place-1',
          placeName: '서울숲',
          visitOrder: 1,
          imageUrl: '/images/place-park.png',
          review: null,
          photos: summary.photos,
        },
      ],
    }
  }

  const [course, reviewResponse] = await Promise.all([
    fetchCourseById(summary.courseId, signal),
    apiClient.get(API_ENDPOINTS.courses.reviews(summary.courseId), { signal }),
  ])
  const reviewData = reviewResponse.data as unknown
  if (!reviewData || typeof reviewData !== 'object') {
    throw new Error('Course review response was invalid.')
  }
  const reviewEnvelope = reviewData as { courseId?: unknown; stops?: unknown }
  if (
    reviewEnvelope.courseId !== summary.courseId ||
    !Array.isArray(reviewEnvelope.stops) ||
    reviewEnvelope.stops.length > MAX_STOPS ||
    !reviewEnvelope.stops.every(isCourseReviewStop)
  ) {
    throw new Error('Course review response was invalid.')
  }

  const reviewByCoursePlaceId = new Map(
    reviewEnvelope.stops.map((stop) => [stop.coursePlaceId, stop])
  )
  const stops = course.places.map((place) => {
    const reviewStop = reviewByCoursePlaceId.get(place.id)
    const albumPhotos = summary.photos.filter(
      (photo) => photo.externalPlaceId === place.externalPlaceId
    )
    const knownPhotoIds = new Set(albumPhotos.map((photo) => photo.photoId))
    const reviewPhotos: AlbumPhoto[] = (reviewStop?.review?.photos ?? [])
      .filter((photo) => !knownPhotoIds.has(photo.photoId))
      .map((photo) => ({
        ...photo,
        externalPlaceId: place.externalPlaceId,
        isPublic: true,
      }))

    return {
      coursePlaceId: place.id,
      externalPlaceId: place.externalPlaceId,
      placeName: place.name,
      visitOrder: place.visitOrder,
      imageUrl: place.imageUrl,
      review: reviewStop?.review
        ? {
            reviewId: reviewStop.review.reviewId,
            rating: reviewStop.review.rating,
            contents: reviewStop.review.contents,
            weather: reviewStop.review.weather,
            createdAt: reviewStop.review.createdAt,
          }
        : null,
      photos: [...albumPhotos, ...reviewPhotos],
    }
  })

  return { summary, course, stops }
}

export function getAlbumErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return '앨범을 불러오지 못했어요. 다시 시도해주세요.'
  const normalized = error as { status?: unknown; type?: unknown }
  if (normalized.status === 401) return '로그인이 만료되었습니다. 다시 로그인해주세요.'
  if (normalized.status === 404) return '앨범에 연결된 여행을 찾지 못했습니다.'
  if (normalized.type === 'network') return '네트워크 연결을 확인하고 다시 시도해주세요.'
  if (normalized.type === 'timeout') return '앨범을 불러오는 데 시간이 오래 걸리고 있어요.'
  return '앨범을 불러오지 못했어요. 다시 시도해주세요.'
}
