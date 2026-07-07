'use client'

import Image from 'next/image'
import { useState } from 'react'
import { MapPin, Compass, BookImage } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingScreenProps {
  onDone: () => void
}

const slides = [
  {
    icon: MapPin,
    color: 'bg-sage-green-light',
    iconColor: 'text-sage-green',
    image: '/images/place-park.png',
    title: '반려동물과 함께 갈 수\n있는 여행지를 찾아요',
    desc: '전국 수천 곳의 반려동물 동반 가능 장소를 탐색하고 나만의 코스를 만들어보세요.',
  },
  {
    icon: Compass,
    color: 'bg-sky-blue/20',
    iconColor: 'text-sky-blue',
    image: '/images/place-cafe.png',
    title: '출발지와 도착지에 맞춰\n중간 거점을 추천해요',
    desc: '날씨, 반려동물 성향, 이동 거리를 고려한 최적의 경로와 중간 거점을 제안해드려요.',
  },
  {
    icon: BookImage,
    color: 'bg-soft-orange/20',
    iconColor: 'text-soft-orange',
    image: '/images/album-cover.png',
    title: '여행의 순간을\n앨범으로 남겨요',
    desc: '여행 중 사진과 노트를 기록하고, 완성된 앨범을 커뮤니티에 공유하거나 SNS 카드로 저장하세요.',
  },
]

export default function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [idx, setIdx] = useState(0)
  const slide = slides[idx]
  const Icon = slide.icon

  return (
    <div className="flex flex-col flex-1 bg-warm-beige">
      {/* Skip */}
      <div className="flex justify-end px-4 pt-4">
        <button
          onClick={onDone}
          className="text-warm-gray text-[13px] font-medium py-1 px-3"
        >
          건너뛰기
        </button>
      </div>

      {/* Image area */}
      <div className="relative mx-4 rounded-[20px] overflow-hidden h-52 mt-2">
        <Image
          src={slide.image}
          alt={slide.title.replace('\n', ' ')}
          fill
          className="object-cover transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {/* Icon badge */}
        <div
          className={cn(
            'absolute bottom-4 left-4 w-10 h-10 rounded-full flex items-center justify-center',
            slide.color
          )}
        >
          <Icon className={cn('w-5 h-5', slide.iconColor)} />
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 flex flex-col px-6 pt-8 gap-3">
        <h2 className="text-[22px] font-bold text-deep-brown leading-snug text-balance whitespace-pre-line">
          {slide.title}
        </h2>
        <p className="text-[14px] text-warm-gray leading-relaxed">{slide.desc}</p>
      </div>

      {/* Dots + CTA */}
      <div className="px-6 pb-10 flex flex-col gap-6">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`슬라이드 ${i + 1}`}
              className={cn(
                'rounded-full transition-all duration-300',
                i === idx
                  ? 'w-6 h-2.5 bg-sage-green'
                  : 'w-2.5 h-2.5 bg-border'
              )}
            />
          ))}
        </div>

        {idx < slides.length - 1 ? (
          <button
            onClick={() => setIdx((p) => p + 1)}
            className="w-full h-12 rounded-btn bg-sage-green text-white font-semibold text-[15px] active:opacity-80 transition-opacity"
          >
            다음
          </button>
        ) : (
          <button
            onClick={onDone}
            className="w-full h-12 rounded-btn bg-sage-green text-white font-semibold text-[15px] active:opacity-80 transition-opacity"
          >
            시작하기
          </button>
        )}
      </div>
    </div>
  )
}
