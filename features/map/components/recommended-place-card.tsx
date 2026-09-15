'use client'

import { useEffect, useId, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  PawPrint,
  Phone,
  Star,
  Users,
} from 'lucide-react'
import { fetchRecommendedPlaceDetails } from '@/features/map/api/place-details-api'
import PlaceImage from '@/features/map/components/place-image'
import { parsePetPolicy } from '@/features/map/lib/pet-policy'
import type {
  RecommendedPlace,
  RecommendedPlaceDetails,
} from '@/features/map/types/recommended-place'
import { cn } from '@/lib/utils'

function getPolicyLabels(place: RecommendedPlace) {
  return [
    place.allowedPetSize ? `허용 크기 ${place.allowedPetSize}` : null,
    place.leashRequired === true ? '목줄 필수' : null,
    place.carrierRequired === true ? '이동장 필수' : null,
  ].filter((label): label is string => Boolean(label))
}

interface RecommendedPlaceCardProps {
  disabled: boolean
  index: number
  onToggle: () => void
  place: RecommendedPlace
  selected: boolean
}

export default function RecommendedPlaceCard({
  disabled,
  index,
  onToggle,
  place,
  selected,
}: RecommendedPlaceCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [details, setDetails] = useState<RecommendedPlaceDetails | null>(null)
  const [detailStatus, setDetailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const detailsId = useId()
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => () => requestRef.current?.abort(), [])

  const toggleDetails = () => {
    const nextExpanded = !expanded
    setExpanded(nextExpanded)
    if (
      !nextExpanded ||
      detailStatus === 'loading' ||
      detailStatus === 'success'
    ) {
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

  const detailedPolicy = parsePetPolicy(details?.petPolicy)
  const policyLabels = [...new Set([...getPolicyLabels(place), ...detailedPolicy.labels])]
  const fallbackPolicy = parsePetPolicy(place.caution)

  return (
    <article
      className={cn(
        'overflow-hidden rounded-card border bg-card-surface shadow-sm transition-[border-color,box-shadow]',
        selected ? 'border-sage-green shadow-md ring-1 ring-sage-green/30' : 'border-border'
      )}
    >
      <div className="flex gap-3 p-3">
        <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl">
          <PlaceImage src={place.imageUrl} sizes="88px" iconClassName="size-6" />
          <span className="absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-soft-orange text-[12px] font-bold text-white shadow-sm">
            {index + 1}
          </span>
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={toggleDetails}
              aria-controls={detailsId}
              aria-expanded={expanded}
              aria-label={`${place.name} 상세 ${expanded ? '접기' : '펼치기'}`}
              className="min-w-0 flex-1 text-left outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-sage-green/50"
            >
              <p className="truncate text-[15px] font-bold text-deep-brown">{place.name}</p>
              <p className="mt-0.5 text-[11px] font-medium text-sage-green">
                {place.category} · {place.indoorOutdoorType}
              </p>
            </button>
            <button
              type="button"
              aria-pressed={selected}
              aria-label={`${place.name} 선택`}
              disabled={disabled}
              onClick={onToggle}
              className={cn(
                'flex h-7 shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sage-green/50',
                selected
                  ? 'border-sage-green bg-sage-green text-white'
                  : 'border-border bg-white text-warm-gray',
                disabled && 'cursor-not-allowed opacity-45'
              )}
            >
              {selected && <Check aria-hidden="true" className="size-3.5" />}
              {selected ? '선택됨' : '선택'}
            </button>
          </div>

          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-warm-gray">
            <MapPin aria-hidden="true" className="mr-1 inline size-3" />
            {place.address}
          </p>
          <button
            type="button"
            onClick={toggleDetails}
            aria-controls={detailsId}
            aria-expanded={expanded}
            className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-deep-brown outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-sage-green/50"
          >
            리뷰·이용 정보
            <ChevronDown
              aria-hidden="true"
              className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}
            />
          </button>
        </div>
      </div>

      <div
        id={detailsId}
        aria-hidden={!expanded}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:duration-0',
          expanded ? 'visible grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 border-t border-border/70 px-3 pb-4 pt-3">
            <section aria-label="방문자 리뷰" className="rounded-xl bg-soft-orange/10 p-3">
              <p className="text-[12px] font-semibold text-deep-brown">방문자 리뷰</p>
              {detailStatus === 'loading' ? (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-warm-gray">
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> 리뷰 정보를 불러오는 중
                </p>
              ) : details && (
                details.rating !== null ||
                details.reviewCount !== null ||
                details.visitCount !== null
              ) ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {details.rating !== null ? (
                    <span className="flex items-center gap-1 text-[15px] font-bold text-deep-brown">
                      <Star aria-hidden="true" className="size-4 fill-soft-orange text-soft-orange" />
                      {details.rating.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-warm-gray">평점 정보 없음</span>
                  )}
                  {details.reviewCount !== null && (
                    <span className="text-[11px] text-warm-gray">리뷰 {details.reviewCount}개</span>
                  )}
                  {details.visitCount !== null && (
                    <span className="flex items-center gap-1 text-[11px] text-warm-gray">
                      <Users aria-hidden="true" className="size-3" /> 방문 {details.visitCount}회
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-warm-gray">
                  {detailStatus === 'error'
                    ? '리뷰 정보를 불러오지 못했어요.'
                    : '등록된 리뷰 정보가 없어요.'}
                </p>
              )}
            </section>

            <section aria-label="장소 이용 정보">
              <p className="mb-2 text-[12px] font-semibold text-deep-brown">장소 이용 정보</p>
              <div className="space-y-1.5 text-[11px] leading-relaxed text-warm-gray">
                <p className="flex items-start gap-1.5">
                  <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" /> {place.address}
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock aria-hidden="true" className="size-3.5 shrink-0" />
                  {detailStatus === 'loading' ? '영업시간 확인 중' : details?.businessHours ?? '영업시간 정보 없음'}
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone aria-hidden="true" className="size-3.5 shrink-0" />
                  {detailStatus === 'loading' ? '연락처 확인 중' : details?.phoneNumber ?? '연락처 정보 없음'}
                </p>
              </div>
            </section>

            <section aria-label="반려동물 이용 규칙" className="rounded-xl bg-sage-green-light p-3">
              <p className="text-[12px] font-semibold text-sage-green">반려동물 이용 규칙</p>
              {policyLabels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {policyLabels.map((label) => (
                    <span key={label} className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-sage-green">
                      {label}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 whitespace-pre-line break-words text-[11px] leading-relaxed text-deep-brown">
                {detailedPolicy.text ?? fallbackPolicy.text ?? '등록된 이용 규칙이 없어요. 방문 전 장소에 확인해주세요.'}
              </p>
              {detailedPolicy.text && fallbackPolicy.text && detailedPolicy.text !== fallbackPolicy.text && (
                <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-soft-orange">
                  <PawPrint aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
                  <span className="whitespace-pre-line break-words">{fallbackPolicy.text}</span>
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </article>
  )
}
