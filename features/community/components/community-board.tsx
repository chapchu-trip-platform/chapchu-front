'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { PostDetail } from './post-detail'
import { PostList } from './post-list'
import { ReviewList } from './review-list'

const tabs = ['HOT', '자유게시판', '여행 리뷰']

export default function CommunityBoard({ initialPostId }: { initialPostId?: string }) {
  const epoch = useAuthStore(state => state.sessionEpoch)
  return <Board key={epoch} initialPostId={initialPostId} />
}

function Board({ initialPostId }: { initialPostId?: string }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const openedFromBoard = useRef(false)

  if (initialPostId) return <PostDetail key={initialPostId} postId={initialPostId} onBack={() => openedFromBoard.current ? router.back() : router.replace('/community')} />

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <TopBar title="게시판" />
    <div className="flex border-b border-border bg-card-surface">
      {tabs.map((tab, index) => <Button key={tab} variant="ghost" aria-pressed={activeTab === index} onClick={() => setActiveTab(index)} className={cn('h-auto flex-1 rounded-none py-3 text-[13px] font-medium', activeTab === index ? 'border-b-2 border-sage-green text-sage-green' : 'text-warm-gray')}>{tab}</Button>)}
    </div>
    <div className="no-scrollbar flex-1 overflow-y-auto pb-24">
      {activeTab === 2 ? <ReviewList /> : <PostList key={activeTab} sort={activeTab === 0 ? 'popular' : 'latest'} onOpen={id => { openedFromBoard.current = true; router.push(`/community?post=${encodeURIComponent(id)}`) }} />}
    </div>
  </div>
}
