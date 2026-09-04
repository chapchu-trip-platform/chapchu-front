'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { PenLine } from 'lucide-react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/features/auth/stores/auth-store'
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
  const [activeTab, setActiveTab] = useState(initialTab === 'free' ? 1 : 0)
  const openedFromBoard = useRef(false)

  if (initialPostId) return <PostDetail key={initialPostId} postId={initialPostId} onBack={() => openedFromBoard.current ? router.back() : router.replace(initialTab === 'free' ? '/community?tab=free' : '/community')} />

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <TopBar title="게시판" />
    <div className="flex border-b border-border bg-card-surface">
      {tabs.map((tab, index) => <Button key={tab} variant="ghost" aria-pressed={activeTab === index} onClick={() => setActiveTab(index)} className={cn('h-auto flex-1 rounded-none py-3 text-[13px] font-medium', activeTab === index ? 'border-b-2 border-sage-green text-sage-green' : 'text-warm-gray')}>{tab}</Button>)}
    </div>
    <div className="no-scrollbar flex-1 overflow-y-auto pb-24">
      {activeTab !== 2 && <div className="flex justify-end px-4 pt-3"><Link href="/community/write" className="inline-flex items-center gap-2 rounded-full bg-sage-green px-4 py-2 text-[13px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-green focus-visible:ring-offset-2"><PenLine className="h-4 w-4" />글쓰기</Link></div>}
      {activeTab === 2 ? <ReviewList /> : <PostList key={activeTab} sort={activeTab === 0 ? 'popular' : 'latest'} onOpen={id => { openedFromBoard.current = true; router.push(`/community?post=${encodeURIComponent(id)}${activeTab === 1 ? '&tab=free' : ''}`) }} />}
    </div>
  </div>
}
