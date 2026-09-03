import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, publicApiClient } from '@/lib/api/client'
import { commentFixture, postFixture, reviewFixture } from '@/test/fixtures/community'
import * as api from './community-api'

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  publicApiClient: { get: vi.fn() },
}))

beforeEach(() => vi.resetAllMocks())

describe('community API requests', () => {
  it('requests paginated posts with opaque cursor and signal', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { posts: [postFixture], nextCursor: null } })
    const signal = new AbortController().signal
    await api.fetchPosts('popular', 'date~id+/=', signal)
    expect(apiClient.get).toHaveBeenCalledWith('/posts', { params: { sort: 'popular', size: 20, cursor: 'date~id+/=' }, signal })
    await api.fetchPosts('latest')
    expect(apiClient.get).toHaveBeenLastCalledWith('/posts', { params: { sort: 'latest', size: 20 }, signal: undefined })
  })
  it('loads detail independently and encodes a path segment', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: postFixture })
    await api.fetchPost('post/?#')
    expect(apiClient.get).toHaveBeenCalledWith('/posts/post%2F%3F%23', { signal: undefined })
  })
  it('uses protected collections to establish ownership and bookmark state', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [postFixture] })
    expect(await api.fetchMyPosts()).toEqual([postFixture])
    expect(await api.fetchMyBookmarks()).toEqual([postFixture])
    expect(apiClient.get).toHaveBeenCalledWith('/users/me/posts', { signal: undefined })
    expect(apiClient.get).toHaveBeenCalledWith('/users/me/bookmarks', { signal: undefined })
  })
  it('creates and edits posts with documented fields', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: postFixture })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: postFixture })
    const input = { petId: 'pet-1', photoId: 'photo-1', courseId: 'course-1', title: '제목', content: '내용' }
    await api.createPost(input)
    await api.updatePost('post-1', { title: '수정', content: '본문' })
    expect(apiClient.post).toHaveBeenCalledWith('/posts', input)
    expect(apiClient.patch).toHaveBeenCalledWith('/posts/post-1', { title: '수정', content: '본문' })
    await api.deletePost('post-1')
    expect(apiClient.delete).toHaveBeenCalledWith('/posts/post-1')
  })
  it('keeps recommendation and bookmark creation/cancellation separate', async () => {
    await api.setPostRecommendation('post-1', true)
    await api.setPostRecommendation('post-1', false)
    await api.setPostBookmark('post-1', true)
    await api.setPostBookmark('post-1', false)
    expect(apiClient.post).toHaveBeenCalledWith('/posts/post-1/recommendations')
    expect(apiClient.delete).toHaveBeenCalledWith('/posts/post-1/recommendations')
    expect(apiClient.post).toHaveBeenCalledWith('/posts/post-1/bookmarks')
    expect(apiClient.delete).toHaveBeenCalledWith('/posts/post-1/bookmarks')
  })
  it('sends a selected documented report reason and detail', async () => {
    await api.reportPost('post-1', '광고성 내용')
    expect(apiClient.post).toHaveBeenCalledWith('/posts/post-1/reports', { reportReason: 'SPAM', reportDetail: '광고성 내용' })
  })
  it('creates root comments and replies with server IDs and deletes by comment ID', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: commentFixture }).mockResolvedValueOnce({ data: { ...commentFixture, parentCommentId: 'parent-1', depth: 1 } })
    await api.createComment('post-1', '댓글')
    await api.createComment('post-1', '답글', 'parent-1')
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/posts/post-1/comments', { parentCommentId: null, content: '댓글' })
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/posts/post-1/comments', { parentCommentId: 'parent-1', content: '답글' })
    await api.deleteComment('comment-1')
    expect(apiClient.delete).toHaveBeenCalledWith('/comments/comment-1')
  })
  it('rejects comments returned for another post', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ...commentFixture, postId: 'other' } })
    await expect(api.createComment('post-1', '댓글')).rejects.toThrow()
  })
  it('propagates failed writes without replay', async () => {
    const failure = { type: 'unauthorized', status: 401 }
    vi.mocked(apiClient.post).mockRejectedValue(failure)
    await expect(api.createComment('post-1', '보존할 입력')).rejects.toEqual(failure)
    expect(apiClient.post).toHaveBeenCalledTimes(1)
  })
})

describe('review API requests', () => {
  it('separates my protected reviews from public place reviews', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [reviewFixture] })
    vi.mocked(publicApiClient.get).mockResolvedValue({ data: [reviewFixture] })
    await api.fetchMyReviews()
    await api.fetchPlaceReviews('place-1')
    expect(apiClient.get).toHaveBeenCalledWith('/users/me/reviews', { signal: undefined })
    expect(publicApiClient.get).toHaveBeenCalledWith('/places/place-1/reviews', { signal: undefined })
  })
  it('sends review contents, rating and optional course/weather without post fields', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: reviewFixture })
    const input = { placeId: 'place-1', petId: 'pet-1', contents: '여행 후기', rating: 5 }
    await api.createReview(input)
    expect(apiClient.post).toHaveBeenCalledWith('/reviews', input)
    await expect(api.createReview({ ...input, rating: 6 })).rejects.toThrow()
    expect(apiClient.post).toHaveBeenCalledTimes(1)
  })
  it('deletes reviews and uses their own recommendation paths', async () => {
    await api.deleteReview('review-1')
    await api.setReviewRecommendation('review-1', true)
    await api.setReviewRecommendation('review-1', false)
    expect(apiClient.delete).toHaveBeenCalledWith('/reviews/review-1')
    expect(apiClient.post).toHaveBeenCalledWith('/reviews/review-1/recommendations')
    expect(apiClient.delete).toHaveBeenCalledWith('/reviews/review-1/recommendations')
  })
  it('rejects a public collection from a different place', async () => {
    vi.mocked(publicApiClient.get).mockResolvedValue({ data: [reviewFixture] })
    await expect(api.fetchPlaceReviews('different-place')).rejects.toThrow()
  })
})
