import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/features/community/api/community-api'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { commentFixture, postFixture } from '@/test/fixtures/community'
import type { Comment } from '@/features/community/types/community'
import { PostComments } from './post-comments'
import { CommunityNoticeProvider } from './community-notice-provider'

vi.mock('@/features/community/api/community-api')
function Harness({ postId = 'post-1' }: { postId?: string }) {
  const [count, setCount] = useState(8)
  return <CommunityNoticeProvider key={postId}><PostComments postId={postId} count={count} onCountChange={setCount} /></CommunityNoticeProvider>
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(yes => { resolve = yes })
  return { resolve, promise }
}
beforeEach(() => {
  vi.resetAllMocks()
  useAuthStore.setState({ status: 'authenticated', sessionEpoch: 0 })
  vi.mocked(api.fetchComments).mockResolvedValue([commentFixture])
})
afterEach(cleanup)

describe('persisted post comments', () => {
  it('preserves a successful comment when only its count refresh fails without replaying the write', async () => {
    const user = userEvent.setup()
    vi.mocked(api.fetchComments).mockResolvedValue([])
    vi.mocked(api.createComment).mockResolvedValue(commentFixture)
    vi.mocked(api.fetchPost).mockRejectedValue({ type: 'server' })
    render(<Harness />)
    await screen.findByText(/첫 댓글을 남겨/)
    await user.type(screen.getByRole('textbox', { name: '댓글 내용' }), '댓글')
    await user.click(screen.getByRole('button', { name: '댓글 전송' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('최신 댓글 수는 다시 열어')
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(await screen.findByText(commentFixture.content)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '댓글 내용' })).toHaveValue('')
    expect(screen.getByRole('heading', { name: '댓글 8' })).toBeInTheDocument()
    expect(api.createComment).toHaveBeenCalledTimes(1)
  })
  it('keeps a deleted parent and its child after deletion, hides parent actions and reads the server count', async () => {
    const user = userEvent.setup()
    const child = { ...commentFixture, id: 'child', parentCommentId: commentFixture.id, content: '보존된 답글', depth: 1 }
    const deleted = { ...commentFixture, deleted: true, nickname: null, content: '서버 원문이 와도 숨김' }
    vi.mocked(api.fetchComments).mockResolvedValueOnce([commentFixture, child]).mockResolvedValueOnce([deleted, child])
    vi.mocked(api.fetchPost).mockResolvedValue({ ...postFixture, commentCount: 1 })
    render(<Harness />)
    await user.click((await screen.findAllByRole('button', { name: '댓글 삭제' }))[0])
    await user.click(screen.getByRole('button', { name: '삭제 확인' }))
    await user.click(await screen.findByRole('button', { name: '닫기' }))
    const placeholder = await screen.findByText('삭제된 댓글입니다')
    expect(screen.getByText(child.content)).toBeInTheDocument()
    expect(placeholder.compareDocumentPosition(screen.getByText(child.content)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText(deleted.content)).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '댓글 수정' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: '댓글 삭제' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: '답글' })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: '댓글 1' })).toBeInTheDocument()
  })
  it('loads authors and replies on re-entry without overwriting the server post count', async () => {
    const reply = { ...commentFixture, id: 'reply', content: '답글 내용', parentCommentId: commentFixture.id, depth: 1, nickname: '(탈퇴한 사용자)' }
    vi.mocked(api.fetchComments).mockResolvedValue([commentFixture, reply])
    const first = render(<Harness />)
    await screen.findByText(reply.content)
    expect(screen.getByText(/댓글 작성자/)).toBeInTheDocument()
    expect(screen.getByText(/탈퇴한 사용자/)).toBeInTheDocument()
    expect(screen.getByText(commentFixture.content).compareDocumentPosition(screen.getByText(reply.content)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(await screen.findByRole('heading', { name: '댓글 8' })).toBeInTheDocument()
    first.unmount()
    render(<Harness />)
    await screen.findByText(reply.content)
    expect(api.fetchComments).toHaveBeenCalledTimes(2)
  })
  it('shows a list failure, blocks writes and retries to the empty state', async () => {
    const user = userEvent.setup()
    vi.mocked(api.fetchComments).mockRejectedValueOnce({ type: 'network' }).mockResolvedValueOnce([])
    render(<Harness />)
    await screen.findByRole('alert')
    expect(screen.getByRole('textbox', { name: '댓글 내용' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText(/첫 댓글을 남겨/)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '댓글 내용' })).toBeEnabled()
  })
  it('preserves the original and edit draft on 404, then applies a single successful save', async () => {
    const user = userEvent.setup()
    const save = deferred<Comment>()
    vi.mocked(api.updateComment).mockRejectedValueOnce({ type: 'not-found', status: 404 }).mockReturnValueOnce(save.promise)
    render(<Harness />)
    await user.click(await screen.findByRole('button', { name: '댓글 수정' }))
    const editor = screen.getByRole('textbox', { name: '수정할 댓글 내용' })
    expect(editor).toHaveFocus()
    await user.clear(editor)
    await user.type(editor, '수정한 댓글')
    await user.click(screen.getByRole('button', { name: '수정 저장' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('수정·삭제할 권한이 없어요')
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(editor).toHaveValue('수정한 댓글')
    expect(screen.getByText(commentFixture.content)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }))
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }))
    expect(api.updateComment).toHaveBeenCalledTimes(2)
    expect(api.updateComment).toHaveBeenLastCalledWith('post-1', 'comment-1', '수정한 댓글')
    await act(async () => save.resolve({ ...commentFixture, content: '수정한 댓글' }))
    await user.click(await screen.findByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('textbox', { name: '수정할 댓글 내용' })).not.toBeInTheDocument()
    expect(screen.getByText('수정한 댓글')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '댓글 8' })).toBeInTheDocument()
  })
  it('cancels edits without writing and disables blank saves', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(await screen.findByRole('button', { name: '댓글 수정' }))
    await user.clear(screen.getByRole('textbox', { name: '수정할 댓글 내용' }))
    expect(screen.getByRole('button', { name: '수정 저장' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '수정 취소' }))
    expect(api.updateComment).not.toHaveBeenCalled()
    expect(screen.getByText(commentFixture.content)).toBeInTheDocument()
  })
  it('blocks writes during list loading and ignores responses from the previous post', async () => {
    const old = deferred<Comment[]>()
    vi.mocked(api.fetchComments).mockReturnValueOnce(old.promise).mockResolvedValueOnce([])
    const { rerender } = render(<Harness />)
    expect(screen.getByRole('textbox', { name: '댓글 내용' })).toBeDisabled()
    rerender(<Harness postId="post-2" />)
    await screen.findByText(/첫 댓글을 남겨/)
    await act(async () => old.resolve([commentFixture]))
    expect(screen.queryByText(commentFixture.content)).not.toBeInTheDocument()
    expect(api.fetchComments).toHaveBeenLastCalledWith('post-2', expect.any(AbortSignal))
  })
  it('reloads the server tree after deleting a parent and exposes failed reads for retry', async () => {
    const user = userEvent.setup()
    const reply = { ...commentFixture, id: 'reply', content: '남은 답글', parentCommentId: 'comment-1', depth: 1 }
    vi.mocked(api.fetchComments).mockResolvedValueOnce([commentFixture, reply]).mockRejectedValueOnce({ type: 'server' }).mockResolvedValueOnce([reply])
    render(<Harness />)
    await screen.findByText(reply.content)
    await user.click(screen.getAllByRole('button', { name: '댓글 삭제' })[0])
    await user.click(screen.getByRole('button', { name: '삭제 확인' }))
    await user.click(await screen.findByRole('button', { name: '닫기' }))
    await screen.findByRole('alert')
    expect(api.deleteComment).toHaveBeenCalledExactlyOnceWith('comment-1')
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    await screen.findByText(reply.content)
    expect(screen.queryByText(commentFixture.content)).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { name: '댓글 8' })).toBeInTheDocument())
  })
  it('preserves comments and count on failed deletion without reloading or reporting success', async () => {
    const user = userEvent.setup()
    vi.mocked(api.deleteComment).mockRejectedValue({ status: 404, type: 'not-found' })
    render(<Harness />)
    await user.click(await screen.findByRole('button', { name: '댓글 삭제' }))
    await user.click(screen.getByRole('button', { name: '삭제 확인' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('권한이 없어요')
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.getByText(commentFixture.content)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '댓글 8' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '삭제 확인' })).toBeEnabled()
    expect(api.fetchComments).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('댓글을 삭제했어요.')).not.toBeInTheDocument()
  })
  it('clears a previous permission error when opening another edit', async () => {
    const user = userEvent.setup()
    vi.mocked(api.updateComment).mockRejectedValue({ status: 404, type: 'not-found' })
    render(<Harness />)
    await user.click(await screen.findByRole('button', { name: '댓글 수정' }))
    await user.type(screen.getByRole('textbox', { name: '수정할 댓글 내용' }), ' 수정')
    await user.click(screen.getByRole('button', { name: '수정 저장' }))
    await user.click(await screen.findByRole('button', { name: '닫기' }))
    await user.click(screen.getByRole('button', { name: '수정 취소' }))
    await user.click(screen.getByRole('button', { name: '댓글 수정' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '수정할 댓글 내용' })).toHaveValue(commentFixture.content)
  })
})
