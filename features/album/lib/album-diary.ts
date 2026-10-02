import type { Post } from '@/features/community/types/community'

const FINAL_REVIEW_CACHE_KEY = 'chapchu.album-final-reviews'
const MAX_FINAL_REVIEWS = 100
const MAX_COURSE_ID_LENGTH = 500
const MAX_REVIEW_LENGTH = 20_000

export interface TravelDiaryEntry {
  content: string
  createdAt: number
}

interface StoredTravelDiaryEntry extends TravelDiaryEntry {
  courseId: string
}

function postTime(value: string | null) {
  if (!value) return 0
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function isStoredTravelDiaryEntry(value: unknown): value is StoredTravelDiaryEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<StoredTravelDiaryEntry>
  return (
    typeof entry.courseId === 'string' &&
    entry.courseId.trim().length > 0 &&
    entry.courseId.length <= MAX_COURSE_ID_LENGTH &&
    typeof entry.content === 'string' &&
    entry.content.trim().length > 0 &&
    entry.content.length <= MAX_REVIEW_LENGTH &&
    typeof entry.createdAt === 'number' &&
    Number.isFinite(entry.createdAt) &&
    entry.createdAt > 0
  )
}

function readStoredTravelDiaries(): StoredTravelDiaryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(
      window.localStorage.getItem(FINAL_REVIEW_CACHE_KEY) ?? '[]'
    ) as unknown
    if (!Array.isArray(value)) return []
    return value.filter(isStoredTravelDiaryEntry).slice(0, MAX_FINAL_REVIEWS)
  } catch {
    return []
  }
}

export function saveFinalTravelReview(
  courseId: string,
  content: string,
  createdAt = Date.now()
) {
  if (typeof window === 'undefined') return
  const normalizedCourseId = courseId.trim()
  const normalizedContent = content.trim()
  if (
    !normalizedCourseId ||
    normalizedCourseId.length > MAX_COURSE_ID_LENGTH ||
    !normalizedContent ||
    normalizedContent.length > MAX_REVIEW_LENGTH ||
    !Number.isFinite(createdAt) ||
    createdAt <= 0
  ) return

  const next = [
    { courseId: normalizedCourseId, content: normalizedContent, createdAt },
    ...readStoredTravelDiaries().filter((entry) => entry.courseId !== normalizedCourseId),
  ].slice(0, MAX_FINAL_REVIEWS)

  try {
    window.localStorage.setItem(FINAL_REVIEW_CACHE_KEY, JSON.stringify(next))
  } catch {
    // Album saving must still work when browser storage is unavailable.
  }
}

export function getSavedFinalTravelReview(courseId: string): TravelDiaryEntry | null {
  const normalizedCourseId = courseId.trim()
  if (!normalizedCourseId) return null
  const entry = readStoredTravelDiaries().find(
    (candidate) => candidate.courseId === normalizedCourseId
  )
  return entry ? { content: entry.content.trim(), createdAt: entry.createdAt } : null
}

export function findLatestTravelDiaryForCourse(
  posts: Post[],
  courseId: string
): TravelDiaryEntry | null {
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

  return matchingPost
    ? { content: matchingPost.content.trim(), createdAt: postTime(matchingPost.createdAt) }
    : null
}

export function findTravelDiaryForCourse(posts: Post[], courseId: string) {
  return findLatestTravelDiaryForCourse(posts, courseId)?.content ?? null
}
