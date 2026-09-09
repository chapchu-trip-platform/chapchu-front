'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bookmark, ChevronLeft, Flag, MessageCircle, MoreHorizontal, ThumbsUp } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { deletePost, fetchMyPosts, fetchPost, reportPost, setPostBookmark, updatePost } from '@/features/community/api/community-api'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { POST_TITLE_LIMIT } from '@/features/community/stores/post-draft-store'
import { useCommunityAction, useCommunityQuery } from '@/features/community/hooks/use-community-request'
import { usePrefersReducedMotion } from '@/features/community/hooks/use-prefers-reduced-motion'
import { formatCommunityDate, postReactionErrorMessage } from '@/features/community/lib/community-model'
import { usePostRecommendationStore } from '@/features/community/stores/post-recommendation-store'
import type { Post } from '@/features/community/types/community'
import { cn } from '@/lib/utils'
import { CommunityPhotoGallery, communityTextAreaClass, QueryFeedback } from './community-shared'
import { CommunityNoticeProvider } from './community-notice-provider'
import { PostComments } from './post-comments'

export function PostDetail({ postId, onBack }: { postId: string; onBack: () => void }) {
  const request = useCallback(async (signal: AbortSignal) => {
    const expected = usePostRecommendationStore.getState().byPost[postId]
    const epoch = useAuthStore.getState().sessionEpoch
    const result = await fetchPost(postId, signal)
    if (!signal.aborted && epoch === useAuthStore.getState().sessionEpoch) {
      usePostRecommendationStore.getState().applyRead(postId, result.recommended, expected)
    }
    return result
  }, [postId])
  const query = useCommunityQuery(request)
  if (!query.data) return <div className="flex-1 overflow-y-auto bg-warm-beige p-4 pb-24">
    <IconButton onClick={onBack} aria-label="뒤로가기"><ChevronLeft /></IconButton>
    <QueryFeedback loading={query.loading} error={query.error} onRetry={query.reload} />
  </div>
  return <CommunityNoticeProvider key={query.data.id}><LoadedPost initialPost={query.data} onBack={onBack} /></CommunityNoticeProvider>
}

function LoadedPost({ initialPost, onBack }: { initialPost: Post; onBack: () => void }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [post, setPost] = useState(initialPost)
  const myPosts = useCommunityQuery(fetchMyPosts)
  const recommendation = usePostRecommendationStore(state => state.byPost[initialPost.id]?.value)
  const recommendationPending = usePostRecommendationStore(state => state.byPost[initialPost.id]?.pending ?? false)
  const [panel, setPanel] = useState<'menu' | 'report' | 'edit' | 'delete' | null>(null)
  const [title, setTitle] = useState(post.title)
  const [content, setContent] = useState(post.content)
  const [reportDetail, setReportDetail] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const reducedMotionRef = useRef(prefersReducedMotion)
  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion
  }, [prefersReducedMotion])
  useEffect(() => {
    if (panel) {
      panelRef.current?.focus({ preventScroll: true })
      panelRef.current?.scrollIntoView({ block: 'start', behavior: reducedMotionRef.current ? 'auto' : 'smooth' })
    }
  }, [panel])
  const action = useCommunityAction()
  const reactionAction = useCommunityAction()
  const busy = action.busy || reactionAction.busy
  const bookmarked = post.bookmarked
  const owned = myPosts.data?.some(item => item.id === post.id) === true

  const recommend = (enabled: boolean) => void reactionAction.run(async ({ isCurrent, signal }) => {
    await usePostRecommendationStore.getState().change(post.id, enabled)
    if (!isCurrent()) return null
    // A failed count refresh must not present a successful mutation as a failed write.
    try { return await fetchPost(post.id, signal) } catch { return null }
  }, refreshed => {
    if (refreshed) setPost(previous => ({ ...previous, recommendationCount: refreshed.recommendationCount }))
  }, refreshed => (enabled ? '추천했어요.' : '추천을 취소했어요.') + (refreshed ? '' : ' 최신 추천 수는 다시 열어 확인해 주세요.'), error => postReactionErrorMessage(error, enabled ? '추천' : '추천 취소'))

  const toggleBookmark = () => void reactionAction.run(() => setPostBookmark(post.id, !bookmarked), () => {
    setPost(previous => ({ ...previous, bookmarked: !bookmarked }))
  }, bookmarked ? '북마크를 취소했어요.' : '북마크에 저장했어요.', error => postReactionErrorMessage(error, bookmarked ? '북마크 취소' : '북마크 등록'))

  const reveal = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const }
  const panelMotion = prefersReducedMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { height: 0, opacity: 0, y: -8 }, animate: { height: 'auto', opacity: 1, y: 0 } }

  return <motion.div initial={prefersReducedMotion ? false : { opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={reveal} className="flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-beige">
    <div className="z-40 flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card-surface px-4">
      <IconButton onClick={onBack} aria-label="뒤로가기"><ChevronLeft className="h-5 w-5 text-deep-brown" /></IconButton>
      <div className="flex gap-1">
        <IconButton aria-label="더보기" aria-expanded={panel === 'menu'} onClick={() => setPanel(panel === 'menu' ? null : 'menu')} disabled={busy}><MoreHorizontal className="h-5 w-5" /></IconButton>
      </div>
    </div>
    <PostComments postId={post.id} count={post.commentCount} onCountChange={total => setPost(previous => ({ ...previous, commentCount: total }))}>
      <motion.div initial={prefersReducedMotion ? false : { opacity: 0, scale: 1.015 }} animate={{ opacity: 1, scale: 1 }} transition={reveal}>
        <CommunityPhotoGallery post={post} />
      </motion.div>
      <motion.div initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...reveal, delay: prefersReducedMotion ? 0 : 0.05 }} className="space-y-3 px-4 pt-4">
        {panel === 'menu' && <motion.div key="menu" ref={panelRef} tabIndex={-1} aria-label="게시글 작업" {...panelMotion} transition={reveal} className="overflow-hidden space-y-2 rounded-card border border-border bg-card-surface p-3 outline-none">
          <Button variant="ghost" size="sm" onClick={() => setPanel('report')}>광고·스팸 신고</Button>
          {myPosts.loading && <p className="text-[12px] text-warm-gray">내 게시글인지 확인 중이에요…</p>}
          {myPosts.error && <Button variant="outline" size="sm" onClick={myPosts.reload}>내 게시글 다시 확인</Button>}
          {owned && <><Button variant="ghost" size="sm" onClick={() => setPanel('edit')}>게시글 수정</Button><Button variant="ghost" size="sm" onClick={() => setPanel('delete')}>게시글 삭제</Button></>}
        </motion.div>}
        {panel === 'report' && <motion.div key="report" ref={panelRef} tabIndex={-1} aria-label="게시글 작업" {...panelMotion} transition={reveal} className="overflow-hidden rounded-card border border-border bg-card-surface p-3 outline-none"><form className="space-y-3" onSubmit={event => {
          event.preventDefault()
          void action.run(() => reportPost(post.id, reportDetail.trim()), () => { setPanel(null); setReportDetail('') }, '신고가 접수되었어요.')
        }}>
          <h2 className="text-[14px] font-semibold">광고·스팸 신고</h2>
          <p className="text-[12px] text-warm-gray">광고나 스팸에 해당하는 게시글을 신고해 주세요. 다른 사유의 신고는 준비 중이에요.</p>
          <textarea aria-label="신고 상세 내용" placeholder="상세 내용 (선택)" value={reportDetail} maxLength={2000} disabled={busy} onChange={event => setReportDetail(event.target.value)} className={communityTextAreaClass} />
          <div className="flex gap-2"><Button type="submit" size="sm" disabled={busy}>신고 접수</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => setPanel(null)}>취소</Button></div>
        </form></motion.div>}
        {panel === 'edit' && owned && <motion.div key="edit" ref={panelRef} tabIndex={-1} aria-label="게시글 작업" {...panelMotion} transition={reveal} className="overflow-hidden rounded-card border border-border bg-card-surface p-3 outline-none"><form className="space-y-3" onSubmit={event => {
          event.preventDefault()
          if (!title.trim() || title.length > POST_TITLE_LIMIT || !content.trim()) return
          void action.run(() => updatePost(post.id, { title: title.trim(), content: content.trim() }), updated => {
            setPost(previous => ({ ...previous, title: updated.title, content: updated.content })); setTitle(updated.title); setContent(updated.content); setPanel(null)
          }, '게시글을 수정했어요.')
        }}>
          <h2 className="text-[14px] font-semibold">게시글 수정</h2>
          <Input aria-label="게시글 제목" value={title} maxLength={POST_TITLE_LIMIT} disabled={busy} onChange={event => setTitle(event.target.value)} />
          {title.length > POST_TITLE_LIMIT && <p role="alert">제목을 {POST_TITLE_LIMIT}자 이내로 줄여 주세요.</p>}
          <textarea aria-label="게시글 내용" value={content} maxLength={20_000} disabled={busy} onChange={event => setContent(event.target.value)} className={communityTextAreaClass} />
          <div className="flex gap-2"><Button type="submit" size="sm" disabled={busy || !title.trim() || title.length > POST_TITLE_LIMIT || !content.trim()}>수정 저장</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => setPanel(null)}>취소</Button></div>
        </form></motion.div>}
        {panel === 'delete' && owned && <motion.div key="delete" ref={panelRef} tabIndex={-1} aria-label="게시글 작업" {...panelMotion} transition={reveal} className="overflow-hidden space-y-3 rounded-card border border-border bg-card-surface p-3 outline-none">
          <p className="text-[13px]">게시글을 삭제할까요? 삭제 후에는 되돌릴 수 없어요.</p>
          <Button variant="destructive" size="sm" disabled={busy} onClick={() => void action.run(() => deletePost(post.id), onBack)}>게시글 삭제 확인</Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setPanel(null)}>취소</Button>
        </motion.div>}
        <span className="rounded-full bg-sage-green px-2 py-0.5 text-[11px] font-semibold text-white">자유게시판</span>
        <h1 className="break-words text-balance text-[20px] font-bold leading-snug text-deep-brown">{post.title}</h1>
        <div className="flex items-center gap-2 border-b border-border py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-green/20 text-[13px] font-bold text-sage-green">{post.nickname[0] || '여'}</div>
          <div><p className="text-[13px] font-semibold text-deep-brown">{post.nickname || '작성자'}</p><p className="text-[11px] text-warm-gray">{formatCommunityDate(post.createdAt)} · 조회 {post.viewCount.toLocaleString()}</p></div>
        </div>
        <p className="whitespace-pre-wrap break-words border-b border-border py-4 text-[14px] leading-relaxed text-deep-brown">{post.content}</p>
        <div className="flex flex-wrap gap-3 py-3">
          <motion.div whileTap={prefersReducedMotion || busy || recommendationPending ? undefined : { scale: 0.94 }}><Button variant="ghost" size="sm" aria-label={recommendation ? '추천 취소' : '게시글 추천'} aria-pressed={recommendation} disabled={busy || recommendationPending} className={cn('px-0', recommendation ? 'text-sage-green' : 'text-warm-gray')} onClick={() => recommend(recommendation !== true)}><ThumbsUp className={recommendation ? 'fill-sage-green' : ''} /><motion.span key={post.recommendationCount} initial={prefersReducedMotion ? false : { opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={reveal}>{post.recommendationCount}</motion.span></Button></motion.div>
          <motion.div whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}><Button variant="ghost" size="sm" aria-label="댓글로 이동" className="px-0" onClick={() => document.getElementById('community-comments')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' })}><MessageCircle />{post.commentCount}</Button></motion.div>
          <motion.div whileTap={prefersReducedMotion || busy ? undefined : { scale: 0.94 }}><Button variant="ghost" size="sm" aria-label={bookmarked ? '북마크 취소' : '북마크'} aria-pressed={bookmarked} className={cn('px-0', bookmarked && 'text-soft-orange')} disabled={busy} onClick={toggleBookmark}><motion.span initial={false} animate={prefersReducedMotion ? undefined : { scale: bookmarked ? [1, 1.22, 1] : 1 }} transition={{ duration: 0.24 }}><Bookmark className={bookmarked ? 'fill-soft-orange' : ''} /></motion.span>{bookmarked ? '북마크 취소' : '북마크'}</Button></motion.div>
          <motion.div className="ml-auto" whileTap={prefersReducedMotion || busy ? undefined : { scale: 0.94 }}><Button variant="ghost" size="sm" className="px-0" disabled={busy} onClick={() => setPanel('report')}><Flag />신고</Button></motion.div>
        </div>
      </motion.div>
    </PostComments>
  </motion.div>
}
