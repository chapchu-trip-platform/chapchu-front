import { POST_CATEGORIES, REVIEW_WEATHER, type Comment, type PhotoDownload, type Post, type PostCategory, type PostPage, type PostPhoto, type PostSummary, type Review } from '@/features/community/types/community'

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown, max = 20_000): value is string => typeof value === 'string' && value.length <= max
const id = (value: unknown): value is string => text(value, 200) && value.trim().length > 0
const nullableId = (value: unknown): value is string | null => value === null || id(value)
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const date = (value: unknown): value is string | null => value === null || (text(value, 100) && Number.isFinite(Date.parse(value)))
const postCategory = (value: unknown): value is PostCategory => typeof value === 'string' && POST_CATEGORIES.includes(value as PostCategory)

function parsePostCategory(value: unknown): PostCategory | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (value === 'GENERAL') return 'FREE'
  if (postCategory(value)) return value
  throw new Error('Invalid community post type.')
}

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
  const photoValues = record(value) && Array.isArray(value.photos) && value.photos.length <= 10 ? value.photos : null
  const photos = photoValues?.map(parsePostPhoto) ?? null
  if (!record(value) || !id(value.id) || !nullableId(value.petId) || !nullableId(value.photoId) ||
      !nullableId(value.courseId) || !text(value.title, 500) || !text(value.content) ||
      !text(value.nickname, 100) ||
      !(value.authorProfilePhotoUrl === undefined || value.authorProfilePhotoUrl === null || text(value.authorProfilePhotoUrl, 4096)) ||
      !(value.photoUrl === null || text(value.photoUrl, 4096)) ||
      !count(value.viewCount) || !count(value.recommendationCount) || !count(value.commentCount) || !date(value.createdAt) ||
      typeof value.recommended !== 'boolean' || typeof value.bookmarked !== 'boolean' || !photos) {
    throw new Error('Invalid community post response.')
  }
  const category = parsePostCategory(value.postType ?? value.category)
  const postValue = { ...value }
  delete postValue.postType
  delete postValue.category
  const parsed: Post = {
    ...(postValue as unknown as Post),
    authorProfilePhotoUrl: safePhotoUrl((value.authorProfilePhotoUrl as string | null | undefined) ?? null),
    photoUrl: safePhotoUrl(value.photoUrl as string | null),
    photos,
    ...(category !== undefined ? { category } : {}),
  }
  return parsed
}

function parsePostPhoto(value: unknown): PostPhoto {
  if (!record(value) || !id(value.photoId) ||
      !(value.photoKey === null || (text(value.photoKey, 4096) && value.photoKey.trim())) ||
      !(value.downloadUrl === undefined || value.downloadUrl === null || text(value.downloadUrl, 4096))) {
    throw new Error('Invalid community post photo response.')
  }
  return {
    photoId: value.photoId,
    photoKey: value.photoKey,
    downloadUrl: safePhotoUrl((value.downloadUrl as string | null | undefined) ?? null),
  }
}

export function parsePosts(value: unknown): Post[] {
  if (!Array.isArray(value)) throw new Error('Invalid community list response.')
  return value.map(parsePost)
}

export function parsePostSummary(value: unknown): PostSummary {
  if (!record(value)) throw new Error('Invalid community post summary response.')

  const thumbnail = value.thumbnail
  const validThumbnail = thumbnail === null || (
    record(thumbnail) && id(thumbnail.photoId) &&
    (thumbnail.photoKey === null || text(thumbnail.photoKey, 4096)) &&
    (thumbnail.downloadUrl === undefined || thumbnail.downloadUrl === null || text(thumbnail.downloadUrl, 4096))
  )
  if (!id(value.id) || !text(value.title, 500) || !text(value.nickname, 100) || !value.nickname.trim() ||
      !(value.authorProfilePhotoUrl === undefined || value.authorProfilePhotoUrl === null || text(value.authorProfilePhotoUrl, 4096)) ||
      !count(value.recommendationCount) || !count(value.commentCount) || !validThumbnail || !date(value.createdAt)) {
    throw new Error('Invalid community post summary response.')
  }

  // photoKey is always opaque storage metadata; only the photo read API may return a URL.
  const parsed: PostSummary = {
    id: value.id,
    photoId: record(thumbnail) && typeof thumbnail.photoKey === 'string' && thumbnail.photoKey.trim()
      ? thumbnail.photoId as string
      : null,
    title: value.title,
    nickname: value.nickname,
    authorProfilePhotoUrl: safePhotoUrl((value.authorProfilePhotoUrl as string | null | undefined) ?? null),
    recommendationCount: value.recommendationCount,
    commentCount: value.commentCount,
    photoUrl: record(thumbnail)
      ? safePhotoUrl((thumbnail.downloadUrl as string | null | undefined) ?? null)
      : null,
    createdAt: value.createdAt,
  }
  const category = parsePostCategory(value.postType ?? value.category)
  if (category !== undefined) parsed.category = category
  return parsed
}

export function parsePostSummaries(value: unknown): PostSummary[] {
  if (!Array.isArray(value)) throw new Error('Invalid community list response.')
  return value.map(parsePostSummary)
}

export function parsePhotoDownload(value: unknown): PhotoDownload {
  if (!record(value) || !id(value.id) || !text(value.downloadUrl, 4096) || !date(value.takenAt)) {
    throw new Error('Invalid photo download response.')
  }
  const downloadUrl = safePhotoUrl(value.downloadUrl)
  if (!downloadUrl) throw new Error('Invalid photo download URL.')
  return { id: value.id, downloadUrl, takenAt: value.takenAt }
}

export function parsePostPage(value: unknown): PostPage {
  if (!record(value) || !(value.nextCursor === null || (text(value.nextCursor, 1024) && value.nextCursor.trim()))) {
    throw new Error('Invalid community cursor response.')
  }
  return { posts: parsePostSummaries(value.posts), nextCursor: value.nextCursor as string | null }
}

export function parseComment(value: unknown): Comment {
  if (!record(value) || !id(value.id) || !id(value.postId) || !nullableId(value.parentCommentId) ||
      !count(value.depth) || !count(value.commentOrder) || !text(value.content) || typeof value.deleted !== 'boolean' ||
      !(value.deleted ? value.nickname === null : text(value.nickname, 100)) || !date(value.createdAt)) {
    throw new Error('Invalid comment response.')
  }
  return { ...(value as unknown as Comment), ...(value.deleted ? { content: '삭제된 댓글입니다', nickname: null } : {}) }
}

export function parseComments(value: unknown): Comment[] {
  if (!Array.isArray(value)) throw new Error('Invalid comment list response.')
  const comments = value.map(parseComment)
  if (new Set(comments.map(comment => comment.id)).size !== comments.length) throw new Error('Duplicate comment IDs.')
  return comments.sort((a, b) => a.commentOrder - b.commentOrder)
}

export function commentMutationErrorMessage(error: unknown) {
  if (record(error) && error.status === 404) return '댓글을 찾을 수 없거나 수정·삭제할 권한이 없어요. 본인이 작성한 댓글인지 확인해 주세요.'
  return communityErrorMessage(error)
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

export function mergePosts(previous: PostSummary[], next: PostSummary[]) {
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

export function postReactionErrorMessage(error: unknown, action: '추천' | '추천 취소' | '북마크 등록' | '북마크 취소') {
  const detail = record(error) && (error.type === 'server' || (typeof error.status === 'number' && error.status >= 500))
    ? `서버 오류${record(error) && typeof error.status === 'number' ? ` (HTTP ${error.status})` : ''}가 발생했어요. 잠시 후 다시 시도해 주세요.`
    : record(error) && error.status === 404
      ? '해당 내역을 찾지 못했어요. 이미 취소되었거나 게시글이 없을 수 있어요.'
      : communityErrorMessage(error)
  return `${action}${action.endsWith('취소') ? '를' : '을'} 완료하지 못했어요. ${detail}`
}
