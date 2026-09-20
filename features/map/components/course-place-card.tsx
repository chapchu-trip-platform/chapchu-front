'use client'

import { useEffect, useId, useRef, useState } from 'react'
import {
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  PawPrint,
  Phone,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import { fetchRecommendedPlaceDetails } from '@/features/map/api/place-details-api'
import PlaceImage from '@/features/map/components/place-image'
import { parsePetPolicy } from '@/features/map/lib/pet-policy'
import type { RecommendedCoursePlace } from '@/features/map/types/course'
import type { RecommendedPlaceDetails } from '@/features/map/types/recommended-place'
import { cn } from '@/lib/utils'

export default function CoursePlaceCard({ place }: { place: RecommendedCoursePlace }) {
  const [expanded, setExpanded] = useState(false)
  const [details, setDetails] = useState<RecommendedPlaceDetails | null>(null)
  const [detailStatus, setDetailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const requestRef = useRef<AbortController | null>(null)
  const detailId = useId()

  useEffect(() => () => requestRef.current?.abort(), [])

  const toggleDetails = () => {
    const nextExpanded = !expanded
    setExpanded(nextExpanded)
    if (!nextExpanded || detailStatus === 'loading' || detailStatus === 'success') return
    if (!place.externalPlaceId.trim()) {
      setDetailStatus('success')
      return
    }

    const controller = new AbortController()
    requestRef.current = controller
    setDetailStatus('loading')
    void fetchRecommendedPlaceDetails(place.externalPlaceId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setDetails(result)
        setDetailStatus('success')
      })
      .catch(() => {
        if (!controller.signal.aborted) setDetailStatus('error')
      })
      .finally(() => {
        if (requestRef.current === controller) requestRef.current = null
      })
  }

  const coursePolicy = parsePetPolicy(place.petPolicy)
  const detailedPolicy = parsePetPolicy(details?.petPolicy)
  const policy = detailedPolicy.text || detailedPolicy.labels.length > 0
    ? detailedPolicy
    : coursePolicy
  const address = details?.address ?? place.details?.address
  const category = details?.category ?? place.details?.category
  const businessHours = details?.businessHours ?? place.details?.hours
  const rating = details?.rating ?? place.details?.rating
  const reviewCount = details?.reviewCount ?? place.details?.reviewCount

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card-surface shadow-sm">
      <button
        type="button"
        onClick={toggleDetails}
        aria-controls={detailId}
        aria-expanded={expanded}
        aria-label={`${place.name} 상세 ${expanded ? '접기' : '펼치기'}`}
        className="flex w-full items-center gap-3 p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage-green/50"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-soft-orange text-[12px] font-bold text-white">
          {place.visitOrder}
        </div>
        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl">
          <PlaceImage src={place.imageUrl} sizes="48px" iconClassName="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 break-words text-[14px] font-semibold leading-snug text-deep-brown">
              {place.name}
            </p>
            <span className="shrink-0 rounded-full bg-sage-green-light px-2 py-1 text-[10px] font-semibold text-sage-green">
              {place.isFinal ? '최종 도착지' : '중간 방문지'}
            </span>
          </div>
          {(address || category) && (
            <p className="mt-1 break-words text-[11px] leading-relaxed text-warm-gray">
              {category && <span className="font-medium text-sage-green">{category}</span>}
              {category && address && <span aria-hidden="true"> · </span>}
              {address}
            </p>
          )}
        </div>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0 text-warm-gray transition-transform duration-300',
            expanded && 'rotate-180'
          )}
        />
      </button>

      <div
        id={detailId}
        aria-hidden={!expanded}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:duration-0',
          expanded
            ? 'visible grid-rows-[1fr] opacity-100'
            : 'invisible grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 border-t border-border/70 px-3 pb-4 pt-3">
            {place.reason && (
              <section className="rounded-xl bg-soft-orange/10 p-3" aria-label="추천 이유">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-deep-brown">
                  <Sparkles aria-hidden="true" className="size-3.5 text-soft-orange" /> 추천 이유
                </p>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-deep-brown">
                  {place.reason}
                </p>
              </section>
            )}

            <section aria-label="장소 상세 정보" className="space-y-1.5 text-[11px] leading-relaxed text-warm-gray">
              <p className="text-[12px] font-semibold text-deep-brown">장소 상세 정보</p>
              {detailStatus === 'loading' ? (
                <p className="flex items-center gap-1.5">
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> 정보를 불러오는 중
                </p>
              ) : (
                <>
                  <p className="flex items-start gap-1.5 whitespace-normal break-words">
                    <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                    <span>{address ?? '주소 정보 없음'}</span>
                  </p>
                  <p className="flex items-start gap-1.5 whitespace-normal break-words">
                    <Clock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                    <span>{businessHours ?? '영업시간 정보 없음'}</span>
                  </p>
                  <p className="flex items-start gap-1.5 whitespace-normal break-words">
                    <Phone aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                    <span>{details?.phoneNumber ?? '연락처 정보 없음'}</span>
                  </p>
                </>
              )}
              {detailStatus === 'error' && (
                <p className="text-danger">최신 장소 정보를 불러오지 못했어요.</p>
              )}
            </section>

            <section aria-label="방문자 평가" className="rounded-xl bg-muted p-3">
              <p className="text-[12px] font-semibold text-deep-brown">방문자 평가</p>
              {(rating !== null && rating !== undefined) ||
              (reviewCount !== null && reviewCount !== undefined) ||
              (details?.visitCount !== null && details?.visitCount !== undefined) ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {rating !== null && rating !== undefined ? (
                    <span className="flex items-center gap-1 text-[14px] font-bold text-deep-brown">
                      <Star aria-hidden="true" className="size-4 fill-soft-orange text-soft-orange" />
                      {rating.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-warm-gray">평점 정보 없음</span>
                  )}
                  {reviewCount !== null && reviewCount !== undefined && (
                    <span className="text-[11px] text-warm-gray">리뷰 {reviewCount}개</span>
                  )}
                  {details?.visitCount !== null && details?.visitCount !== undefined && (
                    <span className="flex items-center gap-1 text-[11px] text-warm-gray">
                      <Users aria-hidden="true" className="size-3" /> 방문 {details.visitCount}회
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] text-warm-gray">등록된 평가 정보가 없어요.</p>
              )}
            </section>

            <section aria-label="반려동물 이용 조건" className="rounded-xl bg-sage-green-light p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-sage-green">
                <PawPrint aria-hidden="true" className="size-3.5" /> 반려동물 이용 조건
              </p>
              {policy.labels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {policy.labels.map((label) => (
                    <span
                      key={label}
                      className="max-w-full whitespace-normal break-words rounded-lg bg-white/75 px-2 py-1 text-[10px] font-medium leading-snug text-sage-green"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 whitespace-pre-line break-words text-[11px] leading-relaxed text-deep-brown">
                {policy.text ?? '등록된 이용 조건이 없어요. 방문 전 장소에 확인해주세요.'}
              </p>
            </section>
          </div>
        </div>
      </div>
    </article>
  )
}
