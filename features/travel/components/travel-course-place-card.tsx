'use client'

import Image from 'next/image'
import {
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Textarea } from '@/components/ui/input'
import type { RecommendedCoursePlace } from '@/features/map/types/course'
import type { TravelDraftPhoto } from '@/features/travel/stores/travel-store'
import { cn } from '@/lib/utils'

export interface TravelReviewDraft {
  note: string
  rating: number
  saved: boolean
}

interface TravelCoursePlaceCardProps {
  current: boolean
  distanceLabel: string
  expanded: boolean
  onReviewChange: (update: Partial<Pick<TravelReviewDraft, 'note' | 'rating'>>) => void
  onPhotosSelected: (files: File[]) => void
  onSaveReview: () => void
  onToggle: () => void
  place: RecommendedCoursePlace
  reviewDraft: TravelReviewDraft
  photos: TravelDraftPhoto[]
  photoError: string | null
  photoStatus: 'idle' | 'loading' | 'success' | 'error'
  visited: boolean
}

export default function TravelCoursePlaceCard({
  current,
  distanceLabel,
  expanded,
  onReviewChange,
  onPhotosSelected,
  onSaveReview,
  onToggle,
  place,
  reviewDraft,
  photos,
  photoError,
  photoStatus,
  visited,
}: TravelCoursePlaceCardProps) {
  const reviewPanelId = `travel-place-review-${place.id}`

  return (
    <article
      className={cn(
        'isolate overflow-hidden rounded-xl border transition-[border-color,background-color,box-shadow] duration-300 motion-reduce:duration-0',
        current
          ? 'border-sage-green/40 bg-sage-green-light/50 shadow-sm'
          : 'border-border bg-card-surface'
      )}
    >
      <button
        type="button"
        className="relative z-10 flex min-h-[68px] w-full items-center gap-3 px-3 py-2.5 text-left"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={reviewPanelId}
        aria-label={`${place.name} ${expanded ? '후기 접기' : '후기 펼치기'}`}
      >
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
            visited
              ? 'bg-sage-green text-white'
              : current
                ? 'bg-soft-orange text-white'
                : 'bg-muted text-warm-gray'
          )}
        >
          {visited ? <CheckCircle2 className="size-4" /> : place.visitOrder}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-deep-brown">
            {place.name}
          </p>
          <p className="mt-0.5 text-[11px] text-warm-gray">
            {visited
              ? '방문 완료'
              : current
                ? `다음 방문지 · ${distanceLabel}`
                : '방문 예정'}
          </p>
        </div>
        {reviewDraft.saved && (
          <span className="shrink-0 text-[10px] font-semibold text-sage-green">
            후기 저장됨
          </span>
        )}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0 text-warm-gray transition-transform duration-300 motion-reduce:duration-0',
            expanded && 'rotate-180'
          )}
        />
      </button>

      <div
        id={reviewPanelId}
        role="region"
        aria-label={`${place.name} 후기 작성`}
        aria-hidden={!expanded}
        className={cn(
          'relative z-0 grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:duration-0',
          expanded
            ? 'visible grid-rows-[1fr] opacity-100'
            : 'invisible grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-sage-green/20 px-3 pb-3 pt-3">
            <p className="text-[12px] font-semibold text-deep-brown">여행 후기</p>
            <Textarea
              value={reviewDraft.note}
              onChange={(event) => onReviewChange({ note: event.target.value })}
              placeholder="이 장소에서의 기억을 남겨보세요..."
              rows={3}
              aria-label={`${place.name} 간단 후기`}
              className="mt-2 rounded-xl border-0 bg-muted px-3 py-2.5"
            />
            <div className="mt-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold text-deep-brown">여행 사진</p>
                <span className="text-[10px] text-warm-gray">{photos.length}/10장</span>
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                <label
                  className={cn(
                    'flex size-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-muted text-warm-gray',
                    (photoStatus === 'loading' || photos.length >= 10) && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <Camera className="size-5" />
                  <span className="text-[10px]">
                    {photoStatus === 'loading' ? '저장 중' : '사진 추가'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    aria-label={`${place.name} 사진 추가`}
                    disabled={photoStatus === 'loading' || photos.length >= 10}
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []).slice(0, 10 - photos.length)
                      if (files.length > 0) onPhotosSelected(files)
                      event.target.value = ''
                    }}
                  />
                </label>
                {photos.map((photo) => (
                  <div
                    key={photo.photoId}
                    className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-border"
                  >
                    <Image
                      src={photo.downloadUrl}
                      alt={`${place.name} 여행 사진`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
              {photoError && (
                <p className="mt-1 text-[11px] leading-relaxed text-danger" role="alert">
                  {photoError}
                </p>
              )}
              {photoStatus === 'success' && !photoError && (
                <p className="mt-1 text-[11px] text-sage-green" role="status">
                  사진이 앨범에 저장됐어요.
                </p>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-0.5" aria-label={`${place.name} 만족도`}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <IconButton
                    key={value}
                    type="button"
                    onClick={() => onReviewChange({ rating: value })}
                    aria-label={`${place.name} ${value}점`}
                    size="sm"
                  >
                    <Star
                      className={cn(
                        'size-5 transition-colors',
                        value <= reviewDraft.rating
                          ? 'fill-soft-orange text-soft-orange'
                          : 'text-border'
                      )}
                    />
                  </IconButton>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={onSaveReview}
                disabled={!reviewDraft.note.trim() || reviewDraft.rating < 1}
                aria-label={reviewDraft.saved ? '저장 완료' : '후기 저장'}
              >
                {reviewDraft.saved ? (
                  <><Check className="size-3.5" /> 저장 완료</>
                ) : (
                  <><BookOpen className="size-3.5" /> 임시 저장</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
