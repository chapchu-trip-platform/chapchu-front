'use client'

import type { SearchableLocation } from '@/features/location/types/location'
import { mapCourse } from '@/features/map/lib/course-mapper'
import type {
  CourseDto,
  CoursePlaceDto,
  CreateCourseRequestDto,
} from '@/features/map/types/course-api'
import type { RecommendedCourse } from '@/features/map/types/course'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

const DEFAULT_COURSE_RADIUS_METERS = 5_000
const COURSE_RECOMMENDATION_TIMEOUT_MS = 60_000
const MAX_COURSE_PLACES = 100
const MAX_STRING_LENGTH = 500

class InvalidCourseResponseError extends Error {
  constructor() {
    super('Course response was invalid.')
    this.name = 'InvalidCourseResponseError'
  }
}

const NO_PLACES_FOUND_MESSAGE = '주변에 반려동물 동반 가능 장소가 없습니다.'

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
    typeof place.visitOrder === 'number' &&
    Number.isInteger(place.visitOrder) &&
    place.visitOrder > 0 &&
    typeof place.finalPlace === 'boolean'
  )
}

function isCourseDto(value: unknown): value is CourseDto {
  if (!value || typeof value !== 'object') return false
  const course = value as Partial<CourseDto>
  return (
    isBoundedString(course.courseId) &&
    isBoundedString(course.travelDate) &&
    isBoundedString(course.startLocation) &&
    Array.isArray(course.places) &&
    course.places.length <= MAX_COURSE_PLACES &&
    course.places.every(isCoursePlaceDto)
  )
}

export function formatLocalTravelDate(date: Date) {
  if (Number.isNaN(date.getTime())) throw new Error('Travel date is invalid.')
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildCreateCourseRequest(
  origin: SearchableLocation,
  date = new Date()
): CreateCourseRequestDto {
  const startLocation = origin.name.trim() || origin.address.trim()
  if (!startLocation) throw new Error('Course start location is required.')

  return {
    lat: origin.latitude,
    lng: origin.longitude,
    radiusMeters: DEFAULT_COURSE_RADIUS_METERS,
    travelDate: formatLocalTravelDate(date),
    startLocation,
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

export function getCourseRecommendationErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') {
    return '추천 코스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
  }

  if (error instanceof InvalidCourseResponseError) {
    return '추천 코스 응답 형식을 확인하지 못했습니다. 서버 API 계약을 확인해주세요.'
  }

  const normalized = error as { status?: unknown; type?: unknown }
  if (normalized.status === 401) return '로그인이 만료되었습니다. 다시 로그인해주세요.'
  if (normalized.status === 403) return '추천 코스를 생성할 권한이 없습니다. 로그인 상태를 확인해주세요.'
  if (normalized.status === 404) return '추천 코스를 찾지 못했습니다. 출발지를 변경해주세요.'
  if (normalized.status === 429) return '추천 요청이 많습니다. 잠시 후 다시 시도해주세요.'
  if (normalized.type === 'network') return '네트워크 연결을 확인하고 다시 시도해주세요.'
  if (normalized.type === 'timeout') return '추천 요청 시간이 초과되었습니다. 다시 시도해주세요.'
  if (normalized.status === 400 || normalized.status === 422) {
    return '출발 위치 정보를 확인한 뒤 다시 시도해주세요.'
  }
  if (normalized.type === 'server') {
    return '서버에서 추천 코스를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.'
  }
  return '추천 코스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
}

export function isNoPlacesFoundCourseError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const normalized = error as { message?: unknown; status?: unknown }
  return (
    normalized.status === 404 &&
    normalized.message === NO_PLACES_FOUND_MESSAGE
  )
}
