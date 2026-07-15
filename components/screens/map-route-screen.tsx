'use client'

import Image from 'next/image'
import { useState } from 'react'
import { MapPin, Navigation, Star, Clock, ChevronRight, X, ThumbsUp } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MapRouteScreenProps {
  onBack: () => void
  onStartTrip: () => void
}

const waypoints = [
  {
    name: '성수 펫 카페',
    address: '서울 성동구 성수동 2가',
    image: '/images/place-cafe.png',
    hours: '10:00 ~ 21:00',
    rating: 4.8,
    reviews: 124,
    petRule: '목줄 착용 필수',
    type: '카페',
  },
  {
    name: '서울숲 공원',
    address: '서울 성동구 뚝섬로 273',
    image: '/images/place-park.png',
    hours: '상시 개방',
    rating: 4.9,
    reviews: 320,
    petRule: '목줄 착용, 배변봉투 필수',
    type: '공원',
  },
  {
    name: '한강 펫 레스토랑',
    address: '서울 용산구 이촌동',
    image: '/images/place-restaurant.png',
    hours: '11:30 ~ 22:00',
    rating: 4.6,
    reviews: 87,
    petRule: '소형견만 동반 가능',
    type: '레스토랑',
  },
]

interface PlaceDetailSheetProps {
  place: typeof waypoints[0]
  onClose: () => void
  onSelect: () => void
}

function PlaceDetailSheet({ place, onClose, onSelect }: PlaceDetailSheetProps) {
  const reviews = [
    { author: '산책러버', text: '반려견과 함께 최고의 시간! 직원분들도 친절했어요.', rating: 5 },
    { author: '멍뭉이맘', text: '물그릇과 간식도 챙겨줘서 감동이었어요.', rating: 5 },
  ]

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-card-surface rounded-t-[24px] overflow-hidden slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-muted"
          aria-label="닫기"
        >
          <X className="w-4 h-4 text-warm-gray" />
        </button>

        <div className="overflow-y-auto no-scrollbar max-h-[80vh]">
          {/* Image */}
          <div className="relative h-44 mx-4 mt-2 rounded-card overflow-hidden">
            <Image src={place.image} alt={place.name} fill className="object-cover" />
            <div className="absolute top-2 left-2 bg-sage-green rounded-full px-2.5 py-1">
              <span className="text-[11px] text-white font-medium">반려동물 동반 가능</span>
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[18px] font-bold text-deep-brown">{place.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-soft-orange fill-soft-orange" />
                  <span className="text-[13px] font-semibold text-deep-brown">{place.rating}</span>
                  <span className="text-[12px] text-warm-gray">({place.reviews}개 리뷰)</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-muted text-[12px] text-warm-gray font-medium">{place.type}</span>
            </div>

            <div className="flex items-start gap-1.5 mt-3">
              <MapPin className="w-3.5 h-3.5 text-warm-gray mt-0.5 flex-shrink-0" />
              <span className="text-[13px] text-warm-gray">{place.address}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Clock className="w-3.5 h-3.5 text-warm-gray flex-shrink-0" />
              <span className="text-[13px] text-warm-gray">{place.hours}</span>
            </div>

            {/* Pet rules */}
            <div className="mt-3 p-3 bg-sage-green-light rounded-xl">
              <p className="text-[12px] font-semibold text-sage-green mb-1">반려동물 이용 규칙</p>
              <p className="text-[12px] text-deep-brown">{place.petRule}</p>
            </div>

            {/* Reviews */}
            <div className="mt-4">
              <h4 className="text-[14px] font-semibold text-deep-brown mb-2">대표 리뷰</h4>
              {reviews.map((r, i) => (
                <div key={i} className="flex gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-sage-green/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-sage-green">{r.author[0]}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[12px] font-semibold text-deep-brown">{r.author}</span>
                      <div className="flex">
                        {Array.from({ length: r.rating }).map((_, j) => (
                          <Star key={j} className="w-2.5 h-2.5 text-soft-orange fill-soft-orange" />
                        ))}
                      </div>
                    </div>
                    <p className="text-[12px] text-warm-gray">{r.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 pb-8">
            <Button
              onClick={onSelect}
              fullWidth
              size="lg"
            >
              이 장소 선택하기
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MapRouteScreen({ onBack, onStartTrip }: MapRouteScreenProps) {
  const [selectedPlace, setSelectedPlace] = useState<typeof waypoints[0] | null>(null)
  const [bottomExpanded, setBottomExpanded] = useState(false)

  return (
    <div className="flex flex-col flex-1 bg-warm-beige relative overflow-hidden">
      <TopBar title="추천 경로" showBack onBack={onBack} />

      {/* Map area */}
      <div className="relative flex-1 bg-sky-blue/20 overflow-hidden">
        {/* Grid */}
        {[0,1,2,3,4,5,6,7].map(i => (
          <div key={i} className="absolute w-full h-px bg-white/25" style={{ top: `${i * 14}%` }} />
        ))}
        {[0,1,2,3,4,5,6].map(i => (
          <div key={i} className="absolute h-full w-px bg-white/25" style={{ left: `${i * 17}%` }} />
        ))}
        {/* Roads */}
        <div className="absolute top-[35%] w-full h-3 bg-white/50 rounded" />
        <div className="absolute left-[25%] h-full w-3 bg-white/50 rounded" />
        <div className="absolute top-[60%] w-[70%] left-[15%] h-2 bg-white/40 rounded" />

        {/* Route line */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <path
            d="M 60,30 Q 100,55 140,50 Q 200,45 240,65 Q 290,85 320,80"
            stroke="#6FAF8E"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>

        {/* Origin marker */}
        <div className="absolute top-[25%] left-[12%] flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-sage-green flex items-center justify-center shadow-md">
            <Navigation className="w-4 h-4 text-white" />
          </div>
          <div className="bg-white rounded-lg px-2 py-0.5 mt-1 shadow text-[10px] font-semibold text-deep-brown">현재 위치</div>
        </div>

        {/* Waypoint markers */}
        {[
          { top: '30%', left: '35%', label: '1' },
          { top: '42%', left: '58%', label: '2' },
          { top: '56%', left: '74%', label: '3' },
        ].map((m, i) => (
          <button
            key={i}
            onClick={() => setSelectedPlace(waypoints[i])}
            className="absolute flex flex-col items-center"
            style={{ top: m.top, left: m.left }}
          >
            <div className="w-7 h-7 rounded-full bg-soft-orange flex items-center justify-center shadow-md border-2 border-white">
              <span className="text-[11px] font-bold text-white">{m.label}</span>
            </div>
          </button>
        ))}

        {/* Destination */}
        <div className="absolute top-[68%] left-[82%] flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-danger flex items-center justify-center shadow-md">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div className="bg-white rounded-lg px-2 py-0.5 mt-1 shadow text-[10px] font-semibold text-deep-brown">도착지</div>
        </div>
      </div>

      {/* Bottom sheet */}
      <div className={cn('bg-card-surface rounded-t-[24px] -mt-6 shadow-xl', bottomExpanded ? '' : '')}>
        {/* Handle */}
        <button
          className="flex justify-center w-full pt-3 pb-1"
          onClick={() => setBottomExpanded(!bottomExpanded)}
          aria-label="시트 열기/닫기"
        >
          <div className="w-10 h-1 rounded-full bg-border" />
        </button>

        {/* Route summary */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[16px] font-bold text-deep-brown">서울 성동구 → 용산구</h3>
            <div className="flex gap-2">
              <span className="px-2 py-1 rounded-full bg-sage-green-light text-sage-green text-[11px] font-semibold flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" /> 반려동물 적합
              </span>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-warm-gray" />
              <span className="text-[12px] text-warm-gray">중간 거점 3개</span>
            </div>
            <div className="flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-warm-gray" />
              <span className="text-[12px] text-warm-gray">약 12.4km</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-warm-gray" />
              <span className="text-[12px] text-warm-gray">약 4시간</span>
            </div>
          </div>

          {/* Recommendation reason */}
          <div className="mt-3 p-3 bg-sage-green-light rounded-xl">
            <p className="text-[12px] text-deep-brown leading-relaxed">
              오늘 날씨가 맑고 기온이 적절해 산책하기 최적이에요. 반려동물 동반 가능 장소 위주로 경로를 구성했습니다.
            </p>
          </div>
        </div>

        {/* Waypoint list */}
        <div className="px-4 pb-2">
          <h4 className="text-[13px] font-semibold text-warm-gray mb-2">중간 거점</h4>
          <div className="flex flex-col gap-2">
            {waypoints.map((place, i) => (
              <button
                key={i}
                onClick={() => setSelectedPlace(place)}
                className="flex items-center gap-3 p-3 bg-muted/60 rounded-xl text-left active:opacity-80"
              >
                <div className="w-7 h-7 rounded-full bg-soft-orange flex items-center justify-center flex-shrink-0">
                  <span className="text-[12px] font-bold text-white">{i + 1}</span>
                </div>
                <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                  <Image src={place.image} alt={place.name} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-deep-brown truncate">{place.name}</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-soft-orange fill-soft-orange" />
                    <span className="text-[11px] text-warm-gray">{place.rating}</span>
                    <span className="text-[11px] text-warm-gray">· {place.type}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-warm-gray flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-8 pt-2">
          <Button
            onClick={onStartTrip}
            fullWidth
            size="lg"
          >
            이 경로로 여행 시작
          </Button>
        </div>
      </div>

      {/* Place Detail Sheet */}
      {selectedPlace && (
        <PlaceDetailSheet
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onSelect={() => setSelectedPlace(null)}
        />
      )}
    </div>
  )
}
