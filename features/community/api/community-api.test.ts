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
    const summary = {
      id: 'summary-1', title: '목록 제목', nickname: '작성자', recommendationCount: 1, commentCount: 2,
      thumbnail: null, createdAt: '2026-09-08T12:00:00Z',
    }
    vi.mocked(apiClient.get).mockResolvedValue({ data: { posts: [summary], nextCursor: null } })
    const signal = new AbortController().signal
    await expect(api.fetchPosts('popular', 'date~id+/=', signal)).resolves.toEqual({
      posts: [{ id: 'summary-1', photoId: null, title: '목록 제목', nickname: '작성자', authorProfilePhotoUrl: null, recommendationCount: 1, commentCount: 2, photoUrl: null, createdAt: '2026-09-08T12:00:00Z' }],
      nextCursor: null,
    })
    expect(apiClient.get).toHaveBeenCalledWith('/posts', { params: { sort: 'popular', size: 20, cursor: 'date~id+/=' }, signal })
    await api.fetchPosts('latest')
    expect(apiClient.get).toHaveBeenLastCalledWith('/posts', { params: { sort: 'latest', size: 20 }, signal: undefined })
  })

  it('requests only travel review posts for the travel review board', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { posts: [], nextCursor: null } })

    await api.fetchPosts('latest', undefined, undefined, 'TRAVEL_REVIEW')

    expect(apiClient.get).toHaveBeenCalledWith('/posts', {
      params: { sort: 'latest', size: 20, type: 'TRAVEL_REVIEW' },
      signal: undefined,
    })
  })
  it('maps the free-board category to the documented general post type', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { posts: [], nextCursor: null } })

    await api.fetchPosts('latest', undefined, undefined, 'FREE')

    expect(apiClient.get).toHaveBeenCalledWith('/posts', {
      params: { sort: 'latest', size: 20, type: 'GENERAL' },
      signal: undefined,
    })
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
  it.each([200, 201])('creates a text-only free-board post from a %i response without parsing a body', async status => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: undefined, status })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: postFixture })
    const input = { title: '제목', content: '내용' }
    const signal = new AbortController().signal
    await expect(api.createPost(input, signal)).resolves.toBeUndefined()
    await api.updatePost('post-1', { title: '수정', content: '본문' }, signal)
    expect(apiClient.post).toHaveBeenCalledWith('/posts', input, { signal })
    expect(apiClient.patch).toHaveBeenCalledWith('/posts/post-1', { title: '수정', content: '본문' }, { signal })
    await api.deletePost('post-1')
    expect(apiClient.delete).toHaveBeenCalledWith('/posts/post-1')
  })
  it('maps an explicit UI category to the documented postType request field', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: undefined, status: 201 })

    await api.createPost({ title: '제목', content: '내용', category: 'FREE' })

    expect(apiClient.post).toHaveBeenCalledWith(
      '/posts',
      { title: '제목', content: '내용', postType: 'GENERAL' },
      { signal: undefined }
    )
  })
  it('preserves the three-state post photo update contract', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: postFixture })
    const signal = new AbortController().signal
    await api.updatePost('post-1', { title: '유지', content: '본문' }, signal)
    await api.updatePost('post-1', { title: '전체 삭제', content: '본문', photos: [] }, signal)
    await api.updatePost('post-1', {
      title: '교체', content: '본문', photos: [{ photoKey: 'post/user/one.jpg' }, { photoKey: 'post/user/two.jpg' }],
    }, signal)
    await api.updatePost('post-1', { title: '명시적 유지', content: '본문', photos: null }, signal)
    expect(apiClient.patch).toHaveBeenNthCalledWith(1, '/posts/post-1', { title: '유지', content: '본문' }, { signal })
    expect(apiClient.patch).toHaveBeenNthCalledWith(2, '/posts/post-1', { title: '전체 삭제', content: '본문', photos: [] }, { signal })
    expect(apiClient.patch).toHaveBeenNthCalledWith(3, '/posts/post-1', {
      title: '교체', content: '본문', photos: [{ photoKey: 'post/user/one.jpg' }, { photoKey: 'post/user/two.jpg' }],
    }, { signal })
    expect(apiClient.patch).toHaveBeenNthCalledWith(4, '/posts/post-1', {
      title: '명시적 유지', content: '본문', photos: null,
    }, { signal })
  })
  it('rejects duplicate photo keys before updating a post', async () => {
    await expect(api.updatePost('post-1', {
      title: '중복 사진',
      content: '본문',
      photos: [{ photoKey: 'post/user/same.jpg' }, { photoKey: 'post/user/same.jpg' }],
    })).rejects.toThrow('Post photo keys must be unique.')
    expect(apiClient.patch).not.toHaveBeenCalled()
  })
  it.each([202, 204])('does not confirm publication from an unexpected %i response', async status => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: undefined, status })

    await expect(api.createPost({ title: '제목', content: '내용' })).rejects.toThrow('Unexpected post creation status.')
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
  it('loads sorted comments with a signal and rejects duplicate IDs, missing authors and cross-post data', async () => {
    const signal = new AbortController().signal
    const later = { ...commentFixture, id: 'comment-2', commentOrder: 2 }
    vi.mocked(apiClient.get).mockResolvedValue({ data: [later, commentFixture] })
    expect(await api.fetchComments('post-1', signal)).toEqual([commentFixture, later])
    expect(apiClient.get).toHaveBeenCalledWith('/posts/post-1/comments', { signal })
    for (const data of [[commentFixture, commentFixture], [{ ...commentFixture, nickname: undefined }], [{ ...commentFixture, postId: 'other' }], {}]) {
      vi.mocked(apiClient.get).mockResolvedValue({ data })
      await expect(api.fetchComments('post-1')).rejects.toThrow()
    }
  })
  it('patches only comment content and validates the returned resource', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { ...commentFixture, content: '수정' } })
    expect((await api.updateComment('post-1', 'comment-1', ' 수정 ')).content).toBe('수정')
    expect(apiClient.patch).toHaveBeenCalledWith('/comments/comment-1', { content: '수정' })
    for (const data of [{ ...commentFixture, id: 'other' }, { ...commentFixture, postId: 'other' }]) {
      vi.mocked(apiClient.patch).mockResolvedValue({ data })
      await expect(api.updateComment('post-1', 'comment-1', '수정')).rejects.toThrow()
    }
    vi.mocked(apiClient.patch).mockClear()
    await expect(api.updateComment('post-1', 'comment-1', ' ')).rejects.toThrow()
    expect(apiClient.patch).not.toHaveBeenCalled()
  })
  it('logs only safe bookmark failure metadata in development and never logs in production', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failure = { status: 500, message: 'Internal Server Error', details: { token: 'secret', email: 'private' } }
    vi.mocked(apiClient.delete).mockRejectedValue(failure)
    try {
      vi.stubEnv('NODE_ENV', 'development')
      await expect(api.setPostBookmark('private-post-id', false)).rejects.toEqual(failure)
      expect(log).toHaveBeenCalledExactlyOnceWith('[community] Bookmark cancellation failed', {
        method: 'DELETE', route: '/posts/:postId/bookmarks', observedAt: expect.any(String), status: 500, message: 'Internal Server Error',
      })
      log.mockClear()
      vi.mocked(apiClient.delete).mockRejectedValue({ status: 500, message: 'secret personal data' })
      await expect(api.setPostBookmark('private-post-id', false)).rejects.toBeDefined()
      expect(JSON.stringify(log.mock.calls)).not.toContain('secret')
      log.mockClear()
      vi.stubEnv('NODE_ENV', 'production')
      await expect(api.setPostBookmark('private-post-id', false)).rejects.toBeDefined()
      expect(log).not.toHaveBeenCalled()
    } finally { vi.unstubAllEnvs(); log.mockRestore() }
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
