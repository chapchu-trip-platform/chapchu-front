'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { createComment, deleteComment, fetchComments, fetchPost, updateComment } from '@/features/community/api/community-api'
import { useCommunityAction, useCommunityQuery } from '@/features/community/hooks/use-community-request'
import { commentMutationErrorMessage, formatCommunityDate, orderComments } from '@/features/community/lib/community-model'
import { QueryFeedback, communityTextAreaClass } from './community-shared'

export function PostComments({ postId, count, onCountChange, children }: { postId: string; count: number; onCountChange: (total: number) => void; children?: ReactNode }) {
  const request = useCallback((signal: AbortSignal) => fetchComments(postId, signal), [postId])
  const query = useCommunityQuery(request)
  const comments = query.data ?? []
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const action = useCommunityAction()
  const editAction = useCommunityAction()
  const busy = action.busy || editAction.busy || query.loading || Boolean(query.error)

  async function readCount(signal: AbortSignal) {
    try { return (await fetchPost(postId, signal)).commentCount } catch { return null }
  }

  function submit() {
    if (!content.trim() || busy) return
    void action.run(async ({ signal, isCurrent }) => {
      const comment = await createComment(postId, content.trim(), replyTo)
      return { comment, total: isCurrent() ? await readCount(signal) : null }
    }, ({ comment, total }) => {
      query.setData(previous => [...(previous ?? []).filter(item => item.id !== comment.id), comment])
      setContent('')
      setReplyTo(null)
      if (total !== null) onCountChange(total)
    }, result => '댓글을 등록했어요.' + (result.total === null ? ' 최신 댓글 수는 다시 열어 확인해 주세요.' : ''))
  }

  return <>
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
    {children}
    <section id="community-comments" className="border-t border-border px-4 py-4">
    <h2 className="mb-3 text-[14px] font-semibold text-deep-brown">댓글 {count}</h2>
    <QueryFeedback loading={query.loading} error={query.error} onRetry={query.reload} />
    {query.data?.length === 0 && <p className="mb-4 text-[12px] text-warm-gray">아직 댓글이 없어요. 첫 댓글을 남겨 보세요.</p>}
    {comments.length > 0 && <p className="mb-4 text-[12px] text-warm-gray">본인이 작성한 댓글만 수정·삭제할 수 있어요.</p>}
    <div className="space-y-4">
      {orderComments(comments).map(({ comment, depth }) => <div key={comment.id} style={{ marginLeft: Math.min(depth, 3) * 16 }} className={depth ? 'border-l border-border pl-3' : ''}>
        {!comment.deleted && <p className="text-[12px] text-warm-gray">{comment.nickname} · {formatCommunityDate(comment.createdAt)}</p>}
        <p className="mt-1 whitespace-pre-wrap break-words text-[13px] text-deep-brown">{comment.deleted ? '삭제된 댓글입니다' : comment.content}</p>
        {!comment.deleted && <div className="mt-1 flex gap-2">
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setReplyTo(comment.id); inputRef.current?.focus() }}>답글</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => { editAction.clearFeedback(); setDeleting(null); setEditing(comment.id); setEditContent(comment.content) }}>댓글 수정</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setEditing(null); setDeleting(comment.id) }}>댓글 삭제</Button>
        </div>}
        {!comment.deleted && editing === comment.id && <form className="space-y-2 rounded-xl bg-muted p-3" onSubmit={event => {
          event.preventDefault()
          if (busy || !editContent.trim()) return
          void editAction.run(() => updateComment(postId, comment.id, editContent.trim()), updated => {
            query.setData(previous => previous?.map(item => item.id === updated.id ? updated : item) ?? null)
            setEditing(null)
          }, '댓글을 수정했어요.', commentMutationErrorMessage)
        }}>
          <textarea autoFocus aria-label="수정할 댓글 내용" className={communityTextAreaClass} maxLength={20_000} value={editContent} disabled={busy} onChange={event => setEditContent(event.target.value)} />
          <Button type="submit" size="sm" disabled={busy || !editContent.trim() || editContent.trim() === comment.content}>수정 저장</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(null)}>수정 취소</Button>
        </form>}
        {!comment.deleted && deleting === comment.id && <div className="space-y-2 rounded-xl bg-muted p-3">
          <p className="text-[12px]">이 댓글을 삭제할까요?</p>
          <Button variant="destructive" size="sm" disabled={busy} onClick={() => void action.run(async ({ signal, isCurrent }) => {
            await deleteComment(comment.id)
            return isCurrent() ? readCount(signal) : null
          }, total => {
            // The server owns descendant deletion semantics. Read the resulting tree.
            query.reload()
            setDeleting(null)
            setReplyTo(null)
            if (total !== null) onCountChange(total)
          }, total => '댓글을 삭제했어요.' + (total === null ? ' 최신 댓글 수는 다시 열어 확인해 주세요.' : ''), commentMutationErrorMessage)}>삭제 확인</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setDeleting(null)}>취소</Button>
        </div>}
      </div>)}
    </div>
    </section>
    </div>
    <form className="mb-20 shrink-0 border-t border-border bg-card-surface px-4 py-3" onSubmit={event => { event.preventDefault(); submit() }}>
      {replyTo && <div className="mb-2 flex items-center justify-between text-[12px] text-sage-green"><span>답글 작성 중</span><Button size="sm" variant="ghost" disabled={busy} onClick={() => setReplyTo(null)}>답글 취소</Button></div>}
      <div className="flex gap-2">
        <Input ref={inputRef} aria-label="댓글 내용" value={content} maxLength={20_000} disabled={busy} onChange={event => setContent(event.target.value)} placeholder="댓글을 입력하세요..." size="compact" className="h-10 flex-1 rounded-full border-transparent bg-muted" />
        <IconButton type="submit" aria-label="댓글 전송" size="lg" variant={content.trim() ? 'primary' : 'muted'} disabled={!content.trim() || busy}><Send className="h-4 w-4" /></IconButton>
      </div>
    </form>
  </>
}
