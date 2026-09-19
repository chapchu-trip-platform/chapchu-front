'use client'

import { isDemoSessionActive } from '@/features/auth/stores/auth-store'
import type { RecommendedPlaceDetails } from '@/features/map/types/recommended-place'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

const MAX_STRING_LENGTH = 500

interface PlaceDetailsDto {
  address?: string | null
  businessHours?: string | null
  categoryLabel?: string | null
  phoneNumber?: string | null
  rating?: number | null
  reviewNum?: number | null
  visitNum?: number | null
  petPolicy?: unknown | null
}

const demoDetails: Record<string, RecommendedPlaceDetails> = {
  'demo-place-1': {
    address: '서울 성동구 뚝섬로 273',
    businessHours: '24시간 운영',
    category: '공원',
    phoneNumber: null,
    rating: 4.9,
    reviewCount: 320,
    visitCount: 842,
    petPolicy: '목줄 착용과 배변봉투 지참이 필요해요.',
  },
  'demo-place-2': {
    address: '서울 성동구 연무장길 20',
    businessHours: '09:00 - 22:00',
    category: '카페',
    phoneNumber: '02-000-0000',
    rating: 4.8,
    reviewCount: 124,
    visitCount: 356,
    petPolicy: '실내에서는 목줄을 착용해주세요.',
  },
  'demo-place-3': {
    address: '서울 성동구 왕십리로 83',
    businessHours: '11:00 - 21:00',
    category: '식당',
    phoneNumber: '02-000-0001',
    rating: 4.6,
    reviewCount: 87,
    visitCount: 219,
    petPolicy: '실내에서는 이동장을 이용해주세요.',
  },
}

function optionalDisplayString(value: unknown) {
  return value === undefined || value === null || (
    typeof value === 'string' && value.length <= MAX_STRING_LENGTH
  )
}

function optionalNonNegativeNumber(value: unknown) {
  return value === undefined || value === null || (
    typeof value === 'number' && Number.isFinite(value) && value >= 0
  )
}

function isPlaceDetailsDto(value: unknown): value is PlaceDetailsDto {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const details = value as PlaceDetailsDto
  return (
    optionalDisplayString(details.address) &&
    optionalDisplayString(details.businessHours) &&
    optionalDisplayString(details.categoryLabel) &&
    optionalDisplayString(details.phoneNumber) &&
    optionalNonNegativeNumber(details.rating) &&
    optionalNonNegativeNumber(details.reviewNum) &&
    optionalNonNegativeNumber(details.visitNum)
  )
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || null
}

export async function fetchRecommendedPlaceDetails(
  externalPlaceId: string,
  signal?: AbortSignal
): Promise<RecommendedPlaceDetails> {
  const normalizedId = externalPlaceId.trim()
  if (!normalizedId) throw new Error('Place ID is required.')

  if (isDemoSessionActive()) {
    return demoDetails[normalizedId] ?? {
      address: null,
      businessHours: null,
      category: null,
      phoneNumber: null,
      rating: null,
      reviewCount: null,
      visitCount: null,
      petPolicy: null,
    }
  }

  const { data }: { data: unknown } = await apiClient.get(
    API_ENDPOINTS.places.detail(normalizedId),
    { signal }
  )
  if (!isPlaceDetailsDto(data)) throw new Error('Place details response was invalid.')

  return {
    address: normalizeText(data.address),
    businessHours: normalizeText(data.businessHours),
    category: normalizeText(data.categoryLabel),
    phoneNumber: normalizeText(data.phoneNumber),
    rating: data.rating ?? null,
    reviewCount: data.reviewNum ?? null,
    visitCount: data.visitNum ?? null,
    petPolicy: data.petPolicy ?? null,
  }
}
