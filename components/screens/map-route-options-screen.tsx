'use client'

import type { ComponentProps } from 'react'
import { Loader2, MapPin, PawPrint } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { ChoiceChip } from '@/components/ui/choice-chip'
import type { SearchableLocation } from '@/features/location/types/location'
import {
  isValidRouteOptions,
  MAX_WAYPOINT_COUNT,
  MIN_WAYPOINT_COUNT,
} from '@/features/map/lib/route-options'
import type { SelectablePet } from '@/features/profile/api/pets-api'
import { cn } from '@/lib/utils'

export type CourseRecommendationStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'

interface MapRouteOptionsScreenProps {
  destination: SearchableLocation
  onBack: () => void
  onOptionsChange: (options: {
    waypointCount: number
  }) => void
  onPetSelect: (petId: string) => void
  onRecommend: () => void
  origin: SearchableLocation
  recommendationError: string | null
  recommendationStatus: CourseRecommendationStatus
  petLoadStatus: 'loading' | 'success' | 'error'
  pets: SelectablePet[]
  selectedPetId: string | null
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
  onBack,
  onOptionsChange,
  onPetSelect,
  onRecommend,
  origin,
  recommendationError,
  recommendationStatus,
  petLoadStatus,
  pets,
  selectedPetId,
  waypointCount,
}: MapRouteOptionsScreenProps) {
  const hasValidOptions = isValidRouteOptions(waypointCount)
  const canRecommend = hasValidOptions && selectedPetId !== null

  const updateWaypointCount = (nextWaypointCount: number) => {
    onOptionsChange({
      waypointCount: nextWaypointCount,
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
            <PawPrint className="size-4 text-sage-green" />
            <h2 className="text-[15px] font-bold text-deep-brown">
              함께 여행할 반려동물
            </h2>
          </div>

          {petLoadStatus === 'loading' && (
            <div role="status" className="mt-3 flex items-center gap-2 text-[13px] text-warm-gray">
              <Loader2 className="size-4 animate-spin text-sage-green" />
              반려동물 정보를 불러오고 있어요…
            </div>
          )}

          {petLoadStatus === 'error' && (
            <p role="alert" className="mt-3 text-[12px] text-danger">
              반려동물 정보를 불러오지 못했습니다. 다시 로그인한 뒤 시도해주세요.
            </p>
          )}

          {petLoadStatus === 'success' && pets.length === 0 && (
            <p role="status" className="mt-3 text-[12px] text-warm-gray">
              등록된 반려동물이 없습니다.
            </p>
          )}

          {pets.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {pets.map((pet) => (
                <ChoiceChip
                  key={pet.id}
                  selected={selectedPetId === pet.id}
                  shape="card"
                  size="segment"
                  onClick={() => onPetSelect(pet.id)}
                  className={cn(
                    'h-12 w-full rounded-xl text-[14px]',
                    selectedPetId !== pet.id && 'bg-card-surface text-deep-brown'
                  )}
                >
                  {pet.name}
                </ChoiceChip>
              ))}
            </div>
          )}
        </RouteOptionsCard>

        <section className="mt-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-soft-orange" />
            <h2 className="text-[15px] font-bold text-deep-brown">중간 거점 개수</h2>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {Array.from(
              { length: MAX_WAYPOINT_COUNT - MIN_WAYPOINT_COUNT + 1 },
              (_, index) => index + MIN_WAYPOINT_COUNT
            ).map((count) => (
              <ChoiceChip
                key={count}
                selected={waypointCount === count}
                shape="card"
                size="segment"
                onClick={() => updateWaypointCount(count)}
                className={cn(
                  'h-12 w-full rounded-xl px-2 text-[14px]',
                  waypointCount !== count && 'bg-card-surface text-deep-brown'
                )}
              >
                {count === 0 ? '0개 · 직행' : `${count}개`}
              </ChoiceChip>
            ))}
          </div>
        </section>

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
            선택한 경로 주변에서 추천 가능한 코스를 찾지 못했습니다. 출발지나 도착지를
            변경하거나 다시 시도해주세요.
          </div>
        )}
      </div>

      <div className="safe-bottom-action px-4 pt-3">
        <Button
          disabled={!canRecommend || recommendationStatus === 'loading'}
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
          ) : !selectedPetId ? (
            '반려동물을 선택해주세요'
          ) : hasValidOptions ? (
            recommendationStatus === 'error' || recommendationStatus === 'empty'
              ? '추천 코스 다시 받기'
              : '추천 코스 받기'
          ) : (
            '여행 조건을 선택해주세요'
          )}
        </Button>
        <p className="mt-2 text-center text-[11px] text-warm-gray">
          선택한 반려동물·출발지·도착지와 중간 거점 수를 추천 API에 전달합니다.
        </p>
      </div>
    </div>
  )
}
