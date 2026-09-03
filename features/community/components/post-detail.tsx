'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bookmark, ChevronLeft, Flag, MessageCircle, MoreHorizontal, Share2, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { deletePost, fetchMyBookmarks, fetchMyPosts, fetchPost, reportPost, setPostBookmark, setPostRecommendation, updatePost } from '@/features/community/api/community-api'
import { useCommunityAction, useCommunityQuery } from '@/features/community/hooks/use-community-request'
import { formatCommunityDate } from '@/features/community/lib/community-model'
import type { Post } from '@/features/community/types/community'
import { cn } from '@/lib/utils'
import { CommunityFeedback, CommunityPhoto, communityTextAreaClass, PostCompanionInfo, QueryFeedback } from './community-shared'
import { PostComments } from './post-comments'

export function PostDetail({ postId, onBack }: { postId: string; onBack: () => void }) {
  const request = useCallback((signal: AbortSignal) => fetchPost(postId, signal), [postId])
  const query = useCommunityQuery(request)
  if (!query.data) return <div className="flex-1 overflow-y-auto bg-warm-beige p-4 pb-24">
    <IconButton onClick={onBack} aria-label="뒤로가기"><ChevronLeft /></IconButton>
    <QueryFeedback loading={query.loading} error={query.error} onRetry={query.reload} />
  </div>
  return <LoadedPost initialPost={query.data} onBack={onBack} />
}

function LoadedPost({ initialPost, onBack }: { initialPost: Post; onBack: () => void }) {
  const [post, setPost] = useState(initialPost)
  const bookmarks = useCommunityQuery(fetchMyBookmarks)
  const myPosts = useCommunityQuery(fetchMyPosts)
  const [recommendation, setRecommendation] = useState<boolean | null>(null)
  const [panel, setPanel] = useState<'menu' | 'report' | 'edit' | 'delete' | null>(null)
  const [title, setTitle] = useState(post.title)
  const [content, setContent] = useState(post.content)
  const [reportDetail, setReportDetail] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (panel) {
      panelRef.current?.focus({ preventScroll: true })
      panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }, [panel])
  const action = useCommunityAction()
  const bookmarked = bookmarks.data?.some(item => item.id === post.id)
  const owned = myPosts.data?.some(item => item.id === post.id) === true

  const recommend = (enabled: boolean) => void action.run(async ({ isCurrent, signal }) => {
    await setPostRecommendation(post.id, enabled)
    if (!isCurrent()) return null
    // A failed count refresh must not present a successful mutation as a failed write.
    try { return await fetchPost(post.id, signal) } catch { return null }
  }, refreshed => {
    setRecommendation(enabled)
    if (refreshed) setPost(previous => ({ ...previous, recommendationCount: refreshed.recommendationCount }))
  }, refreshed => (enabled ? '추천했어요.' : '추천을 취소했어요.') + (refreshed ? '' : ' 최신 추천 수는 다시 열어 확인해 주세요.'))

  const share = () => void action.run(async () => {
    const url = new URL('/community', window.location.origin)
    url.searchParams.set('post', post.id)
    if (navigator.share) { await navigator.share({ title: post.title, url: url.href }); return undefined }
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url.href); return '게시글 링크를 복사했어요.' }
    throw new Error('Sharing is unavailable.')
  }, () => {}, message => message)

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-beige">
    <div className="z-40 flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card-surface px-4">
      <IconButton onClick={onBack} aria-label="뒤로가기"><ChevronLeft className="h-5 w-5 text-deep-brown" /></IconButton>
      <div className="flex gap-1">
        <IconButton aria-label={bookmarked ? '북마크 취소' : '북마크'} aria-pressed={bookmarked ?? undefined} disabled={action.busy || !bookmarks.data} onClick={() => void action.run(() => setPostBookmark(post.id, !bookmarked), () => {
          bookmarks.setData(previous => bookmarked ? previous?.filter(item => item.id !== post.id) ?? null : [...(previous ?? []), post])
        }, bookmarked ? '북마크를 취소했어요.' : '북마크에 저장했어요.')}><Bookmark className={cn('h-5 w-5', bookmarked ? 'fill-soft-orange text-soft-orange' : 'text-deep-brown')} /></IconButton>
        <IconButton aria-label="더보기" aria-expanded={panel === 'menu'} onClick={() => setPanel(panel === 'menu' ? null : 'menu')} disabled={action.busy}><MoreHorizontal className="h-5 w-5" /></IconButton>
      </div>
    </div>
    <PostComments postId={post.id} count={post.commentCount} onCountChange={delta => setPost(previous => ({ ...previous, commentCount: Math.max(0, previous.commentCount + delta) }))}>
      <CommunityPhoto url={post.photoUrl} title={post.title} className="h-52" />
      <div className="space-y-3 px-4 pt-4">
        <CommunityFeedback error={action.error} notice={action.notice} />
        {bookmarks.error && <div><CommunityFeedback error="북마크 상태를 확인하지 못했어요." /><Button variant="ghost" size="sm" onClick={bookmarks.reload}>북마크 다시 확인</Button></div>}
        {panel && <div ref={panelRef} tabIndex={-1} aria-label="게시글 작업" className="outline-none" />}
        {panel === 'menu' && <div className="space-y-2 rounded-card border border-border bg-card-surface p-3">
          <Button variant="ghost" size="sm" disabled={action.busy} onClick={() => recommend(false)}>추천 취소</Button>
          <Button variant="ghost" size="sm" onClick={() => setPanel('report')}>광고·스팸 신고</Button>
          {myPosts.loading && <p className="text-[12px] text-warm-gray">내 게시글인지 확인 중이에요…</p>}
          {myPosts.error && <Button variant="outline" size="sm" onClick={myPosts.reload}>내 게시글 다시 확인</Button>}
          {owned && <><Button variant="ghost" size="sm" onClick={() => setPanel('edit')}>게시글 수정</Button><Button variant="ghost" size="sm" onClick={() => setPanel('delete')}>게시글 삭제</Button></>}
        </div>}
        {panel === 'report' && <form className="space-y-3 rounded-card border border-border bg-card-surface p-3" onSubmit={event => {
          event.preventDefault()
          void action.run(() => reportPost(post.id, reportDetail.trim()), () => { setPanel(null); setReportDetail('') }, '신고가 접수되었어요.')
        }}>
          <h2 className="text-[14px] font-semibold">광고·스팸 신고</h2>
          <p className="text-[12px] text-warm-gray">광고나 스팸에 해당하는 게시글을 신고해 주세요. 다른 사유의 신고는 준비 중이에요.</p>
          <textarea aria-label="신고 상세 내용" placeholder="상세 내용 (선택)" value={reportDetail} maxLength={2000} disabled={action.busy} onChange={event => setReportDetail(event.target.value)} className={communityTextAreaClass} />
          <div className="flex gap-2"><Button type="submit" size="sm" disabled={action.busy}>신고 접수</Button><Button variant="ghost" size="sm" disabled={action.busy} onClick={() => setPanel(null)}>취소</Button></div>
        </form>}
        {panel === 'edit' && owned && <form className="space-y-3 rounded-card border border-border bg-card-surface p-3" onSubmit={event => {
          event.preventDefault()
          if (!title.trim() || !content.trim()) return
          void action.run(() => updatePost(post.id, { title: title.trim(), content: content.trim() }), updated => {
            setPost(updated); setTitle(updated.title); setContent(updated.content); setPanel(null)
          }, '게시글을 수정했어요.')
        }}>
          <h2 className="text-[14px] font-semibold">게시글 수정</h2>
          <Input aria-label="게시글 제목" value={title} maxLength={500} disabled={action.busy} onChange={event => setTitle(event.target.value)} />
          <textarea aria-label="게시글 내용" value={content} maxLength={20_000} disabled={action.busy} onChange={event => setContent(event.target.value)} className={communityTextAreaClass} />
          <div className="flex gap-2"><Button type="submit" size="sm" disabled={action.busy || !title.trim() || !content.trim()}>수정 저장</Button><Button variant="ghost" size="sm" disabled={action.busy} onClick={() => setPanel(null)}>취소</Button></div>
        </form>}
        {panel === 'delete' && owned && <div className="space-y-3 rounded-card border border-border bg-card-surface p-3">
          <p className="text-[13px]">게시글을 삭제할까요? 삭제 후에는 되돌릴 수 없어요.</p>
          <Button variant="destructive" size="sm" disabled={action.busy} onClick={() => void action.run(() => deletePost(post.id), onBack)}>게시글 삭제 확인</Button>
          <Button variant="ghost" size="sm" disabled={action.busy} onClick={() => setPanel(null)}>취소</Button>
        </div>}
        <span className="rounded-full bg-sage-green px-2 py-0.5 text-[11px] font-semibold text-white">자유게시판</span>
        <h1 className="break-words text-balance text-[20px] font-bold leading-snug text-deep-brown">{post.title}</h1>
        <div className="flex items-center gap-2 border-b border-border py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-green/20 text-[13px] font-bold text-sage-green">{post.nickname[0] || '여'}</div>
          <div><p className="text-[13px] font-semibold text-deep-brown">{post.nickname || '작성자'}</p><p className="text-[11px] text-warm-gray">{formatCommunityDate(post.createdAt)} · 조회 {post.viewCount.toLocaleString()}</p></div>
        </div>
        <p className="whitespace-pre-wrap break-words border-b border-border py-4 text-[14px] leading-relaxed text-deep-brown">{post.content}</p>
        <PostCompanionInfo post={post} />
        <div className="flex flex-wrap gap-3 py-3">
          <Button variant="ghost" size="sm" aria-label={recommendation ? '추천 취소' : '게시글 추천'} aria-pressed={recommendation ?? undefined} disabled={action.busy} className={cn('px-0', recommendation ? 'text-sage-green' : 'text-warm-gray')} onClick={() => recommend(recommendation !== true)}><ThumbsUp className={recommendation ? 'fill-sage-green' : ''} />{post.recommendationCount}</Button>
          <Button variant="ghost" size="sm" aria-label="댓글로 이동" className="px-0" onClick={() => document.getElementById('community-comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><MessageCircle />{post.commentCount}</Button>
          <Button variant="ghost" size="sm" className="px-0" disabled={action.busy} onClick={share}><Share2 />공유</Button>
          <Button variant="ghost" size="sm" className="ml-auto px-0" disabled={action.busy} onClick={() => setPanel('report')}><Flag />신고</Button>
        </div>
      </div>
    </PostComments>
  </div>
}
