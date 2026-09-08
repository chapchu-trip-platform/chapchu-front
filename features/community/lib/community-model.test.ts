import { describe, expect, it } from 'vitest'
import { commentFixture, postFixture, reviewFixture } from '@/test/fixtures/community'
import { communityErrorMessage, formatCommunityDate, mergePosts, orderComments, parsePost, parsePostPage, parseReview, safePhotoUrl } from './community-model'

describe('community contract adapters', () => {
  it('places late replies directly below their parent, including nested replies', () => {
    const comments = [
      { ...commentFixture, id: 'A' },
      { ...commentFixture, id: 'B' },
      { ...commentFixture, id: 'A-reply', parentCommentId: 'A' },
      { ...commentFixture, id: 'A-nested', parentCommentId: 'A-reply' },
    ]
    expect(orderComments(comments).map(({ comment, depth }) => [comment.id, depth])).toEqual([
      ['A', 0], ['A-reply', 1], ['A-nested', 2], ['B', 0],
    ])
  })
  it('accepts nullable fields without inventing pet details, counts or timestamps', () => {
    const post = { ...postFixture, petId: null, courseId: null, createdAt: null }
    expect(parsePost(post)).toEqual(post)
    expect(formatCommunityDate(null)).toBe('날짜 정보 없음')
  })
  it.each([-1, 0.5, '3', NaN])('rejects invalid counts: %s', recommendationCount => {
    expect(() => parsePost({ ...postFixture, recommendationCount })).toThrow()
  })
  it('rejects missing fields and malformed cursor pages', () => {
    expect(() => parsePost({ id: 'post-1' })).toThrow()
    expect(() => parsePostPage([postFixture])).toThrow()
    expect(() => parsePostPage({ posts: [], nextCursor: '' })).toThrow()
    expect(() => parsePostPage({ posts: [], nextCursor: 12 })).toThrow()
  })
  it('keeps opaque cursors intact and deduplicates overlapping pages in order', () => {
    const cursor = '2026-08-30T10:30:00~id+value/='
    expect(parsePostPage({ posts: [postFixture], nextCursor: cursor }).nextCursor).toBe(cursor)
    const changed = { ...postFixture, title: '수정된 제목' }
    expect(mergePosts([postFixture], [changed, { ...postFixture, id: 'post-2' }])).toEqual([changed, { ...postFixture, id: 'post-2' }])
  })
  it.each(['javascript:alert(1)', 'data:image/svg+xml,test', '//example.com/photo.jpg', 'http://example.com/a', 'https://user:secret@example.com/a'])('rejects unsafe photo URL %s', value => {
    expect(safePhotoUrl(value)).toBeNull()
  })
  it('supports credential-free HTTPS photos', () => {
    expect(safePhotoUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg')
  })
  it('validates review contents, nullable weather and integer rating', () => {
    expect(parseReview({ ...reviewFixture, weather: null })).toMatchObject({ weather: null })
    for (const rating of [0, 6, 2.5]) expect(() => parseReview({ ...reviewFixture, rating })).toThrow()
    expect(() => parseReview({ ...reviewFixture, weather: 'WINDY' })).toThrow()
    expect(() => parseReview({ ...reviewFixture, contents: undefined, content: 'wrong field' })).toThrow()
  })
  it('does not expose raw server error text', () => {
    expect(communityErrorMessage({ type: 'server', message: 'private backend detail' })).not.toContain('private')
    expect(communityErrorMessage({ type: 'forbidden' })).toContain('권한')
    expect(communityErrorMessage({ type: 'not-found' })).toContain('찾을 수 없는')
    expect(communityErrorMessage({ status: 409 })).toContain('이미 처리')
  })
})
