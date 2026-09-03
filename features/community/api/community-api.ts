'use client'

import { apiClient, publicApiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { parseComment, parsePost, parsePostPage, parsePosts, parseReview, parseReviews } from '@/features/community/lib/community-model'
import type { PostInput, ReviewInput } from '@/features/community/types/community'

const endpoints = API_ENDPOINTS.community

export async function fetchPosts(sort: 'latest' | 'popular', cursor?: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(endpoints.posts, { params: { sort, size: 20, ...(cursor ? { cursor } : {}) }, signal })
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

export async function createPost(input: PostInput) {
  const { data } = await apiClient.post<unknown>(endpoints.posts, input)
  return parsePost(data)
}

export async function updatePost(postId: string, input: Pick<PostInput, 'title' | 'content'>) {
  const { data } = await apiClient.patch<unknown>(endpoints.post(postId), input)
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
  else await apiClient.delete(path)
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
