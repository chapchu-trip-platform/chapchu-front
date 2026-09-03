import { REVIEW_WEATHER, type Comment, type Post, type PostPage, type Review } from '@/features/community/types/community'

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown, max = 20_000): value is string => typeof value === 'string' && value.length <= max
const id = (value: unknown): value is string => text(value, 200) && value.trim().length > 0
const nullableId = (value: unknown) => value === null || id(value)
const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const date = (value: unknown) => value === null || (text(value, 100) && Number.isFinite(Date.parse(value)))

/** Remote photos are rendered by the browser, never fetched by a server-side proxy. */
export function safePhotoUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url.href
  } catch { return null }
}

export function parsePost(value: unknown): Post {
  if (!record(value) || !id(value.id) || !nullableId(value.petId) || !nullableId(value.photoId) ||
      !nullableId(value.courseId) || !text(value.title, 500) || !text(value.content) ||
      !text(value.nickname, 100) || !(value.photoUrl === null || text(value.photoUrl, 4096)) ||
      !count(value.viewCount) || !count(value.recommendationCount) || !count(value.commentCount) || !date(value.createdAt)) {
    throw new Error('Invalid community post response.')
  }
  return { ...(value as unknown as Post), photoUrl: safePhotoUrl(value.photoUrl as string | null) }
}

export function parsePosts(value: unknown): Post[] {
  if (!Array.isArray(value)) throw new Error('Invalid community list response.')
  return value.map(parsePost)
}

export function parsePostPage(value: unknown): PostPage {
  if (!record(value) || !(value.nextCursor === null || (text(value.nextCursor, 1024) && value.nextCursor.trim()))) {
    throw new Error('Invalid community cursor response.')
  }
  return { posts: parsePosts(value.posts), nextCursor: value.nextCursor as string | null }
}

export function parseComment(value: unknown): Comment {
  if (!record(value) || !id(value.id) || !id(value.postId) || !nullableId(value.parentCommentId) ||
      !count(value.depth) || !count(value.commentOrder) || !text(value.content) || !date(value.createdAt)) {
    throw new Error('Invalid comment response.')
  }
  return value as unknown as Comment
}

export function parseReview(value: unknown): Review {
  if (!record(value) || !id(value.id) || !id(value.placeId) || !id(value.petId) ||
      !Number.isInteger(value.rating) || (value.rating as number) < 1 || (value.rating as number) > 5 ||
      !text(value.contents) || !count(value.recommendationCount) || !date(value.createdAt) ||
      !nullableId(value.coursePlaceId) || !(value.weather === null || REVIEW_WEATHER.includes(value.weather as never))) {
    throw new Error('Invalid review response.')
  }
  return value as unknown as Review
}

export function parseReviews(value: unknown): Review[] {
  if (!Array.isArray(value)) throw new Error('Invalid reviews response.')
  return value.map(parseReview)
}

export function mergePosts(previous: Post[], next: Post[]) {
  return Array.from(new Map([...previous, ...next].map(post => [post.id, post])).values())
}

/** Keep replies below their actual parent, even when another root was added first. */
export function orderComments(comments: Comment[]): { comment: Comment; depth: number }[] {
  const children = new Map<string | null, Comment[]>()
  const ids = new Set(comments.map(comment => comment.id))
  for (const comment of comments) {
    const parent = comment.parentCommentId && ids.has(comment.parentCommentId) ? comment.parentCommentId : null
    children.set(parent, [...(children.get(parent) ?? []), comment])
  }
  const result: { comment: Comment; depth: number }[] = []
  const stack = (children.get(null) ?? []).slice().reverse().map(comment => ({ comment, depth: 0 }))
  const visited = new Set<string>()
  while (stack.length) {
    const entry = stack.pop()!
    if (visited.has(entry.comment.id)) continue
    visited.add(entry.comment.id)
    result.push(entry)
    for (const child of (children.get(entry.comment.id) ?? []).slice().reverse()) stack.push({ comment: child, depth: entry.depth + 1 })
  }
  return result
}

export function formatCommunityDate(value: string | null) {
  return value ? value.slice(0, 10).replaceAll('-', '.') : '날짜 정보 없음'
}

export function communityErrorMessage(error: unknown) {
  const type = record(error) ? error.type : undefined
  if (record(error) && error.status === 409) return '이미 처리되었거나 현재 상태와 맞지 않아요. 새로고침 후 확인해 주세요.'
  switch (type) {
    case 'unauthorized': return '로그인이 만료되었어요. 로그인 상태를 확인한 뒤 다시 시도해 주세요.'
    case 'forbidden': return '이 작업을 할 수 있는 권한이 없어요.'
    case 'not-found': return '삭제되었거나 찾을 수 없는 항목이에요.'
    case 'validation': return '입력 내용을 확인해 주세요.'
    case 'network': return '인터넷 연결을 확인하고 다시 시도해 주세요.'
    case 'timeout': return '응답이 늦어지고 있어요. 잠시 후 다시 확인해 주세요.'
    default: return '정보를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'
  }
}
