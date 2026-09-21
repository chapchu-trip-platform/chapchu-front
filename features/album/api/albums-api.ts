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
import { getHiddenTravelPhotoIds } from '@/features/travel/lib/hidden-travel-photos'

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
  review?: (AlbumReview & { photos: Array<Omit<AlbumPhoto, 'externalPlaceId' | 'isPublic'>> }) | null
}

interface CourseSummaryDto {
  courseId: string
  travelDate: string
  startLocation: string
  isCompleted: boolean
  placeCount: number
}

function isString(value: unknown, max = MAX_STRING_LENGTH): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

function isNullableString(value: unknown, max = MAX_STRING_LENGTH) {
  return value === null || isString(value, max)
}

function isSafeHttpsUrl(value: unknown): value is string {
  if (!isString(value, MAX_URL_LENGTH)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

function isNullableDate(value: unknown) {
  return value === null || (
    isString(value, 100) &&
    Number.isFinite(Date.parse(value))
  )
}

/**
 * Convert the date formats accepted by the API into a comparable timestamp.
 * Date-only values are parsed in UTC so the ordering does not depend on the
 * browser's local timezone. Invalid/empty values are kept as `null` and are
 * placed after valid dates by the comparators below.
 */
function toComparableTime(value: string | null) {
  if (!value?.trim()) return null

  const dateOnly = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (dateOnly) {
    const [, year, month, day] = dateOnly
    const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day))
    const normalized = new Date(timestamp)
    return Number.isFinite(timestamp) &&
      normalized.getUTCFullYear() === Number(year) &&
      normalized.getUTCMonth() === Number(month) - 1 &&
      normalized.getUTCDate() === Number(day)
      ? timestamp
      : null
  }

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function compareIds(left: string, right: string) {
  if (left === right) return 0
  return left < right ? -1 : 1
}

/** Sort album cards from the most recent travel date to the oldest. */
export function compareAlbumSummaries(left: AlbumSummary, right: AlbumSummary) {
  const leftTime = toComparableTime(left.travelDate)
  const rightTime = toComparableTime(right.travelDate)

  if (leftTime !== null && rightTime !== null && leftTime !== rightTime) {
    return rightTime - leftTime
  }
  if (leftTime !== null && rightTime === null) return -1
  if (leftTime === null && rightTime !== null) return 1

  // A stable tie-breaker is important because API response order is not
  // guaranteed and modern sorting implementations may preserve that order.
  return compareIds(left.courseId, right.courseId)
}

/** Sort photos in the order they were taken, with unknown timestamps last. */
export function compareAlbumPhotos(left: AlbumPhoto, right: AlbumPhoto) {
  const leftTime = toComparableTime(left.takenAt)
  const rightTime = toComparableTime(right.takenAt)

  if (leftTime !== null && rightTime !== null && leftTime !== rightTime) {
    return leftTime - rightTime
  }
  if (leftTime !== null && rightTime === null) return -1
  if (leftTime === null && rightTime !== null) return 1

  const leftCreatedTime = toComparableTime(left.createdAt ?? null)
  const rightCreatedTime = toComparableTime(right.createdAt ?? null)
  if (leftCreatedTime !== null && rightCreatedTime !== null && leftCreatedTime !== rightCreatedTime) {
    return leftCreatedTime - rightCreatedTime
  }
  if (leftCreatedTime !== null && rightCreatedTime === null) return -1
  if (leftCreatedTime === null && rightCreatedTime !== null) return 1

  return compareIds(left.photoId, right.photoId)
}

function sortAlbumPhotos(photos: AlbumPhoto[]) {
  return [...photos].sort(compareAlbumPhotos)
}

function parseAlbumSummaries(value: unknown): AlbumSummary[] {
  if (
    !Array.isArray(value) ||
    value.length > MAX_ALBUMS ||
    !value.every(isAlbumSummaryDto)
  ) {
    throw new Error('Album response was invalid.')
  }

  const hiddenPhotoIds = getHiddenTravelPhotoIds()
  return value.map((album) => ({
    ...album,
    photos: sortAlbumPhotos(
      album.photos.filter((photo) => !hiddenPhotoIds.has(photo.photoId))
    ),
  }))
}

function isAlbumPhotoDto(value: unknown): value is AlbumPhoto {
  if (!value || typeof value !== 'object') return false
  const photo = value as Partial<AlbumPhoto>
  return (
    isString(photo.photoId, 500) &&
    isSafeHttpsUrl(photo.downloadUrl) &&
    isNullableString(photo.takenAt, 100) &&
    (photo.createdAt === undefined || isNullableDate(photo.createdAt)) &&
    isNullableString(photo.externalPlaceId, 500) &&
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

function isCourseSummaryDto(value: unknown): value is CourseSummaryDto {
  if (!value || typeof value !== 'object') return false
  const course = value as Partial<CourseSummaryDto>
  return (
    isString(course.courseId, 500) &&
    isString(course.travelDate, 100) &&
    isString(course.startLocation, 500) &&
    typeof course.isCompleted === 'boolean' &&
    typeof course.placeCount === 'number' &&
    Number.isInteger(course.placeCount) &&
    course.placeCount >= 0 &&
    course.placeCount <= MAX_STOPS
  )
}

function isCourseReviewPhoto(value: unknown) {
  if (!value || typeof value !== 'object') return false
  const photo = value as { photoId?: unknown; downloadUrl?: unknown; takenAt?: unknown }
  return (
    isString(photo.photoId, 500) &&
    isSafeHttpsUrl(photo.downloadUrl) &&
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
    (stop.review === undefined || stop.review === null || isCourseReview(stop.review))
  )
}

function parseCourseReviewStops(value: unknown, courseId: string): CourseReviewStopDto[] {
  if (!value || typeof value !== 'object') return []

  if (Array.isArray(value)) {
    if (value.length > MAX_STOPS) return []
    return value.filter(isCourseReviewStop)
  }

  const envelope = value as { courseId?: unknown; stops?: unknown }
  // Older responses did not always include the envelope courseId. If it is
  // present, still reject a response belonging to another course.
  if (envelope.courseId !== undefined && envelope.courseId !== courseId) return []
  if (!Array.isArray(envelope.stops) || envelope.stops.length > MAX_STOPS) return []

  // A single malformed review should not hide the rest of the album. The
  // course and album photos are still useful when review data is incomplete.
  return envelope.stops.filter(isCourseReviewStop)
}

function shouldIgnoreReviewError(error: unknown, signal?: AbortSignal) {
  if (signal?.aborted) return false
  if (!error || typeof error !== 'object') return true
  const normalized = error as { status?: unknown }
  // Authentication/permission errors must continue through the normal auth
  // flow; all other review failures can degrade to an empty review section.
  return normalized.status !== 401 && normalized.status !== 403
}

async function fetchCourseReviewStops(courseId: string, signal?: AbortSignal) {
  try {
    const reviewResponse = await apiClient.get(
      API_ENDPOINTS.courses.reviews(courseId),
      { signal }
    )
    return parseCourseReviewStops(reviewResponse.data as unknown, courseId)
  } catch (error) {
    if (!shouldIgnoreReviewError(error, signal)) throw error
    return []
  }
}

export async function fetchMyAlbums(signal?: AbortSignal): Promise<AlbumSummary[]> {
  if (isDemoSessionActive()) return []

  const [albumResponse, courseResponse] = await Promise.all([
    apiClient.get(API_ENDPOINTS.albums.mine, { signal }),
    apiClient.get(API_ENDPOINTS.courses.mine, { signal }),
  ])
  const albumData = albumResponse.data as unknown
  const courseData = courseResponse.data as unknown
  if (
    !Array.isArray(courseData) ||
    courseData.length > MAX_ALBUMS ||
    !courseData.every(isCourseSummaryDto)
  ) {
    throw new Error('Course list response was invalid.')
  }

  const visibleAlbums = parseAlbumSummaries(albumData)
  const albumsByCourseId = new Map(
    visibleAlbums.map((album) => [album.courseId, album] as const)
  )
  for (const course of courseData) {
    if (!course.isCompleted || albumsByCourseId.has(course.courseId)) continue
    albumsByCourseId.set(course.courseId, {
      courseId: course.courseId,
      travelDate: course.travelDate,
      petId: null,
      photos: [],
    })
  }

  return [...albumsByCourseId.values()]
    .sort(compareAlbumSummaries)
    .slice(0, MAX_ALBUMS)
}

export async function fetchAlbumsByPet(
  petId: string,
  signal?: AbortSignal
): Promise<AlbumSummary[]> {
  if (isDemoSessionActive()) return []
  if (!petId.trim() || petId.length > 500) {
    throw new Error('Pet ID was invalid.')
  }

  const { data }: { data: unknown } = await apiClient.get(
    API_ENDPOINTS.albums.byPet(petId),
    { signal }
  )
  return parseAlbumSummaries(data)
    .sort(compareAlbumSummaries)
    .slice(0, MAX_ALBUMS)
}

export async function fetchAlbumDetail(
  summary: AlbumSummary,
  signal?: AbortSignal
): Promise<AlbumDetail> {
  const [course, reviewStops] = await Promise.all([
    fetchCourseById(summary.courseId, signal, { allowLegacyFields: true }),
    fetchCourseReviewStops(summary.courseId, signal),
  ])

  const reviewByCoursePlaceId = new Map(
    reviewStops.map((stop) => [stop.coursePlaceId, stop])
  )
  const stops = [...course.places]
    .sort((left, right) => (
      left.visitOrder - right.visitOrder || compareIds(left.id, right.id)
    ))
    .map((place) => {
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
        photos: sortAlbumPhotos([...albumPhotos, ...reviewPhotos]),
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
