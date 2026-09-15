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
import type { RecommendedPlace } from '@/features/map/types/recommended-place'
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

function isCoursePlaceDto(value: unknown): value is CoursePlaceDto {
  if (!value || typeof value !== 'object') return false
  const place = value as Partial<CoursePlaceDto>
  return (
    isBoundedString(place.coursePlaceId) &&
    isBoundedString(place.externalPlaceId) &&
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
    typeof place.finalPlace === 'boolean' &&
    (place.reason === undefined ||
      place.reason === null ||
      isBoundedString(place.reason)) &&
    Object.hasOwn(place, 'petPolicy')
  )
}

function isCourseDto(value: unknown): value is CourseDto {
  if (!value || typeof value !== 'object') return false
  const course = value as Partial<CourseDto>
  return (
    isBoundedString(course.courseId) &&
    isBoundedString(course.travelDate) &&
    isBoundedString(course.startLocation) &&
    isBoundedString(course.endLocation) &&
    Array.isArray(course.places) &&
    course.places.length <= MAX_COURSE_PLACES &&
    course.places.every(isCoursePlaceDto)
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

function mapRecommendedPlaceToDto(destination: RecommendedPlace): RecommendedPlaceDto {
  return {
    externalPlaceId: destination.externalPlaceId.trim(),
    placeName: destination.name.trim(),
    placeImageUrl: destination.imageUrl,
    latitude: destination.latitude,
    longitude: destination.longitude,
    address: destination.address.trim(),
    categoryLabel: destination.category.trim(),
    indoorOutdoorType: destination.indoorOutdoorType.trim(),
    allowedPetSize: destination.allowedPetSize,
    leashRequired: destination.leashRequired,
    carrierRequired: destination.carrierRequired,
    placeCaution: destination.caution,
  }
}

export function buildCreateCourseRequest(
  {
    destination,
    origin,
    petId,
    weather,
  }: {
    destination: RecommendedPlace
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
    destination: mapRecommendedPlaceToDto(destination),
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
  signal?: AbortSignal
): Promise<RecommendedCourse> {
  const normalizedCourseId = courseId.trim()
  if (!normalizedCourseId) throw new Error('Course ID is required.')

  const { data }: { data: unknown } = await apiClient.get(
    API_ENDPOINTS.courses.detail(normalizedCourseId),
    { signal }
  )
  if (!isCourseDto(data)) throw new InvalidCourseResponseError()
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
  if (!error || typeof error !== 'object') {
    return '추천 코스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
  }

  if (error instanceof InvalidCourseResponseError) {
    return '추천 코스 응답 형식을 확인하지 못했습니다. 서버 API 계약을 확인해주세요.'
  }

  const normalized = error as { status?: unknown; type?: unknown }
  if (normalized.status === 401) return '로그인이 만료되었습니다. 다시 로그인해주세요.'
  if (normalized.status === 403) return '선택한 반려동물로 코스를 생성할 권한이 없습니다.'
  if (normalized.status === 404) return '선택한 장소로 코스를 만들지 못했습니다.'
  if (normalized.status === 429) return '추천 요청이 많습니다. 잠시 후 다시 시도해주세요.'
  if (normalized.type === 'network') return '네트워크 연결을 확인하고 다시 시도해주세요.'
  if (normalized.type === 'timeout') return '추천 요청 시간이 초과되었습니다. 다시 시도해주세요.'
  if (normalized.status === 400 || normalized.status === 422) {
    return '반려동물과 선택한 장소 정보를 확인한 뒤 다시 시도해주세요.'
  }
  if (normalized.type === 'server') {
    return '서버에서 추천 코스를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.'
  }
  return '추천 코스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
}
