import { describe, expect, it } from 'vitest'
import { commentFixture, postFixture, reviewFixture } from '@/test/fixtures/community'
import { communityErrorMessage, formatCommunityDate, mergePosts, orderComments, parsePhotoDownload, parsePost, parsePostPage, parsePostSummary, parseReview, safePhotoUrl } from './community-model'

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
    expect(() => parsePostPage({ posts: [postFixture], nextCursor: null })).toThrow()
    expect(() => parsePostPage([postFixture])).toThrow()
    expect(() => parsePostPage({ posts: [], nextCursor: '' })).toThrow()
    expect(() => parsePostPage({ posts: [], nextCursor: 12 })).toThrow()
  })
  it('keeps opaque cursors intact and deduplicates overlapping pages in order', () => {
    const cursor = '2026-08-30T10:30:00~id+value/='
    const summary = {
      id: 'post-1', title: '제목', nickname: '작성자', recommendationCount: 1, commentCount: 0,
      thumbnail: null, createdAt: null,
    }
    expect(parsePostPage({ posts: [summary], nextCursor: cursor }).nextCursor).toBe(cursor)
    const changed = { ...postFixture, title: '수정된 제목' }
    expect(mergePosts([postFixture], [changed, { ...postFixture, id: 'post-2' }])).toEqual([changed, { ...postFixture, id: 'post-2' }])
  })
  it('maps the current summary-shaped list response without requiring detail fields', () => {
    const summary = {
      id: 'summary-1',
      title: '요약 게시글',
      nickname: '작성자',
      recommendationCount: 3,
      commentCount: 2,
      thumbnail: null,
      createdAt: '2026-09-08T12:00:00Z',
    }
    expect(parsePostPage({ posts: [summary], nextCursor: null })).toEqual({
      posts: [{
        id: 'summary-1', photoId: null, title: '요약 게시글', nickname: '작성자', recommendationCount: 3,
        authorProfilePhotoUrl: null, commentCount: 2, photoUrl: null, createdAt: '2026-09-08T12:00:00Z',
      }],
      nextCursor: null,
    })
  })
  it('maps the documented post type to the UI board category', () => {
    const summary = {
      id: 'travel-summary', title: '여행 기록', nickname: '작성자', recommendationCount: 0, commentCount: 0,
      thumbnail: null, postType: 'TRAVEL_REVIEW', createdAt: null,
    }
    expect(parsePostSummary(summary).category).toBe('TRAVEL_REVIEW')
    expect(parsePost({ ...postFixture, postType: 'TRAVEL_REVIEW' }).category).toBe('TRAVEL_REVIEW')
    expect(parsePostSummary({ ...summary, postType: 'GENERAL' }).category).toBe('FREE')
    expect(() => parsePostSummary({ ...summary, postType: 'UNKNOWN' })).toThrow('Invalid community post type.')
  })
  it('does not treat an opaque thumbnail photo key as a browser URL', () => {
    const summary = {
      id: 'summary-1', title: '요약 게시글', nickname: '작성자', recommendationCount: 0, commentCount: 0,
      thumbnail: { photoId: 'photo-1', photoKey: 'posts/member/photo.jpg' }, createdAt: null,
    }
    expect(parsePostSummary(summary).photoUrl).toBeNull()
    expect(parsePostSummary(summary).photoId).toBe('photo-1')
    expect(parsePostSummary({ ...summary, thumbnail: { photoId: 'photo-1', photoKey: 'https://untrusted.example/photo.jpg' } }).photoUrl).toBeNull()
    expect(() => parsePostSummary({ ...summary, thumbnail: { photoId: '', photoKey: null } })).toThrow()
  })
  it('maps documented post and author URLs while rejecting unsafe author URLs locally', () => {
    const summary = {
      id: 'summary-1', title: '사진 글', nickname: '작성자', recommendationCount: 0, commentCount: 0,
      authorProfilePhotoUrl: 'https://example.com/avatar.jpg',
      thumbnail: { photoId: 'photo-1', photoKey: 'post/member/photo.jpg', downloadUrl: 'https://example.com/post.jpg' },
      createdAt: null,
    }
    expect(parsePostSummary(summary)).toMatchObject({
      authorProfilePhotoUrl: 'https://example.com/avatar.jpg',
      photoUrl: 'https://example.com/post.jpg',
    })
    expect(parsePostSummary({ ...summary, authorProfilePhotoUrl: 'http://example.com/avatar.jpg' }).authorProfilePhotoUrl).toBeNull()
    expect(parsePost({
      ...postFixture,
      authorProfilePhotoUrl: 'https://example.com/avatar.jpg',
      photoId: 'photo-1',
      photoUrl: 'https://example.com/post.jpg',
      photos: [{ photoId: 'photo-1', photoKey: 'post/member/photo.jpg', downloadUrl: 'https://example.com/post.jpg' }],
    })).toMatchObject({
      authorProfilePhotoUrl: 'https://example.com/avatar.jpg',
      photos: [{ downloadUrl: 'https://example.com/post.jpg' }],
    })
  })
  it('treats an incomplete deployed thumbnail as unavailable without rejecting its post', () => {
    const summary = {
      id: 'summary-1', title: '기존 글', nickname: '작성자', recommendationCount: 0, commentCount: 0,
      thumbnail: { photoId: 'photo-1', photoKey: null }, createdAt: null,
    }
    expect(parsePostSummary(summary)).toMatchObject({ photoId: null, photoUrl: null })
    expect(parsePost({ ...postFixture, photoId: 'photo-1', photos: [{ photoId: 'photo-1', photoKey: null }] }).photos).toEqual([
      { photoId: 'photo-1', photoKey: null, downloadUrl: null },
    ])
  })
  it('validates the documented post photo collection before mapping it', () => {
    const photo = { photoId: 'photo-1', photoKey: 'post/member/photo.jpg', downloadUrl: null }
    expect(parsePost({ ...postFixture, photoId: photo.photoId, photos: [photo] }).photos).toEqual([photo])
    expect(parsePost({ ...postFixture, photos: Array.from({ length: 10 }, (_, index) => ({
      photoId: `photo-${index}`, photoKey: `post/member/${index}.jpg`,
    })) }).photos).toHaveLength(10)
    expect(() => parsePost({ ...postFixture, photos: Array.from({ length: 11 }, (_, index) => ({
      photoId: `photo-${index}`, photoKey: `post/member/${index}.jpg`,
    })) })).toThrow()
    expect(() => parsePost({ ...postFixture, photos: undefined })).toThrow()
    expect(() => parsePost({ ...postFixture, photos: [{ photoId: '', photoKey: 'post/member/photo.jpg' }] })).toThrow()
    expect(() => parsePost({ ...postFixture, photos: [{ photoId: 'photo-1', photoKey: '' }] })).toThrow()
  })
  it('validates photo download responses and allows an absent taken date', () => {
    expect(parsePhotoDownload({ id: 'photo-1', downloadUrl: 'https://example.com/photo.jpg', takenAt: null })).toEqual({
      id: 'photo-1', downloadUrl: 'https://example.com/photo.jpg', takenAt: null,
    })
    expect(() => parsePhotoDownload({ id: 'photo-1', downloadUrl: 'http://example.com/photo.jpg', takenAt: null })).toThrow()
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
