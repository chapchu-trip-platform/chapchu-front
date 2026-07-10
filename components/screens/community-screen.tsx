'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThumbsUp, MessageCircle, Bookmark, ChevronLeft, Flag, Send, MoreHorizontal, Share2 } from 'lucide-react'
import TopBar from '@/components/top-bar'
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
    petName: '봄이 · 비글',
    course: '제주 올레 7코스',
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
    petName: '루나 · 말라뮤트',
    course: '가평 자라섬 코스',
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
    petName: '코코 · 포메라니안',
    course: '성수동 애견 카페',
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
      <div className="flex items-center justify-between px-4 h-14 bg-card-surface border-b border-border sticky top-0 z-40">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center" aria-label="뒤로가기">
          <ChevronLeft className="w-5 h-5 text-deep-brown" />
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => setBookmarked(!bookmarked)}
            className="w-9 h-9 flex items-center justify-center"
            aria-label="북마크"
          >
            <Bookmark className={cn('w-5 h-5', bookmarked ? 'text-soft-orange fill-soft-orange' : 'text-deep-brown')} />
          </button>
          <button
            onClick={() => setShowReport(!showReport)}
            className="w-9 h-9 flex items-center justify-center"
            aria-label="더보기"
          >
            <MoreHorizontal className="w-5 h-5 text-deep-brown" />
          </button>
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

          {/* Course info */}
          <div className="py-3 border-b border-border flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-warm-gray">동행 반려동물</span>
              <span className="text-[12px] text-deep-brown">{post.petName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-warm-gray">코스 정보</span>
              <span className="text-[12px] text-deep-brown">{post.course}</span>
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
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="댓글을 입력하세요..."
          className="flex-1 h-10 px-3 rounded-full bg-muted text-[13px] text-deep-brown placeholder:text-warm-gray focus:outline-none focus:ring-2 focus:ring-sage-green/50"
        />
        <button
          className={cn('w-10 h-10 rounded-full flex items-center justify-center transition-colors',
            commentText.trim() ? 'bg-sage-green' : 'bg-muted'
          )}
          aria-label="댓글 전송"
        >
          <Send className={cn('w-4 h-4', commentText.trim() ? 'text-white' : 'text-warm-gray')} />
        </button>
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
            <button
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="bg-card-surface rounded-card border border-border overflow-hidden text-left active:opacity-80 shadow-sm"
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
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
