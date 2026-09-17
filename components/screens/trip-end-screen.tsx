'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Cloud,
  CloudRain,
  CloudSun,
  Image as ImageIcon,
  Loader2,
  MapPinned,
  PawPrint,
  Send,
  Share2,
  Snowflake,
  Sparkles,
  Sun,
  X,
} from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input, Textarea } from '@/components/ui/input'
import { ModalActions } from '@/components/ui/modal-actions'
import { DEFAULT_ALBUM_COVER_URL } from '@/features/album/constants'
import type { CourseWeatherInput } from '@/features/map/types/course-api'
import type { RecommendedCourse } from '@/features/map/types/course'
import type { TravelNoteDraft } from '@/features/travel/stores/travel-store'
import { formatPetName } from '@/lib/format-pet-name'
import { cn } from '@/lib/utils'

interface TripEndScreenProps {
  course?: RecommendedCourse | null
  petName?: string | null
  noteDrafts?: TravelNoteDraft[]
  weather?: CourseWeatherInput
  initialReview?: string
  isBoardShared?: boolean
  onReviewChange?: (review: string) => void
  onSave: (review: string, coverPhotoId: string | null) => void | Promise<void>
  onShare?: (review: string, coverPhotoId: string | null, title: string) => void
}

export interface TripPhotoChoice {
  photoId: string
  downloadUrl: string
  placeName: string
  takenAt: string | null
}

function formatTravelDate(value: string | undefined) {
  if (!value) return '여행 날짜 미정'
  const [year, month, day] = value.split('-')
  return year && month && day ? `${year}.${month}.${day}` : value
}

function wasShareCancelled(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function WeatherIcon({ status, className }: { status: string; className: string }) {
  const normalized = status.toLowerCase()
  if (normalized.includes('비') || normalized.includes('rain')) return <CloudRain className={className} />
  if (normalized.includes('눈') || normalized.includes('snow')) return <Snowflake className={className} />
  if (normalized.includes('맑') || normalized.includes('sun') || normalized.includes('clear')) return <Sun className={className} />
  if (normalized.includes('흐') || normalized.includes('cloud')) return <Cloud className={className} />
  return <CloudSun className={className} />
}

export default function TripEndScreen({
  course,
  petName,
  noteDrafts = [],
  weather,
  initialReview = '',
  isBoardShared = false,
  onReviewChange,
  onSave,
  onShare,
}: TripEndScreenProps) {
  const [review, setReview] = useState(initialReview)
  const defaultTripTitle = course
    ? `${formatPetName(petName)}와의 ${course.endLocation} 여행`
    : `${formatPetName(petName)}와의 여행`
  const [tripTitle, setTripTitle] = useState(defaultTripTitle)
  const [showSNSModal, setShowSNSModal] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [snsShareStatus, setSnsShareStatus] = useState<
    'idle' | 'sharing' | 'shared' | 'copied' | 'error'
  >('idle')

  const places = useMemo(
    () => [...(course?.places ?? [])].sort((left, right) => left.visitOrder - right.visitOrder),
    [course?.places]
  )
  const photos = useMemo<TripPhotoChoice[]>(
    () =>
      noteDrafts.flatMap((draft) => {
        const placeName = places.find((place) => place.id === draft.waypointId)?.name ?? '여행 장소'
        return (draft.photos ?? []).map((photo) => ({ ...photo, placeName }))
      }),
    [noteDrafts, places]
  )
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(
    () => photos[0]?.photoId ?? null
  )

  const selectedCover =
    photos.find((photo) => photo.photoId === coverPhotoId) ?? photos[0] ?? null
  const effectiveCoverPhotoId = selectedCover?.photoId ?? null
  const companionName = formatPetName(petName)
  const travelDate = formatTravelDate(course?.travelDate)
  const weatherLabel = weather?.weatherStatus?.trim() || '날씨 정보 없음'
  const effectiveTripTitle = tripTitle.trim() || defaultTripTitle
  const weatherDetails = [
    weatherLabel,
    typeof weather?.temperature === 'number' ? `${weather.temperature}°C` : null,
    typeof weather?.humidity === 'number' ? `습도 ${weather.humidity}%` : null,
  ].filter(Boolean).join(' · ')
  const coverImage =
    selectedCover?.downloadUrl ??
    DEFAULT_ALBUM_COVER_URL

  const handleSave = async () => {
    if (!review.trim() || saveStatus === 'saving') return
    setSaveStatus('saving')
    setSaveError(null)
    try {
      await onSave(review.trim(), effectiveCoverPhotoId)
    } catch (error: unknown) {
      setSaveStatus('error')
      setSaveError(
        error instanceof Error
          ? error.message
          : '앨범을 저장하지 못했어요. 다시 시도해주세요.'
      )
    }
  }

  const handleSnsShare = async () => {
    if (snsShareStatus === 'sharing') return
    const shareText = [
      effectiveTripTitle,
      `${travelDate} · ${places.length}곳 방문 · 사진 ${photos.length}장 · ${weatherLabel}`,
      review.trim() || `${companionName}와 함께한 여행 기록`,
    ].join('\n')

    setSnsShareStatus('sharing')
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: effectiveTripTitle, text: shareText })
        setSnsShareStatus('shared')
        return
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText)
        setSnsShareStatus('copied')
        return
      }
      setSnsShareStatus('error')
    } catch (error: unknown) {
      setSnsShareStatus(wasShareCancelled(error) ? 'idle' : 'error')
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar title="여행 기록 완성" />

      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <section className="mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-card-surface shadow-sm">
          <div className="relative h-36 overflow-hidden bg-deep-brown">
            <Image src={coverImage} alt="여행 대표 사진" fill priority className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
              <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold text-sage-green shadow-sm">
                <Sparkles className="size-3.5" /> 여행 완료
              </span>
              <span className="flex items-center gap-1 rounded-full bg-black/35 px-3 py-1.5 text-[10px] text-white backdrop-blur-md">
                <PawPrint className="size-3" /> {companionName}
              </span>
            </div>
          </div>

          <div className="p-4">
            <label className="text-[10px] font-semibold text-warm-gray" htmlFor="trip-title">여행 제목</label>
            <Input
              id="trip-title"
              aria-label="여행 제목"
              value={tripTitle}
              maxLength={60}
              onChange={(event) => setTripTitle(event.target.value)}
              onBlur={() => {
                if (!tripTitle.trim()) setTripTitle(defaultTripTitle)
              }}
              className="mt-1 h-10 border-0 bg-muted/55 px-3 text-[16px] font-bold shadow-none focus:ring-1"
            />

            <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
              <MapPinned className="mt-0.5 size-5 shrink-0 text-sage-green" />
              <div className="min-w-0 flex-1">
                <p className="break-words text-[13px] font-bold text-deep-brown">
                  {course ? `${course.startLocation} → ${course.endLocation}` : '경로 정보 없음'}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-sage-green-light px-2.5 py-1 text-[10px] font-semibold text-sage-green">{places.length}곳 방문</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="flex min-w-0 items-center gap-2 rounded-xl bg-warm-beige/70 px-3 py-2.5">
                <CalendarDays className="size-4 shrink-0 text-soft-orange" />
                <div className="min-w-0">
                  <p className="text-[9px] text-warm-gray">여행 날짜</p>
                  <p className="truncate text-[11px] font-semibold text-deep-brown">{travelDate}</p>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-2 rounded-xl bg-warm-beige/70 px-3 py-2.5">
                <WeatherIcon status={weatherLabel} className="size-4 shrink-0 text-sky-blue" />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-deep-brown">{weatherLabel}</p>
                  <p className="flex gap-1.5 truncate text-[9px] text-warm-gray">
                    {typeof weather?.temperature === 'number' && <span>{weather.temperature}°C</span>}
                    {typeof weather?.humidity === 'number' && <span>습도 {weather.humidity}%</span>}
                    {typeof weather?.temperature !== 'number' && typeof weather?.humidity !== 'number' && <span>상세 정보 없음</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-4 mt-5 rounded-2xl border border-border bg-card-surface p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-bold text-deep-brown">경로별 후기</h2>
              <p className="mt-0.5 text-[10px] text-warm-gray">
                {photos.length > 0 ? '사진을 눌러 앨범 대표 사진을 선택할 수 있어요.' : '장소마다 남긴 기록을 확인해보세요.'}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-sage-green-light px-2 py-1 text-[10px] font-semibold text-sage-green">사진 {photos.length}장</span>
          </div>
          <div className="space-y-3" role="radiogroup" aria-label="앨범 대표 사진 선택">
            {places.length > 0 ? places.map((place, index) => {
              const draft = noteDrafts.find((item) => item.waypointId === place.id)
              const placePhotos = draft?.photos ?? []
              return (
                <article key={place.id} className="overflow-hidden rounded-xl bg-warm-beige/65">
                  <div className="flex items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 px-3 pt-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sage-green text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <h3 className="min-w-0 flex-1 truncate text-[13px] font-bold text-deep-brown">{place.name}</h3>
                      {typeof draft?.rating === 'number' && (
                        <span className="shrink-0 text-[10px] font-semibold text-soft-orange">★ {draft.rating}</span>
                      )}
                    </div>
                  </div>
                  <p className="px-3 pb-2.5 pt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-warm-gray">
                    {draft?.content?.trim() || '작성한 후기가 없어요.'}
                  </p>
                  {placePhotos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto border-t border-border/60 px-3 py-3 no-scrollbar">
                      {placePhotos.map((photo, photoIndex) => {
                        const selected = effectiveCoverPhotoId === photo.photoId
                        return (
                          <button
                            key={photo.photoId}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={`${place.name} 사진${placePhotos.length > 1 ? ` ${photoIndex + 1}` : ''}을 앨범 대표 사진으로 선택`}
                            onClick={() => setCoverPhotoId(photo.photoId)}
                            className={cn(
                              'relative size-20 shrink-0 overflow-hidden rounded-xl border-2 bg-muted',
                              selected ? 'border-sage-green' : 'border-transparent'
                            )}
                          >
                            <Image src={photo.downloadUrl} alt={`${place.name} 여행 사진`} fill className="object-cover" />
                            {selected && (
                              <span className="absolute right-1 top-1 flex items-center gap-0.5 rounded-full bg-sage-green px-1.5 py-0.5 text-[8px] font-bold text-white">
                                <Check className="size-2.5" /> 대표
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </article>
              )
            }) : (
              <p className="rounded-2xl bg-muted/60 px-3 py-3 text-[11px] text-warm-gray">등록된 경유지가 없어요.</p>
            )}
          </div>
        </section>

        <section className="mx-4 mb-6 mt-5 rounded-2xl border border-border bg-card-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-deep-brown">여행 일기</h2>
            <BookOpen className="size-5 text-soft-orange" />
          </div>
          <Textarea
            value={review}
            onChange={(event) => { setReview(event.target.value); onReviewChange?.(event.target.value) }}
            placeholder="오늘 여행을 어떠셨나요? 소중한 기억을 기록해보세요..."
            rows={5}
            className="rounded-xl border border-border bg-warm-beige/60 px-3.5 py-3 shadow-none"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-warm-gray">전체 후기는 게시판에 공유할 때 코스와 함께 저장됩니다.</p>
          {saveError && <p className="mt-3 text-[12px] leading-relaxed text-danger" role="alert">{saveError}</p>}
        </section>
      </div>

      <div className="shrink-0 border-t border-border bg-card-surface/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_22px_rgba(72,56,45,0.06)] backdrop-blur-xl">
        <Button onClick={() => void handleSave()} disabled={!review.trim() || saveStatus === 'saving'} fullWidth size="lg" className="shadow-sm">
          {saveStatus === 'saving' ? <Loader2 className="size-4 animate-spin" /> : <BookOpen className="size-4" />}
          {saveStatus === 'saving' ? '앨범 저장 중' : '앨범에 저장하기'}
        </Button>
        <ModalActions className="mt-2">
          <Button onClick={() => onShare?.(review.trim(), effectiveCoverPhotoId, effectiveTripTitle)} disabled={!onShare || !review.trim() || saveStatus === 'saving' || isBoardShared} variant="outline">
            {isBoardShared ? <CheckCircle2 className="size-4 text-sage-green" /> : <Share2 className="size-4 text-sage-green" />}
            {isBoardShared ? '게시판 공유 완료' : '게시판 공유'}
          </Button>
          <Button onClick={() => { setSnsShareStatus('idle'); setShowSNSModal(true) }} variant="outline">
            <ImageIcon className="size-4 text-soft-orange" /> SNS 카드
          </Button>
        </ModalActions>
      </div>

      {showSNSModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 p-5 backdrop-blur-[2px]">
          <div role="dialog" aria-modal="true" aria-labelledby="sns-card-title" className="w-full max-w-sm rounded-3xl bg-card-surface p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 id="sns-card-title" className="text-[17px] font-bold text-deep-brown">SNS 코스 카드</h3>
                <p className="mt-0.5 text-[10px] text-warm-gray">공유될 카드 모습을 미리 확인해보세요.</p>
              </div>
              <IconButton aria-label="SNS 카드 닫기" onClick={() => setShowSNSModal(false)}><X className="size-5" /></IconButton>
            </div>
            <div className="relative mx-auto aspect-[4/5] w-full overflow-hidden rounded-2xl bg-deep-brown shadow-sm">
              <Image src={coverImage} alt="SNS 여행 카드 대표 사진" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/90" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 text-white">
                <span className="flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-bold backdrop-blur-md"><PawPrint className="size-3" /> CHAPCHU</span>
                <span className="rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-medium text-white/90 backdrop-blur-md">{travelDate}</span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/80"><Sparkles className="size-3.5 text-soft-orange" /> 여행을 완료했어요</span>
                <h4 className="mt-2 text-balance text-[24px] font-bold leading-[1.25] drop-shadow-sm">{effectiveTripTitle}</h4>
                <p className="mt-2 text-[11px] text-white/75">{course ? `${course.startLocation} → ${course.endLocation}` : weatherLabel}</p>
                {places.length > 0 && (
                  <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-white/65">
                    경유지 · {places.map((place) => place.name).join(' · ')}
                  </p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/20 pt-3 text-[10px] text-white/85">
                  <span className="flex min-w-0 items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1.5 backdrop-blur-sm">
                    <WeatherIcon status={weatherLabel} className="size-3.5 shrink-0 text-sky-blue" />
                    <span className="truncate">{weatherDetails}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1.5 backdrop-blur-sm">
                    <PawPrint className="size-3.5 shrink-0 text-soft-orange" />
                    <span className="truncate">{companionName}</span>
                  </span>
                </div>
              </div>
            </div>
            {snsShareStatus === 'shared' && <p className="mt-3 text-center text-[12px] font-medium text-sage-green" role="status">공유할 앱을 선택했어요.</p>}
            {snsShareStatus === 'copied' && <p className="mt-3 text-center text-[12px] font-medium text-sage-green" role="status">공유 문구를 복사했어요.</p>}
            {snsShareStatus === 'error' && <p className="mt-3 text-center text-[12px] text-danger" role="alert">이 기기에서는 공유 기능을 사용할 수 없어요.</p>}
            <ModalActions className="mt-4">
              <Button onClick={() => setShowSNSModal(false)} variant="outline">닫기</Button>
              <Button onClick={() => void handleSnsShare()} disabled={snsShareStatus === 'sharing'}>
                {snsShareStatus === 'sharing' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {snsShareStatus === 'sharing' ? '공유 준비 중' : '다른 앱으로 공유'}
              </Button>
            </ModalActions>
          </div>
        </div>
      )}
    </div>
  )
}
