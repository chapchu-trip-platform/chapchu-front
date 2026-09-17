import type { Post } from '@/features/community/types/community'

function postTime(value: string | null) {
  if (!value) return 0
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function findTravelDiaryForCourse(posts: Post[], courseId: string) {
  const normalizedCourseId = courseId.trim()
  if (!normalizedCourseId) return null

  const matchingPost = posts
    .filter(
      (post) =>
        post.courseId === normalizedCourseId &&
        post.category !== 'FREE' &&
        post.content.trim()
    )
    .sort(
      (left, right) =>
        postTime(right.createdAt) - postTime(left.createdAt) ||
        right.id.localeCompare(left.id)
    )[0]

  return matchingPost?.content.trim() ?? null
}
