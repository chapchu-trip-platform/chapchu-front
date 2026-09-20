'use client'

import Image from 'next/image'
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  LockKeyhole,
  Minus,
  Star,
  Trash2,
} from 'lucide-react'
import { IconButton } from '@/components/ui/icon-button'
import { Textarea } from '@/components/ui/input'
import type { RecommendedCoursePlace } from '@/features/map/types/course'
import { METADATA_SAFE_IMAGE_ACCEPT } from '@/features/photos/lib/sanitize-image-file'
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
  onRemovePhoto: (photoId: string) => void
  onToggle: () => void
  place: RecommendedCoursePlace
  reviewDraft: TravelReviewDraft
  reviewEnabled: boolean
  photos: TravelDraftPhoto[]
  photoError: string | null
  photoStatus: 'idle' | 'loading' | 'success' | 'error'
  skipped: boolean
  visited: boolean
}

export default function TravelCoursePlaceCard({
  current,
  distanceLabel,
  expanded,
  onReviewChange,
  onPhotosSelected,
  onRemovePhoto,
  onToggle,
  place,
  reviewDraft,
  reviewEnabled,
  photos,
  photoError,
  photoStatus,
  skipped,
  visited,
}: TravelCoursePlaceCardProps) {
  const reviewPanelId = `travel-place-review-${place.id}`

  return (
    <article
      className={cn(
        'isolate overflow-hidden rounded-xl border transition-[border-color,background-color,box-shadow] duration-300 motion-reduce:duration-0',
        current
          ? 'border-sage-green/40 bg-sage-green-light/50 shadow-sm'
          : skipped
            ? 'border-border bg-muted/35'
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
              : skipped
                ? 'bg-warm-gray/20 text-warm-gray'
              : current
                ? 'bg-soft-orange text-white'
                : 'bg-muted text-warm-gray'
          )}
        >
          {visited
            ? <CheckCircle2 className="size-4" />
            : skipped
              ? <Minus className="size-4" />
              : place.visitOrder}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-deep-brown">
            {place.name}
          </p>
          <p className="mt-0.5 text-[11px] text-warm-gray">
            {visited
              ? '방문 완료'
              : skipped
                ? '방문 생략'
              : current
                ? `다음 방문지 · ${distanceLabel}`
                : '방문 예정'}
          </p>
        </div>
        {reviewDraft.saved && (
          <span className="shrink-0 text-[10px] font-semibold text-sage-green">
            메모리 저장됨
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
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] font-semibold text-deep-brown">여행 후기</p>
              {!reviewEnabled && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-warm-gray">
                  <LockKeyhole className="size-3" />
                  {skipped ? '방문 생략한 장소' : '방문 인증 후 작성 가능'}
                </span>
              )}
            </div>
            <Textarea
              value={reviewDraft.note}
              onChange={(event) => onReviewChange({ note: event.target.value })}
              placeholder={
                reviewEnabled
                  ? '이 장소에서의 기억을 남겨보세요...'
                  : skipped
                    ? '방문을 생략한 장소에는 후기를 작성할 수 없어요.'
                    : '먼저 이 장소의 방문 인증을 진행해주세요.'
              }
              rows={3}
              aria-label={`${place.name} 간단 후기`}
              disabled={!reviewEnabled}
              className="mt-2 rounded-xl border-0 bg-muted px-3 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="mt-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold text-deep-brown">여행 사진</p>
                <span className="text-[10px] text-warm-gray">{photos.length}/10장</span>
              </div>
              <div className="mt-2 flex touch-pan-x gap-2 overflow-x-auto pb-1 no-scrollbar">
                <label
                  className={cn(
                    'flex size-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-muted text-warm-gray',
                    (!reviewEnabled || photoStatus === 'loading' || photos.length >= 10) &&
                      'cursor-not-allowed opacity-50'
                  )}
                  aria-disabled={!reviewEnabled}
                >
                  <Camera className="size-5" />
                  <span className="text-[10px]">
                    {photoStatus === 'loading' ? '저장 중' : '사진 추가'}
                  </span>
                  <input
                    type="file"
                    accept={METADATA_SAFE_IMAGE_ACCEPT}
                    multiple
                    className="sr-only"
                    aria-label={`${place.name} 사진 추가`}
                    disabled={!reviewEnabled || photoStatus === 'loading' || photos.length >= 10}
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
                    <button
                      type="button"
                      onClick={() => onRemovePhoto(photo.photoId)}
                      className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/55 text-white shadow-sm transition-colors hover:bg-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      aria-label={`${place.name} 여행 사진 삭제`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {!reviewEnabled && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-warm-gray">
                  <LockKeyhole className="size-3" />
                  {skipped
                    ? '방문을 생략한 장소에는 사진을 추가할 수 없어요.'
                    : '방문 인증 후 사진을 추가할 수 있어요.'}
                </p>
              )}
              {photoError && (
                <p className="mt-1 text-[11px] leading-relaxed text-danger" role="alert">
                  {photoError}
                </p>
              )}
              {photoStatus === 'success' && !photoError && (
                <p className="mt-1 text-[11px] text-sage-green" role="status">
                  여행 완료 전까지 프론트 메모리에 임시 저장돼요.
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
                    disabled={!reviewEnabled}
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
              {reviewEnabled && (
                <span className="text-right text-[10px] leading-relaxed text-sage-green" role="status">
                  입력 즉시 메모리에 저장돼요
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
