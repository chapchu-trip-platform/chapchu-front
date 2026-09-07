import type { Comment, Post, Review } from '@/features/community/types/community'

export const postFixture: Post = {
  id: 'post-1', petId: 'pet-1', photoId: null, courseId: 'course-1',
  title: '반려견과 바다 산책', content: '함께 걸었던 여행 기록', nickname: '여행자',
  photoUrl: null, viewCount: 12, recommendationCount: 3, commentCount: 2, createdAt: '2026-08-30T10:30:00',
  recommended: false, bookmarked: false,
}

export const commentFixture: Comment = {
  id: 'comment-1', postId: 'post-1', parentCommentId: null, depth: 0, commentOrder: 1,
  content: '즐거운 여행이네요', nickname: '댓글 작성자', deleted: false, createdAt: null,
}

export const reviewFixture: Review = {
  id: 'review-1', placeId: 'place-1', petId: 'pet-1', rating: 4,
  contents: '반려견과 걷기 좋아요', weather: 'SUNNY', coursePlaceId: null,
  recommendationCount: 2, createdAt: null,
}
