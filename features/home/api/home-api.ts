'use client'

import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { HomeSummary, HotPost } from '@/features/home/types/home'

interface HomeSummaryDto {
  nickname: string
  petNames: string[]
}

interface PostDto {
  id: string
  photoId: string | null
  title: string
  content: string
  viewCount: number
  recommendationCount: number
  createdAt: string | null
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength
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

function isPostDto(value: unknown): value is PostDto {
  if (!value || typeof value !== 'object') return false
  const post = value as Partial<PostDto>
  return (
    isBoundedString(post.id, 100) &&
    (post.photoId === null || isBoundedString(post.photoId, 100)) &&
    isBoundedString(post.title, 500) &&
    isBoundedString(post.content, 20_000) &&
    isNonNegativeNumber(post.viewCount) &&
    isNonNegativeNumber(post.recommendationCount) &&
    (post.createdAt === null || isBoundedString(post.createdAt, 100))
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
    params: { sort: 'popular' },
    signal,
  })
  if (!Array.isArray(data) || data.length > 1_000 || !data.every(isPostDto)) {
    throw new Error('Popular posts response was invalid.')
  }

  return data
    .map((post) => ({
      id: post.id,
      title: post.title.trim(),
      content: post.content.trim(),
      viewCount: post.viewCount,
      recommendationCount: post.recommendationCount,
      createdAt: post.createdAt,
      hasPhoto: Boolean(post.photoId?.trim()),
    }))
    .sort((first, second) => second.recommendationCount - first.recommendationCount)
    .slice(0, 3)
}
