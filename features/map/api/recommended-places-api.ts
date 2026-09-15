'use client'

import type { SearchableLocation } from '@/features/location/types/location'
import type {
  CourseWeatherInput,
  RecommendedPlaceDto,
  RecommendedPlacesRequestDto,
} from '@/features/map/types/course-api'
import type { RecommendedPlace } from '@/features/map/types/recommended-place'
import { isDemoSessionActive } from '@/features/auth/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

const RECOMMENDED_PLACES_TIMEOUT_MS = 60_000
const DESTINATION_CANDIDATE_LIMIT = 5
const DEFAULT_RADIUS_METERS = 5_000
const MAX_RECOMMENDED_PLACES = 100
const MAX_STRING_LENGTH = 500
const MAX_URL_LENGTH = 2_048

function buildDemoRecommendedPlaces(
  request: RecommendedPlacesRequestDto
): RecommendedPlace[] {
  const places = [
    {
      externalPlaceId: 'demo-place-1',
      name: '반려견 산책 공원',
      imageUrl: '/images/place-park.png',
      latitude: request.lat + 0.006,
      longitude: request.lng - 0.004,
      address: '도착지 주변 추천 장소',
      category: '공원',
      indoorOutdoorType: '실외',
      allowedPetSize: 'ALL',
      leashRequired: true,
      carrierRequired: false,
      caution: '목줄과 배변봉투를 준비해주세요.',
    },
    {
      externalPlaceId: 'demo-place-2',
      name: '펫 프렌들리 카페',
      imageUrl: '/images/place-cafe.png',
      latitude: request.lat - 0.003,
      longitude: request.lng + 0.005,
      address: '도착지 주변 추천 장소',
      category: '카페',
      indoorOutdoorType: '실내',
      allowedPetSize: 'ALL',
      leashRequired: true,
      carrierRequired: false,
      caution: null,
    },
    {
      externalPlaceId: 'demo-place-3',
      name: '반려견 동반 레스토랑',
      imageUrl: '/images/place-restaurant.png',
      latitude: request.lat + 0.002,
      longitude: request.lng + 0.007,
      address: '도착지 주변 추천 장소',
      category: '음식점',
      indoorOutdoorType: 'BOTH',
      allowedPetSize: 'ALL',
      leashRequired: false,
      carrierRequired: true,
      caution: '실내에서는 이동장을 이용해주세요.',
    },
  ] satisfies RecommendedPlace[]

  return places.slice(0, request.limit > 0 ? request.limit : places.length)
}

class InvalidRecommendedPlacesResponseError extends Error {
  constructor() {
    super('Recommended places response was invalid.')
    this.name = 'InvalidRecommendedPlacesResponseError'
  }
}

function isBoundedString(value: unknown, maxLength = MAX_STRING_LENGTH): value is string {
  return (
    typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
  )
}

function isNullableDisplayString(value: unknown, maxLength = MAX_STRING_LENGTH) {
  return (
    value === null || (typeof value === 'string' && value.length <= maxLength)
  )
}

function isDisplayString(value: unknown, maxLength = MAX_STRING_LENGTH) {
  return typeof value === 'string' && value.length <= maxLength
}

function isNullableBoolean(value: unknown) {
  return value === null || typeof value === 'boolean'
}

function isRecommendedPlaceDto(value: unknown): value is RecommendedPlaceDto {
  if (!value || typeof value !== 'object') return false
  const place = value as Partial<RecommendedPlaceDto>
  return (
    isBoundedString(place.externalPlaceId) &&
    isBoundedString(place.placeName) &&
    isNullableDisplayString(place.placeImageUrl, MAX_URL_LENGTH) &&
    typeof place.latitude === 'number' &&
    Number.isFinite(place.latitude) &&
    place.latitude >= -90 &&
    place.latitude <= 90 &&
    typeof place.longitude === 'number' &&
    Number.isFinite(place.longitude) &&
    place.longitude >= -180 &&
    place.longitude <= 180 &&
    isDisplayString(place.address) &&
    isBoundedString(place.categoryLabel) &&
    isBoundedString(place.indoorOutdoorType) &&
    isNullableDisplayString(place.allowedPetSize) &&
    isNullableBoolean(place.leashRequired) &&
    isNullableBoolean(place.carrierRequired) &&
    isNullableDisplayString(place.placeCaution)
  )
}

function mapRecommendedPlace(place: RecommendedPlaceDto): RecommendedPlace {
  return {
    externalPlaceId: place.externalPlaceId.trim(),
    name: place.placeName.trim(),
    imageUrl: place.placeImageUrl?.trim() || null,
    latitude: place.latitude,
    longitude: place.longitude,
    address: place.address.trim() || '주소 정보 없음',
    category: place.categoryLabel.trim(),
    indoorOutdoorType: place.indoorOutdoorType.trim(),
    allowedPetSize: place.allowedPetSize?.trim() || null,
    leashRequired: place.leashRequired,
    carrierRequired: place.carrierRequired,
    caution: place.placeCaution?.trim() || null,
  }
}

export function buildRecommendedPlacesRequest({
  destination,
  petId,
  weather,
}: {
  destination: SearchableLocation
  petId: string
  weather?: CourseWeatherInput
}): RecommendedPlacesRequestDto {
  const normalizedPetId = petId.trim()
  if (!normalizedPetId) throw new Error('Recommended places pet ID is required.')

  return {
    petId: normalizedPetId,
    lat: destination.latitude,
    lng: destination.longitude,
    radiusMeters: DEFAULT_RADIUS_METERS,
    limit: DESTINATION_CANDIDATE_LIMIT,
    ...(typeof weather?.temperature === 'number'
      ? { temperature: weather.temperature }
      : {}),
    ...(typeof weather?.humidity === 'number' ? { humidity: weather.humidity } : {}),
    ...(weather?.weatherStatus?.trim()
      ? { weatherStatus: weather.weatherStatus.trim() }
      : {}),
  }
}

export async function fetchRecommendedPlaces(
  request: RecommendedPlacesRequestDto,
  signal?: AbortSignal
): Promise<RecommendedPlace[]> {
  if (isDemoSessionActive()) return buildDemoRecommendedPlaces(request)

  const { data }: { data: unknown } = await apiClient.post(
    API_ENDPOINTS.places.recommended,
    request,
    {
      signal,
      timeout: RECOMMENDED_PLACES_TIMEOUT_MS,
      replayAfterAuthRefresh: true,
    }
  )

  if (
    !Array.isArray(data) ||
    data.length > MAX_RECOMMENDED_PLACES ||
    !data.every(isRecommendedPlaceDto)
  ) {
    throw new InvalidRecommendedPlacesResponseError()
  }

  return data.map(mapRecommendedPlace)
}

export function getPlaceRecommendationErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') {
    return '추천 장소를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
  }
  if (error instanceof InvalidRecommendedPlacesResponseError) {
    return '추천 장소 응답 형식을 확인하지 못했습니다. 서버 API 계약을 확인해주세요.'
  }

  const normalized = error as { status?: unknown; type?: unknown }
  if (normalized.status === 401) return '로그인이 만료되었습니다. 다시 로그인해주세요.'
  if (normalized.status === 403) return '선택한 반려동물로 장소를 추천받을 권한이 없습니다.'
  if (normalized.status === 429) return '추천 요청이 많습니다. 잠시 후 다시 시도해주세요.'
  if (normalized.type === 'network') return '네트워크 연결을 확인하고 다시 시도해주세요.'
  if (normalized.type === 'timeout') return '추천 요청 시간이 초과되었습니다. 다시 시도해주세요.'
  if (normalized.status === 400 || normalized.status === 422) {
    return '반려동물과 탐색 지역 정보를 확인한 뒤 다시 시도해주세요.'
  }
  return '추천 장소를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
}
