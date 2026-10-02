import { afterEach, describe, expect, it } from 'vitest'
import {
  findLatestTravelDiaryForCourse,
  findTravelDiaryForCourse,
  getSavedFinalTravelReview,
  saveFinalTravelReview,
} from '@/features/album/lib/album-diary'
import type { Post } from '@/features/community/types/community'

function post(overrides: Partial<Post>): Post {
  return {
    id: 'post-1',
    petId: 'pet-1',
    photoId: null,
    courseId: 'course-1',
    title: '여행 후기',
    content: '최종 여행 일기',
    nickname: '보호자',
    authorProfilePhotoUrl: null,
    photoUrl: null,
    photos: [],
    viewCount: 0,
    recommendationCount: 0,
    recommended: false,
    bookmarked: false,
    commentCount: 0,
    createdAt: '2026-09-16T10:00:00Z',
    category: 'TRAVEL_REVIEW',
    ...overrides,
  }
}

describe('findTravelDiaryForCourse', () => {
  afterEach(() => localStorage.clear())

  it('uses the latest travel-review post content for the matching course', () => {
    expect(findTravelDiaryForCourse([
      post({ id: 'older', content: '이전 일기', createdAt: '2026-09-15T10:00:00Z' }),
      post({ id: 'free', category: 'FREE', content: '일반 게시글' }),
      post({ id: 'other', courseId: 'course-2', content: '다른 여행 일기' }),
      post({ id: 'latest', content: '게시판에 등록된 최종 여행 일기' }),
    ], 'course-1')).toBe('게시판에 등록된 최종 여행 일기')
  })

  it('accepts an older response without a category when it has the course id', () => {
    expect(findTravelDiaryForCourse([
      post({ category: null, content: '기존 여행 후기 내용' }),
    ], 'course-1')).toBe('기존 여행 후기 내용')
  })

  it('keeps only the last final review saved for a course', () => {
    saveFinalTravelReview('course-1', '첫 번째 최종 후기', 100)
    saveFinalTravelReview('course-1', '마지막 최종 후기', 200)

    expect(getSavedFinalTravelReview('course-1')).toEqual({
      content: '마지막 최종 후기',
      createdAt: 200,
    })
  })

  it('exposes the timestamp of the latest matching server diary', () => {
    expect(findLatestTravelDiaryForCourse([
      post({ id: 'older', content: '이전 후기', createdAt: '2026-09-15T10:00:00Z' }),
      post({ id: 'latest', content: '최종 후기', createdAt: '2026-09-16T10:00:00Z' }),
    ], 'course-1')).toEqual({
      content: '최종 후기',
      createdAt: Date.parse('2026-09-16T10:00:00Z'),
    })
  })
})
