'use client'

import Image from 'next/image'
import { ThumbsUp, MessageCircle, Bookmark, Eye, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InteractiveCard } from '@/components/ui/interactive-card'
import WeatherCard from '@/features/home/components/weather-card'
import TmapMap from '@/features/map/components/tmap-map'
import type { CurrentWeather, WeatherLoadStatus } from '@/types/weather'

interface HomeScreenProps {
  onStartTrip: () => void
  onViewPost: (postId: number) => void
  weather: CurrentWeather | null
  weatherStatus: WeatherLoadStatus
  onRetryWeather: () => void
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

const HOME_MAP_LOCATION = {
  center: { lat: 37.5446, lng: 127.0567 },
  label: '성수동 기준 · 예시 위치',
} as const

const hotPosts = [
  {
    id: 1,
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
    id: 2,
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
    id: 3,
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

export default function HomeScreen({
  onStartTrip,
  onViewPost,
  weather,
  weatherStatus,
  onRetryWeather,
}: HomeScreenProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Top bar — home variant */}
      <header className="z-40 flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card-surface px-4">
        <div className="flex items-center gap-1.5">
          <div className="relative w-6 h-6">
            <Image src="/images/paw-logo.png" alt="PawRoute" fill className="object-contain" />
          </div>
          <span className="text-[17px] font-bold text-deep-brown">PawRoute</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
      {/* Current Location Map Card */}
      <div className="mx-4 mt-4 rounded-card overflow-hidden shadow-sm relative h-44 bg-sky-blue/30">
        <TmapMap
          center={HOME_MAP_LOCATION.center}
          zoom={15}
          locationLabel={HOME_MAP_LOCATION.label}
          showMarker
          className="min-h-0"
        />
      </div>

      {/* Weather Card */}
      <WeatherCard status={weatherStatus} weather={weather} onRetry={onRetryWeather} />

      {/* Travel Start CTA */}
      <div className="mx-4 mt-3 p-4 bg-sage-green rounded-card shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] text-white/80 font-medium mb-0.5">골든이와 함께</p>
            <h2 className="text-[18px] font-bold text-white leading-snug text-balance">
              오늘 어디로 떠날까요?
            </h2>
            <p className="text-[12px] text-white/70 mt-1">
              {weatherStatus === 'success' && weather
                ? weather.walkAdvice
                : '날씨를 확인하고 산책을 준비해 보세요'}
            </p>
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
        <Button
          onClick={onStartTrip}
          variant="outline"
          fullWidth
          className="mt-3 border-white bg-white text-sage-green hover:bg-white/90"
        >
          여행 시작하기
        </Button>
      </div>

      {/* Nearby Places */}
      <div className="mt-6">
        <div className="px-4 mb-3">
          <h3 className="text-[16px] font-semibold text-deep-brown">주변 추천 장소</h3>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
          {nearbyPlaces.map((place, i) => (
            <InteractiveCard
              key={i}
              padding="none"
              fullWidth={false}
              className="w-44 flex-shrink-0 overflow-hidden"
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
            </InteractiveCard>
          ))}
        </div>
      </div>

      {/* HOT Posts */}
      <div className="mt-6 pb-4">
        <div className="flex items-center justify-between px-4 mb-3">
          <h3 className="text-[16px] font-semibold text-deep-brown">HOT 게시글</h3>
          <Button variant="link" size="sm" className="h-auto p-0 text-[12px] font-medium">더보기</Button>
        </div>
        <div className="flex flex-col gap-3 px-4">
          {hotPosts.map((post, i) => (
            <InteractiveCard
              key={post.id}
              onClick={() => onViewPost(post.id)}
              padding="sm"
              className="flex gap-3"
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
            </InteractiveCard>
          ))}
        </div>
      </div>
      </div>
    </div>
  )
}
