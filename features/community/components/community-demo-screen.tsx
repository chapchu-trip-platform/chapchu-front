'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ThumbsUp,
  MessageCircle,
  Bookmark,
  ChevronLeft,
  Flag,
  Send,
  MoreHorizontal,
  PenLine,
  PawPrint,
  Route,
} from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { InteractiveCard } from '@/components/ui/interactive-card'
import { cn } from '@/lib/utils'

interface CommunityScreenProps {
  initialPostId?: string
  initialTab?: 'free'
}

const tabs = ['HOT', '자유게시판', '여행 리뷰']

import { posts, comments } from '@/data/mock/community'

function PostDetailView({ post, onBack }: { post: typeof posts[0]; onBack: () => void }) {
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [showReport, setShowReport] = useState(false)

  return (
    <div className="flex flex-col flex-1 bg-warm-beige overflow-hidden">
      <div className="sticky top-0 z-40 flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card-surface px-4">
        <IconButton onClick={onBack} aria-label="뒤로가기">
          <ChevronLeft className="w-5 h-5 text-deep-brown" />
        </IconButton>
        <div className="flex gap-1">
          <IconButton
            onClick={() => setShowReport(!showReport)}
            aria-label="더보기"
          >
            <MoreHorizontal className="w-5 h-5 text-deep-brown" />
          </IconButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Cover */}
        <div className="relative h-52">
          <Image src={post.image} alt={post.title} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        <div className="px-4 pt-4">
          {/* Tab badge */}
          <span className="px-2 py-0.5 rounded-full bg-sage-green text-white text-[11px] font-semibold">{post.tab}</span>

          <h1 className="text-[20px] font-bold text-deep-brown mt-2 mb-1 leading-snug text-balance">{post.title}</h1>

          {/* Author */}
          <div className="flex items-center gap-2 py-3 border-b border-border">
            <div className="w-8 h-8 rounded-full bg-sage-green/20 flex items-center justify-center">
              <span className="text-[13px] font-bold text-sage-green">{post.author[0]}</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-deep-brown">{post.author}</p>
              <p className="text-[11px] text-warm-gray">{post.date} · 조회 {post.views.toLocaleString()}</p>
            </div>
          </div>

          {/* Body */}
          <p className="text-[14px] text-deep-brown leading-relaxed py-4 border-b border-border">{post.body}</p>

          {/* Pet and course info */}
          {post.tab === '여행 리뷰' && <div className="py-4 border-b border-border flex flex-col gap-3">
            <div className="rounded-card border border-border bg-card-surface p-3.5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-green-light">
                  <PawPrint className="h-4 w-4 text-sage-green" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-warm-gray">동행 반려동물</p>
                  <p className="text-[15px] font-bold text-deep-brown">{post.pet.name}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sage-green/10 px-2.5 py-1 text-[12px] font-semibold text-sage-green">
                  견종 · {post.pet.breed}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[12px] text-deep-brown">{post.pet.size}</span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[12px] text-deep-brown">{post.pet.age}</span>
              </div>
            </div>

            <div className="rounded-card border border-border bg-card-surface p-3.5">
              <div className="mb-3 flex items-start gap-2">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-soft-orange/15">
                  <Route className="h-4 w-4 text-soft-orange" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-warm-gray">코스 정보</p>
                  <p className="text-[14px] font-bold text-deep-brown">{post.course.name}</p>
                  <p className="mt-0.5 text-[11px] text-warm-gray">
                    총 {post.course.distance} · {post.course.duration} · {post.course.places.length}개 장소
                  </p>
                </div>
              </div>
              <ol aria-label={`${post.course.name} 경유 장소`} className="pl-1">
                {post.course.places.map((place, index) => (
                  <li key={place} className="relative flex min-h-9 gap-2.5 last:min-h-0">
                    {index < post.course.places.length - 1 && (
                      <span className="absolute left-[11px] top-5 h-[calc(100%-4px)] w-px bg-sage-green/30" />
                    )}
                    <span className="relative z-10 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-sage-green text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="pt-0.5 text-[12px] font-medium text-deep-brown">{place}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>}
          {/* Actions */}
          <div className="flex gap-4 py-3 border-b border-border">
            <Button
              onClick={() => setLiked(!liked)}
              variant="ghost"
              size="sm"
              className={cn('h-auto px-0 py-1', liked ? 'text-sage-green' : 'text-warm-gray')}
            >
              <ThumbsUp className={cn('w-5 h-5', liked ? 'fill-sage-green' : '')} />
              <span className="text-[13px] font-medium">{post.likes + (liked ? 1 : 0)}</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-auto px-0 py-1 text-warm-gray">
              <MessageCircle className="w-5 h-5" />
              <span className="text-[13px] font-medium">{post.comments}</span>
            </Button>
            <Button variant="ghost" size="sm" aria-label={bookmarked ? '북마크 취소' : '북마크'} aria-pressed={bookmarked} onClick={() => setBookmarked(!bookmarked)} className={cn('h-auto px-0 py-1', bookmarked ? 'text-soft-orange' : 'text-warm-gray')}>
              <Bookmark className={cn('w-5 h-5', bookmarked && 'fill-soft-orange')} />
              <span className="text-[13px] font-medium">북마크</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-auto px-0 py-1 text-warm-gray"
              onClick={() => alert('신고가 접수되었습니다.')}
            >
              <Flag className="w-4 h-4" />
              <span className="text-[12px]">신고</span>
            </Button>
          </div>

          {/* Comments */}
          <div className="py-3">
            <h3 className="text-[14px] font-semibold text-deep-brown mb-3">댓글 {post.comments}</h3>
            {comments.map((c, i) => (
              <div key={i} className="mb-4">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-[12px] font-bold text-warm-gray">{c.author[0]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-deep-brown">{c.author}</span>
                      <span className="text-[11px] text-warm-gray">{c.time}</span>
                    </div>
                    <p className="text-[13px] text-deep-brown mt-0.5 leading-relaxed">{c.text}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <Button variant="ghost" size="sm" className="h-auto gap-1 p-0 text-warm-gray">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{c.likes}</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-auto p-0 text-[11px] text-warm-gray">답글</Button>
                    </div>
                    {/* Replies */}
                    {c.replies.map((r, j) => (
                      <div key={j} className="mt-2 ml-4 flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-sage-green/15 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-bold text-sage-green">{r.author[0]}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-deep-brown">{r.author}</span>
                            <span className="text-[11px] text-warm-gray">{r.time}</span>
                          </div>
                          <p className="text-[12px] text-deep-brown mt-0.5">{r.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comment input */}
      <div className="border-t border-border bg-card-surface px-4 py-3 mb-20 flex gap-2">
        <Input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="댓글을 입력하세요..."
          size="compact"
          className="h-10 flex-1 rounded-full border-transparent bg-muted"
        />
        <IconButton
          variant={commentText.trim() ? 'primary' : 'muted'}
          size="lg"
          aria-label="댓글 전송"
        >
          <Send className={cn('w-4 h-4', commentText.trim() ? 'text-white' : 'text-warm-gray')} />
        </IconButton>
      </div>
    </div>
  )
}

export default function CommunityScreen({ initialPostId, initialTab }: CommunityScreenProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(initialTab === 'free' ? 1 : 0)
  const [selectedPost, setSelectedPost] = useState<typeof posts[0] | null>(() =>
    posts.find((post) => String(post.id) === initialPostId) ?? null
  )

  if (selectedPost) {
    return (
      <PostDetailView
        post={selectedPost}
        onBack={() => {
          setSelectedPost(null)
          if (initialPostId) {
            router.replace('/community')
          }
        }}
      />
    )
  }

  const filteredPosts = activeTab === 0
    ? posts
    : posts.filter(p => p.tab === tabs[activeTab])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="게시판" />

      {/* Tabs */}
      <div className="flex border-b border-border bg-card-surface">
        {tabs.map((tab, i) => (
          <Button
            key={i}
            onClick={() => setActiveTab(i)}
            variant="ghost"
            aria-pressed={activeTab === i}
            className={cn(
              'h-auto flex-1 rounded-none py-3 text-[13px] font-medium',
              activeTab === i
                ? 'text-sage-green border-b-2 border-sage-green'
                : 'text-warm-gray'
            )}
          >
            {tab}
          </Button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {activeTab !== 2 && <div className="flex justify-end px-4 pt-3"><Link href="/community/write" className="inline-flex items-center gap-2 rounded-full bg-sage-green px-4 py-2 text-[13px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-green focus-visible:ring-offset-2"><PenLine className="h-4 w-4" />글쓰기</Link></div>}
        <div className="flex flex-col gap-3 p-4">
          {filteredPosts.map((post, i) => (
            <InteractiveCard
              key={post.id}
              onClick={() => setSelectedPost(post)}
              padding="none"
              className="overflow-hidden"
            >
              <div className="relative h-36">
                <Image src={post.image} alt={post.title} fill className="object-cover" />
                {activeTab === 0 && i === 0 && (
                  <div className="absolute top-3 left-3 bg-soft-orange px-2.5 py-1 rounded-full">
                    <span className="text-[11px] font-bold text-white">HOT</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-[14px] font-semibold text-deep-brown leading-snug line-clamp-2 text-balance mb-2">
                  {post.title}
                </h3>
                {post.tab === '여행 리뷰' && <div className="mb-2.5 flex flex-col gap-1 rounded-xl bg-muted/55 px-2.5 py-2">
                  <p className="flex items-center gap-1.5 text-[11px] text-deep-brown">
                    <PawPrint className="h-3 w-3 flex-shrink-0 text-sage-green" />
                    <span className="truncate">
                      {post.pet.name} · {post.pet.breed} · {post.pet.size} · {post.pet.age}
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5 text-[11px] text-deep-brown">
                    <Route className="h-3 w-3 flex-shrink-0 text-soft-orange" />
                    <span className="truncate">{post.course.name} · 경유 {post.course.places.length}곳</span>
                  </p>
                </div>}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-sage-green/20 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-sage-green">{post.author[0]}</span>
                    </div>
                    <span className="text-[11px] text-warm-gray">{post.author}</span>
                    <span className="text-[11px] text-warm-gray">·</span>
                    <span className="text-[11px] text-warm-gray">{post.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5 text-[11px] text-warm-gray">
                      <ThumbsUp className="w-3 h-3" /> {post.likes}
                    </span>
                    <span className="flex items-center gap-0.5 text-[11px] text-warm-gray">
                      <MessageCircle className="w-3 h-3" /> {post.comments}
                    </span>
                    <span className="flex items-center gap-0.5 text-[11px] text-warm-gray">
                      <Bookmark className="w-3 h-3" /> {post.bookmarks}
                    </span>
                  </div>
                </div>
              </div>
            </InteractiveCard>
          ))}
        </div>
      </div>
    </div>
  )
}
