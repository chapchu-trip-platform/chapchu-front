import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { usePostDraftStore } from '@/features/community/stores/post-draft-store'
import { createPost } from '@/features/community/api/community-api'
import { uploadPhotoFiles } from '@/features/photos/api/photo-api'
import { mockRouter } from '@/test/mocks/next-navigation'
import PostEditor from './post-editor'

vi.mock('@/features/community/api/community-api')
vi.mock('@/features/photos/api/photo-api')

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(yes => { resolve = yes })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ status: 'authenticated', sessionEpoch: 0 })
  usePostDraftStore.getState().clear()
  vi.mocked(createPost).mockResolvedValue(undefined)
  vi.mocked(uploadPhotoFiles).mockResolvedValue([])
})
afterEach(cleanup)

describe('free-board post editor', () => {
  it('keeps an older overlong draft but blocks preview until its title fits 100 characters', () => {
    usePostDraftStore.getState().update({ title: '가'.repeat(101), content: '보존' })
    render(<PostEditor />)
    expect(screen.getByLabelText('제목')).toHaveValue('가'.repeat(101))
    expect(screen.getByLabelText('제목')).toHaveAttribute('maxlength', '100')
    expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('100자')
  })
  it('requires nonempty title and content for preview and publication', async () => {
    const user = userEvent.setup()
    render(<PostEditor />)
    expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '임시 저장' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '게시글 등록' })).toBeDisabled()
    expect(screen.getByLabelText('제목')).toBeRequired()
    expect(screen.getByLabelText('내용')).toBeRequired()
    await user.type(screen.getByLabelText('제목'), '  ')
    await user.type(screen.getByLabelText('내용'), '산책 이야기')
    expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled()
    await user.clear(screen.getByLabelText('제목'))
    await user.type(screen.getByLabelText('제목'), '오늘의 산책')
    await user.clear(screen.getByLabelText('내용'))
    await user.type(screen.getByLabelText('내용'), '  ')
    expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled()
    await user.clear(screen.getByLabelText('내용'))
    await user.type(screen.getByLabelText('내용'), '산책 이야기')
    await user.click(screen.getByRole('button', { name: '미리보기' }))
    expect(screen.getByRole('heading', { name: '오늘의 산책' })).toBeInTheDocument()
    expect(screen.getByLabelText('게시글 미리보기')).toHaveFocus()
    expect(screen.getByText('산책 이야기')).toBeInTheDocument()
    expect(screen.getByText('아직 게시되지 않은 글이에요.')).toBeInTheDocument()
    expect(screen.getByText('함께한 여행 이야기')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '게시글 등록' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: '임시 저장' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('아직 게시되지 않았어요')
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(createPost).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '편집' }))
    expect(screen.getByLabelText('제목')).toHaveValue('오늘의 산책')
    expect(screen.getByLabelText('제목')).toHaveFocus()
  })

  it('publishes only trimmed text, clears the draft and returns to the free board after an empty success response', async () => {
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.type(screen.getByLabelText('제목'), '  오늘의 산책  ')
    await user.type(screen.getByLabelText('내용'), '  함께 걸었어요.  ')
    await user.click(screen.getByRole('button', { name: '게시글 등록' }))
    await waitFor(() => expect(createPost).toHaveBeenCalledWith({
      title: '오늘의 산책',
      content: '함께 걸었어요.',
    }, expect.any(AbortSignal)))
    expect(usePostDraftStore.getState()).toMatchObject({ title: '', content: '' })
    expect(mockRouter.replace).toHaveBeenCalledWith('/community?tab=free')
  })

  it('uploads selected photos and sends their keys with the post', async () => {
    const createObjectUrl = vi.fn(() => 'blob:preview')
    const revokeObjectUrl = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl })
    vi.mocked(uploadPhotoFiles).mockResolvedValue([
      { uploadUrl: 'https://upload.example/photo', photoKey: 'post/user/photo.jpg', fileName: 'photo.jpg' },
    ])
    const user = userEvent.setup()
    render(<PostEditor />)
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText('게시글 사진 선택') as HTMLInputElement
    await user.upload(input, file)
    expect(screen.getByText('1 / 10장')).toBeInTheDocument()
    await user.type(screen.getByLabelText('제목'), '사진 글')
    await user.type(screen.getByLabelText('내용'), '사진을 공유해요')
    await user.click(screen.getByRole('button', { name: '게시글 등록' }))
    await waitFor(() => expect(uploadPhotoFiles).toHaveBeenCalledWith([file], 'POST', expect.any(AbortSignal)))
    expect(createPost).toHaveBeenCalledWith({
      title: '사진 글',
      content: '사진을 공유해요',
      photos: [{ photoKey: 'post/user/photo.jpg' }],
    }, expect.any(AbortSignal))
  })

  it('identifies a likely object-storage CORS failure and keeps the draft', async () => {
    vi.mocked(uploadPhotoFiles).mockRejectedValueOnce({
      name: 'PhotoUploadError',
      stage: 'object-storage',
      reason: 'connection-or-cors',
    })
    const createObjectUrl = vi.fn(() => 'blob:preview')
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    const user = userEvent.setup()
    render(<PostEditor />)
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('게시글 사진 선택'), file)
    await user.type(screen.getByLabelText('제목'), 'CORS 추적')
    await user.type(screen.getByLabelText('내용'), '초안을 유지해요')

    await user.click(screen.getByRole('button', { name: '게시글 등록' }))

    expect(await screen.findByRole('dialog')).toHaveTextContent('사진 저장소 연결이 차단됐어요')
    expect(screen.getAllByText(/CORS 후보 기록/)).toHaveLength(2)
    expect(screen.getByLabelText('제목')).toHaveValue('CORS 추적')
    expect(screen.getByLabelText('내용')).toHaveValue('초안을 유지해요')
    expect(createPost).not.toHaveBeenCalled()
  })

  it('separates post creation failure after photos were uploaded', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.mocked(uploadPhotoFiles).mockResolvedValueOnce([
      { uploadUrl: 'https://upload.example/photo', photoKey: 'post/user/photo.jpg', fileName: 'photo.jpg' },
    ])
    vi.mocked(createPost).mockRejectedValueOnce({ type: 'network' })
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.upload(
      screen.getByLabelText('게시글 사진 선택'),
      new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
    )
    await user.type(screen.getByLabelText('제목'), '등록 단계 추적')
    await user.type(screen.getByLabelText('내용'), '초안을 유지해요')

    await user.click(screen.getByRole('button', { name: '게시글 등록' }))

    expect(await screen.findByRole('dialog')).toHaveTextContent('사진 업로드는 완료됐지만 게시글 등록에 실패했어요')
    expect(screen.getByLabelText('제목')).toHaveValue('등록 단계 추적')
    expect(createPost).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledWith(
      '[post-publish] request failed',
      expect.objectContaining({
        stage: 'post-create',
        photoUploadCompleted: true,
        type: 'network',
      })
    )
  })

  it('preserves the required text and permits retry after a failed publication', async () => {
    vi.mocked(createPost).mockRejectedValueOnce({ type: 'network' }).mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.type(screen.getByLabelText('제목'), '보존할 제목')
    await user.type(screen.getByLabelText('내용'), '보존할 내용')
    await user.click(screen.getByRole('button', { name: '게시글 등록' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('인터넷 연결')
    expect(screen.getByLabelText('제목')).toHaveValue('보존할 제목')
    expect(screen.getByLabelText('내용')).toHaveValue('보존할 내용')
    await user.click(screen.getByRole('button', { name: '닫기' }))
    await user.click(screen.getByRole('button', { name: '게시글 등록' }))
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/community?tab=free'))
    expect(createPost).toHaveBeenCalledTimes(2)
  })

  it('prevents duplicate publication while the first request is pending', async () => {
    const pending = deferred<void>()
    vi.mocked(createPost).mockReturnValue(pending.promise)
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.type(screen.getByLabelText('제목'), '한 번만 등록')
    await user.type(screen.getByLabelText('내용'), '중복 요청을 막아요')
    fireEvent.click(screen.getByRole('button', { name: '게시글 등록' }))
    expect(screen.getByRole('button', { name: '등록 중…' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('게시글을 등록하고 있어요')
    expect(screen.getByRole('status')).toHaveFocus()
    expect(screen.getByRole('button', { name: '등록 중…' }).closest('[inert]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '뒤로 가기' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '등록 중…' }))
    expect(createPost).toHaveBeenCalledTimes(1)
    await act(async () => pending.resolve())
    expect(mockRouter.replace).toHaveBeenCalledOnce()
  })

  it('temporarily limits content to 100 characters without discarding an older draft', () => {
    usePostDraftStore.getState().update({ title: '제목', content: '가'.repeat(101) })
    render(<PostEditor />)
    expect(screen.getByLabelText('내용')).toHaveValue('가'.repeat(101))
    expect(screen.getByLabelText('내용')).toHaveAttribute('maxlength', '100')
    expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '게시글 등록' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('임시 제한인 100자')
  })

  it('aborts a pending publication and ignores its late response after the session changes', async () => {
    const pending = deferred<void>()
    vi.mocked(createPost).mockReturnValue(pending.promise)
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.type(screen.getByLabelText('제목'), '세션 변경')
    await user.type(screen.getByLabelText('내용'), '늦은 응답을 무시해요')
    fireEvent.click(screen.getByRole('button', { name: '게시글 등록' }))
    const signal = vi.mocked(createPost).mock.calls[0]?.[1]
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal?.aborted).toBe(false)
    act(() => useAuthStore.setState({ sessionEpoch: 1, status: 'unauthenticated' }))
    expect(signal?.aborted).toBe(true)
    await act(async () => pending.resolve())
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })

  it('keeps demo drafts local and never sends them to the real API', async () => {
    useAuthStore.setState({ status: 'demo' })
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.type(screen.getByLabelText('제목'), '체험 제목')
    await user.type(screen.getByLabelText('내용'), '체험 내용')
    expect(screen.getByRole('button', { name: '로그인 후 등록' })).toBeDisabled()
    expect(screen.getByText(/체험 화면에서는/)).toBeInTheDocument()
    expect(createPost).not.toHaveBeenCalled()
  })

  it('keeps a draft across page navigation in the same session and returns to the free board', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<PostEditor />)
    await user.type(screen.getByLabelText('제목'), '이어 쓰기')
    await user.type(screen.getByLabelText('내용'), '보관할 내용')
    await user.click(screen.getByRole('button', { name: '뒤로 가기' }))
    expect(mockRouter.replace).toHaveBeenCalledWith('/community?tab=free')
    unmount()
    render(<PostEditor />)
    expect(screen.getByLabelText('제목')).toHaveValue('이어 쓰기')
    expect(screen.getByLabelText('내용')).toHaveValue('보관할 내용')
    expect(screen.getByText(/새로고침하거나 로그아웃하면 사라져요/)).toBeInTheDocument()
  })

  it('clears private content and preview on a session change', async () => {
    const user = userEvent.setup()
    render(<PostEditor />)
    await user.type(screen.getByLabelText('제목'), '이전 계정 제목')
    await user.type(screen.getByLabelText('내용'), '이전 계정 내용')
    await user.click(screen.getByRole('button', { name: '미리보기' }))
    act(() => useAuthStore.getState().clearSession())
    expect(screen.queryByText('이전 계정 내용')).not.toBeInTheDocument()
    expect(screen.getByLabelText('제목')).toHaveValue('')
    expect(usePostDraftStore.getState().content).toBe('')
  })

  it('clears a draft after logout while the editor is unmounted', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<PostEditor />)
    await user.type(screen.getByLabelText('내용'), '비공개 초안')
    unmount()
    act(() => useAuthStore.setState({ sessionEpoch: 1, status: 'unauthenticated' }))
    act(() => useAuthStore.setState({ status: 'authenticated' }))
    render(<PostEditor />)
    expect(screen.getByLabelText('내용')).toHaveValue('')
  })

  it('warns before losing a draft to reload and removes the handler after leaving', () => {
    const { unmount } = render(<PostEditor />)
    const empty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(empty)
    expect(empty.defaultPrevented).toBe(false)
    fireEvent.change(screen.getByLabelText('내용'), { target: { value: '초안' } })
    const edited = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(edited)
    expect(edited.defaultPrevented).toBe(true)
    unmount()
    const afterLeaving = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(afterLeaving)
    expect(afterLeaving.defaultPrevented).toBe(false)
  })
})
