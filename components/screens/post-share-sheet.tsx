'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { CalendarDays, CheckCircle2, CloudSun, ImageOff, MapPinned, PawPrint, Route, X } from 'lucide-react'
import {
  BottomSheetBackdrop,
  BottomSheetRoot,
  BottomSheetSurface,
} from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { ModalActions } from '@/components/ui/modal-actions'
import { cn } from '@/lib/utils'
import { formatPetName } from '@/lib/format-pet-name'
import type { CourseWeatherInput } from '@/features/map/types/course-api'
import type { RecommendedCourse } from '@/features/map/types/course'

export interface SharedPost {
  title: string
  content: string
  image: string | null
  pet: string
}

interface SharePhoto {
  photoId: string
  downloadUrl: string
  placeName: string
}

interface PostShareSheetProps {
  onClose: () => void
  onShare: (post: SharedPost) => void | Promise<void>
  tripTitle: string
  photos: SharePhoto[]
  initialPhotoId?: string | null
  petName: string
  tripReview: string
  variant?: 'free' | 'travel-review'
  course?: RecommendedCourse | null
  weather?: CourseWeatherInput
}

const BACKDROP_EXIT_MS = 80
const SHEET_EXIT_MS = 320
const SHARE_SUCCESS_DISPLAY_MS = 600

export default function PostShareSheet({
  onClose,
  onShare,
  tripTitle,
  photos,
  initialPhotoId = null,
  petName,
  tripReview,
  variant = 'free',
  course,
  weather,
}: PostShareSheetProps) {
  const displayPetName = formatPetName(petName)
  const isTravelReview = variant === 'travel-review'
  const routePlaces = [...(course?.places ?? [])].sort((left, right) => left.visitOrder - right.visitOrder)
  const [title, setTitle] = useState(tripTitle || '')
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(initialPhotoId)
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'success' | 'error'>('idle')
  const [shareError, setShareError] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [isSheetClosing, setIsSheetClosing] = useState(false)

  useEffect(() => {
    if (!isClosing) return

    const sheetTimer = window.setTimeout(() => setIsSheetClosing(true), BACKDROP_EXIT_MS)
    const closeTimer = window.setTimeout(onClose, BACKDROP_EXIT_MS + SHEET_EXIT_MS)

    return () => {
      window.clearTimeout(sheetTimer)
      window.clearTimeout(closeTimer)
    }
  }, [isClosing, onClose])

  useEffect(() => {
    if (shareStatus !== 'success' || isClosing) return

    const successTimer = window.setTimeout(
      () => setIsClosing(true),
      SHARE_SUCCESS_DISPLAY_MS
    )
    return () => window.clearTimeout(successTimer)
  }, [isClosing, shareStatus])

  const requestClose = () => {
    if (isClosing || shareStatus === 'sharing') return
    setIsClosing(true)
  }

  const handleShare = async () => {
    if (!title.trim() || !tripReview.trim()) {
      alert('제목과 전체 후기 내용을 확인해주세요.')
      return
    }

    if (shareStatus === 'sharing' || shareStatus === 'success') return

    setShareStatus('sharing')
    setShareError(null)
    try {
      await onShare({
        title: title.trim(),
        content: tripReview.trim(),
        image: photos.find((photo) => photo.photoId === selectedPhotoId)?.downloadUrl ?? null,
        pet: petName,
      })
      setShareStatus('success')
    } catch (error: unknown) {
      setShareStatus('error')
      setShareError(error instanceof Error ? error.message : '게시글을 공유하지 못했어요. 다시 시도해주세요.')
    }
  }

  return (
    <BottomSheetRoot>
      {/* Backdrop */}
      <BottomSheetBackdrop
        className={cn(
          'transition-colors duration-75',
          isClosing ? 'bg-transparent' : 'bg-black/25'
        )}
        onClick={requestClose}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-share-sheet-title"
        className={cn(
          'relative z-10 translate-y-0 drop-shadow-[0_-10px_24px_rgba(58,47,42,0.18)] transition-transform duration-[320ms] ease-in will-change-transform',
          isSheetClosing ? 'translate-y-full' : 'slide-up'
        )}
      >
        <BottomSheetSurface className="flex max-h-[85vh] flex-col rounded-t-[28px] [clip-path:inset(0_round_28px_28px_0_0)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 id="post-share-sheet-title" className="text-[16px] font-bold text-deep-brown">{isTravelReview ? '여행 후기 공유' : '게시글 공유'}</h3>
          <IconButton
            onClick={requestClose}
            aria-label="공유 창 닫기"
          >
            <X className="w-5 h-5 text-deep-brown" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 no-scrollbar">
          {isTravelReview && <section aria-label="여행 후기 게시판 안내" className="mb-4 rounded-2xl bg-soft-orange/10 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-[17px] font-bold text-deep-brown">여행 리뷰 게시판에 공유</h4>
                <p className="mt-1 text-[12px] leading-relaxed text-warm-gray">여행 경로와 일기가 함께 등록돼요.</p>
              </div>
              <Route className="size-5 shrink-0 text-soft-orange" />
            </div>
            {course && <div className="mt-3 space-y-2 border-t border-soft-orange/20 pt-3">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-deep-brown"><MapPinned className="size-3.5 text-soft-orange" />{course.startLocation} → {course.endLocation}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-warm-gray">
                <span className="flex items-center gap-1"><CalendarDays className="size-3" />{course.travelDate.replaceAll('-', '.')}</span>
                {weather?.weatherStatus && <span className="flex items-center gap-1"><CloudSun className="size-3" />{weather.weatherStatus}</span>}
                <span className="flex items-center gap-1"><PawPrint className="size-3" />{displayPetName}</span>
              </div>
              {routePlaces.length > 0 && <p className="line-clamp-2 text-[10px] leading-relaxed text-warm-gray">{routePlaces.map((place) => place.name).join(' · ')}</p>}
            </div>}
          </section>}

          {/* Featured image */}
          <div className="mb-4">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold text-deep-brown">{isTravelReview ? '여행 대표 사진' : '대표 사진'}</p>
                <p className="mt-0.5 text-[10px] text-warm-gray">게시글 상단에 표시할 사진을 골라주세요.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoId(null)}
                aria-pressed={selectedPhotoId === null}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors',
                  selectedPhotoId === null
                    ? 'border-sage-green bg-sage-green-light text-sage-green'
                    : 'border-border text-warm-gray'
                )}
              >
                사진 없이 공유
              </button>
            </div>
            {photos.length === 0 ? (
              <div className="flex h-24 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-warm-beige/60 text-warm-gray">
                <ImageOff className="size-6" />
                <p className="mt-1 text-[11px]">선택할 여행 사진이 없어요.</p>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="radiogroup" aria-label="게시판 대표 사진 선택">
                {photos.map((photo) => {
                  const selected = selectedPhotoId === photo.photoId
                  return (
                    <button
                      key={photo.photoId}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${photo.placeName} 사진을 게시판 대표 사진으로 선택`}
                      onClick={() => setSelectedPhotoId(photo.photoId)}
                      className={cn(
                        'relative size-24 shrink-0 overflow-hidden rounded-xl border-2 bg-muted transition-all',
                        selected ? 'border-sage-green' : 'border-transparent'
                      )}
                    >
                      <Image src={photo.downloadUrl} alt={`${photo.placeName} 여행 사진`} fill className="object-cover" />
                      {selected && (
                        <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-sage-green text-white">
                          <CheckCircle2 className="size-3.5" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            <p className="mt-2 text-[10px] leading-relaxed text-warm-gray">대표 사진은 선택하지 않아도 게시글을 공유할 수 있어요.</p>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="mb-2 block text-[12px] font-semibold text-warm-gray">제목</label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="여행의 제목을 입력하세요"
              maxLength={80}
              size="compact"
            />
            <p className="text-[11px] text-warm-gray mt-1 text-right">
              {title.length}/80
            </p>
          </div>

          <div className={cn('mb-5 flex items-start gap-2 rounded-xl px-3 py-2.5', isTravelReview ? 'bg-soft-orange/10' : 'bg-sage-green/10')}>
            <CheckCircle2 className={cn('mt-0.5 size-3.5 shrink-0', isTravelReview ? 'text-soft-orange' : 'text-sage-green')} />
            <div>
              <p className="text-[11px] font-semibold text-deep-brown">{isTravelReview ? '여행 리뷰 전용 게시글' : '게시글 공유'}</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-warm-gray">전체 후기와 이번 여행 코스가 함께 연결되어 공유됩니다.</p>
            </div>
          </div>
          {shareError && (
            <p className="mb-4 text-[12px] leading-relaxed text-danger" role="alert">
              {shareError}
            </p>
          )}
        </div>

        {/* Actions */}
        <ModalActions className="gap-3 border-t border-border bg-card-surface p-3.5">
          <Button
            onClick={requestClose}
            variant="outline"
            size="lg"
          >
            취소
          </Button>
          <Button
            onClick={handleShare}
            disabled={shareStatus === 'sharing' || shareStatus === 'success'}
            size="lg"
            aria-live="polite"
          >
            {shareStatus === 'success' ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                공유 완료
              </>
            ) : shareStatus === 'sharing' ? (
              '공유 중...'
            ) : (
              '공유하기'
            )}
          </Button>
        </ModalActions>
        </BottomSheetSurface>
      </div>
    </BottomSheetRoot>
  )
}
