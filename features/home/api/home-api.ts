'use client'

import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { parsePostPage } from '@/features/community/lib/community-model'
import type { HomeSummary, HotPost } from '@/features/home/types/home'

interface HomeSummaryDto {
  nickname: string
  petNames: string[]
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
