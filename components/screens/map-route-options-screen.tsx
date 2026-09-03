'use client'

import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { AlertCircle, Clock3, Loader2, MapPin, Route } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { ChoiceChip } from '@/components/ui/choice-chip'
import type { SearchableLocation } from '@/features/location/types/location'
import { getMinimumWalkingTimeSeconds } from '@/features/map/api/walking-time-api'
import {
  getTravelTimeOptions,
  isValidRouteOptions,
  MAX_WAYPOINT_COUNT,
  secondsToMinimumTravelHours,
} from '@/features/map/lib/route-options'
import { cn } from '@/lib/utils'

type WalkingTimeStatus = 'loading' | 'success' | 'error'
export type CourseRecommendationStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'

interface MapRouteOptionsScreenProps {
  destination: SearchableLocation
  minimumWalkingTimeHours: number | null
  onBack: () => void
  onOptionsChange: (options: {
    minimumWalkingTimeHours: number
    waypointCount: number
    travelTimeHours: number
  }) => void
  onRecommend: () => void
  origin: SearchableLocation
  recommendationError: string | null
  recommendationStatus: CourseRecommendationStatus
  travelTimeHours: number | null
  waypointCount: number | null
}

function RouteOptionsCard({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'rounded-card border border-border bg-card-surface p-4 shadow-sm',
        className
      )}
      {...props}
    />
  )
}

export default function MapRouteOptionsScreen({
  destination,
  minimumWalkingTimeHours,
  onBack,
  onOptionsChange,
  onRecommend,
  origin,
  recommendationError,
  recommendationStatus,
  travelTimeHours,
  waypointCount,
}: MapRouteOptionsScreenProps) {
  const [status, setStatus] = useState<WalkingTimeStatus>('loading')
  const [retryCount, setRetryCount] = useState(0)
  const waypointCountRef = useRef(waypointCount)
  const travelTimeHoursRef = useRef(travelTimeHours)

  useEffect(() => {
    waypointCountRef.current = waypointCount
    travelTimeHoursRef.current = travelTimeHours
  }, [travelTimeHours, waypointCount])

  useEffect(() => {
    const controller = new AbortController()

    void getMinimumWalkingTimeSeconds(origin, destination, controller.signal)
      .then((seconds) => {
        const minimumHours = secondsToMinimumTravelHours(seconds)
        const currentWaypointCount = waypointCountRef.current
        const currentTravelTimeHours = travelTimeHoursRef.current
        const nextWaypointCount =
          currentWaypointCount !== null &&
          currentWaypointCount >= 1 &&
          currentWaypointCount <= MAX_WAYPOINT_COUNT
            ? currentWaypointCount
            : 1
        const nextTravelTime =
          currentTravelTimeHours !== null &&
          currentTravelTimeHours >= minimumHours &&
          currentTravelTimeHours <= minimumHours + 3
            ? currentTravelTimeHours
            : minimumHours

        onOptionsChange({
          minimumWalkingTimeHours: minimumHours,
          waypointCount: nextWaypointCount,
          travelTimeHours: nextTravelTime,
        })
        setStatus('success')
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === 'AbortError') return
        setStatus('error')
      })

    return () => controller.abort()
  }, [destination, onOptionsChange, origin, retryCount])

  const travelTimeOptions =
    minimumWalkingTimeHours === null
      ? []
      : getTravelTimeOptions(minimumWalkingTimeHours)
  const hasValidOptions = isValidRouteOptions(
    minimumWalkingTimeHours,
    waypointCount,
    travelTimeHours
  )

  const updateOptions = (next: {
    waypointCount?: number
    travelTimeHours?: number
  }) => {
    if (minimumWalkingTimeHours === null) return
    onOptionsChange({
      minimumWalkingTimeHours,
      waypointCount: next.waypointCount ?? waypointCount ?? 1,
      travelTimeHours:
        next.travelTimeHours ?? travelTimeHours ?? minimumWalkingTimeHours,
    })
  }

  return (
    <div className="flex flex-1 flex-col bg-warm-beige">
      <TopBar title="여행 조건 설정" showBack onBack={onBack} />

      <div className="mobile-scroll flex-1 px-4 py-5">
        <RouteOptionsCard>
          <p className="text-[12px] font-semibold text-sage-green">선택한 경로</p>
          <div className="mt-3 flex items-start gap-3">
            <div className="mt-1 flex flex-col items-center">
              <span className="size-2.5 rounded-full bg-sage-green" />
              <span className="h-8 w-px bg-border" />
              <span className="size-2.5 rounded-full bg-soft-orange" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="truncate text-[14px] font-semibold text-deep-brown">
                  {origin.name}
                </p>
                <p className="truncate text-[11px] text-warm-gray">{origin.address}</p>
              </div>
              <div>
                <p className="truncate text-[14px] font-semibold text-deep-brown">
                  {destination.name}
                </p>
                <p className="truncate text-[11px] text-warm-gray">
                  {destination.address}
                </p>
              </div>
            </div>
          </div>
        </RouteOptionsCard>

        <RouteOptionsCard className="mt-4">
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-sage-green" />
            <h2 className="text-[15px] font-bold text-deep-brown">최소 도보 이동 시간</h2>
          </div>

          {status === 'loading' && (
            <div role="status" className="mt-4 flex items-center gap-2 text-[13px] text-warm-gray">
              <Loader2 className="size-4 animate-spin text-sage-green" />
              TMAP에서 도보 경로를 확인하고 있어요…
            </div>
          )}

          {status === 'error' && (
            <div role="alert" className="mt-4 rounded-xl bg-soft-orange/10 p-3">
              <div className="flex items-center gap-2 text-[13px] font-medium text-deep-brown">
                <AlertCircle className="size-4 text-soft-orange" />
                최소 이동 시간을 확인하지 못했어요.
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 text-sage-green"
                onClick={() => {
                  setStatus('loading')
                  setRetryCount((count) => count + 1)
                }}
              >
                다시 시도
              </Button>
            </div>
          )}

          {status === 'success' && minimumWalkingTimeHours !== null && (
            <div className="mt-3 rounded-xl bg-sage-green-light px-4 py-3">
              <p className="text-[24px] font-bold text-sage-green">
                {minimumWalkingTimeHours}H
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-warm-gray">
                TMAP 보행자 경로 시간을 H 단위로 올림한 값입니다.
              </p>
            </div>
          )}
        </RouteOptionsCard>

        {status === 'success' && minimumWalkingTimeHours !== null && (
          <>
            <section className="mt-4">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-soft-orange" />
                <h2 className="text-[15px] font-bold text-deep-brown">중간 거점 개수</h2>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {Array.from({ length: MAX_WAYPOINT_COUNT }, (_, index) => index + 1).map(
                  (count) => (
                    <ChoiceChip
                      key={count}
                      selected={waypointCount === count}
                      shape="card"
                      size="segment"
                      onClick={() => updateOptions({ waypointCount: count })}
                      className={cn(
                        'h-12 w-full rounded-xl text-[14px]',
                        waypointCount !== count && 'bg-card-surface text-deep-brown'
                      )}
                    >
                      {count}개
                    </ChoiceChip>
                  )
                )}
              </div>
            </section>

            <section className="mt-5">
              <div className="flex items-center gap-2">
                <Route className="size-4 text-sage-green" />
                <h2 className="text-[15px] font-bold text-deep-brown">여행 시간</h2>
              </div>
              <p className="mt-1 text-[11px] text-warm-gray">
                최소 이동 시간부터 최대 3시간을 더해 선택할 수 있어요.
              </p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {travelTimeOptions.map((hours) => (
                  <ChoiceChip
                    key={hours}
                    selected={travelTimeHours === hours}
                    shape="card"
                    size="segment"
                    onClick={() => updateOptions({ travelTimeHours: hours })}
                    className={cn(
                      'h-12 w-full rounded-xl text-[14px]',
                      travelTimeHours !== hours && 'bg-card-surface text-deep-brown'
                    )}
                  >
                    {hours}H
                  </ChoiceChip>
                ))}
              </div>
            </section>
          </>
        )}

        {recommendationStatus === 'error' && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-danger/20 bg-danger/5 p-3 text-[12px] text-deep-brown"
          >
            {recommendationError}
          </div>
        )}

        {recommendationStatus === 'empty' && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-soft-orange/30 bg-soft-orange/10 p-3 text-[12px] text-deep-brown"
          >
            출발 위치 주변에서 추천 가능한 코스를 찾지 못했습니다. 출발지를 변경하거나
            다시 시도해주세요.
          </div>
        )}
      </div>

      <div className="safe-bottom-action px-4 pt-3">
        <Button
          disabled={!hasValidOptions || recommendationStatus === 'loading'}
          fullWidth
          size="lg"
          onClick={onRecommend}
          aria-live="polite"
        >
          {recommendationStatus === 'loading' ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              추천 코스 생성 중
            </>
          ) : hasValidOptions ? (
            recommendationStatus === 'error' || recommendationStatus === 'empty'
              ? '추천 코스 다시 받기'
              : '추천 코스 받기'
          ) : (
            '여행 조건을 선택해주세요'
          )}
        </Button>
        <p className="mt-2 text-center text-[11px] text-warm-gray">
          현재 API는 출발 위치 주변 추천만 지원하며 도착지·거점 수·여행 시간은 요청에
          포함되지 않습니다.
        </p>
      </div>
    </div>
  )
}
