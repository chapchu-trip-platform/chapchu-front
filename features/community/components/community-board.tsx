'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { PenLine } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { usePrefersReducedMotion } from '@/features/community/hooks/use-prefers-reduced-motion'
import { PostDetail } from './post-detail'
import { PostList } from './post-list'
import { ReviewList } from './review-list'

const tabs = ['HOT', '자유게시판', '여행 리뷰']

interface CommunityBoardProps { initialPostId?: string; initialTab?: 'free' }

export default function CommunityBoard({ initialPostId, initialTab }: CommunityBoardProps) {
  const epoch = useAuthStore(state => state.sessionEpoch)
  return <Board key={epoch} initialPostId={initialPostId} initialTab={initialTab} />
}

function Board({ initialPostId, initialTab }: CommunityBoardProps) {
  const router = useRouter()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [activeTab, setActiveTab] = useState(initialTab === 'free' ? 1 : 0)
  const openedFromBoard = useRef(false)
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }

  if (initialPostId) return <PostDetail key={initialPostId} postId={initialPostId} onBack={() => openedFromBoard.current ? router.back() : router.replace(initialTab === 'free' ? '/community?tab=free' : '/community')} />

  return <motion.div initial={prefersReducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={transition} className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <TopBar title="게시판" />
    <div className="flex border-b border-border bg-card-surface">
      {tabs.map((tab, index) => <Button key={tab} variant="ghost" aria-pressed={activeTab === index} onClick={() => setActiveTab(index)} className={cn('relative h-auto flex-1 rounded-none py-3 text-[13px] font-medium', activeTab === index ? 'text-sage-green' : 'text-warm-gray')}>{tab}{activeTab === index && <motion.span layoutId={prefersReducedMotion ? undefined : 'community-active-tab'} transition={transition} aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-sage-green" />}</Button>)}
    </div>
    <div className="no-scrollbar flex-1 overflow-y-auto pb-24">
      <motion.div key={activeTab} initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={transition}>
        {activeTab === 1 && <div className="flex justify-end px-4 pt-3"><motion.div whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}><Link href="/community/write" className="inline-flex items-center gap-2 rounded-full bg-sage-green px-4 py-2 text-[13px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-green focus-visible:ring-offset-2"><PenLine className="h-4 w-4" />글쓰기</Link></motion.div></div>}
        {activeTab === 2 ? <ReviewList /> : <PostList sort={activeTab === 0 ? 'popular' : 'latest'} onOpen={id => { openedFromBoard.current = true; router.push(`/community?post=${encodeURIComponent(id)}${activeTab === 1 ? '&tab=free' : ''}`) }} />}
      </motion.div>
    </div>
  </motion.div>
}
