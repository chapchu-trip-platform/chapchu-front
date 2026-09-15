'use client'

import { useState } from 'react'
import { CalendarDays, Loader2, MapPin, Navigation } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import CoursePlaceCard from '@/features/map/components/course-place-card'
import type { SearchableLocation } from '@/features/location/types/location'
import MapFlowBottomDock from '@/features/map/components/map-flow-bottom-dock'
import MapFlowDetailSheet from '@/features/map/components/map-flow-detail-sheet'
import TmapMap, { type TmapMapMarker } from '@/features/map/components/tmap-map'
import {
  formatWalkingTime,
  type PedestrianRoute,
} from '@/features/map/api/walking-time-api'
import type { RecommendedCourse } from '@/features/map/types/course'

interface MapRouteScreenProps {
  course: RecommendedCourse
  destination: SearchableLocation | null
  isStartingTrip?: boolean
  onBack?: () => void
  onStartTrip: () => void
  origin: SearchableLocation | null
  pedestrianRoute?: PedestrianRoute | null
  pedestrianRouteStatus?: 'idle' | 'loading' | 'success' | 'error'
  startTripError?: string | null
}

function getRouteMapZoom(points: Array<{ latitude: number; longitude: number }>) {
  if (points.length < 2) return 14
  const latitudes = points.map((point) => point.latitude)
  const longitudes = points.map((point) => point.longitude)
  const coordinateSpan = Math.max(
    Math.max(...latitudes) - Math.min(...latitudes),
    Math.max(...longitudes) - Math.min(...longitudes)
  )

  if (coordinateSpan > 1) return 7
  if (coordinateSpan > 0.5) return 8
  if (coordinateSpan > 0.2) return 9
  if (coordinateSpan > 0.08) return 10
  if (coordinateSpan > 0.03) return 11
  if (coordinateSpan > 0.01) return 12
  return 14
}

export default function MapRouteScreen({
  course,
  destination,
  isStartingTrip = false,
  onBack,
  onStartTrip,
  origin,
  pedestrianRoute = null,
  pedestrianRouteStatus = 'idle',
  startTripError = null,
}: MapRouteScreenProps) {
  const [bottomExpanded, setBottomExpanded] = useState(false)
  const mapPoints = [
    ...(origin ? [origin] : []),
    ...course.places,
  ]
  const mapCenter = mapPoints.length > 0
    ? {
        lat: mapPoints.reduce((sum, point) => sum + point.latitude, 0) / mapPoints.length,
        lng: mapPoints.reduce((sum, point) => sum + point.longitude, 0) / mapPoints.length,
      }
    : destination
      ? { lat: destination.latitude, lng: destination.longitude }
      : undefined
  const mapMarkers: TmapMapMarker[] = [
    ...(origin
      ? [
          {
            id: `origin-${origin.id}`,
            position: { lat: origin.latitude, lng: origin.longitude },
            title: `출발지: ${origin.name}`,
            label: '출발',
            variant: 'origin' as const,
          },
        ]
      : []),
    ...course.places.map((place) => ({
      id: `course-place-${place.id}`,
      position: { lat: place.latitude, lng: place.longitude },
      title: `${place.visitOrder}번 방문지: ${place.name}`,
      label: place.isFinal ? '도착' : String(place.visitOrder),
      variant: place.isFinal ? 'destination' as const : 'candidate' as const,
    })),
  ]
  const mapZoom = getRouteMapZoom(mapPoints)
  const routeTitle = `${course.startLocation} → ${course.endLocation}`

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar title="장소 순서 확정" showBack={Boolean(onBack)} onBack={onBack} />

      <div className="relative z-0 flex-1 overflow-hidden bg-sky-blue/20">
        <TmapMap
          center={mapCenter}
          locationLabel={routeTitle}
          markers={mapMarkers}
          routePath={pedestrianRoute?.path ?? []}
          zoom={mapZoom}
        />
      </div>

      <MapFlowDetailSheet
        id="route-details-sheet"
        expanded={bottomExpanded}
        onExpandedChange={setBottomExpanded}
        expandLabel="방문 순서 펼치기"
        collapseLabel="방문 순서 접기"
        contentClassName="overflow-y-auto no-scrollbar"
      >
        <div className="space-y-2 px-4 pb-3 pt-1">
          <div
            role="status"
            className="rounded-xl border border-sage-green/30 bg-sage-green-light px-3 py-2 text-[11px] font-medium text-deep-brown"
          >
            선택한 최종 도착지를 기준으로 서버가 생성한 코스입니다.
          </div>
          {pedestrianRouteStatus === 'loading' && (
            <div className="flex items-center gap-2 rounded-xl border border-soft-orange/30 bg-soft-orange/10 px-3 py-2 text-[11px] leading-relaxed text-deep-brown">
              <Loader2 aria-hidden="true" className="size-3.5 shrink-0 animate-spin" />
              방문 순서에 맞는 보행 경로를 찾고 있어요.
            </div>
          )}
          {pedestrianRouteStatus === 'success' && pedestrianRoute && (
            <div className="flex flex-wrap gap-x-2 gap-y-1 rounded-xl border border-soft-orange/30 bg-soft-orange/10 px-3 py-2 text-[11px] leading-relaxed text-deep-brown">
              <span className="font-semibold">보행 경로</span>
              <span>{(pedestrianRoute.totalDistanceMeters / 1000).toFixed(1)}km</span>
              <span>{formatWalkingTime(pedestrianRoute.totalTimeSeconds)}</span>
            </div>
          )}
          {pedestrianRouteStatus === 'error' && (
            <div role="alert" className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-[11px] leading-relaxed text-deep-brown">
              보행 경로를 불러오지 못했어요. 장소 순서는 그대로 확인할 수 있습니다.
            </div>
          )}
          {startTripError && (
            <div
              role="alert"
              className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] leading-relaxed text-danger"
            >
              {startTripError}
            </div>
          )}
        </div>

        <div className="px-4 pb-2">
          <h4 className="mb-2 text-[13px] font-semibold text-warm-gray">방문 순서</h4>
          <ol className="flex flex-col gap-2">
            {course.places.map((place) => (
              <li key={place.id}>
                <CoursePlaceCard place={place} />
              </li>
            ))}
          </ol>
        </div>
      </MapFlowDetailSheet>

      <MapFlowBottomDock expanded={bottomExpanded} testId="route-summary-dock">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="whitespace-normal break-words text-[15px] font-bold leading-snug text-deep-brown">
              {routeTitle}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-sage-green-light px-3 py-1 text-[13px] font-semibold text-sage-green">
            코스 구성 완료
          </span>
        </div>
        <div data-testid="route-summary-stats" className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4 text-warm-gray" />
            <span className="whitespace-nowrap text-[12px] text-warm-gray">
              장소 {course.places.length}개
            </span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4 text-warm-gray" />
            <span className="whitespace-nowrap text-[12px] text-warm-gray">
              {course.travelDate}
            </span>
          </div>
          <Navigation className="ml-auto h-4 w-4 text-sage-green" aria-hidden="true" />
        </div>
        <Button
          onClick={onStartTrip}
          disabled={course.places.length === 0 || isStartingTrip}
          size="lg"
          className="map-flow-dock-button"
        >
          {isStartingTrip ? <><Loader2 className="animate-spin" /> 여행을 준비하는 중</> : '이 코스로 여행 시작'}
        </Button>
      </MapFlowBottomDock>
    </div>
  )
}
