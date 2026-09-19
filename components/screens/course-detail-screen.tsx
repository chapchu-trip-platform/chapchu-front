'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudRain,
  CloudSun,
  MapPin,
  PawPrint,
  Snowflake,
  Sun,
} from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { PhotoViewerDialog } from '@/components/common/photo-viewer-dialog'
import TopBar from '@/components/top-bar'
import { DEFAULT_ALBUM_COVER_URL } from '@/features/album/constants'
import type { AlbumDetail, AlbumStop } from '@/features/album/types/album'
import { formatPetName } from '@/lib/format-pet-name'

interface CourseDetailScreenProps {
  detail: AlbumDetail
  petName: string
  overallReview?: string
  onBack: () => void
}

function formatDate(value: string | null) {
  if (!value) return '여행 날짜 미정'
  const [year, month, day] = value.split('-')
  return year && month && day ? `${year}.${month}.${day}` : value
}

const weatherDetails = {
  SUNNY: { label: '맑음', Icon: Sun },
  CLOUDY: { label: '흐림', Icon: Cloud },
  RAINY: { label: '비', Icon: CloudRain },
  SNOWY: { label: '눈', Icon: Snowflake },
} as const

function getWeatherDetail(weather: string | null) {
  if (!weather) return { label: '기록 없음', Icon: CloudSun }
  return weatherDetails[weather as keyof typeof weatherDetails] ?? { label: weather, Icon: CloudSun }
}

function StopPhotoGallery({ stop }: { stop: AlbumStop }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const viewerHistoryRef = useRef(false)
  const reducedMotion = Boolean(useReducedMotion())
  const photoCount = stop.photos.length
  const activePhoto = stop.photos[activeIndex] ?? null
  const [expanded, setExpanded] = useState(false)
  const visiblePhotos = expanded ? stop.photos : stop.photos.slice(0, 3)
  const hiddenPhotoCount = photoCount - visiblePhotos.length

  const move = useCallback((direction: 1 | -1) => {
    setActiveIndex((current) => (current + direction + photoCount) % photoCount)
    setZoom(1)
  }, [photoCount])

  const openViewer = (index: number) => {
    setActiveIndex(index)
    setZoom(1)
    viewerHistoryRef.current = true
    window.history.pushState(
      { ...window.history.state, chapchuPhotoViewer: true },
      '',
      window.location.href
    )
    setViewerOpen(true)
  }

  const closeViewer = useCallback(() => {
    if (viewerHistoryRef.current) {
      viewerHistoryRef.current = false
      setViewerOpen(false)
      window.history.back()
      return
    }
    setViewerOpen(false)
  }, [])

  useEffect(() => {
    if (!viewerOpen) return
    const handlePopState = () => {
      viewerHistoryRef.current = false
      setViewerOpen(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [viewerOpen])

  return (
    <>
      <div
        className="grid grid-cols-3 gap-1.5 p-2"
        aria-label={`${stop.placeName}에서 촬영한 사진 ${photoCount}장`}
      >
        {visiblePhotos.map((photo, index) => {
          return (
            <button
            key={photo.photoId}
            type="button"
            className={`relative cursor-zoom-in overflow-hidden rounded-xl bg-muted outline-none focus-visible:ring-2 focus-visible:ring-sage-green/70 ${
              photoCount === 1 ? 'col-span-3 aspect-video' : 'aspect-square'
            }`}
              aria-label={`${stop.placeName} 사진 ${index + 1} 자세히 보기`}
              onClick={() => openViewer(index)}
            >
              <Image
                src={photo.downloadUrl}
                alt={`${stop.placeName} 사진 ${index + 1}`}
                fill
                sizes={photoCount === 1 ? '(max-width: 430px) 90vw, 360px' : '(max-width: 430px) 30vw, 120px'}
                className="object-cover transition-transform duration-200 hover:scale-[1.03]"
              />
            </button>
          )
        })}
      </div>
      {photoCount > 3 && (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1 border-t border-border px-3 py-2.5 text-[11px] font-semibold text-sage-green outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage-green/70"
          aria-expanded={expanded}
          aria-label={expanded ? '사진 접기' : `사진 ${hiddenPhotoCount}장 더 보기`}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? '사진 접기' : `사진 ${hiddenPhotoCount}장 더 보기`}
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
      )}
      <PhotoViewerDialog
        open={viewerOpen}
        title={stop.placeName}
        url={activePhoto?.downloadUrl ?? null}
        activeIndex={activeIndex}
        photoCount={photoCount}
        zoom={zoom}
        reducedMotion={reducedMotion}
        onOpenChange={(open) => { if (!open) closeViewer() }}
        onMove={move}
        onZoom={setZoom}
        onImageError={closeViewer}
      />
    </>
  )
}

function StopCard({ stop, isLast }: { stop: AlbumStop; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex shrink-0 flex-col items-center pt-1">
        <div className="z-10 flex size-7 items-center justify-center rounded-full bg-sage-green shadow-sm">
          <span className="text-[11px] font-bold text-white">{stop.visitOrder}</span>
        </div>
        {!isLast && <div className="mt-1 min-h-8 w-0.5 flex-1 bg-sage-green/25" />}
      </div>

      <div className="flex-1 pb-4">
        <article className="overflow-hidden rounded-2xl border border-border bg-card-surface">
          <div className="flex items-center gap-2 px-3 pb-2 pt-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold text-deep-brown">{stop.placeName}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-warm-gray">
                <Camera className="size-3" /> 촬영한 사진 {stop.photos.length}장
              </p>
            </div>
            {isLast && (
              <span className="shrink-0 rounded-full bg-sage-green-light px-2 py-1 text-[9px] font-semibold text-sage-green">
                도착
              </span>
            )}
          </div>

          {stop.photos.length > 0 ? (
            <StopPhotoGallery stop={stop} />
          ) : (
            <div className="mx-2 mb-2 flex h-20 items-center justify-center rounded-xl bg-muted/55 text-[11px] text-warm-gray">
              이 장소에서 촬영한 사진이 없어요.
            </div>
          )}
        </article>
      </div>
    </div>
  )
}

export default function CourseDetailScreen({ detail, petName, overallReview, onBack }: CourseDetailScreenProps) {
  const { course, summary, stops } = detail
  const coverImage = summary.photos[0]?.downloadUrl ?? DEFAULT_ALBUM_COVER_URL
  const companionName = formatPetName(petName)
  const title = `${companionName}와의 ${course.endLocation} 여행`
  const orderedStops = [...stops].sort((left, right) => left.visitOrder - right.visitOrder)
  const recordedWeather = orderedStops.find((stop) => stop.review?.weather)?.review?.weather ?? null
  const weather = getWeatherDetail(recordedWeather)
  const WeatherIcon = weather.Icon

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar title="앨범 상세" showBack onBack={onBack} />

      <div
        role="region"
        aria-label="앨범 상세 내용"
        className="min-h-0 flex-1 overflow-y-auto pb-16 no-scrollbar"
      >
        <div className="relative mx-4 mt-4 h-44 overflow-hidden rounded-2xl bg-muted shadow-sm">
          <Image src={coverImage} alt={title} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            <Camera className="size-3" /> 사진 {summary.photos.length}장
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h2 className="text-balance text-[17px] font-bold leading-snug text-white">{title}</h2>
          </div>
        </div>

        <section
          aria-label="여행 정보"
          className="mx-4 mt-3 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card-surface px-1.5 py-3"
        >
          <div className="min-w-0 px-2 text-center">
            <PawPrint className="mx-auto size-4 text-sage-green" />
            <p className="mt-1.5 text-[9px] font-semibold text-warm-gray">함께한 반려견</p>
            <p className="mt-0.5 truncate text-[12px] font-bold text-deep-brown">{companionName}</p>
          </div>
          <div className="min-w-0 px-2 text-center">
            <CalendarDays className="mx-auto size-4 text-soft-orange" />
            <p className="mt-1.5 text-[9px] font-semibold text-warm-gray">여행 날짜</p>
            <p className="mt-0.5 truncate text-[12px] font-bold text-deep-brown">{formatDate(summary.travelDate)}</p>
          </div>
          <div className="min-w-0 px-2 text-center">
            <WeatherIcon className="mx-auto size-4 text-sky-blue" />
            <p className="mt-1.5 text-[9px] font-semibold text-warm-gray">당시 날씨</p>
            <p className="mt-0.5 truncate text-[12px] font-bold text-deep-brown">{weather.label}</p>
          </div>
        </section>

        <section
          aria-label="여행 완료 일기"
          className="mx-4 mt-3 rounded-2xl border border-border bg-card-surface px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-soft-orange/10">
              <BookOpen className="size-3.5 text-soft-orange" />
            </span>
            <h3 className="text-[14px] font-bold text-deep-brown">여행 완료 일기</h3>
          </div>
          <p className="mt-2 min-h-4 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-warm-gray">
            {overallReview?.trim() ?? ''}
          </p>
        </section>

        <div className="mx-4 mt-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
            <div>
              <h3 className="text-[15px] font-bold text-deep-brown">이동 흐름</h3>
              <p className="mt-0.5 text-[10px] text-warm-gray">출발부터 도착까지 방문한 순서예요.</p>
            </div>
            <span className="shrink-0 text-[11px] font-medium text-sage-green">{orderedStops.length}곳 방문</span>
          </div>

          <div className="flex gap-3">
            <div className="flex shrink-0 flex-col items-center pt-1">
              <div className="z-10 flex size-7 items-center justify-center rounded-full border-2 border-sage-green bg-card-surface">
                <MapPin className="size-3.5 text-sage-green" />
              </div>
              {orderedStops.length > 0 && <div className="mt-1 min-h-8 w-0.5 flex-1 bg-sage-green/25" />}
            </div>
            <div className="min-w-0 flex-1 pb-4 pt-0.5">
              <div className="rounded-xl border border-sage-green/10 bg-sage-green-light/55 px-3 py-2.5">
                <p className="text-[9px] font-bold text-sage-green">출발</p>
                <p className="mt-0.5 truncate text-[13px] font-semibold text-deep-brown">{course.startLocation}</p>
              </div>
            </div>
          </div>

          {orderedStops.map((stop, index) => (
            <StopCard key={stop.coursePlaceId} stop={stop} isLast={index === orderedStops.length - 1} />
          ))}
        </div>
        <div className="pb-4" />
      </div>
    </div>
  )
}
