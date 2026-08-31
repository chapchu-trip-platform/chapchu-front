'use client'

import Image from 'next/image'
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { Eye, Star, ThumbsUp } from 'lucide-react'
import { LazyMotion, animate, domAnimation, m, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { mockNearbyPlaces } from '@/data/mock'
import WeatherCard from '@/features/home/components/weather-card'
import {
  formatPetCompanion,
  type HomeDataStatus,
  type HotPost,
} from '@/features/home/types/home'
import TmapMap from '@/features/map/components/tmap-map'
import type { LocationLoadStatus } from '@/features/location/stores/location-store'
import type { CurrentWeather, WeatherLoadStatus } from '@/types/weather'

interface HomeScreenProps {
  onStartTrip: () => void
  onViewAllPosts: () => void
  mapCenter: { lat: number; lng: number }
  mapLocationLabel: string
  locationStatus: LocationLoadStatus
  petNames: string[]
  petNamesStatus: HomeDataStatus
  hotPosts: HotPost[]
  hotPostsStatus: HomeDataStatus
  onRetryHotPosts: () => void
  weather: CurrentWeather | null
  weatherStatus: WeatherLoadStatus
  onRetryWeather: () => void
}

const nearbyPlaces = mockNearbyPlaces.slice(0, 3)

const HOT_POST_PLACEHOLDERS = [
  '/images/album-cover.png',
  '/images/place-park.png',
  '/images/place-cafe.png',
] as const

const HOME_MOTION_EASE = [0.22, 1, 0.36, 1] as const

function formatPostDate(createdAt: string | null) {
  if (!createdAt) return '작성일 미제공'
  const date = new Date(createdAt)
  if (!Number.isFinite(date.getTime())) return '작성일 미제공'
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeZone: 'Asia/Seoul',
  }).format(date)
}

export default function HomeScreen({
  onStartTrip,
  onViewAllPosts,
  mapCenter,
  mapLocationLabel,
  locationStatus,
  petNames,
  petNamesStatus,
  hotPosts,
  hotPostsStatus,
  onRetryHotPosts,
  weather,
  weatherStatus,
  onRetryWeather,
}: HomeScreenProps) {
  const prefersReducedMotion = useReducedMotion()
  const nearbyMomentumRef = useRef<{ stop: () => void } | null>(null)
  const nearbyDragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startScrollLeft: number
    isHorizontal: boolean
    lastX: number
    lastTimestamp: number
    velocityX: number
  } | null>(null)
  const petCompanion =
    petNamesStatus === 'loading' ? '반려동물 정보 확인 중' : formatPetCompanion(petNames)

  useEffect(
    () => () => {
      nearbyMomentumRef.current?.stop()
    },
    []
  )

  const handleNearbyPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Touch devices get smoother and more reliable momentum from the browser's
    // native overflow scrolling. Manual pointer dragging is only for mouse/pen.
    if (event.pointerType === 'touch') return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    nearbyMomentumRef.current?.stop()
    nearbyMomentumRef.current = null
    nearbyDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: event.currentTarget.scrollLeft,
      isHorizontal: false,
      lastX: event.clientX,
      lastTimestamp: event.timeStamp,
      velocityX: 0,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handleNearbyPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = nearbyDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.isHorizontal) {
      if (Math.abs(deltaX) < 6 || Math.abs(deltaX) <= Math.abs(deltaY)) return
      drag.isHorizontal = true
    }

    const elapsedMs = Math.max(1, event.timeStamp - drag.lastTimestamp)
    const latestVelocity = (event.clientX - drag.lastX) / elapsedMs
    drag.velocityX = drag.velocityX * 0.35 + latestVelocity * 0.65
    drag.lastX = event.clientX
    drag.lastTimestamp = event.timeStamp

    event.preventDefault()
    event.currentTarget.scrollLeft = drag.startScrollLeft - deltaX
  }

  const stopNearbyDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = nearbyDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    nearbyDragRef.current = null

    if (event.type === 'pointercancel' || !drag.isHorizontal || prefersReducedMotion) return

    const carousel = event.currentTarget
    const currentScrollLeft = carousel.scrollLeft
    const maxScrollLeft = Math.max(0, carousel.scrollWidth - carousel.clientWidth)
    if (maxScrollLeft === 0) return

    const targetScrollLeft = Math.min(
      maxScrollLeft,
      Math.max(0, currentScrollLeft - drag.velocityX * 220)
    )
    if (Math.abs(targetScrollLeft - currentScrollLeft) < 1) return

    nearbyMomentumRef.current = animate(currentScrollLeft, targetScrollLeft, {
      type: 'spring',
      stiffness: 240,
      damping: 32,
      mass: 0.7,
      onUpdate: (value) => {
        carousel.scrollLeft = value
      },
      onComplete: () => {
        nearbyMomentumRef.current = null
      },
    })
  }

  return (
    <LazyMotion features={domAnimation}>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Top bar — home variant */}
      <m.header
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
        className="z-40 flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card-surface px-4"
      >
        <div className="flex items-center gap-1.5">
          <div className="relative w-6 h-6">
            <Image src="/images/paw-logo.png" alt="PawRoute" fill className="object-contain" />
          </div>
          <span className="text-[17px] font-bold text-deep-brown">PawRoute</span>
        </div>
      </m.header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
      {/* Current Location Map Card */}
      <m.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: prefersReducedMotion ? 0 : 0.04,
          duration: prefersReducedMotion ? 0 : 0.38,
          ease: HOME_MOTION_EASE,
        }}
        className="relative mx-4 mt-4 h-44 overflow-hidden rounded-card bg-sky-blue/30 shadow-sm"
        data-motion-section="map"
      >
        <TmapMap
          center={mapCenter}
          zoom={16}
          locationLabel={mapLocationLabel}
          showMarker={locationStatus === 'success'}
          showZoomControl={false}
          interactive={false}
          markerVariant="profile"
          className="min-h-0"
        />
      </m.div>

      {/* Weather Card */}
      <m.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: prefersReducedMotion ? 0 : 0.1,
          duration: prefersReducedMotion ? 0 : 0.38,
          ease: HOME_MOTION_EASE,
        }}
        data-motion-section="weather"
      >
      <WeatherCard status={weatherStatus} weather={weather} onRetry={onRetryWeather} />
      </m.div>

      {/* Travel Start CTA */}
      <m.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: prefersReducedMotion ? 0 : 0.16,
          duration: prefersReducedMotion ? 0 : 0.4,
          ease: HOME_MOTION_EASE,
        }}
        className="mx-4 mt-3 rounded-card bg-sage-green p-4 shadow-md"
        data-motion-section="trip-cta"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] text-white/80 font-medium mb-0.5">{petCompanion}</p>
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
              alt=""
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
      </m.div>

      {/* Nearby Places */}
      <m.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: prefersReducedMotion ? 0 : 0.22,
          duration: prefersReducedMotion ? 0 : 0.42,
          ease: HOME_MOTION_EASE,
        }}
        className="mt-6"
        data-motion-section="nearby"
      >
        <div className="px-4 mb-3">
          <h3 className="text-[16px] font-semibold text-deep-brown">추천 장소 예시</h3>
          <p className="mt-0.5 text-[11px] text-warm-gray">
            위치 기반 추천 API 연결 전 예시 데이터예요.
          </p>
        </div>
        <div
          className="flex cursor-grab select-none gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 active:cursor-grabbing no-scrollbar"
          data-testid="nearby-place-carousel"
          onDragStart={(event) => event.preventDefault()}
          onPointerCancel={stopNearbyDrag}
          onPointerDown={handleNearbyPointerDown}
          onPointerMove={handleNearbyPointerMove}
          onPointerUp={stopNearbyDrag}
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'auto' }}
        >
          {nearbyPlaces.map((place, i) => (
            <m.article
              key={i}
              initial={prefersReducedMotion ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: prefersReducedMotion ? 0 : 0.26 + i * 0.05,
                duration: prefersReducedMotion ? 0 : 0.36,
                ease: HOME_MOTION_EASE,
              }}
              className="w-44 flex-shrink-0 overflow-hidden rounded-card border border-border bg-card-surface shadow-sm"
            >
              <div className="relative h-28">
                <Image
                  src={place.image}
                  alt={place.name}
                  fill
                  priority={i === 0}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                  className="object-cover"
                />
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
            </m.article>
          ))}
        </div>
      </m.section>

      {/* HOT Posts */}
      <m.section
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: prefersReducedMotion ? 0 : 0.3,
          duration: prefersReducedMotion ? 0 : 0.42,
          ease: HOME_MOTION_EASE,
        }}
        className="mt-6 pb-4"
        data-motion-section="hot-posts"
      >
        <div className="flex items-center justify-between px-4 mb-3">
          <h3 className="text-[16px] font-semibold text-deep-brown">HOT 게시글</h3>
          <Button
            onClick={onViewAllPosts}
            variant="link"
            size="sm"
            className="h-auto p-0 text-[12px] font-medium"
          >
            더보기
          </Button>
        </div>
        <div className="flex flex-col gap-3 px-4">
          {hotPostsStatus === 'loading' && (
            <div role="status" aria-label="HOT 게시글을 불러오는 중" className="contents">
              {[0, 1, 2].map((index) => (
              <div
                key={index}
                aria-hidden="true"
                className="h-[106px] animate-pulse rounded-card border border-border bg-card-surface"
              />
              ))}
            </div>
          )}

          {hotPostsStatus === 'error' && (
            <div className="rounded-card border border-border bg-card-surface px-4 py-5 text-center">
              <p className="text-[13px] font-semibold text-deep-brown">
                HOT 게시글을 잠시 불러오지 못했어요.
              </p>
              <Button onClick={onRetryHotPosts} variant="link" size="sm" className="mt-1">
                다시 시도
              </Button>
            </div>
          )}

          {hotPostsStatus === 'success' && hotPosts.length === 0 && (
            <div className="rounded-card border border-border bg-card-surface px-4 py-5 text-center">
              <p className="text-[13px] text-warm-gray">아직 추천 게시글이 없어요.</p>
            </div>
          )}

          {hotPostsStatus === 'success' && hotPosts.map((post, i) => (
            <m.article
              key={post.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: prefersReducedMotion ? 0 : i * 0.04,
                duration: prefersReducedMotion ? 0 : 0.34,
                ease: HOME_MOTION_EASE,
              }}
              className="flex gap-3 rounded-card border border-border bg-card-surface p-3 shadow-sm"
            >
              <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={HOT_POST_PLACEHOLDERS[i] ?? HOT_POST_PLACEHOLDERS[0]}
                  alt=""
                  fill
                  className="object-cover"
                />
                {i === 0 && (
                  <div className="absolute left-1 top-1 flex h-5 min-w-8 items-center justify-center rounded-full bg-soft-orange px-1.5">
                    <span className="text-[9px] font-bold leading-none text-white">HOT</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <h4 className="text-[13px] font-semibold text-deep-brown leading-snug line-clamp-2 text-balance">
                  {post.title}
                </h4>
                <p className="line-clamp-1 text-[11px] text-warm-gray">
                  {post.content || '게시글 내용이 없어요.'}
                </p>
                <p className="text-[10px] text-warm-gray/80">{formatPostDate(post.createdAt)}</p>
                <div className="flex items-center gap-2 mt-auto">
                  <span className="flex items-center gap-0.5 text-[11px] text-warm-gray">
                    <Eye className="w-3 h-3" /> {post.viewCount.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-0.5 text-[11px] text-warm-gray">
                    <ThumbsUp className="w-3 h-3" /> {post.recommendationCount.toLocaleString()}
                  </span>
                </div>
              </div>
            </m.article>
          ))}
        </div>
      </m.section>
      </div>
    </div>
    </LazyMotion>
  )
}
