'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ThumbsUp, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InteractiveCard } from '@/components/ui/interactive-card'
import { fetchPosts } from '@/features/community/api/community-api'
import { useCommunityQuery } from '@/features/community/hooks/use-community-request'
import { communityErrorMessage, formatCommunityDate, mergePosts } from '@/features/community/lib/community-model'
import { CommunityFeedback, CommunityPhoto, PostCompanionInfo, QueryFeedback } from './community-shared'

export function PostList({ sort, onOpen }: { sort: 'popular' | 'latest'; onOpen: (id: string) => void }) {
  const request = useCallback((signal: AbortSignal) => fetchPosts(sort, undefined, signal), [sort])
  const query = useCommunityQuery(request)
  const [moreError, setMoreError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const moreController = useRef<AbortController | null>(null)
  useEffect(() => () => moreController.current?.abort(), [])

  const loadMore = async () => {
    const cursor = query.data?.nextCursor
    if (!cursor || moreController.current) return
    const controller = new AbortController()
    moreController.current = controller
    setLoadingMore(true)
    setMoreError(null)
    try {
      const page = await fetchPosts(sort, cursor, controller.signal)
      if (controller.signal.aborted) return
      if (page.nextCursor === cursor) throw new Error('Repeated cursor.')
      query.setData(previous => previous ? { posts: mergePosts(previous.posts, page.posts), nextCursor: page.nextCursor } : previous)
    } catch (reason) {
      if (!controller.signal.aborted) setMoreError(communityErrorMessage(reason))
    } finally {
      if (!controller.signal.aborted) { setLoadingMore(false); moreController.current = null }
    }
  }

  return <div className="flex flex-col gap-3 p-4">
    <QueryFeedback loading={query.loading} error={query.error} onRetry={query.reload} />
    {query.data?.posts.length === 0 && <p className="py-10 text-center text-[13px] text-warm-gray">아직 등록된 게시글이 없어요.</p>}
    {query.data?.posts.map((post, index) => <InteractiveCard key={post.id} onClick={() => onOpen(post.id)} padding="none" className="overflow-hidden">
      <div className="relative">
        <CommunityPhoto url={post.photoUrl} title={post.title} className="h-36" />
        {sort === 'popular' && index === 0 && <span className="absolute left-3 top-3 rounded-full bg-soft-orange px-2.5 py-1 text-[11px] font-bold text-white">HOT</span>}
      </div>
      <div className="p-3">
        <h3 className="mb-2 line-clamp-2 text-balance text-[14px] font-semibold leading-snug text-deep-brown">{post.title}</h3>
        <PostCompanionInfo post={post} compact />
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-warm-gray">
          <span className="min-w-0 break-words">{post.nickname || '작성자'} · {formatCommunityDate(post.createdAt)}</span>
          <span className="flex gap-2"><span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3" />{post.recommendationCount}</span><span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{post.commentCount}</span></span>
        </div>
      </div>
    </InteractiveCard>)}
    <CommunityFeedback error={moreError} />
    {query.data?.nextCursor && <Button variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? '불러오는 중…' : moreError ? '더 불러오기 다시 시도' : '더 불러오기'}</Button>}
  </div>
}
