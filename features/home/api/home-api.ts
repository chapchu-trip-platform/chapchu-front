'use client'

import { apiClient, publicApiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { parsePostPage } from '@/features/community/lib/community-model'
import type { HomeSummary, HotPost, NearbyPlace } from '@/features/home/types/home'

export const HOME_NEARBY_RADIUS_METERS = 1_500
const MAX_NEARBY_PLACES = 100

interface HomeSummaryDto {
  nickname: string
  petNames: string[]
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function safeImageUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const latitudeDelta = radians(to.latitude - from.latitude)
  const longitudeDelta = radians(to.longitude - from.longitude)
  const startLatitude = radians(from.latitude)
  const endLatitude = radians(to.latitude)
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return Math.round(6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function parseNearbyPlace(
  value: unknown,
  center: { latitude: number; longitude: number }
): NearbyPlace {
  if (
    !isRecord(value) ||
    !isBoundedString(value.externalPlaceId, 200) ||
    !value.externalPlaceId.trim() ||
    !isBoundedString(value.placeName, 500) ||
    !value.placeName.trim() ||
    !isBoundedString(value.address, 1_000) ||
    !isFiniteNumber(value.latitude) ||
    !isFiniteNumber(value.longitude) ||
    !isFiniteNumber(value.rating) ||
    value.rating < 0 ||
    value.rating > 5 ||
    !isNonNegativeInteger(value.reviewNum) ||
    !(value.petPolicy === null || isRecord(value.petPolicy))
  ) {
    throw new Error('Nearby place response was invalid.')
  }
  return {
    id: value.externalPlaceId.trim(),
    name: value.placeName.trim(),
    imageUrl: safeImageUrl(value.placeImageUrl),
    address: value.address.trim(),
    rating: value.rating,
    reviewCount: value.reviewNum,
    distanceMeters: distanceMeters(center, {
      latitude: value.latitude,
      longitude: value.longitude,
    }),
    hasPetPolicy: value.petPolicy !== null,
  }
}

function isHomeSummaryDto(value: unknown): value is HomeSummaryDto {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<HomeSummaryDto>
  return (
    isBoundedString(data.nickname, 100) &&
    Array.isArray(data.petNames) &&
    data.petNames.length <= 100 &&
    data.petNames.every((name) => isBoundedString(name, 100))
  )
}

export async function fetchHomeSummary(signal?: AbortSignal): Promise<HomeSummary> {
  const { data }: { data: unknown } = await apiClient.get(API_ENDPOINTS.home.summary, {
    signal,
  })
  if (!isHomeSummaryDto(data)) throw new Error('Home response was invalid.')

  return {
    nickname: data.nickname.trim(),
    petNames: data.petNames.map((name) => name.trim()).filter(Boolean),
  }
}

export async function fetchPopularPosts(signal?: AbortSignal): Promise<HotPost[]> {
  const { data }: { data: unknown } = await apiClient.get(API_ENDPOINTS.community.posts, {
    params: { sort: 'popular', size: 3 },
    signal,
  })
  let page
  try {
    page = parsePostPage(data)
  } catch {
    throw new Error('Popular posts response was invalid.')
  }
  if (page.posts.length > 3) {
    throw new Error('Popular posts response was invalid.')
  }

  return page.posts
    .map((post) => ({
      id: post.id,
      nickname: post.nickname.trim(),
      title: post.title.trim(),
      recommendationCount: post.recommendationCount,
      commentCount: post.commentCount,
      createdAt: post.createdAt,
      photoUrl: post.photoUrl,
    }))
    .sort((first, second) => second.recommendationCount - first.recommendationCount)
    .slice(0, 3)
}

export async function fetchNearbyPlaces(
  center: { latitude: number; longitude: number },
  signal?: AbortSignal
): Promise<NearbyPlace[]> {
  const { data }: { data: unknown } = await publicApiClient.get(API_ENDPOINTS.places.nearby, {
    params: {
      lat: Number(center.latitude.toFixed(3)),
      lng: Number(center.longitude.toFixed(3)),
      radiusMeters: HOME_NEARBY_RADIUS_METERS,
    },
    signal,
  })
  if (!Array.isArray(data) || data.length > MAX_NEARBY_PLACES) {
    throw new Error('Nearby places response was invalid.')
  }
  return data
    .map((place) => parseNearbyPlace(place, center))
    .filter((place) => place.distanceMeters <= HOME_NEARBY_RADIUS_METERS)
    .sort((first, second) => first.distanceMeters - second.distanceMeters)
}
