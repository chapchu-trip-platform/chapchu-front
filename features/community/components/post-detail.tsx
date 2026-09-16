'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@base-ui/react/dialog'
import { Bookmark, CalendarDays, ChevronLeft, Flag, MessageCircle, PawPrint, PenLine, RefreshCw, Route, ThumbsUp, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { ModalActions } from '@/components/ui/modal-actions'
import { PhotoImage } from '@/components/common/photo-image'
import { deletePost, fetchMyPosts, fetchPost, reportPost, setPostBookmark } from '@/features/community/api/community-api'
import { fetchCourseById } from '@/features/map/api/courses-api'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { useCommunityAction, useCommunityQuery } from '@/features/community/hooks/use-community-request'
import { usePrefersReducedMotion } from '@/features/community/hooks/use-prefers-reduced-motion'
import { formatCommunityDate, postReactionErrorMessage } from '@/features/community/lib/community-model'
import { usePostRecommendationStore } from '@/features/community/stores/post-recommendation-store'
import type { Post } from '@/features/community/types/community'
import type { RecommendedCourse } from '@/features/map/types/course'
import { cn } from '@/lib/utils'
import { CommunityPhotoGallery, communityTextAreaClass, QueryFeedback } from './community-shared'
import { CommunityNoticeProvider } from './community-notice-provider'
import { PostComments } from './post-comments'

export function PostDetail({ postId, onBack, travelReview = false }: { postId: string; onBack: () => void; travelReview?: boolean }) {
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
  if (travelReview || query.data.category === 'TRAVEL_REVIEW') {
    return <TravelReviewPostDetail initialPost={query.data} onBack={onBack} />
  }
  return <CommunityNoticeProvider key={query.data.id}><LoadedPost initialPost={query.data} onBack={onBack} /></CommunityNoticeProvider>
}

function TravelReviewPostDetail({ initialPost, onBack }: { initialPost: Post; onBack: () => void }) {
  const courseQuery = useCommunityQuery(
    useCallback(
      (signal: AbortSignal) => initialPost.courseId
        ? fetchCourseById(initialPost.courseId, signal, { allowLegacyFields: true })
        : Promise.resolve(null),
      [initialPost.courseId]
    )
  )
  return <CommunityNoticeProvider key={`${initialPost.id}:travel-review`}><LoadedPost initialPost={initialPost} onBack={onBack} travelReview course={courseQuery.data} /></CommunityNoticeProvider>
}

function TravelReviewCourseSummary({ course }: { course?: RecommendedCourse | null }) {
  if (!course) {
    return <section aria-label="여행 리뷰 코스 정보" className="my-4 rounded-[22px] border border-soft-orange/20 bg-soft-orange/5 p-4">
      <p className="text-[12px] font-semibold text-deep-brown">연결된 여행 코스 정보가 없어요.</p>
    </section>
  }

  const places = [...course.places].sort((left, right) => left.visitOrder - right.visitOrder)
  return <section aria-label="여행 리뷰 코스 정보" className="my-4 rounded-[22px] border border-soft-orange/20 bg-soft-orange/5 p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-soft-orange"><Route className="size-3.5" />여행 리뷰 코스</p>
        <h2 className="mt-1 break-words text-[16px] font-bold text-deep-brown">{course.startLocation} → {course.endLocation}</h2>
      </div>
      <PawPrint className="size-5 shrink-0 text-soft-orange" />
    </div>
    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-warm-gray"><CalendarDays className="size-3.5" />{course.travelDate.replaceAll('-', '.')}</p>
    {places.length > 0 && <ol aria-label="여행 리뷰 경유지" className="mt-3 space-y-2 border-t border-soft-orange/15 pt-3">
      {places.map((place, index) => <li key={place.id} className="flex items-center gap-2.5 text-[12px] text-deep-brown">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-soft-orange text-[9px] font-bold text-white">{index + 1}</span>
        <span className="truncate">{place.name}</span>
      </li>)}
    </ol>}
  </section>
}

function LoadedPost({ initialPost, onBack, travelReview = false, course }: { initialPost: Post; onBack: () => void; travelReview?: boolean; course?: RecommendedCourse | null }) {
  const router = useRouter()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [post, setPost] = useState(initialPost)
  const myPosts = useCommunityQuery(fetchMyPosts)
  const recommendation = usePostRecommendationStore(state => state.byPost[initialPost.id]?.value)
  const recommendationPending = usePostRecommendationStore(state => state.byPost[initialPost.id]?.pending ?? false)
  const [actionModal, setActionModal] = useState<'report' | 'delete' | null>(null)
  const [reportDetail, setReportDetail] = useState('')
  const actionTriggerRef = useRef<HTMLButtonElement | null>(null)
  const action = useCommunityAction()
  const reactionAction = useCommunityAction()
  const busy = action.busy || reactionAction.busy
  const bookmarked = post.bookmarked
  const owned = myPosts.data?.some(item => item.id === post.id) === true
  const openActionModal = (kind: 'report' | 'delete', trigger: HTMLButtonElement) => {
    actionTriggerRef.current = trigger
    setActionModal(kind)
  }
  const closeActionModal = () => {
    setActionModal(null)
    setReportDetail('')
  }

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

  const reloadPhotos = () => void action.run(
    ({ signal }) => fetchPost(post.id, signal),
    refreshed => setPost(refreshed),
  )

  const reveal = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const }
  return <motion.div initial={prefersReducedMotion ? false : { opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={reveal} className="flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-beige">
    <div className="z-40 flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card-surface px-4">
      <IconButton onClick={onBack} aria-label="뒤로가기"><ChevronLeft className="h-5 w-5 text-deep-brown" /></IconButton>
      <div className="flex items-center gap-1">
        {owned && <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-sage-green" disabled={busy} onClick={() => router.push(`/community/write?edit=${encodeURIComponent(post.id)}&from=detail`)}><PenLine className="h-4 w-4" />수정하기</Button>}
        <IconButton aria-label="광고·스팸 신고" title="광고·스팸 신고" onClick={event => openActionModal('report', event.currentTarget)} disabled={busy}><Flag className="h-4 w-4" /></IconButton>
        {myPosts.error && <IconButton aria-label="내 게시글 다시 확인" title="내 게시글 다시 확인" onClick={myPosts.reload} disabled={busy}><RefreshCw className="h-4 w-4" /></IconButton>}
        {owned && <IconButton aria-label="게시글 삭제" title="게시글 삭제" variant="danger" onClick={event => openActionModal('delete', event.currentTarget)} disabled={busy}><Trash2 className="h-4 w-4" /></IconButton>}
      </div>
    </div>
    <Dialog.Root open={actionModal !== null} onOpenChange={open => { if (!open && !busy) closeActionModal() }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-[1px]" />
        <Dialog.Popup
          finalFocus={() => actionTriggerRef.current?.isConnected ? actionTriggerRef.current : true}
          className="fixed left-1/2 top-1/2 z-[71] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[398px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card border border-border bg-card-surface p-5 text-deep-brown shadow-xl outline-none"
        >
          {actionModal === 'report' ? (
            <form className="space-y-4" onSubmit={event => {
              event.preventDefault()
              void action.run(() => reportPost(post.id, reportDetail.trim()), () => closeActionModal(), '신고가 접수되었어요.')
            }}>
              <div className="space-y-1.5">
                <Dialog.Title className="text-[17px] font-bold">광고·스팸 신고</Dialog.Title>
                <Dialog.Description className="text-[13px] leading-relaxed text-warm-gray">광고나 스팸에 해당하는 게시글을 신고해 주세요. 다른 사유의 신고는 준비 중이에요.</Dialog.Description>
              </div>
              <textarea autoFocus aria-label="신고 상세 내용" placeholder="상세 내용 (선택)" value={reportDetail} maxLength={2000} disabled={busy} onChange={event => setReportDetail(event.target.value)} className={communityTextAreaClass} />
              <ModalActions>
                <Button type="button" variant="outline" disabled={busy} onClick={closeActionModal}>취소</Button>
                <Button type="submit" disabled={busy}>{busy ? '신고 중…' : '신고 접수'}</Button>
              </ModalActions>
            </form>
          ) : actionModal === 'delete' && owned ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Dialog.Title className="text-[17px] font-bold">게시글 삭제</Dialog.Title>
                <Dialog.Description className="text-[13px] leading-relaxed text-warm-gray">게시글을 삭제할까요? 삭제 후에는 되돌릴 수 없어요.</Dialog.Description>
              </div>
              <ModalActions>
                <Button type="button" variant="outline" autoFocus disabled={busy} onClick={closeActionModal}>취소</Button>
                <Button type="button" variant="destructive" disabled={busy} onClick={() => void action.run(() => deletePost(post.id), () => { setActionModal(null); onBack() })}>{busy ? '삭제 중…' : '삭제 확인'}</Button>
              </ModalActions>
            </div>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
    <PostComments postId={post.id} count={post.commentCount} onCountChange={total => setPost(previous => ({ ...previous, commentCount: total }))}>
      <motion.div initial={prefersReducedMotion ? false : { opacity: 0, scale: 1.015 }} animate={{ opacity: 1, scale: 1 }} transition={reveal}>
        <CommunityPhotoGallery post={post} onReload={reloadPhotos} />
      </motion.div>
      <motion.div initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...reveal, delay: prefersReducedMotion ? 0 : 0.05 }} className="space-y-3 px-4 pt-4">
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold text-white', travelReview ? 'bg-soft-orange' : 'bg-sage-green')}>{travelReview ? '여행 리뷰' : '자유게시판'}</span>
        <h1 className="break-words text-balance text-[20px] font-bold leading-snug text-deep-brown">{post.title}</h1>
        <div className="flex items-center gap-2 border-b border-border py-3">
          <PhotoImage
            src={post.authorProfilePhotoUrl}
            alt={`${post.nickname || '작성자'} 프로필 사진`}
            fallbackSrc="/images/default-profile.svg"
            fallbackAlt="기본 프로필"
            className="h-8 w-8 shrink-0 rounded-full"
            sizes="32px"
          />
          <div><p className="text-[13px] font-semibold text-deep-brown">{post.nickname || '작성자'}</p><p className="text-[11px] text-warm-gray">{formatCommunityDate(post.createdAt)} · 조회 {post.viewCount.toLocaleString()}</p></div>
        </div>
        <p className="whitespace-pre-wrap break-words border-b border-border py-4 text-[14px] leading-relaxed text-deep-brown">{post.content}</p>
        {travelReview && <TravelReviewCourseSummary course={course} />}
        <div className="flex flex-wrap gap-3 py-3">
          <motion.div whileTap={prefersReducedMotion || busy || recommendationPending ? undefined : { scale: 0.94 }}><Button variant="ghost" size="sm" aria-label={recommendation ? '추천 취소' : '게시글 추천'} aria-pressed={recommendation} disabled={busy || recommendationPending} className={cn('px-0', recommendation ? 'text-sage-green' : 'text-warm-gray')} onClick={() => recommend(recommendation !== true)}><ThumbsUp className={recommendation ? 'fill-sage-green' : ''} /><motion.span key={post.recommendationCount} initial={prefersReducedMotion ? false : { opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={reveal}>{post.recommendationCount}</motion.span></Button></motion.div>
          <motion.div whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}><Button variant="ghost" size="sm" aria-label="댓글로 이동" className="px-0" onClick={() => document.getElementById('community-comments')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' })}><MessageCircle />{post.commentCount}</Button></motion.div>
          <motion.div whileTap={prefersReducedMotion || busy ? undefined : { scale: 0.94 }}><Button variant="ghost" size="sm" aria-label={bookmarked ? '북마크 취소' : '북마크'} aria-pressed={bookmarked} className={cn('px-0', bookmarked && 'text-soft-orange')} disabled={busy} onClick={toggleBookmark}><motion.span initial={false} animate={prefersReducedMotion ? undefined : { scale: bookmarked ? [1, 1.22, 1] : 1 }} transition={{ duration: 0.24 }}><Bookmark className={bookmarked ? 'fill-soft-orange' : ''} /></motion.span>{bookmarked ? '북마크 취소' : '북마크'}</Button></motion.div>
        </div>
      </motion.div>
    </PostComments>
  </motion.div>
}
