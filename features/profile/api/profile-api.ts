'use client'

import { apiClient, publicApiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { BreedOption, NamedOption } from '@/features/auth/types/signup'
import type {
  PetMutationInput,
  PetOptions,
  ProfilePet,
  ProfilePost,
  ProfileReview,
  ProfileSummary,
  WishlistPlace,
} from '@/features/profile/types/profile'

const PET_SIZES = new Set(['SMALL', 'MEDIUM', 'LARGE'])
const REVIEW_WEATHER = new Set(['SUNNY', 'CLOUDY', 'RAINY', 'SNOWY'])
const MAX_PROFILE_COLLECTION_ITEMS = 200
const MAX_PET_ACTIVITIES = 50
const WISHLIST_DETAIL_CONCURRENCY = 6

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function isString(value: unknown, maxLength = 20_000): value is string {
  return typeof value === 'string' && value.length <= maxLength
}

function isNullableString(value: unknown, maxLength = 20_000): value is string | null {
  return value === null || isString(value, maxLength)
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRating(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 5
}

function isIdentifier(value: unknown, maxLength = 200): value is string {
  return isString(value, maxLength) && value.trim().length > 0
}

function requireIdentifier(value: string, label: string) {
  if (!isIdentifier(value)) throw new Error(`${label} is required.`)
  return value.trim()
}

function parseCollection(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length > MAX_PROFILE_COLLECTION_ITEMS) {
    throw new Error(`${label} response was invalid.`)
  }
  return value
}

function isNamedOption(value: unknown): value is NamedOption {
  return (
    isObject(value) &&
    isString(value.id, 100) &&
    value.id.trim().length > 0 &&
    isString(value.name, 100) &&
    value.name.trim().length > 0
  )
}

function isBreedOption(value: unknown): value is BreedOption {
  return (
    isObject(value) &&
    isNonNegativeInteger(value.id) &&
    isString(value.name, 100) &&
    value.name.trim().length > 0
  )
}

function parseProfileSummary(value: unknown): ProfileSummary {
  if (
    !isObject(value) ||
    !isString(value.nickname, 100) ||
    value.nickname.trim().length === 0 ||
    !isString(value.email, 320) ||
    !isNonNegativeInteger(value.petCount)
  ) {
    throw new Error('Profile summary response was invalid.')
  }

  return {
    nickname: value.nickname.trim(),
    email: value.email.trim(),
    petCount: value.petCount,
  }
}

function parsePet(value: unknown): ProfilePet {
  if (
    !isObject(value) ||
    !isIdentifier(value.id, 100) ||
    !isString(value.petName, 100) ||
    value.petName.trim().length === 0 ||
    !(value.breedId === null || isNonNegativeInteger(value.breedId)) ||
    !isString(value.breedName, 100) ||
    value.breedName.trim().length === 0 ||
    !isString(value.size, 20) ||
    !PET_SIZES.has(value.size) ||
    !isNonNegativeInteger(value.age) ||
    value.age > 100 ||
    !Array.isArray(value.activities) ||
    value.activities.length > MAX_PET_ACTIVITIES ||
    !value.activities.every(isNamedOption)
  ) {
    throw new Error('Pet response was invalid.')
  }

  const activities = value.activities.map((activity) => ({
    id: activity.id.trim(),
    name: activity.name.trim(),
  }))
  if (new Set(activities.map((activity) => activity.id)).size !== activities.length) {
    throw new Error('Pet response contained duplicate activities.')
  }

  return {
    id: value.id,
    petName: value.petName.trim(),
    breedId: value.breedId,
    breedName: value.breedName.trim(),
    size: value.size as ProfilePet['size'],
    age: value.age,
    activities,
  }
}

function parsePost(value: unknown): ProfilePost {
  if (
    !isObject(value) ||
    !isIdentifier(value.id, 100) ||
    !isString(value.title, 500) ||
    value.title.trim().length === 0 ||
    !isString(value.content) ||
    !isNonNegativeInteger(value.viewCount) ||
    !isNonNegativeInteger(value.recommendationCount) ||
    !isNonNegativeInteger(value.commentCount) ||
    !isString(value.nickname, 100) ||
    value.nickname.trim().length === 0 ||
    !isNullableString(value.photoUrl, 2_000) ||
    !isNullableString(value.createdAt, 100)
  ) {
    throw new Error('Profile post response was invalid.')
  }

  return {
    id: value.id,
    title: value.title.trim(),
    content: value.content.trim(),
    viewCount: value.viewCount,
    recommendationCount: value.recommendationCount,
    commentCount: value.commentCount,
    nickname: value.nickname.trim(),
    photoUrl: value.photoUrl,
    createdAt: value.createdAt,
  }
}

function parseWishlistItem(value: unknown) {
  if (
    !isObject(value) ||
    !isIdentifier(value.placeId, 200) ||
    !isNullableString(value.createdAt, 100)
  ) {
    throw new Error('Wishlist response was invalid.')
  }
  return { placeId: value.placeId.trim(), createdAt: value.createdAt }
}

function parsePlace(value: unknown) {
  if (
    !isObject(value) ||
    !isIdentifier(value.externalPlaceId, 200) ||
    !isString(value.placeName, 500) ||
    value.placeName.trim().length === 0 ||
    !isString(value.address, 1_000) ||
    !isRating(value.rating) ||
    !isNonNegativeInteger(value.reviewNum)
  ) {
    throw new Error('Place response was invalid.')
  }
  return {
    externalPlaceId: value.externalPlaceId.trim(),
    placeName: value.placeName.trim(),
    address: value.address.trim(),
    rating: value.rating,
    reviewCount: value.reviewNum,
  }
}

function parseReview(value: unknown): ProfileReview {
  if (
    !isObject(value) ||
    !isIdentifier(value.id, 100) ||
    !isIdentifier(value.placeId, 200) ||
    !isIdentifier(value.petId, 100) ||
    !isRating(value.rating) ||
    !isString(value.contents) ||
    !(value.weather === null || (isString(value.weather, 20) && REVIEW_WEATHER.has(value.weather))) ||
    !isNonNegativeInteger(value.recommendationCount) ||
    !isNullableString(value.createdAt, 100) ||
    !isNullableString(value.coursePlaceId, 100)
  ) {
    throw new Error('Profile review response was invalid.')
  }

  return value as unknown as ProfileReview
}

export async function fetchProfileSummary(signal?: AbortSignal) {
  const { data }: { data: unknown } = await apiClient.get(API_ENDPOINTS.users.mypage, {
    signal,
  })
  return parseProfileSummary(data)
}

export async function fetchPets(signal?: AbortSignal) {
  const { data }: { data: unknown } = await apiClient.get(API_ENDPOINTS.pets.list, {
    signal,
  })
  return parseCollection(data, 'Pets').map(parsePet)
}

export async function fetchPetOptions(signal?: AbortSignal): Promise<PetOptions> {
  const [breedsResponse, activitiesResponse] = await Promise.all([
    publicApiClient.get<unknown>(API_ENDPOINTS.breeds.list, { signal }),
    publicApiClient.get<unknown>(API_ENDPOINTS.activities.list, { signal }),
  ])
  if (
    !Array.isArray(breedsResponse.data) ||
    breedsResponse.data.length > 500 ||
    !breedsResponse.data.every(isBreedOption) ||
    !Array.isArray(activitiesResponse.data) ||
    activitiesResponse.data.length > 200 ||
    !activitiesResponse.data.every(isNamedOption)
  ) {
    throw new Error('Pet options response was invalid.')
  }
  return {
    breeds: breedsResponse.data,
    activities: activitiesResponse.data,
  }
}

export async function createPet(input: PetMutationInput) {
  const { data }: { data: unknown } = await apiClient.post(API_ENDPOINTS.pets.list, input)
  return parsePet(data)
}

export async function updatePet(petId: string, input: Partial<PetMutationInput>) {
  const normalizedPetId = requireIdentifier(petId, 'Pet ID')
  const { data }: { data: unknown } = await apiClient.patch(
    API_ENDPOINTS.pets.detail(normalizedPetId),
    input
  )
  return parsePet(data)
}

export async function deletePet(petId: string) {
  await apiClient.delete(API_ENDPOINTS.pets.detail(requireIdentifier(petId, 'Pet ID')))
}

export async function updateNickname(currentNickname: string, nextNickname: string) {
  const nickname = nextNickname.trim()
  if (!nickname) throw new Error('Nickname is required.')

  if (nickname !== currentNickname.trim()) {
    const { data }: { data: unknown } = await publicApiClient.get(
      API_ENDPOINTS.users.nicknameAvailability,
      { params: { nickname } }
    )
    if (!isObject(data) || data.nickname !== nickname || typeof data.available !== 'boolean') {
      throw new Error('Nickname availability response was invalid.')
    }
    if (!data.available) {
      throw Object.assign(new Error('Nickname is unavailable.'), { status: 409 })
    }
  }

  const { data }: { data: unknown } = await apiClient.patch(API_ENDPOINTS.users.me, {
    nickname,
  })
  if (!isObject(data) || !isString(data.nickname, 100)) {
    throw new Error('Profile update response was invalid.')
  }
  return data.nickname.trim()
}

export async function withdrawAccount() {
  await apiClient.patch(API_ENDPOINTS.users.me, { accountStatus: 'WITHDRAWN' })
}

export async function fetchMyPosts(signal?: AbortSignal) {
  const { data }: { data: unknown } = await apiClient.get(API_ENDPOINTS.users.posts, {
    signal,
  })
  return parseCollection(data, 'Profile posts').map(parsePost)
}

export async function fetchBookmarks(signal?: AbortSignal) {
  const { data }: { data: unknown } = await apiClient.get(API_ENDPOINTS.users.bookmarks, {
    signal,
  })
  return parseCollection(data, 'Bookmarks').map(parsePost)
}

export async function removeBookmark(postId: string) {
  await apiClient.delete(
    API_ENDPOINTS.community.bookmark(requireIdentifier(postId, 'Post ID'))
  )
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
) {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  )
  return results
}

export async function fetchWishlist(signal?: AbortSignal): Promise<WishlistPlace[]> {
  const { data }: { data: unknown } = await apiClient.get(API_ENDPOINTS.users.wishlist, {
    signal,
  })
  const items = parseCollection(data, 'Wishlist').map(parseWishlistItem)
  const places = await mapWithConcurrency(
    items,
    WISHLIST_DETAIL_CONCURRENCY,
    async (item) => {
      const { data: placeData }: { data: unknown } = await apiClient.get(
        API_ENDPOINTS.places.detail(item.placeId),
        { signal }
      )
      const place = parsePlace(placeData)
      return {
        placeId: item.placeId,
        placeName: place.placeName,
        address: place.address,
        rating: place.rating,
        reviewCount: place.reviewCount,
        createdAt: item.createdAt,
      }
    }
  )
  return places
}

export async function removeWishlistPlace(placeId: string) {
  await apiClient.delete(
    API_ENDPOINTS.users.wishlistPlace(requireIdentifier(placeId, 'Place ID'))
  )
}

export async function fetchMyReviews(signal?: AbortSignal) {
  const { data }: { data: unknown } = await apiClient.get(API_ENDPOINTS.users.reviews, {
    signal,
  })
  return parseCollection(data, 'Profile reviews').map(parseReview)
}

interface ProfileApiError {
  type?: string
  status?: number
}

export function getProfileErrorMessage(error: unknown) {
  const apiError = error as ProfileApiError
  if (apiError.status === 409) return '이미 사용 중인 닉네임입니다.'
  if (apiError.type === 'network') return '네트워크 연결을 확인해주세요.'
  if (apiError.type === 'timeout' || (apiError.status ?? 0) >= 500) {
    return '서버 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.'
  }
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'
}
