'use client'

import { isDemoSessionActive } from '@/features/auth/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

const MAX_STRING_LENGTH = 20_000
const MAX_REVIEW_PHOTOS = 10

export interface CreateTravelReviewInput {
  coursePlaceId: string
  placeId: string
  petId: string
  rating: number
  contents: string
  photoIds: string[]
  weather?: 'SUNNY' | 'CLOUDY' | 'RAINY' | 'SNOWY'
}

export interface CreatedTravelReview {
  reviewId: string
  coursePlaceId: string
}

interface CreatedTravelReviewDto {
  id: string
  placeId: string
  petId: string
  rating: number
  contents: string
  coursePlaceId: string | null
  photos: unknown[]
}

function isBoundedString(value: unknown, maxLength = MAX_STRING_LENGTH): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function isReviewPhoto(value: unknown) {
  if (!value || typeof value !== 'object') return false
  const photo = value as { photoId?: unknown; downloadUrl?: unknown; takenAt?: unknown }
  return (
    isBoundedString(photo.photoId, 500) &&
    isBoundedString(photo.downloadUrl, 2_048) &&
    (photo.takenAt === null || isBoundedString(photo.takenAt, 100))
  )
}

function isCreatedReviewDto(value: unknown): value is CreatedTravelReviewDto {
  if (!value || typeof value !== 'object') return false
  const review = value as {
    id?: unknown
    placeId?: unknown
    petId?: unknown
    rating?: unknown
    contents?: unknown
    coursePlaceId?: unknown
    photos?: unknown
  }
  return (
    isBoundedString(review.id, 500) &&
    isBoundedString(review.placeId, 500) &&
    isBoundedString(review.petId, 500) &&
    typeof review.rating === 'number' &&
    Number.isInteger(review.rating) &&
    review.rating >= 1 &&
    review.rating <= 5 &&
    isBoundedString(review.contents) &&
    (review.coursePlaceId === null || isBoundedString(review.coursePlaceId, 500)) &&
    Array.isArray(review.photos) &&
    review.photos.length <= MAX_REVIEW_PHOTOS &&
    review.photos.every(isReviewPhoto)
  )
}

export async function createTravelReview(
  input: CreateTravelReviewInput,
  signal?: AbortSignal
): Promise<CreatedTravelReview> {
  const request = {
    placeId: input.placeId.trim(),
    petId: input.petId.trim(),
    rating: input.rating,
    contents: input.contents.trim(),
    coursePlaceId: input.coursePlaceId.trim(),
    photoIds: input.photoIds,
    ...(input.weather ? { weather: input.weather } : {}),
  }
  if (
    !request.placeId ||
    !request.petId ||
    !request.coursePlaceId ||
    !request.contents ||
    request.contents.length > MAX_STRING_LENGTH ||
    !Number.isInteger(request.rating) ||
    request.rating < 1 ||
    request.rating > 5 ||
    request.photoIds.length > MAX_REVIEW_PHOTOS ||
    request.photoIds.some((photoId) => !photoId.trim())
  ) {
    throw new Error('Travel review input was invalid.')
  }

  if (isDemoSessionActive()) {
    return {
      reviewId: `demo-review-${Date.now()}`,
      coursePlaceId: request.coursePlaceId,
    }
  }

  const { data }: { data: unknown } = await apiClient.post(
    API_ENDPOINTS.reviews.create,
    request,
    { signal }
  )
  if (!isCreatedReviewDto(data) || data.coursePlaceId !== request.coursePlaceId) {
    throw new Error('Travel review response was invalid.')
  }
  return { reviewId: data.id, coursePlaceId: data.coursePlaceId }
}

export function getTravelReviewErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return '여행 후기를 저장하지 못했어요. 다시 시도해주세요.'
  const normalized = error as { status?: unknown; type?: unknown }
  if (normalized.status === 401) return '로그인이 만료되었습니다. 다시 로그인해주세요.'
  if (normalized.status === 403) return '선택한 반려동물로 후기를 저장할 권한이 없습니다.'
  if (normalized.status === 404) return '여행 장소 또는 사진 정보를 찾지 못했습니다.'
  if (normalized.status === 400 || normalized.status === 422) {
    return '후기 내용, 별점, 사진 정보를 확인해주세요.'
  }
  if (normalized.type === 'network') return '네트워크 연결을 확인하고 다시 시도해주세요.'
  if (normalized.type === 'timeout') return '후기 저장 시간이 초과되었습니다. 다시 시도해주세요.'
  return '여행 후기를 저장하지 못했어요. 다시 시도해주세요.'
}
