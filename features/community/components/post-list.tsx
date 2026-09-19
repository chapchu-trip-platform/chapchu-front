'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ThumbsUp, MessageCircle } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { InteractiveCard } from '@/components/ui/interactive-card'
import { PhotoImage } from '@/components/common/photo-image'
import { fetchPosts } from '@/features/community/api/community-api'
import { useCommunityQuery } from '@/features/community/hooks/use-community-request'
import { usePrefersReducedMotion } from '@/features/community/hooks/use-prefers-reduced-motion'
import { communityErrorMessage, formatCommunityDate, mergePosts } from '@/features/community/lib/community-model'
import type { PostCategory } from '@/features/community/types/community'
import { cn } from '@/lib/utils'
import { CommunityFeedback, CommunityPhoto, QueryFeedback } from './community-shared'

export function PostList({ sort, category, onOpen }: { sort: 'popular' | 'latest'; category?: PostCategory; onOpen: (id: string) => void }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const request = useCallback((signal: AbortSignal) => (
    category
      ? fetchPosts(sort, undefined, signal, category)
      : fetchPosts(sort, undefined, signal)
  ), [category, sort])
  const query = useCommunityQuery(request)
  const [moreError, setMoreError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const moreController = useRef<AbortController | null>(null)
  useEffect(() => () => moreController.current?.abort(), [])
  const posts = (query.data?.posts ?? []).filter(
    (post) => !category || !post.category || post.category === category
  )
  const visiblePosts = sort === 'popular'
    ? [...posts].sort((first, second) => second.recommendationCount - first.recommendationCount)
    : posts

  const loadMore = async () => {
    const cursor = query.data?.nextCursor
    if (!cursor || moreController.current) return
    const controller = new AbortController()
    moreController.current = controller
    setLoadingMore(true)
    setMoreError(null)
    try {
      const page = category
        ? await fetchPosts(sort, cursor, controller.signal, category)
        : await fetchPosts(sort, cursor, controller.signal)
      if (controller.signal.aborted) return
      if (page.nextCursor === cursor) throw new Error('Repeated cursor.')
      query.setData(previous => previous ? { posts: mergePosts(previous.posts, page.posts), nextCursor: page.nextCursor } : previous)
    } catch (reason) {
      if (!controller.signal.aborted) setMoreError(communityErrorMessage(reason))
    } finally {
      if (!controller.signal.aborted) { setLoadingMore(false); moreController.current = null }
    }
  }

  return <motion.div className="flex flex-col gap-3 p-4">
    {category === 'TRAVEL_REVIEW' && <div className="rounded-2xl bg-soft-orange/10 px-3.5 py-3">
      <p className="text-[11px] font-semibold text-soft-orange">TRAVEL REVIEW BOARD</p>
      <h2 className="mt-0.5 text-[16px] font-bold text-deep-brown">여행 후기 게시글</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-warm-gray">반려동물과 함께한 코스와 여행 기록을 공유해요.</p>
    </div>}
    <QueryFeedback loading={query.loading} error={query.error} onRetry={query.reload} />
    {posts.length === 0 && !query.loading && !query.error && <motion.p initial={prefersReducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center text-[13px] text-warm-gray">아직 등록된 게시글이 없어요.</motion.p>}
    {visiblePosts.map((post, index) => {
      const isTravelReview = category === 'TRAVEL_REVIEW' || post.category === 'TRAVEL_REVIEW'
      return <motion.div key={post.id} initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: prefersReducedMotion ? 0 : 0.24, delay: prefersReducedMotion ? 0 : Math.min(index, 6) * 0.035, ease: [0.22, 1, 0.36, 1] }} whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}>
      <InteractiveCard onClick={() => onOpen(post.id)} padding="none" className={cn('overflow-hidden', isTravelReview && 'border-soft-orange/25 bg-soft-orange/[0.025]')}>
      <div className="relative">
        <CommunityPhoto url={post.photoUrl} title={post.title} className={isTravelReview ? 'h-44' : 'h-36'} temporaryFallback />
        {sort === 'popular' && index === 0 && <span className="absolute left-3 top-3 rounded-full bg-soft-orange px-2.5 py-1 text-[11px] font-bold text-white">HOT</span>}
      </div>
      <div className="p-3">
        {isTravelReview && <span className="mb-1.5 inline-flex rounded-full bg-sage-green-light px-2 py-0.5 text-[10px] font-semibold text-sage-green">여행 리뷰</span>}
        <h3 className="mb-2 line-clamp-2 text-balance text-[14px] font-semibold leading-snug text-deep-brown">{post.title}</h3>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-warm-gray">
          <span className="flex min-w-0 items-center gap-1.5">
            <PhotoImage
              src={post.authorProfilePhotoUrl}
              alt={`${post.nickname || '작성자'} 프로필 사진`}
              fallbackSrc="/images/default-profile.svg"
              fallbackAlt="기본 프로필"
              className="h-6 w-6 shrink-0 rounded-full"
              sizes="24px"
            />
            <span className="min-w-0 break-words">{post.nickname || '작성자'} · {formatCommunityDate(post.createdAt)}</span>
          </span>
          <span className="flex gap-2"><span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3" />{post.recommendationCount}</span><span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{post.commentCount}</span></span>
        </div>
      </div>
      </InteractiveCard>
    </motion.div>
    })}
    <CommunityFeedback error={moreError} />
    {query.data?.nextCursor && <motion.div initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} whileTap={prefersReducedMotion || loadingMore ? undefined : { scale: 0.98 }}><Button variant="outline" fullWidth disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? '불러오는 중…' : moreError ? '더 불러오기 다시 시도' : '더 불러오기'}</Button></motion.div>}
  </motion.div>
}
