'use client'

import Image from 'next/image'
import { useState } from 'react'
import { MapPin, Compass, BookImage } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

interface OnboardingSlideContentProps {
  slide: (typeof slides)[number]
  className?: string
  onAnimationEnd?: () => void
}

function OnboardingSlideContent({
  slide,
  className,
  onAnimationEnd,
}: OnboardingSlideContentProps) {
  const Icon = slide.icon

  return (
    <div
      className={cn('absolute inset-0 flex flex-col', className)}
      onAnimationEnd={onAnimationEnd}
    >
      <div className="relative mx-4 mt-2 h-[clamp(13rem,44dvh,26rem)] flex-shrink-0 overflow-hidden rounded-[20px]">
        <Image
          src={slide.image}
          alt={slide.title.replace('\n', ' ')}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div
          className={cn(
            'absolute bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-full',
            slide.color
          )}
        >
          <Icon className={cn('h-5 w-5', slide.iconColor)} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-6 pt-[clamp(1.5rem,4dvh,2.5rem)]">
        <h2 className="whitespace-pre-line text-balance text-[22px] font-bold leading-snug text-deep-brown">
          {slide.title}
        </h2>
        <p className="text-[14px] leading-relaxed text-warm-gray">{slide.desc}</p>
      </div>
    </div>
  )
}

export default function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [idx, setIdx] = useState(0)
  const [previousIdx, setPreviousIdx] = useState<number | null>(null)
  const [direction, setDirection] = useState<'next' | 'previous'>('next')
  const slide = slides[idx]
  const isAnimating = previousIdx !== null

  const changeSlide = (nextIdx: number) => {
    if (nextIdx === idx || isAnimating) return

    setDirection(nextIdx > idx ? 'next' : 'previous')
    setPreviousIdx(idx)
    setIdx(nextIdx)
  }

  return (
    <div className="flex flex-col flex-1 bg-warm-beige">
      {/* Skip */}
      <div className="flex justify-end px-4 pt-4">
        <Button
          onClick={onDone}
          variant="ghost"
          size="sm"
          className="h-auto px-3 py-1 text-[13px] text-warm-gray"
        >
          건너뛰기
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {previousIdx !== null && (
          <OnboardingSlideContent
            slide={slides[previousIdx]}
            className={cn(
              'pointer-events-none',
              direction === 'next'
                ? 'onboarding-slide-out-left'
                : 'onboarding-slide-out-right'
            )}
          />
        )}
        <OnboardingSlideContent
          slide={slide}
          className={cn(
            previousIdx !== null &&
              (direction === 'next'
                ? 'onboarding-slide-in-right'
                : 'onboarding-slide-in-left')
          )}
          onAnimationEnd={() => setPreviousIdx(null)}
        />
      </div>

      {/* Dots + CTA */}
      <div className="safe-bottom-onboarding flex flex-col gap-6 px-6 pt-4">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => changeSlide(i)}
              disabled={isAnimating}
              aria-label={`슬라이드 ${i + 1}`}
              className={cn(
                'rounded-full transition-[width,background-color] duration-300',
                i === idx
                  ? 'w-6 h-2.5 bg-sage-green'
                  : 'w-2.5 h-2.5 bg-border'
              )}
            />
          ))}
        </div>

        {idx < slides.length - 1 ? (
          <Button
            onClick={() => changeSlide(idx + 1)}
            disabled={isAnimating}
            fullWidth
            size="lg"
          >
            다음
          </Button>
        ) : (
          <Button
            onClick={onDone}
            fullWidth
            size="lg"
          >
            시작하기
          </Button>
        )}
      </div>
    </div>
  )
}
