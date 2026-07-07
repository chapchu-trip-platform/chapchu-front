'use client'

import Image from 'next/image'
import { MapPin, Wind, Droplets, Sun, CloudSun, ThumbsUp, MessageCircle, Bookmark, Eye, ChevronRight, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HomeScreenProps {
  onStartTrip: () => void
  onViewPost: () => void
}

const nearbyPlaces = [
  {
    name: '성수 펫 카페',
    address: '서울 성동구 성수동',
    image: '/images/place-cafe.png',
    rating: 4.8,
    reviews: 124,
    distance: '0.3km',
    tags: ['카페', '반려동물 동반'],
  },
  {
    name: '서울숲 공원',
    address: '서울 성동구 뚝섬로',
    image: '/images/place-park.png',
    rating: 4.9,
    reviews: 320,
    distance: '0.8km',
    tags: ['공원', '산책 코스'],
  },
  {
    name: '한강 펫 레스토랑',
    address: '서울 용산구 이촌동',
    image: '/images/place-restaurant.png',
    rating: 4.6,
    reviews: 87,
    distance: '1.2km',
    tags: ['레스토랑', '반려동물 동반'],
  },
]

const hotPosts = [
  {
    title: '제주 올레길 강아지와 4박 5일 코스 완전정복',
    author: '산책왕멍이',
    views: 3420,
    likes: 289,
    comments: 47,
    bookmarks: 156,
    date: '2일 전',
    image: '/images/album-cover.png',
  },
  {
    title: '가평 펫 캠핑장 후기 — 반려견과 함께 최고였어요',
    author: '캠핑러버루나',
    views: 1890,
    likes: 147,
    comments: 28,
    bookmarks: 89,
    date: '3일 전',
    image: '/images/place-park.png',
  },
  {
    title: '성수동 애견 카페 TOP 5 모음',
    author: '서울산책로',
    views: 2140,
    likes: 198,
    comments: 34,
    bookmarks: 113,
    date: '5일 전',
    image: '/images/place-cafe.png',
  },
]

export default function HomeScreen({ onStartTrip, onViewPost }: HomeScreenProps) {
  return (
    <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar pb-24">
      {/* Top bar — home variant */}
      <header className="flex items-center justify-between px-4 h-14 bg-card-surface border-b border-border sticky top-0 z-40">
        <div className="flex items-center gap-1.5">
          <div className="relative w-6 h-6">
            <Image src="/images/paw-logo.png" alt="PawRoute" fill className="object-contain" />
          </div>
          <span className="text-[17px] font-bold text-deep-brown">PawRoute</span>
        </div>
        <div className="flex items-center gap-1">
          <button aria-label="알림" className="w-9 h-9 flex items-center justify-center rounded-full relative">
            <svg className="w-5 h-5 text-deep-brown" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-soft-orange rounded-full" />
          </button>
        </div>
      </header>

      {/* Current Location Map Card */}
      <div className="mx-4 mt-4 rounded-card overflow-hidden shadow-sm relative h-44 bg-sky-blue/30">
        {/* Fake map background */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-blue/20 to-sage-green/10">
          {/* Grid lines */}
          {[0,1,2,3,4].map(i => (
            <div key={i} className="absolute w-full h-px bg-white/30" style={{ top: `${i * 25}%` }} />
          ))}
          {[0,1,2,3,4].map(i => (
            <div key={i} className="absolute h-full w-px bg-white/30" style={{ left: `${i * 25}%` }} />
          ))}
          {/* Roads */}
          <div className="absolute top-1/2 w-full h-2 bg-white/40 -translate-y-1/2 rounded" />
          <div className="absolute left-1/3 h-full w-2 bg-white/40 rounded" />
        </div>
        {/* Location badge */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-sage-green shadow-lg flex items-center justify-center pulse-dot">
            <MapPin className="w-6 h-6 text-white" />
          </div>
        </div>
        {/* Location pill */}
        <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-sage-green flex-shrink-0" />
          <span className="text-[12px] text-deep-brown font-medium truncate">서울 성동구 성수동 2가</span>
          <ChevronRight className="w-3.5 h-3.5 text-warm-gray ml-auto flex-shrink-0" />
        </div>
      </div>

      {/* Weather Card */}
      <div className="mx-4 mt-3 p-4 bg-card-surface rounded-card border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-sky-blue/20 flex items-center justify-center">
              <CloudSun className="w-6 h-6 text-sky-blue" />
            </div>
            <div>
              <p className="text-[22px] font-bold text-deep-brown leading-none">23°C</p>
              <p className="text-[12px] text-warm-gray mt-0.5">맑음 · 서울</p>
            </div>
          </div>
          <div className="flex gap-3 text-right">
            <div className="flex flex-col items-center gap-0.5">
              <Wind className="w-3.5 h-3.5 text-warm-gray" />
              <span className="text-[11px] text-warm-gray">2m/s</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Droplets className="w-3.5 h-3.5 text-sky-blue" />
              <span className="text-[11px] text-warm-gray">45%</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Sun className="w-3.5 h-3.5 text-soft-orange" />
              <span className="text-[11px] text-warm-gray">UV 3</span>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[13px] text-sage-green font-medium">오늘은 가볍게 걷기 좋은 날이에요.</p>
        </div>
      </div>

      {/* Travel Start CTA */}
      <div className="mx-4 mt-3 p-4 bg-sage-green rounded-card shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] text-white/80 font-medium mb-0.5">골든이와 함께</p>
            <h2 className="text-[18px] font-bold text-white leading-snug text-balance">
              오늘 어디로 떠날까요?
            </h2>
            <p className="text-[12px] text-white/70 mt-1">날씨도 좋고, 바람도 선선해요</p>
          </div>
          <div className="relative w-16 h-16 flex-shrink-0">
            <Image
              src="/images/dog-hero.png"
              alt="골든이"
              fill
              className="object-cover rounded-full border-2 border-white/50"
            />
          </div>
        </div>
        <button
          onClick={onStartTrip}
          className="mt-3 w-full h-11 rounded-btn bg-white text-sage-green font-bold text-[14px] active:opacity-80 transition-opacity"
        >
          여행 시작하기
        </button>
      </div>

      {/* Nearby Places */}
      <div className="mt-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h3 className="text-[16px] font-semibold text-deep-brown">주변 추천 장소</h3>
          <button className="text-[12px] text-sage-green font-medium">전체보기</button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
          {nearbyPlaces.map((place, i) => (
            <button
              key={i}
              className="flex-shrink-0 w-44 bg-card-surface rounded-card border border-border shadow-sm overflow-hidden text-left active:opacity-80"
            >
              <div className="relative h-28">
                <Image src={place.image} alt={place.name} fill className="object-cover" />
                {/* Pet friendly badge */}
                <div className="absolute top-2 left-2 bg-sage-green rounded-full px-2 py-0.5 flex items-center gap-1">
                  <span className="text-[10px] text-white font-medium">반려동물 OK</span>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/50 rounded-full px-2 py-0.5">
                  <span className="text-[10px] text-white">{place.distance}</span>
                </div>
              </div>
              <div className="p-2.5">
                <p className="text-[13px] font-semibold text-deep-brown truncate">{place.name}</p>
                <p className="text-[11px] text-warm-gray truncate mt-0.5">{place.address}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <Star className="w-3 h-3 text-soft-orange fill-soft-orange" />
                  <span className="text-[11px] font-medium text-deep-brown">{place.rating}</span>
                  <span className="text-[11px] text-warm-gray">({place.reviews})</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* HOT Posts */}
      <div className="mt-6 pb-4">
        <div className="flex items-center justify-between px-4 mb-3">
          <h3 className="text-[16px] font-semibold text-deep-brown">HOT 게시글</h3>
          <button className="text-[12px] text-sage-green font-medium">더보기</button>
        </div>
        <div className="flex flex-col gap-3 px-4">
          {hotPosts.map((post, i) => (
            <button
              key={i}
              onClick={onViewPost}
              className="flex gap-3 bg-card-surface rounded-card border border-border p-3 text-left active:opacity-80"
            >
              <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                <Image src={post.image} alt={post.title} fill className="object-cover" />
                {i === 0 && (
                  <div className="absolute top-1 left-1 bg-soft-orange rounded-full px-1.5 py-0.5">
                    <span className="text-[9px] text-white font-bold">HOT</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <h4 className="text-[13px] font-semibold text-deep-brown leading-snug line-clamp-2 text-balance">
                  {post.title}
                </h4>
                <p className="text-[11px] text-warm-gray">{post.author} · {post.date}</p>
                <div className="flex items-center gap-2 mt-auto">
                  <span className="flex items-center gap-0.5 text-[11px] text-warm-gray">
                    <Eye className="w-3 h-3" /> {post.views.toLocaleString()}
                  </span>
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
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
