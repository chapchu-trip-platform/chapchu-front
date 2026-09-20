'use client'

import { apiClient, publicApiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { parseComment, parseComments, parsePost, parsePostPage, parsePosts, parseReview, parseReviews } from '@/features/community/lib/community-model'
import type { PostCategory, PostInput, ReviewInput, UpdatePostInput } from '@/features/community/types/community'

const endpoints = API_ENDPOINTS.community
const postTypeByCategory = {
  FREE: 'GENERAL',
  TRAVEL_REVIEW: 'TRAVEL_REVIEW',
} as const satisfies Record<PostCategory, string>

export async function fetchPosts(
  sort: 'latest' | 'popular',
  cursor?: string,
  signal?: AbortSignal,
  category?: PostCategory
) {
  const { data } = await apiClient.get<unknown>(endpoints.posts, {
    params: { sort, size: 20, ...(cursor ? { cursor } : {}), ...(category ? { type: postTypeByCategory[category] } : {}) },
    signal,
  })
  return parsePostPage(data)
}

export async function fetchPost(postId: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(endpoints.post(postId), { signal })
  return parsePost(data)
}

export async function fetchMyPosts(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(API_ENDPOINTS.users.posts, { signal })
  return parsePosts(data)
}

export async function fetchMyBookmarks(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(API_ENDPOINTS.users.bookmarks, { signal })
  return parsePosts(data)
}

export async function createPost(input: PostInput, signal?: AbortSignal) {
  if (input.title.length > 100) throw new Error('Post title exceeds 100 characters.')
  const { category, ...postInput } = input
  const { status } = await apiClient.post<void>(
    endpoints.posts,
    { ...postInput, ...(category ? { postType: postTypeByCategory[category] } : {}) },
    { signal }
  )
  if (status !== 200 && status !== 201) throw new Error('Unexpected post creation status.')
}

export async function updatePost(postId: string, input: UpdatePostInput, signal?: AbortSignal) {
  if (input.title.length > 100) throw new Error('Post title exceeds 100 characters.')
  if (input.photos && input.photos.length > 10) throw new Error('Post photo count exceeds 10.')
  if (input.photos?.some(photo => !photo.photoKey.trim())) throw new Error('Post photo key was empty.')
  if (input.photos && new Set(input.photos.map(photo => photo.photoKey)).size !== input.photos.length) {
    throw new Error('Post photo keys must be unique.')
  }
  const { data } = await apiClient.patch<unknown>(endpoints.post(postId), input, { signal })
  return parsePost(data)
}

export async function deletePost(postId: string) {
  await apiClient.delete(endpoints.post(postId))
}

export async function setPostRecommendation(postId: string, recommended: boolean) {
  const path = endpoints.recommendations(postId)
  if (recommended) await apiClient.post(path)
  else await apiClient.delete(path)
}

export async function setPostBookmark(postId: string, bookmarked: boolean) {
  const path = endpoints.bookmark(postId)
  if (bookmarked) await apiClient.post(path)
  else {
    try { await apiClient.delete(path) } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        const failure = error && typeof error === 'object' ? error as Record<string, unknown> : {}
        // Deliberately exclude raw errors, request IDs, headers, bodies and arbitrary server messages.
        console.error('[community] Bookmark cancellation failed', {
          method: 'DELETE', route: '/posts/:postId/bookmarks', observedAt: new Date().toISOString(),
          status: Number.isInteger(failure.status) && Number(failure.status) >= 100 && Number(failure.status) <= 599 ? failure.status : undefined,
          message: failure.message === 'Internal Server Error' ? 'Internal Server Error' : 'See the HTTP status and development diagnostics.',
        })
      }
      throw error
    }
  }
}

// SPAM is the only reason value demonstrated by the published contract.
export async function reportPost(postId: string, reportDetail: string) {
  await apiClient.post(endpoints.reports(postId), { reportReason: 'SPAM', reportDetail })
}

export async function createComment(postId: string, content: string, parentCommentId: string | null = null) {
  const { data } = await apiClient.post<unknown>(endpoints.comments(postId), { parentCommentId, content })
  const comment = parseComment(data)
  if (comment.postId !== postId || comment.parentCommentId !== parentCommentId) throw new Error('Comment response did not match the request.')
  return comment
}

export async function fetchComments(postId: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(endpoints.comments(postId), { signal })
  const comments = parseComments(data)
  if (comments.some(comment => comment.postId !== postId)) throw new Error('Comments did not match the requested post.')
  return comments
}

export async function updateComment(postId: string, commentId: string, content: string) {
  if (!content.trim() || content.length > 20_000) throw new Error('Invalid comment content.')
  const { data } = await apiClient.patch<unknown>(endpoints.comment(commentId), { content: content.trim() })
  const comment = parseComment(data)
  if (comment.id !== commentId || comment.postId !== postId) throw new Error('Comment response did not match the request.')
  return comment
}

export async function deleteComment(commentId: string) {
  await apiClient.delete(endpoints.comment(commentId))
}

export async function fetchMyReviews(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(API_ENDPOINTS.users.reviews, { signal })
  return parseReviews(data)
}

export async function fetchPlaceReviews(placeId: string, signal?: AbortSignal) {
  const { data } = await publicApiClient.get<unknown>(API_ENDPOINTS.reviews.byPlace(placeId), { signal })
  const reviews = parseReviews(data)
  if (reviews.some(review => review.placeId !== placeId)) throw new Error('Reviews did not match the requested place.')
  return reviews
}

export async function createReview(input: ReviewInput) {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5 || !input.contents.trim()) {
    throw new Error('Invalid review input.')
  }
  const { data } = await apiClient.post<unknown>(API_ENDPOINTS.reviews.list, input)
  return parseReview(data)
}

export async function deleteReview(reviewId: string) {
  await apiClient.delete(API_ENDPOINTS.reviews.detail(reviewId))
}

export async function setReviewRecommendation(reviewId: string, recommended: boolean) {
  const path = API_ENDPOINTS.reviews.recommendations(reviewId)
  if (recommended) await apiClient.post(path)
  else await apiClient.delete(path)
}
