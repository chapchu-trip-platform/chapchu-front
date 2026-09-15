'use client'

import { useState } from 'react'
import { CalendarDays, Loader2, MapPin, Navigation } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import type { SearchableLocation } from '@/features/location/types/location'
import MapFlowBottomDock from '@/features/map/components/map-flow-bottom-dock'
import MapFlowDetailSheet from '@/features/map/components/map-flow-detail-sheet'
import RecommendedPlaceCard from '@/features/map/components/recommended-place-card'
import TmapMap, { type TmapMapMarker } from '@/features/map/components/tmap-map'
import { formatLocalTravelDate } from '@/features/map/lib/travel-date'
import type { RecommendedPlace } from '@/features/map/types/recommended-place'

interface MapPlaceSelectionScreenProps {
  destinationArea: SearchableLocation
  courseCreationError?: string | null
  isCreatingCourse?: boolean
  origin?: SearchableLocation
  onBack: () => void
  onConfirm: () => void
  onToggle: (placeId: string) => void
  places: RecommendedPlace[]
  selectedPlaceId: string | null
  travelDate?: string
}

export default function MapPlaceSelectionScreen({
  destinationArea,
  courseCreationError = null,
  isCreatingCourse = false,
  origin,
  onBack,
  onConfirm,
  onToggle,
  places,
  selectedPlaceId,
  travelDate = formatLocalTravelDate(new Date()),
}: MapPlaceSelectionScreenProps) {
  const [bottomExpanded, setBottomExpanded] = useState(false)
  const markers: TmapMapMarker[] = [
    ...(origin
      ? [{
          id: `origin-${origin.id}`,
          position: { lat: origin.latitude, lng: origin.longitude },
          title: `출발지: ${origin.name}`,
          label: '출발',
          variant: 'origin' as const,
        }]
      : []),
    ...places.map((place, index) => ({
      id: `recommended-${place.externalPlaceId}`,
      position: { lat: place.latitude, lng: place.longitude },
      title: `${index + 1}. ${place.name}`,
      label: place.externalPlaceId,
      variant: place.externalPlaceId === selectedPlaceId
        ? 'destination' as const
        : 'candidate' as const,
    })),
  ]

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar title="최종 도착지 선택" showBack onBack={onBack} />

      <div className="relative z-0 flex-1 overflow-hidden bg-sky-blue/20">
        <TmapMap
          center={{ lat: destinationArea.latitude, lng: destinationArea.longitude }}
          locationLabel={`${destinationArea.name} 주변`}
          markers={markers}
          zoom={12}
        />
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-semibold text-deep-brown shadow-sm">
          <span className="flex items-center gap-1"><span className="size-3 rounded-full bg-sage-green" />출발지</span>
          <span className="flex items-center gap-1"><span className="size-3 rounded-full bg-soft-orange" />후보</span>
          <span className="flex items-center gap-1"><span className="size-3 rounded-full bg-danger" />선택</span>
        </div>
      </div>

      <MapFlowDetailSheet
        id="place-selection-sheet"
        expanded={bottomExpanded}
        onExpandedChange={setBottomExpanded}
        expandLabel="추천 장소 목록 펼치기"
        collapseLabel="추천 장소 목록 접기"
        contentClassName="mobile-scroll px-4 pb-6"
      >
        <div className="mb-3 pt-1">
          <p className="text-[12px] font-semibold text-sage-green">
            {destinationArea.name} 주변 맞춤 추천
          </p>
          <h2 className="mt-1 text-[18px] font-bold text-deep-brown">
            최종 도착지 한 곳을 골라주세요
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-warm-gray">
            선택한 도착지와 반려동물 정보를 기준으로 서버가 코스를 자동 생성해요.
          </p>
        </div>

        <div role="group" aria-label="추천 장소" className="space-y-3">
          {places.map((place, index) => {
            const selected = selectedPlaceId === place.externalPlaceId

            return (
              <RecommendedPlaceCard
                key={place.externalPlaceId}
                place={place}
                index={index}
                selected={selected}
                disabled={isCreatingCourse}
                onToggle={() => onToggle(place.externalPlaceId)}
              />
            )
          })}
        </div>
      </MapFlowDetailSheet>

      <MapFlowBottomDock
        expanded={bottomExpanded}
        testId="place-selection-dock"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[17px] font-bold leading-tight text-deep-brown">
              최종 도착지
            </p>
          </div>
          <span
            aria-live="polite"
            className="shrink-0 rounded-full bg-sage-green-light px-3 py-1 text-[13px] font-semibold text-sage-green"
          >
            {selectedPlaceId ? '1곳 선택' : '선택 필요'}
          </span>
        </div>
        <div data-testid="place-selection-stats" className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4 text-warm-gray" />
            <span className="whitespace-nowrap text-[12px] text-warm-gray">
              후보 {places.length}개
            </span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4 text-warm-gray" />
            <span className="whitespace-nowrap text-[12px] text-warm-gray">
              {travelDate}
            </span>
          </div>
          <Navigation className="ml-auto h-4 w-4 text-sage-green" aria-hidden="true" />
        </div>
        {courseCreationError && (
          <p className="mt-2 text-[11px] leading-relaxed text-danger" role="alert">
            {courseCreationError}
          </p>
        )}
        <Button
          size="lg"
          onClick={onConfirm}
          disabled={!selectedPlaceId || isCreatingCourse}
          className="map-flow-dock-button"
        >
          {isCreatingCourse ? (
            <><Loader2 className="animate-spin" /> 코스 생성 중</>
          ) : (
            '선택한 도착지로 코스 생성'
          )}
        </Button>
      </MapFlowBottomDock>
    </div>
  )
}
