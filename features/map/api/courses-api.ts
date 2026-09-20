'use client'

import type { SearchableLocation } from '@/features/location/types/location'
import { mapCourse } from '@/features/map/lib/course-mapper'
import type {
  CourseDto,
  CoursePlaceDto,
  CourseWeatherInput,
  CreateCourseRequestDto,
  RecommendedPlaceDto,
} from '@/features/map/types/course-api'
import type { RecommendedCourse } from '@/features/map/types/course'
import { formatLocalTravelDate } from '@/features/map/lib/travel-date'
import { apiClient, refreshAccessToken } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import {
  isDemoSessionActive,
  useAuthStore,
} from '@/features/auth/stores/auth-store'

const COURSE_RECOMMENDATION_TIMEOUT_MS = 60_000
const MAX_COURSE_PLACES = 100
const MAX_COURSE_SUMMARIES = 100
const MAX_STRING_LENGTH = 500
const MAX_URL_LENGTH = 2_048

class InvalidCourseResponseError extends Error {
  constructor() {
    super('Course response was invalid.')
    this.name = 'InvalidCourseResponseError'
  }
}

interface CourseSummaryDto {
  courseId: string
  travelDate: string
  startLocation: string
  isCompleted: boolean
  placeCount: number
}

function isBoundedString(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_STRING_LENGTH &&
    value.trim().length > 0
  )
}

function isCoursePlaceDto(
  value: unknown,
  options?: { allowLegacyFields?: boolean }
): value is CoursePlaceDto {
  if (!value || typeof value !== 'object') return false
  const place = value as Partial<CoursePlaceDto>
  const allowLegacyFields = options?.allowLegacyFields === true
  return (
    isBoundedString(place.coursePlaceId) &&
    (place.externalPlaceId === null || isBoundedString(place.externalPlaceId)) &&
    isBoundedString(place.placeName) &&
    (place.placeImageUrl === null ||
      (typeof place.placeImageUrl === 'string' &&
        place.placeImageUrl.length <= MAX_URL_LENGTH)) &&
    typeof place.latitude === 'number' &&
    Number.isFinite(place.latitude) &&
    place.latitude >= -90 &&
    place.latitude <= 90 &&
    typeof place.longitude === 'number' &&
    Number.isFinite(place.longitude) &&
    place.longitude >= -180 &&
    place.longitude <= 180 &&
    typeof place.visitOrder === 'number' &&
    Number.isInteger(place.visitOrder) &&
    place.visitOrder > 0 &&
    (typeof place.finalPlace === 'boolean' ||
      (allowLegacyFields && place.finalPlace === undefined)) &&
    (place.reason === undefined ||
      place.reason === null ||
      isBoundedString(place.reason)) &&
    (Object.hasOwn(place, 'petPolicy') || allowLegacyFields)
  )
}

function isCourseDto(
  value: unknown,
  options?: { allowLegacyFields?: boolean }
): value is CourseDto {
  if (!value || typeof value !== 'object') return false
  const course = value as Partial<CourseDto>
  return (
    isBoundedString(course.courseId) &&
    isBoundedString(course.travelDate) &&
    isBoundedString(course.startLocation) &&
    isBoundedString(course.endLocation) &&
    Array.isArray(course.places) &&
    course.places.length <= MAX_COURSE_PLACES &&
    course.places.every((place) => isCoursePlaceDto(place, options))
  )
}

function isCourseSummaryDto(value: unknown): value is CourseSummaryDto {
  if (!value || typeof value !== 'object') return false
  const course = value as Partial<CourseSummaryDto>
  return (
    isBoundedString(course.courseId) &&
    isBoundedString(course.travelDate) &&
    isBoundedString(course.startLocation) &&
    typeof course.isCompleted === 'boolean' &&
    typeof course.placeCount === 'number' &&
    Number.isInteger(course.placeCount) &&
    course.placeCount >= 0 &&
    course.placeCount <= MAX_COURSE_PLACES
  )
}

export { formatLocalTravelDate } from '@/features/map/lib/travel-date'

function mapDestinationToDto(destination: SearchableLocation): RecommendedPlaceDto {
  const placeName = destination.name.trim() || destination.address.trim()
  return {
    externalPlaceId: destination.id.trim(),
    placeName,
    placeImageUrl: null,
    latitude: destination.latitude,
    longitude: destination.longitude,
    address: destination.address.trim(),
    categoryLabel: '도착지',
    indoorOutdoorType: 'BOTH',
    allowedPetSize: null,
    leashRequired: null,
    carrierRequired: null,
    placeCaution: null,
  }
}

export function buildCreateCourseRequest(
  {
    destination,
    origin,
    petId,
    weather,
  }: {
    destination: SearchableLocation
    origin: SearchableLocation
    petId: string
    weather?: CourseWeatherInput
  },
  date = new Date()
): CreateCourseRequestDto {
  const startLocation = origin.name.trim() || origin.address.trim()
  const normalizedPetId = petId.trim()
  if (!startLocation) throw new Error('Course start location is required.')
  if (!normalizedPetId) throw new Error('Course pet ID is required.')
  return {
    petId: normalizedPetId,
    travelDate: formatLocalTravelDate(date),
    startLocation,
    startLat: origin.latitude,
    startLng: origin.longitude,
    destination: mapDestinationToDto(destination),
    ...(typeof weather?.temperature === 'number'
      ? { temperature: weather.temperature }
      : {}),
    ...(typeof weather?.humidity === 'number' ? { humidity: weather.humidity } : {}),
    ...(weather?.weatherStatus?.trim()
      ? { weatherStatus: weather.weatherStatus.trim() }
      : {}),
  }
}

export async function createRecommendedCourse(
  request: CreateCourseRequestDto,
  signal?: AbortSignal
): Promise<RecommendedCourse> {
  const { data }: { data: unknown } = await apiClient.post(
    API_ENDPOINTS.courses.create,
    request,
    {
      signal,
      timeout: COURSE_RECOMMENDATION_TIMEOUT_MS,
      // A 401 response has not created a course, so this specific POST is safe
      // to replay once after the shared client refreshes the access token.
      replayAfterAuthRefresh: true,
    }
  )
  if (!isCourseDto(data)) throw new InvalidCourseResponseError()
  return mapCourse(data)
}

export async function fetchCourseById(
  courseId: string,
  signal?: AbortSignal,
  options?: { allowLegacyFields?: boolean }
): Promise<RecommendedCourse> {
  const normalizedCourseId = courseId.trim()
  if (!normalizedCourseId) throw new Error('Course ID is required.')

  const { data }: { data: unknown } = await apiClient.get(
    API_ENDPOINTS.courses.detail(normalizedCourseId),
    { signal }
  )
  if (!isCourseDto(data, options)) throw new InvalidCourseResponseError()
  return mapCourse(data)
}

export async function fetchActiveCourse(signal?: AbortSignal): Promise<RecommendedCourse | null> {
  if (isDemoSessionActive()) return null

  // The access token intentionally lives only in memory. After a full reload,
  // the persisted travel state can be available before the auth bootstrap has
  // restored a token, so make the documented Bearer request explicit here.
  if (!useAuthStore.getState().accessToken) {
    await refreshAccessToken()
  }

  const { data: summaries }: { data: unknown } = await apiClient.get(
    API_ENDPOINTS.courses.mine,
    { signal }
  )
  if (
    !Array.isArray(summaries) ||
    summaries.length > MAX_COURSE_SUMMARIES ||
    !summaries.every(isCourseSummaryDto)
  ) {
    throw new InvalidCourseResponseError()
  }

  const activeCourse = summaries.find((course) => !course.isCompleted)
  if (!activeCourse) return null

  return fetchCourseById(activeCourse.courseId, signal)
}

export function getCourseRecommendationErrorMessage(error: unknown) {
  const normalized = error as { status?: unknown } | null
  if (normalized?.status === 401) return '로그인이 만료되었습니다. 다시 로그인해주세요.'
  return '코스 생성에 실패했습니다. 다시 시도해주세요.'
}
