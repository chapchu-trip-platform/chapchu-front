'use client'

import type { ComponentProps } from 'react'
import { Clock3, Loader2, PawPrint } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { ChoiceChip } from '@/components/ui/choice-chip'
import type { SearchableLocation } from '@/features/location/types/location'
import type { SelectablePet } from '@/features/profile/api/pets-api'
import { formatWalkingTime } from '@/features/map/api/walking-time-api'
import { formatPetName } from '@/lib/format-pet-name'
import { cn } from '@/lib/utils'

export type PlaceRecommendationStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'

export type MinimumWalkingTimeStatus = 'idle' | 'loading' | 'success' | 'error'

interface MapRouteOptionsScreenProps {
  destination: SearchableLocation
  onBack: () => void
  onPetSelect: (petId: string) => void
  onRecommend: () => void
  origin: SearchableLocation
  recommendationError: string | null
  recommendationStatus: PlaceRecommendationStatus
  petLoadStatus: 'loading' | 'success' | 'error'
  pets: SelectablePet[]
  selectedPetId: string | null
  minimumWalkingTimeSeconds?: number | null
  minimumWalkingTimeStatus?: MinimumWalkingTimeStatus
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
  onPetSelect,
  onRecommend,
  origin,
  recommendationError,
  recommendationStatus,
  petLoadStatus,
  pets,
  selectedPetId,
  minimumWalkingTimeSeconds = null,
  minimumWalkingTimeStatus = 'idle',
}: MapRouteOptionsScreenProps) {
  const canRecommend = selectedPetId !== null

  return (
    <div className="flex flex-1 flex-col bg-warm-beige">
      <TopBar title="추천 장소 찾기" showBack onBack={onBack} />

      <div className="mobile-scroll flex-1 px-4 py-5">
        <RouteOptionsCard>
          <p className="text-[12px] font-semibold text-sage-green">여행 출발지·탐색 지역</p>
          <div className="mt-3 flex items-start gap-3">
            <div className="mt-1 flex flex-col items-center">
              <span className="size-2.5 rounded-full bg-sage-green" />
              <span className="h-8 w-px bg-border" />
              <span className="size-2.5 rounded-full bg-soft-orange" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="whitespace-normal break-words text-[14px] font-semibold leading-snug text-deep-brown">
                  {origin.name}
                </p>
                <p className="mt-0.5 whitespace-normal break-words text-[11px] leading-relaxed text-warm-gray">{origin.address}</p>
              </div>
              <div>
                <p className="whitespace-normal break-words text-[14px] font-semibold leading-snug text-deep-brown">
                  {destination.name}
                </p>
                <p className="mt-0.5 whitespace-normal break-words text-[11px] leading-relaxed text-warm-gray">
                  {destination.address}
                </p>
              </div>
            </div>
          </div>

          {minimumWalkingTimeStatus !== 'idle' && (
            <div
              data-testid="minimum-walking-time"
              role="status"
              className="mt-4 flex items-center gap-3 rounded-xl bg-sage-green-light/70 px-3 py-2.5"
            >
              <Clock3 aria-hidden="true" className="size-4 shrink-0 text-sage-green" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-sage-green">
                  최소 소요 시간
                </p>
                {minimumWalkingTimeStatus === 'loading' && (
                  <p className="mt-0.5 text-[12px] text-deep-brown">
                    도보 이동 시간을 계산하고 있어요…
                  </p>
                )}
                {minimumWalkingTimeStatus === 'success' &&
                  minimumWalkingTimeSeconds !== null && (
                    <p className="mt-0.5 text-[14px] font-bold text-deep-brown">
                      {formatWalkingTime(minimumWalkingTimeSeconds)}
                    </p>
                  )}
                {minimumWalkingTimeStatus === 'error' && (
                  <p className="mt-0.5 text-[12px] text-warm-gray">
                    이동 시간을 확인하지 못했어요.
                  </p>
                )}
              </div>
            </div>
          )}
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
                  aria-label={pet.name}
                  title={pet.name}
                  selected={selectedPetId === pet.id}
                  shape="card"
                  size="segment"
                  onClick={() => onPetSelect(pet.id)}
                  className={cn(
                    'h-12 w-full rounded-xl text-[14px]',
                    selectedPetId !== pet.id && 'bg-card-surface text-deep-brown'
                  )}
                >
                  {formatPetName(pet.name)}
                </ChoiceChip>
              ))}
            </div>
          )}
        </RouteOptionsCard>

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
            탐색 지역 주변에서 추천할 수 있는 장소를 찾지 못했습니다. 다른 지역을
            선택하거나 다시 시도해주세요.
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
              추천 장소 찾는 중
            </>
          ) : !selectedPetId ? (
            '반려동물을 선택해주세요'
          ) : (
            recommendationStatus === 'error' || recommendationStatus === 'empty'
              ? '추천 장소 다시 받기'
              : '추천 장소 받기'
          )}
        </Button>
        <p className="mt-2 text-center text-[11px] text-warm-gray">
          선택한 반려동물과 탐색 지역을 기준으로 방문할 장소 5곳을 추천합니다.
        </p>
      </div>
    </div>
  )
}
