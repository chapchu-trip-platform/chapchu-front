import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/features/community/api/community-api'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { usePostRecommendationStore } from '@/features/community/stores/post-recommendation-store'
import { commentFixture, postFixture, reviewFixture } from '@/test/fixtures/community'
import { mockRouter } from '@/test/mocks/next-navigation'
import type { PostPage } from '@/features/community/types/community'
import CommunityBoard from './community-board'
import { CommunityPhoto } from './community-shared'

async function closeNotice(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: '닫기' }))
}

vi.mock('@/features/community/api/community-api')

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.resetAllMocks()
  window.sessionStorage.clear()
  window.history.replaceState({}, '', '/')
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
  useAuthStore.setState({ status: 'authenticated', sessionEpoch: 0 })
  usePostRecommendationStore.getState().reset()
  vi.mocked(api.fetchPosts).mockResolvedValue({ posts: [postFixture], nextCursor: null })
  vi.mocked(api.fetchPost).mockResolvedValue(postFixture)
  vi.mocked(api.fetchMyBookmarks).mockResolvedValue([])
  vi.mocked(api.fetchMyPosts).mockResolvedValue([])
  vi.mocked(api.fetchMyReviews).mockResolvedValue([reviewFixture])
  vi.mocked(api.fetchPlaceReviews).mockResolvedValue([reviewFixture])
  vi.mocked(api.createComment).mockResolvedValue(commentFixture)
  vi.mocked(api.fetchComments).mockResolvedValue([])
})
afterEach(cleanup)

describe('live community board', () => {
  it('restores both server reaction flags with no session memory and replaces outdated memory on re-entry', async () => {
    const { rerender } = render(<CommunityBoard initialPostId="post-1" />)
    await screen.findByRole('button', { name: '게시글 추천' })
    rerender(<CommunityBoard />)
    usePostRecommendationStore.getState().reset()
    vi.mocked(api.fetchPost).mockResolvedValue({ ...postFixture, recommended: true, bookmarked: true })
    rerender(<CommunityBoard initialPostId="post-1" />)
    expect(await screen.findByRole('button', { name: '추천 취소' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '북마크 취소' })).toHaveAttribute('aria-pressed', 'true')
    rerender(<CommunityBoard />)
    vi.mocked(api.fetchPost).mockResolvedValue(postFixture)
    rerender(<CommunityBoard initialPostId="post-1" />)
    expect(await screen.findByRole('button', { name: '게시글 추천' })).toHaveAttribute('aria-pressed', 'false')
  })
  it('retains a successful recommendation across list navigation and cancels rather than posting again', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<CommunityBoard initialPostId="post-1" />)
    await user.click(await screen.findByRole('button', { name: '게시글 추천' }))
    await closeNotice(user)
    await waitFor(() => expect(screen.getByRole('button', { name: '추천 취소' })).toHaveAttribute('aria-pressed', 'true'))
    vi.mocked(api.fetchPost).mockResolvedValue({ ...postFixture, recommended: true })
    rerender(<CommunityBoard />)
    await screen.findByText(postFixture.title)
    rerender(<CommunityBoard initialPostId="post-1" />)
    await screen.findByRole('heading', { name: postFixture.title })
    await user.click(screen.getByRole('button', { name: '추천 취소' }))
    await waitFor(() => expect(api.setPostRecommendation).toHaveBeenLastCalledWith('post-1', false))
    expect(api.setPostRecommendation).toHaveBeenCalledTimes(2)
  })

  it('rehydrates a bookmark on re-entry, preserves it on server failure and allows an explicit cancellation retry', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<CommunityBoard initialPostId="post-1" />)
    await user.click(await screen.findByRole('button', { name: '북마크' }))
    await closeNotice(user)
    await screen.findByRole('button', { name: '북마크 취소' })
    rerender(<CommunityBoard />)
    await screen.findByText(postFixture.title)
    vi.mocked(api.fetchPost).mockResolvedValue({ ...postFixture, bookmarked: true })
    vi.mocked(api.setPostBookmark).mockRejectedValueOnce({ type: 'server', status: 500 }).mockResolvedValueOnce(undefined)
    rerender(<CommunityBoard initialPostId="post-1" />)
    await user.click(await screen.findByRole('button', { name: '북마크 취소' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('북마크 취소를 완료하지 못했어요')
    await closeNotice(user)
    expect(screen.getByRole('button', { name: '북마크 취소' })).toHaveAttribute('aria-pressed', 'true')
    expect(api.setPostBookmark).toHaveBeenCalledTimes(2)
    await user.click(screen.getByRole('button', { name: '북마크 취소' }))
    await closeNotice(user)
    await waitFor(() => expect(screen.getByRole('button', { name: '북마크' })).toHaveAttribute('aria-pressed', 'false'))
    expect(api.setPostBookmark).toHaveBeenLastCalledWith('post-1', false)
  })

  it('retains success when leaving before the recommendation response and does not issue a stale count refresh', async () => {
    const user = userEvent.setup()
    const pending = deferred<void>()
    vi.mocked(api.setPostRecommendation).mockReturnValueOnce(pending.promise)
    const { rerender } = render(<CommunityBoard initialPostId="post-1" />)
    await user.click(await screen.findByRole('button', { name: '게시글 추천' }))
    rerender(<CommunityBoard />)
    await screen.findByText(postFixture.title)
    rerender(<CommunityBoard initialPostId="post-1" />)
    expect(await screen.findByRole('button', { name: '게시글 추천' })).toBeDisabled()
    await act(async () => pending.resolve())
    expect(await screen.findByRole('button', { name: '추천 취소' })).toHaveAttribute('aria-pressed', 'true')
    expect(api.fetchPost).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '추천 취소' }))
    await waitFor(() => expect(api.setPostRecommendation).toHaveBeenLastCalledWith('post-1', false))
  })

  it('does not wait for the count refresh to preserve a successful recommendation across navigation', async () => {
    const user = userEvent.setup()
    const count = deferred<typeof postFixture>()
    vi.mocked(api.fetchPost).mockResolvedValueOnce(postFixture).mockReturnValueOnce(count.promise).mockResolvedValue({ ...postFixture, recommended: true })
    const { rerender } = render(<CommunityBoard initialPostId="post-1" />)
    await user.click(await screen.findByRole('button', { name: '게시글 추천' }))
    await waitFor(() => expect(api.fetchPost).toHaveBeenCalledTimes(2))
    rerender(<CommunityBoard />)
    await screen.findByText(postFixture.title)
    rerender(<CommunityBoard initialPostId="post-1" />)
    expect(await screen.findByRole('button', { name: '추천 취소' })).toHaveAttribute('aria-pressed', 'true')
    await act(async () => count.resolve(postFixture))
  })

  it('hydrates a recommended server flag and preserves it on cancellation failure', async () => {
    vi.mocked(api.fetchPost).mockResolvedValue({ ...postFixture, recommended: true })
    const user = userEvent.setup()
    vi.mocked(api.setPostRecommendation).mockRejectedValueOnce({ type: 'not-found', status: 404 })
    render(<CommunityBoard initialPostId="post-1" />)
    await user.click(await screen.findByRole('button', { name: '추천 취소' }))
    expect(api.setPostRecommendation).toHaveBeenCalledExactlyOnceWith('post-1', false)
    expect(await screen.findByRole('dialog')).toHaveTextContent('추천 취소를 완료하지 못했어요')
    await closeNotice(user)
    expect(screen.queryByText('추천을 취소했어요.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '추천 취소' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows reaction failures and report success in a single dismissible modal', async () => {
    const user = userEvent.setup()
    vi.mocked(api.fetchPost).mockResolvedValue({ ...postFixture, bookmarked: true })
    vi.mocked(api.setPostBookmark).mockRejectedValueOnce({ status: 500, type: 'server' })
    render(<CommunityBoard initialPostId="post-1" />)
    await user.click(await screen.findByRole('button', { name: '북마크 취소' }))
    expect(await screen.findByRole('dialog', { name: '안내' })).toHaveTextContent('북마크 취소를 완료하지 못했어요')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await closeNotice(user)
    await waitFor(() => expect(screen.getByRole('button', { name: '북마크 취소' })).toHaveFocus())
    await user.click(screen.getByRole('button', { name: '광고·스팸 신고' }))
    await user.click(screen.getByRole('button', { name: '신고 접수' }))
    expect(await screen.findByRole('dialog', { name: '안내' })).toHaveTextContent('신고가 접수되었어요.')
    await closeNotice(user)
    // Base UI resolves a non-tabbable fallback container to its first tabbable child.
    await waitFor(() => expect(screen.getByRole('button', { name: '뒤로가기' })).toHaveFocus())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: postFixture.title })).toBeInTheDocument()
  })

  it('offers writing only on the free board, reserves companion info for reviews, and replaces sharing with bookmarking', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<CommunityBoard />)
    await screen.findByText(postFixture.title)
    expect(api.fetchPosts).toHaveBeenCalledWith('popular', undefined, expect.any(AbortSignal))
    expect(screen.queryByRole('link', { name: '글쓰기' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '자유게시판' }))
    await waitFor(() => expect(api.fetchPosts).toHaveBeenCalledWith('latest', undefined, expect.any(AbortSignal)))
    expect(screen.getByRole('link', { name: '글쓰기' })).toHaveAttribute('href', '/community/write')
    expect(screen.queryByText('동행 반려동물')).not.toBeInTheDocument()
    expect(screen.queryByText('코스 정보')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '여행 리뷰' }))
    await screen.findByText(reviewFixture.contents)
    expect(screen.getByText('동행 반려동물')).toBeInTheDocument()
    expect(screen.getByText('코스 정보')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '글쓰기' })).not.toBeInTheDocument()
    unmount()
    render(<CommunityBoard initialPostId="post-1" />)
    await screen.findByRole('heading', { name: postFixture.title })
    expect(screen.queryByText('동행 반려동물')).not.toBeInTheDocument()
    expect(screen.queryByText('코스 정보')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '공유' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '북마크' })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: '북마크' }))
    await closeNotice(user)
    expect(api.setPostBookmark).toHaveBeenLastCalledWith('post-1', true)
    expect(await screen.findByRole('button', { name: '북마크 취소' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '북마크 취소' }))
    await closeNotice(user)
    expect(api.setPostBookmark).toHaveBeenLastCalledWith('post-1', false)
    expect(await screen.findByRole('button', { name: '북마크' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('orders HOT posts by recommendation count without changing the server order for the free board', async () => {
    const user = userEvent.setup()
    const low = { ...postFixture, id: 'post-low', title: '추천 1개', recommendationCount: 1 }
    const high = { ...postFixture, id: 'post-high', title: '추천 9개', recommendationCount: 9 }
    const middle = { ...postFixture, id: 'post-middle', title: '추천 4개', recommendationCount: 4 }
    vi.mocked(api.fetchPosts).mockResolvedValue({ posts: [low, high, middle], nextCursor: null })

    render(<CommunityBoard />)
    await screen.findByRole('heading', { name: high.title })
    expect(screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent)).toEqual([
      high.title, middle.title, low.title,
    ])

    await user.click(screen.getByRole('button', { name: '자유게시판' }))
    await waitFor(() => expect(api.fetchPosts).toHaveBeenCalledWith('latest', undefined, expect.any(AbortSignal)))
    expect(screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent)).toEqual([
      low.title, high.title, middle.title,
    ])
  })

  it('uses a labeled temporary photo on free posts only when the actual photo is missing or fails', () => {
    const { rerender } = render(<CommunityPhoto title="실제 사진" url="https://example.com/photo.jpg" className="h-52" temporaryFallback />)
    expect(screen.queryByText('임시 사진')).not.toBeInTheDocument()
    fireEvent.error(screen.getByRole('img', { name: '실제 사진' }))
    expect(screen.getByRole('img', { name: /임시 사진/ })).toHaveAttribute('src', '/images/post-cover.png')
    fireEvent.error(screen.getByRole('img', { name: /임시 사진/ }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    rerender(<CommunityPhoto title="사진 없는 글" url={null} className="h-52" temporaryFallback />)
    expect(screen.getByRole('img', { name: /임시 사진/ })).toBeInTheDocument()
  })

  it('uses the documented download URL directly without a separate photo request', () => {
    render(<CommunityPhoto title="목록 사진" url="https://example.com/resolved.jpg" className="h-36" temporaryFallback />)
    expect(screen.getByRole('img', { name: '목록 사진' })).toHaveAttribute('src', 'https://example.com/resolved.jpg')
  })

  it('shows author profile photos and falls back to the local default in post detail', async () => {
    const authorPhotoUrl = 'https://example.com/author.jpg'
    vi.mocked(api.fetchPosts).mockResolvedValue({
      posts: [{ ...postFixture, authorProfilePhotoUrl: authorPhotoUrl }],
      nextCursor: null,
    })
    const { unmount } = render(<CommunityBoard />)
    expect(await screen.findByRole('img', { name: `${postFixture.nickname} 프로필 사진` })).toHaveAttribute('src', authorPhotoUrl)
    unmount()

    vi.mocked(api.fetchPost).mockResolvedValue({ ...postFixture, authorProfilePhotoUrl: null })
    render(<CommunityBoard initialPostId="post-1" />)
    expect(await screen.findByRole('img', { name: '기본 프로필' })).toHaveAttribute('src', '/images/default-profile.svg')
  })

  it('cycles post detail photos in both directions with wraparound', async () => {
    vi.mocked(api.fetchPost).mockResolvedValue({
      ...postFixture,
      photoId: 'photo-1',
      photos: [
        { photoId: 'photo-1', photoKey: 'post/user/one.jpg', downloadUrl: 'https://example.com/photo-1.jpg' },
        { photoId: 'photo-2', photoKey: 'post/user/two.jpg', downloadUrl: 'https://example.com/photo-2.jpg' },
      ],
    })

    const user = userEvent.setup()
    render(<CommunityBoard initialPostId="post-1" />)

    const gallery = await screen.findByRole('region', { name: '게시글 사진 2장' })
    expect(gallery).not.toHaveClass('mx-4', 'rounded-card', 'border')
    expect(await screen.findByRole('img', { name: `${postFixture.title} 사진 1` })).toHaveAttribute('src', 'https://example.com/photo-1.jpg')
    expect(screen.getByRole('img', { name: `${postFixture.title} 사진 1` })).toHaveClass('object-contain')
    expect(gallery.querySelector('img[aria-hidden="true"]')).toHaveClass('blur-2xl', 'object-cover')
    expect(screen.getByRole('button', { name: '이전 사진' })).toHaveClass('opacity-45', 'hover:opacity-100')
    expect(screen.getByText('1 / 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '이전 사진' }))
    expect(await screen.findByRole('img', { name: `${postFixture.title} 사진 2` })).toHaveAttribute('src', 'https://example.com/photo-2.jpg')
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다음 사진' }))
    expect(await screen.findByRole('img', { name: `${postFixture.title} 사진 1` })).toBeInTheDocument()

    gallery.focus()
    await user.keyboard('{ArrowRight}')
    expect(await screen.findByRole('img', { name: `${postFixture.title} 사진 2` })).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(await screen.findByRole('img', { name: `${postFixture.title} 사진 1` })).toBeInTheDocument()
  })

  it('opens the current photo in a full-screen viewer with navigation and zoom controls', async () => {
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    vi.mocked(api.fetchPost).mockResolvedValue({
      ...postFixture,
      photoId: 'photo-1',
      photos: [
        { photoId: 'photo-1', photoKey: 'post/user/one.jpg', downloadUrl: 'https://example.com/photo-1.jpg' },
        { photoId: 'photo-2', photoKey: 'post/user/two.jpg', downloadUrl: 'https://example.com/photo-2.jpg' },
      ],
    })
    const user = userEvent.setup()
    render(<CommunityBoard initialPostId="post-1" />)

    await user.click(await screen.findByRole('button', { name: `${postFixture.title} 사진 1 전체 화면 보기` }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('1 / 2')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '사진 축소' })).toBeDisabled()

    await user.click(within(dialog).getByRole('button', { name: '사진 확대' }))
    expect(within(dialog).getByText('150%')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '전체 화면 다음 사진' }))
    expect(within(dialog).getByText('2 / 2')).toBeInTheDocument()
    expect(within(dialog).getByText('100%')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '전체 화면 닫기' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(historyBack).toHaveBeenCalledOnce()

    // Browser Back closes only the viewer and keeps the detail screen in place.
    await user.click(screen.getByRole('button', { name: `${postFixture.title} 사진 2 전체 화면 보기` }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    act(() => window.dispatchEvent(new PopStateEvent('popstate')))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    historyBack.mockRestore()
  })

  it('preserves the photo order returned by the detail API', async () => {
    vi.mocked(api.fetchPost).mockResolvedValue({
      ...postFixture,
      photoId: 'photo-2',
      photoUrl: 'https://example.com/photo-2.jpg',
      photos: [
        { photoId: 'photo-1', photoKey: 'post/user/one.jpg', downloadUrl: 'https://example.com/photo-1.jpg' },
        { photoId: 'photo-2', photoKey: 'post/user/two.jpg', downloadUrl: 'https://example.com/photo-2.jpg' },
      ],
    })

    render(<CommunityBoard initialPostId="post-1" />)

    expect(await screen.findByRole('img', { name: `${postFixture.title} 사진 1` })).toHaveAttribute('src', 'https://example.com/photo-1.jpg')
  })

  it('shows missing photo URLs as failed and reloads the post before retrying', async () => {
    const expiredPost = {
      ...postFixture,
      photoId: 'photo-1',
      photos: [{ photoId: 'photo-1', photoKey: 'post/user/one.jpg', downloadUrl: null }],
    }
    const refreshedPost = {
      ...expiredPost,
      photoUrl: 'https://example.com/refreshed.jpg',
      photos: [{ ...expiredPost.photos[0], downloadUrl: 'https://example.com/refreshed.jpg' }],
    }
    vi.mocked(api.fetchPost).mockResolvedValueOnce(expiredPost).mockResolvedValueOnce(refreshedPost)
    const user = userEvent.setup()

    render(<CommunityBoard initialPostId="post-1" />)

    expect(await screen.findByText('사진을 불러오지 못했어요')).toBeInTheDocument()
    expect(screen.queryByLabelText('사진 불러오는 중')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '사진 다시 불러오기' }))
    expect(await screen.findByRole('img', { name: `${postFixture.title} 사진 1` })).toHaveAttribute('src', 'https://example.com/refreshed.jpg')
    expect(api.fetchPost).toHaveBeenCalledTimes(2)
  })

  it('loads popular/latest sorting and routes real IDs to detail', async () => {
    const user = userEvent.setup()
    render(<CommunityBoard />)
    await user.click(await screen.findByRole('button', { name: new RegExp(postFixture.title) }))
    expect(mockRouter.push).toHaveBeenCalledWith('/community?post=post-1')
    await user.click(screen.getByRole('button', { name: '자유게시판' }))
    await waitFor(() => expect(api.fetchPosts).toHaveBeenLastCalledWith('latest', undefined, expect.any(AbortSignal)))
  })
  it('returns from detail to the free tab after entering from the editor', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<CommunityBoard initialTab="free" />)
    await user.click(await screen.findByRole('button', { name: new RegExp(postFixture.title) }))
    expect(mockRouter.push).toHaveBeenCalledWith('/community?post=post-1&tab=free')
    rerender(<CommunityBoard initialPostId="post-1" initialTab="free" />)
    await screen.findByRole('heading', { name: postFixture.title })
    await user.click(await screen.findByRole('button', { name: '뒤로가기' }))
    expect(mockRouter.back).toHaveBeenCalledOnce()
    rerender(<CommunityBoard initialTab="free" />)
    await screen.findByText(postFixture.title)
    expect(screen.getByRole('button', { name: '자유게시판' })).toHaveAttribute('aria-pressed', 'true')
    expect(api.fetchPosts).toHaveBeenLastCalledWith('latest', undefined, expect.any(AbortSignal))
  })
  it('returns a directly opened post through browser history', async () => {
    const user = userEvent.setup()
    render(<CommunityBoard initialPostId="post-1" initialTab="free" />)
    await screen.findByRole('heading', { name: postFixture.title })
    await user.click(await screen.findByRole('button', { name: '뒤로가기' }))
    expect(mockRouter.back).toHaveBeenCalledOnce()
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })
  it('ignores delayed results when changing tabs', async () => {
    const pending = deferred<PostPage>()
    vi.mocked(api.fetchPosts).mockReturnValueOnce(pending.promise).mockResolvedValue({ posts: [{ ...postFixture, title: '최신 글' }], nextCursor: null })
    render(<CommunityBoard />)
    const signal = vi.mocked(api.fetchPosts).mock.calls[0][2]
    fireEvent.click(screen.getByRole('button', { name: '자유게시판' }))
    expect(await screen.findByText('최신 글')).toBeInTheDocument()
    await act(async () => pending.resolve({ posts: [postFixture], nextCursor: null }))
    expect(signal?.aborted).toBe(true)
    expect(screen.queryByText(postFixture.title)).not.toBeInTheDocument()
  })
  it('keeps loaded posts after a page failure and retries the same cursor without duplicates', async () => {
    vi.mocked(api.fetchPosts).mockResolvedValueOnce({ posts: [postFixture], nextCursor: 'opaque~cursor' }).mockRejectedValueOnce({ type: 'network' }).mockResolvedValueOnce({ posts: [postFixture, { ...postFixture, id: 'post-2', title: '다음 글' }], nextCursor: null })
    const user = userEvent.setup()
    render(<CommunityBoard />)
    await user.click(await screen.findByRole('button', { name: '더 불러오기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('인터넷 연결')
    expect(screen.getByText(postFixture.title)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '더 불러오기 다시 시도' }))
    expect(await screen.findByText('다음 글')).toBeInTheDocument()
    expect(screen.getAllByText(postFixture.title)).toHaveLength(1)
    expect(screen.queryByRole('button', { name: '더 불러오기' })).not.toBeInTheDocument()
    expect(api.fetchPosts).toHaveBeenLastCalledWith('popular', 'opaque~cursor', expect.any(AbortSignal))
  })
  it('shows empty feed and handles first-page recovery', async () => {
    vi.mocked(api.fetchPosts).mockRejectedValueOnce({ type: 'server' }).mockResolvedValueOnce({ posts: [], nextCursor: null })
    const user = userEvent.setup()
    render(<CommunityBoard />)
    await user.click(await screen.findByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('아직 등록된 게시글이 없어요.')).toBeInTheDocument()
  })
  it('reads a direct detail ID outside the initial feed and tracks subsequent URL changes', async () => {
    const { rerender } = render(<CommunityBoard initialPostId="server-id" />)
    expect(await screen.findByRole('heading', { name: postFixture.title })).toBeInTheDocument()
    expect(api.fetchPost).toHaveBeenCalledWith('server-id', expect.any(AbortSignal))
    expect(api.fetchPosts).not.toHaveBeenCalled()
    vi.mocked(api.fetchPost).mockResolvedValueOnce({ ...postFixture, id: 'post-2', title: '다른 상세' })
    rerender(<CommunityBoard initialPostId="post-2" />)
    expect(await screen.findByRole('heading', { name: '다른 상세' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }))
    expect(mockRouter.back).toHaveBeenCalledOnce()
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })
  it('does not fall back to fixture content for deleted detail', async () => {
    vi.mocked(api.fetchPost).mockRejectedValue({ type: 'not-found' })
    render(<CommunityBoard initialPostId="deleted" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('찾을 수 없는')
    expect(screen.queryByText(postFixture.title)).not.toBeInTheDocument()
  })
  it('uses the server bookmark flag while ownership reads fail', async () => {
    vi.mocked(api.fetchMyBookmarks).mockRejectedValue({ type: 'network' })
    vi.mocked(api.fetchMyPosts).mockRejectedValue({ type: 'network' })
    render(<CommunityBoard initialPostId="post-1" />)
    expect(await screen.findByRole('button', { name: '북마크' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: '수정하기' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '게시글 삭제' })).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: '내 게시글 다시 확인' })).toBeInTheDocument()
  })
  it('hydrates bookmarks and does not toggle on failure', async () => {
    vi.mocked(api.fetchPost).mockResolvedValue({ ...postFixture, bookmarked: true })
    vi.mocked(api.setPostBookmark).mockRejectedValueOnce({ type: 'server' })
    const user = userEvent.setup()
    render(<CommunityBoard initialPostId="post-1" />)
    await user.click(await screen.findByRole('button', { name: '북마크 취소' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await closeNotice(user)
    expect(screen.getByRole('button', { name: '북마크 취소' })).toHaveAttribute('aria-pressed', 'true')
    expect(api.setPostBookmark).toHaveBeenCalledWith('post-1', false)
  })
  it('preserves comments on failure and prevents duplicate submission', async () => {
    vi.mocked(api.createComment).mockRejectedValueOnce({ type: 'unauthorized' })
    const user = userEvent.setup()
    render(<CommunityBoard initialPostId="post-1" />)
    const commentInput = await screen.findByRole('textbox', { name: '댓글 내용' })
    await waitFor(() => expect(commentInput).toBeEnabled())
    await user.type(commentInput, '즐거운 여행이네요')
    await user.click(screen.getByRole('button', { name: '댓글 전송' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('로그인')
    await closeNotice(user)
    expect(screen.getByRole('textbox', { name: '댓글 내용' })).toHaveValue('즐거운 여행이네요')
    const pending = deferred<typeof commentFixture>()
    vi.mocked(api.createComment).mockReturnValueOnce(pending.promise)
    fireEvent.click(screen.getByRole('button', { name: '댓글 전송' }))
    fireEvent.click(screen.getByRole('button', { name: '댓글 전송' }))
    expect(api.createComment).toHaveBeenCalledTimes(2)
    await act(async () => pending.resolve(commentFixture))
    await closeNotice(user)
    expect(await screen.findByText(commentFixture.content)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '댓글 내용' })).toHaveValue('')
    expect(screen.getByRole('heading', { name: '댓글 2' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '댓글 삭제' }))
    await user.click(screen.getByRole('button', { name: '삭제 확인' }))
    await closeNotice(user)
    await waitFor(() => expect(screen.queryByText(commentFixture.content)).not.toBeInTheDocument())
    expect(await screen.findByRole('heading', { name: '댓글 2' })).toBeInTheDocument()
  })
  it('does not retain private detail or drafts when the session changes', async () => {
    const user = userEvent.setup()
    render(<CommunityBoard initialPostId="post-1" />)
    await user.type(await screen.findByRole('textbox', { name: '댓글 내용' }), '이전 세션 초안')
    vi.mocked(api.fetchPost).mockReturnValue(new Promise(() => {}))
    act(() => useAuthStore.setState({ sessionEpoch: 1 }))
    expect(screen.queryByDisplayValue('이전 세션 초안')).not.toBeInTheDocument()
    expect(screen.queryByText(postFixture.title)).not.toBeInTheDocument()
  })
  it('does not issue a recommendation follow-up request after leaving the detail view', async () => {
    const pending = deferred<void>()
    vi.mocked(api.setPostRecommendation).mockReturnValue(pending.promise)
    const user = userEvent.setup()
    const { unmount } = render(<CommunityBoard initialPostId="post-1" />)
    await user.click(await screen.findByRole('button', { name: '게시글 추천' }))
    unmount()
    act(() => useAuthStore.setState({ sessionEpoch: 1, status: 'unauthenticated' }))
    await act(async () => pending.resolve())
    expect(api.fetchPost).toHaveBeenCalledTimes(1)
    expect(api.setPostRecommendation).toHaveBeenCalledTimes(1)
  })
  it('retains the actual parent ordering when replying after another root comment', async () => {
    vi.mocked(api.createComment).mockResolvedValueOnce({ ...commentFixture, id: 'A', content: '첫 댓글' }).mockResolvedValueOnce({ ...commentFixture, id: 'B', content: '둘째 댓글' }).mockResolvedValueOnce({ ...commentFixture, id: 'A-reply', parentCommentId: 'A', content: '첫 댓글의 답글', depth: 1 })
    const user = userEvent.setup()
    render(<CommunityBoard initialPostId="post-1" />)
    const input = await screen.findByRole('textbox', { name: '댓글 내용' })
    await waitFor(() => expect(input).toBeEnabled())
    for (const text of ['첫 댓글', '둘째 댓글']) {
      await user.type(input, text)
      await user.click(screen.getByRole('button', { name: '댓글 전송' }))
      await screen.findByText(text)
      await closeNotice(user)
    }
    await user.click(screen.getAllByRole('button', { name: '답글' })[0])
    await user.type(input, '첫 댓글의 답글')
    await user.click(screen.getByRole('button', { name: '댓글 전송' }))
    await screen.findByText('첫 댓글의 답글')
    expect(api.createComment).toHaveBeenLastCalledWith('post-1', '첫 댓글의 답글', 'A')
    const reply = screen.getByText('첫 댓글의 답글')
    const secondRoot = screen.getByText('둘째 댓글')
    expect(reply.compareDocumentPosition(secondRoot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('moves report actions into a focused modal and keeps the comment form outside the scroll body', async () => {
    const user = userEvent.setup()
    render(<CommunityBoard initialPostId="post-1" />)
    await user.click(await screen.findByRole('button', { name: '광고·스팸 신고' }))
    expect(screen.getByRole('dialog', { name: '광고·스팸 신고' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '신고 상세 내용' })).toHaveFocus()
    expect(screen.queryByRole('textbox', { name: '댓글 내용' })).not.toBeInTheDocument()
  })
  it('cancels own review deletion and retains the review on failed delete before retry', async () => {
    vi.mocked(api.deleteReview).mockRejectedValueOnce({ type: 'forbidden' }).mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<CommunityBoard />)
    await user.click(screen.getByRole('button', { name: '여행 리뷰' }))
    await user.click(await screen.findByRole('button', { name: '리뷰 삭제' }))
    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(api.deleteReview).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '리뷰 삭제' }))
    await user.click(screen.getByRole('button', { name: '리뷰 삭제 확인' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('권한')
    await closeNotice(user)
    expect(screen.getByText(reviewFixture.contents)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '리뷰 삭제 확인' }))
    expect(await screen.findByText('아직 작성한 여행 리뷰가 없어요.')).toBeInTheDocument()
  })
  it('shows direct edit and delete actions in the header only for owned posts', async () => {
    vi.mocked(api.fetchMyPosts).mockResolvedValue([postFixture])
    vi.mocked(api.deletePost).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<CommunityBoard initialPostId="post-1" />)

    await user.click(await screen.findByRole('button', { name: '수정하기' }))
    expect(mockRouter.push).toHaveBeenCalledWith('/community/write?edit=post-1&from=detail')

    const deleteButton = screen.getByRole('button', { name: '게시글 삭제' })
    await user.click(deleteButton)
    expect(screen.getByRole('dialog', { name: '게시글 삭제' })).toHaveTextContent('삭제 후에는 되돌릴 수 없어요.')
    expect(api.deletePost).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog', { name: '게시글 삭제' })).not.toBeInTheDocument()
    await waitFor(() => expect(deleteButton).toHaveFocus())
    expect(screen.queryByRole('button', { name: '게시글 수정' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '더보기' })).not.toBeInTheDocument()

    await user.click(deleteButton)
    await user.click(screen.getByRole('button', { name: '삭제 확인' }))
    await waitFor(() => expect(api.deletePost).toHaveBeenCalledExactlyOnceWith('post-1'))
  })
  it('does not submit a report on opening the form and preserves detail after a failed submission', async () => {
    vi.mocked(api.reportPost).mockRejectedValueOnce({ type: 'server' }).mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<CommunityBoard initialPostId="post-1" />)
    await user.click(await screen.findByRole('button', { name: '광고·스팸 신고' }))
    expect(api.reportPost).not.toHaveBeenCalled()
    await user.type(screen.getByRole('textbox', { name: '신고 상세 내용' }), '광고성 게시글')
    await user.click(screen.getByRole('button', { name: '신고 접수' }))
    expect(await screen.findByRole('dialog', { name: '안내' })).toBeInTheDocument()
    await closeNotice(user)
    expect(screen.getByRole('textbox', { name: '신고 상세 내용' })).toHaveValue('광고성 게시글')
    expect(screen.queryByText('신고가 접수되었어요.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '신고 접수' }))
    expect(await screen.findByText('신고가 접수되었어요.')).toBeInTheDocument()
    expect(api.reportPost).toHaveBeenLastCalledWith('post-1', '광고성 게시글')
    expect(screen.queryByRole('textbox', { name: '신고 상세 내용' })).not.toBeInTheDocument()
  })
  it('labels the limited review feed, queries its place and never exposes delete for others', async () => {
    vi.mocked(api.fetchPlaceReviews).mockResolvedValue([reviewFixture, { ...reviewFixture, id: 'other-review', contents: '다른 여행자의 후기' }])
    const user = userEvent.setup()
    render(<CommunityBoard />)
    await user.click(screen.getByRole('button', { name: '여행 리뷰' }))
    expect(await screen.findByText(reviewFixture.contents)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '내가 작성한 여행 리뷰' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '이 장소 리뷰 보기' }))
    expect(await screen.findByText('다른 여행자의 후기')).toBeInTheDocument()
    expect(api.fetchPlaceReviews).toHaveBeenCalledWith('place-1', expect.any(AbortSignal))
    expect(screen.getAllByRole('button', { name: '리뷰 삭제' })).toHaveLength(1)
  })
  it('shows a neutral image fallback after remote photo failure', () => {
    render(<CommunityPhoto title="여행 사진" url="https://example.com/photo.jpg" className="h-36" />)
    fireEvent.error(screen.getByRole('img', { name: '여행 사진' }))
    expect(screen.getByText('사진을 불러오지 못했어요')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
