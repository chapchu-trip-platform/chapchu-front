'use client'

import Image from 'next/image'
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
  Share2,
  PawPrint,
  Route,
} from 'lucide-react'
import TopBar from '@/components/top-bar'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { InteractiveCard } from '@/components/ui/interactive-card'
import { cn } from '@/lib/utils'

interface CommunityScreenProps {
  initialPostId?: string
}

const tabs = ['HOT', '자유게시판', '여행 리뷰']

const posts = [
  {
    id: 1,
    title: '제주 올레길 강아지와 4박 5일 코스 완전정복',
    body: '제주 올레길을 강아지와 함께 4박 5일 동안 걷고 왔어요. 각 코스별 반려동물 동반 가능 여부와 최적 루트를 정리해봤습니다. 7코스가 가장 좋았고 개방감이 넘쳐서 강아지도 정말 좋아했어요!',
    author: '산책왕멍이',
    views: 3420,
    likes: 289,
    comments: 47,
    bookmarks: 156,
    date: '2024.07.02',
    image: '/images/album-cover.png',
    tab: 'HOT',
    pet: { name: '봄이', breed: '비글', size: '중형견', age: '4살' },
    course: {
      name: '제주 올레 7코스',
      distance: '17.6km',
      duration: '5시간 30분',
      places: ['제주올레 여행자센터', '법환포구', '월평포구', '월평 아왜낭목 쉼터'],
    },
  },
  {
    id: 2,
    title: '가평 펫 캠핑장 후기 — 반려견과 함께 최고였어요',
    body: '가평 자라섬 근처 펫 캠핑장을 다녀왔어요. 반려동물 전용 놀이터도 있고, 수영장도 있어서 강아지가 너무 좋아했습니다!',
    author: '캠핑러버루나',
    views: 1890,
    likes: 147,
    comments: 28,
    bookmarks: 89,
    date: '2024.06.30',
    image: '/images/place-park.png',
    tab: 'HOT',
    pet: { name: '루나', breed: '알래스칸 말라뮤트', size: '대형견', age: '5살' },
    course: {
      name: '가평 자라섬 캠핑 코스',
      distance: '8.3km',
      duration: '3시간 10분',
      places: ['가평역', '자라섬 남도 꽃정원', '자라섬 반려동물 놀이터', '자라섬 오토캠핑장'],
    },
  },
  {
    id: 3,
    title: '성수동 애견 카페 TOP 5 모음',
    body: '성수동 주변 애견 카페 5곳을 직접 다녀보고 정리한 후기입니다. 추천 순위도 함께 공유해요!',
    author: '서울산책로',
    views: 2140,
    likes: 198,
    comments: 34,
    bookmarks: 113,
    date: '2024.06.28',
    image: '/images/place-cafe.png',
    tab: '자유게시판',
    pet: { name: '코코', breed: '포메라니안', size: '소형견', age: '3살' },
    course: {
      name: '성수동 애견 카페 투어',
      distance: '4.2km',
      duration: '2시간 40분',
      places: ['서울숲', '성수 펫 카페', '뚝섬 산책로', '서울숲 반려견 놀이터', '성수 수제간식 공방'],
    },
  },
]

const comments = [
  { author: '멍뭉이맘', text: '저도 가보고 싶어요! 어떤 코스가 제일 좋았나요?', time: '2시간 전', likes: 12, replies: [
    { author: '산책왕멍이', text: '7코스가 뷰도 예쁘고 강아지도 정말 좋아했어요!', time: '1시간 전', likes: 5 }
  ] },
  { author: '제주여행가', text: '저도 다음 달에 제주 가려고 했는데 정보 감사해요!', time: '5시간 전', likes: 8, replies: [] },
]

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
            onClick={() => setBookmarked(!bookmarked)}
            aria-label="북마크"
          >
            <Bookmark className={cn('w-5 h-5', bookmarked ? 'text-soft-orange fill-soft-orange' : 'text-deep-brown')} />
          </IconButton>
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
          <div className="py-4 border-b border-border flex flex-col gap-3">
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
          </div>

          {/* Actions */}
          <div className="flex gap-4 py-3 border-b border-border">
            <button
              onClick={() => setLiked(!liked)}
              className={cn('flex items-center gap-1.5', liked ? 'text-sage-green' : 'text-warm-gray')}
            >
              <ThumbsUp className={cn('w-5 h-5', liked ? 'fill-sage-green' : '')} />
              <span className="text-[13px] font-medium">{post.likes + (liked ? 1 : 0)}</span>
            </button>
            <button className="flex items-center gap-1.5 text-warm-gray">
              <MessageCircle className="w-5 h-5" />
              <span className="text-[13px] font-medium">{post.comments}</span>
            </button>
            <button className="flex items-center gap-1.5 text-warm-gray">
              <Share2 className="w-5 h-5" />
              <span className="text-[13px] font-medium">공유</span>
            </button>
            <button
              className="flex items-center gap-1.5 text-warm-gray ml-auto"
              onClick={() => alert('신고가 접수되었습니다.')}
            >
              <Flag className="w-4 h-4" />
              <span className="text-[12px]">신고</span>
            </button>
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
                      <button className="flex items-center gap-1 text-warm-gray">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{c.likes}</span>
                      </button>
                      <button className="text-[11px] text-warm-gray">답글</button>
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

export default function CommunityScreen({ initialPostId }: CommunityScreenProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)
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
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={cn(
              'flex-1 py-3 text-[13px] font-medium transition-colors',
              activeTab === i
                ? 'text-sage-green border-b-2 border-sage-green'
                : 'text-warm-gray'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
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
                {post.tab === 'HOT' && i === 0 && (
                  <div className="absolute top-3 left-3 bg-soft-orange px-2.5 py-1 rounded-full">
                    <span className="text-[11px] font-bold text-white">HOT</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-[14px] font-semibold text-deep-brown leading-snug line-clamp-2 text-balance mb-2">
                  {post.title}
                </h3>
                <div className="mb-2.5 flex flex-col gap-1 rounded-xl bg-muted/55 px-2.5 py-2">
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
                </div>
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
