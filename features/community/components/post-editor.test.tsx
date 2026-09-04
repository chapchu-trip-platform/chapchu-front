import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { usePostDraftStore } from '@/features/community/stores/post-draft-store'
import { createPost } from '@/features/community/api/community-api'
import { mockRouter } from '@/test/mocks/next-navigation'
import PostEditor from './post-editor'

vi.mock('@/features/community/api/community-api')

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ status: 'authenticated', sessionEpoch: 0 })
  usePostDraftStore.getState().clear()
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
  it('requires nonempty title and content for preview and never submits an unconfirmed API contract', async () => {
    const user = userEvent.setup()
    render(<PostEditor />)
    expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '임시 저장' })).toBeDisabled()
    await user.type(screen.getByLabelText('제목'), '  ')
    await user.type(screen.getByLabelText('내용'), '산책 이야기')
    expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled()
    await user.type(screen.getByLabelText('제목'), '오늘의 산책')
    await user.click(screen.getByRole('button', { name: '미리보기' }))
    expect(screen.getByRole('heading', { name: '오늘의 산책' })).toBeInTheDocument()
    expect(screen.getByLabelText('게시글 미리보기')).toHaveFocus()
    expect(screen.getByText('산책 이야기')).toBeInTheDocument()
    expect(screen.getByText('아직 게시되지 않은 글이에요.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /임시 사진/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '등록 준비 중' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '임시 저장' }))
    expect(screen.getByRole('status')).toHaveTextContent('아직 게시되지 않았어요')
    expect(createPost).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '편집' }))
    expect(screen.getByLabelText('제목')).toHaveValue('  오늘의 산책')
    expect(screen.getByLabelText('제목')).toHaveFocus()
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
