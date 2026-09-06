'use client'

import { useCallback, useState } from 'react'
import { ChevronLeft, Star, ThumbsUp } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { deleteReview, fetchMyReviews, fetchPlaceReviews, setReviewRecommendation } from '@/features/community/api/community-api'
import { useCommunityAction, useCommunityQuery } from '@/features/community/hooks/use-community-request'
import { usePrefersReducedMotion } from '@/features/community/hooks/use-prefers-reduced-motion'
import { formatCommunityDate } from '@/features/community/lib/community-model'
import type { Review } from '@/features/community/types/community'
import { QueryFeedback, ReviewCompanionInfo } from './community-shared'
import { CommunityNoticeProvider } from './community-notice-provider'

const weatherLabels = { SUNNY: '맑음', CLOUDY: '흐림', RAINY: '비', SNOWY: '눈' }

export function ReviewList() {
  return <CommunityNoticeProvider><ReviewListContent /></CommunityNoticeProvider>
}

function ReviewListContent() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [placeId, setPlaceId] = useState<string | null>(null)
  const mine = useCommunityQuery(fetchMyReviews)
  const transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }
  return <motion.div initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={transition} className="space-y-3 p-4">
    <h2 className="text-[15px] font-semibold text-deep-brown">{placeId ? '이 장소의 여행 리뷰' : '내가 작성한 여행 리뷰'}</h2>
    <p className="text-[12px] leading-relaxed text-warm-gray">{placeId ? '같은 장소를 다녀온 여행자들의 리뷰예요.' : '지금은 내가 작성한 리뷰와 해당 장소의 리뷰를 볼 수 있어요. 전체 여행 리뷰 모아보기는 준비 중이에요.'}</p>
    {placeId ? <>
      <Button variant="ghost" size="sm" onClick={() => { setPlaceId(null); mine.reload() }}><ChevronLeft />내 리뷰로 돌아가기</Button>
      <PlaceReviews key={placeId} placeId={placeId} ownIds={new Set(mine.data?.map(review => review.id) ?? [])} prefersReducedMotion={prefersReducedMotion} />
    </> : <>
      <QueryFeedback loading={mine.loading} error={mine.error} onRetry={mine.reload} />
      {mine.data?.length === 0 && <motion.p initial={prefersReducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center text-[13px] text-warm-gray">아직 작성한 여행 리뷰가 없어요.</motion.p>}
      {mine.data?.map((review, index) => <ReviewCard key={review.id} review={review} own index={index} prefersReducedMotion={prefersReducedMotion} onPlace={() => setPlaceId(review.placeId)} onDeleted={() => mine.setData(previous => previous?.filter(item => item.id !== review.id) ?? null)} />)}
    </>}
  </motion.div>
}

function PlaceReviews({ placeId, ownIds, prefersReducedMotion }: { placeId: string; ownIds: Set<string>; prefersReducedMotion: boolean }) {
  const request = useCallback((signal: AbortSignal) => fetchPlaceReviews(placeId, signal), [placeId])
  const query = useCommunityQuery(request)
  return <motion.div initial={prefersReducedMotion ? false : { opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
    <QueryFeedback loading={query.loading} error={query.error} onRetry={query.reload} />
    {query.data?.length === 0 && <p className="py-8 text-center text-[13px] text-warm-gray">이 장소에 등록된 리뷰가 없어요.</p>}
    {query.data?.map((review, index) => <ReviewCard key={review.id} review={review} own={ownIds.has(review.id)} index={index} prefersReducedMotion={prefersReducedMotion} onDeleted={() => query.setData(previous => previous?.filter(item => item.id !== review.id) ?? null)} />)}
  </motion.div>
}

function ReviewCard({ review, own, index, prefersReducedMotion, onPlace, onDeleted }: { review: Review; own: boolean; index: number; prefersReducedMotion: boolean; onPlace?: () => void; onDeleted: () => void }) {
  const [recommendation, setRecommendation] = useState<boolean | null>(null)
  const [count, setCount] = useState(review.recommendationCount)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const action = useCommunityAction()
  const recommend = (enabled: boolean) => void action.run(async ({ isCurrent, signal }) => {
    await setReviewRecommendation(review.id, enabled)
    if (!isCurrent()) return null
    try { return await fetchPlaceReviews(review.placeId, signal) } catch { return null }
  }, reviews => {
    setRecommendation(enabled)
    const refreshed = reviews?.find(item => item.id === review.id)
    if (refreshed) setCount(refreshed.recommendationCount)
  }, reviews => (enabled ? '추천했어요.' : '추천을 취소했어요.') + (reviews ? '' : ' 최신 추천 수는 다시 열어 확인해 주세요.'))

  return <motion.article layout={prefersReducedMotion ? false : 'position'} initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.22, delay: prefersReducedMotion ? 0 : Math.min(index, 6) * 0.035, ease: [0.22, 1, 0.36, 1] }} className="space-y-3 rounded-card border border-border bg-card-surface p-4">
    <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-warm-gray"><span>{own ? '내 리뷰' : '여행자 리뷰'}</span><span>{formatCommunityDate(review.createdAt)}</span></div>
    <div className="flex items-center justify-between"><span aria-label={`별점 ${review.rating}점`} className="flex items-center gap-1 text-[14px] font-semibold text-soft-orange"><Star className="h-4 w-4 fill-soft-orange" />{review.rating} / 5</span><span className="text-[12px] text-warm-gray">{review.weather ? weatherLabels[review.weather] : '날씨 정보 없음'}</span></div>
    <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-deep-brown">{review.contents}</p>
    <ReviewCompanionInfo review={review} />
    <div className="flex flex-wrap items-center gap-2">
      <motion.div whileTap={prefersReducedMotion || action.busy ? undefined : { scale: 0.95 }}><Button variant="ghost" size="sm" aria-label={recommendation ? '리뷰 추천 취소' : '리뷰 추천'} aria-pressed={recommendation ?? undefined} disabled={action.busy} onClick={() => recommend(recommendation !== true)}><ThumbsUp className={recommendation ? 'fill-sage-green text-sage-green' : ''} /><motion.span key={count} initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>{count}</motion.span></Button></motion.div>
      {recommendation !== true && <Button variant="ghost" size="sm" disabled={action.busy} onClick={() => recommend(false)}>추천 취소</Button>}
      {onPlace && <Button variant="soft" size="sm" onClick={onPlace}>이 장소 리뷰 보기</Button>}
      {own && <Button variant="ghost" size="sm" disabled={action.busy} onClick={() => setConfirmDelete(true)}>리뷰 삭제</Button>}
    </div>
    {confirmDelete && <motion.div initial={prefersReducedMotion ? false : { height: 0, opacity: 0, y: -4 }} animate={{ height: 'auto', opacity: 1, y: 0 }} className="overflow-hidden space-y-2 rounded-xl bg-muted p-3">
      <p className="text-[12px]">리뷰를 삭제할까요? 삭제 후에는 되돌릴 수 없어요.</p>
      <Button variant="destructive" size="sm" disabled={action.busy} onClick={() => void action.run(() => deleteReview(review.id), onDeleted)}>리뷰 삭제 확인</Button>
      <Button variant="ghost" size="sm" disabled={action.busy} onClick={() => setConfirmDelete(false)}>취소</Button>
    </motion.div>}
  </motion.article>
}
