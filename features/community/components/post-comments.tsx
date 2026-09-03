'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { createComment, deleteComment } from '@/features/community/api/community-api'
import { useCommunityAction } from '@/features/community/hooks/use-community-request'
import { formatCommunityDate, orderComments } from '@/features/community/lib/community-model'
import type { Comment } from '@/features/community/types/community'
import { CommunityFeedback } from './community-shared'

export function PostComments({ postId, count, onCountChange, children }: { postId: string; count: number; onCountChange: (delta: number) => void; children?: ReactNode }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const action = useCommunityAction()

  function submit() {
    if (!content.trim()) return
    void action.run(() => createComment(postId, content.trim(), replyTo), comment => {
      setComments(previous => [...previous, comment])
      setContent('')
      setReplyTo(null)
      onCountChange(1)
    }, '댓글을 등록했어요.')
  }

  return <>
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
    {children}
    <section id="community-comments" className="border-t border-border px-4 py-4">
    <h2 className="mb-3 text-[14px] font-semibold text-deep-brown">댓글 {count}</h2>
    <p className="mb-4 text-[12px] leading-relaxed text-warm-gray">기존 댓글을 불러오는 기능은 준비 중이에요. 이 화면에서 새로 작성한 댓글은 아래에서 확인할 수 있어요.</p>
    <div className="space-y-4">
      {orderComments(comments).map(({ comment, depth }) => <div key={comment.id} style={{ marginLeft: Math.min(depth, 3) * 16 }} className={depth ? 'border-l border-border pl-3' : ''}>
        <p className="text-[12px] text-warm-gray">내 댓글 · {formatCommunityDate(comment.createdAt)}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-[13px] text-deep-brown">{comment.content}</p>
        <div className="mt-1 flex gap-2">
          <Button variant="ghost" size="sm" disabled={action.busy} onClick={() => { setReplyTo(comment.id); inputRef.current?.focus() }}>답글</Button>
          <Button variant="ghost" size="sm" title={comments.some(item => item.parentCommentId === comment.id) ? '답글을 먼저 삭제해 주세요' : undefined} disabled={action.busy || comments.some(item => item.parentCommentId === comment.id)} onClick={() => setDeleting(comment.id)}>댓글 삭제</Button>
        </div>
        {deleting === comment.id && <div className="space-y-2 rounded-xl bg-muted p-3">
          <p className="text-[12px]">이 댓글을 삭제할까요?</p>
          <Button variant="destructive" size="sm" disabled={action.busy} onClick={() => void action.run(() => deleteComment(comment.id), () => {
            setComments(previous => previous.filter(item => item.id !== comment.id))
            setDeleting(null)
            if (replyTo === comment.id) setReplyTo(null)
            onCountChange(-1)
          }, '댓글을 삭제했어요.')}>삭제 확인</Button>
          <Button variant="ghost" size="sm" disabled={action.busy} onClick={() => setDeleting(null)}>취소</Button>
        </div>}
      </div>)}
    </div>
    </section>
    </div>
    <form className="mb-20 shrink-0 border-t border-border bg-card-surface px-4 py-3" onSubmit={event => { event.preventDefault(); submit() }}>
      <CommunityFeedback error={action.error} notice={action.notice} />
      {replyTo && <div className="mb-2 flex items-center justify-between text-[12px] text-sage-green"><span>답글 작성 중</span><Button size="sm" variant="ghost" disabled={action.busy} onClick={() => setReplyTo(null)}>답글 취소</Button></div>}
      <div className="flex gap-2">
        <Input ref={inputRef} aria-label="댓글 내용" value={content} maxLength={20_000} disabled={action.busy} onChange={event => setContent(event.target.value)} placeholder="댓글을 입력하세요..." size="compact" className="h-10 flex-1 rounded-full border-transparent bg-muted" />
        <IconButton type="submit" aria-label="댓글 전송" size="lg" variant={content.trim() ? 'primary' : 'muted'} disabled={!content.trim() || action.busy}><Send className="h-4 w-4" /></IconButton>
      </div>
    </form>
  </>
}
