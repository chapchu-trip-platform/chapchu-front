'use client'

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CalendarDays, CheckCircle2, MapPin, Navigation } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import type { SearchableLocation } from '@/features/location/types/location'
import TmapMap, { type TmapMapMarker } from '@/features/map/components/tmap-map'
import type { RecommendedCourse } from '@/features/map/types/course'
import { cn } from '@/lib/utils'

interface MapRouteScreenProps {
  course: RecommendedCourse
  destination: SearchableLocation | null
  onBack: () => void
  onStartTrip: () => void
  origin: SearchableLocation | null
}

const DETAIL_HANDLE_HEIGHT_PX = 32
const SHEET_SNAP_THRESHOLD_PX = 40

interface SheetDragState {
  pointerId: number
  startY: number
  startOffset: number
  maxOffset: number
}

function getRouteMapZoom(origin: SearchableLocation, destination: SearchableLocation) {
  const coordinateSpan = Math.max(
    Math.abs(origin.latitude - destination.latitude),
    Math.abs(origin.longitude - destination.longitude)
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
  onBack,
  onStartTrip,
  origin,
}: MapRouteScreenProps) {
  const [bottomExpanded, setBottomExpanded] = useState(false)
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<SheetDragState | null>(null)
  const didDragRef = useRef(false)
  const mapCenter =
    origin && destination
      ? {
          lat: (origin.latitude + destination.latitude) / 2,
          lng: (origin.longitude + destination.longitude) / 2,
        }
      : origin
        ? { lat: origin.latitude, lng: origin.longitude }
        : undefined
  const mapMarkers: TmapMapMarker[] = [
    ...(origin
      ? [
          {
            id: `origin-${origin.id}`,
            position: { lat: origin.latitude, lng: origin.longitude },
            title: `출발지: ${origin.name}`,
          },
        ]
      : []),
    ...(destination
      ? [
          {
            id: `destination-${destination.id}`,
            position: { lat: destination.latitude, lng: destination.longitude },
            title: `도착지: ${destination.name}`,
          },
        ]
      : []),
  ]
  const mapZoom = origin && destination ? getRouteMapZoom(origin, destination) : 14
  const routeTitle = `${course.startLocation} 추천 코스`

  const startSheetDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const sheetHeight = sheetRef.current?.getBoundingClientRect().height ?? 0
    const maxOffset = Math.max(0, sheetHeight - DETAIL_HANDLE_HEIGHT_PX)

    dragStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startOffset: bottomExpanded ? 0 : maxOffset,
      maxOffset,
    }
    didDragRef.current = false
    setDragOffset(bottomExpanded ? 0 : maxOffset)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveSheet = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    const deltaY = event.clientY - dragState.startY
    if (Math.abs(deltaY) > 4) didDragRef.current = true
    setDragOffset(
      Math.min(dragState.maxOffset, Math.max(0, dragState.startOffset + deltaY))
    )
  }

  const finishSheetDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    const deltaY = event.clientY - dragState.startY
    const currentOffset = Math.min(
      dragState.maxOffset,
      Math.max(0, dragState.startOffset + deltaY)
    )
    const shouldExpand =
      deltaY <= -SHEET_SNAP_THRESHOLD_PX ||
      (deltaY < SHEET_SNAP_THRESHOLD_PX && currentOffset < dragState.maxOffset / 2)

    setBottomExpanded(shouldExpand)
    setDragOffset(null)
    dragStateRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const cancelSheetDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) return
    setDragOffset(null)
    dragStateRef.current = null
    didDragRef.current = false
  }

  const sheetTransform =
    dragOffset !== null
      ? `translate3d(0, ${dragOffset}px, 0)`
      : bottomExpanded
        ? 'translate3d(0, 0, 0)'
        : `translate3d(0, calc(100% - ${DETAIL_HANDLE_HEIGHT_PX}px), 0)`

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar title="추천 코스" showBack onBack={onBack} />

      <div className="relative z-0 flex-1 overflow-hidden bg-sky-blue/20">
        <TmapMap
          center={mapCenter}
          locationLabel={routeTitle}
          markers={mapMarkers}
          zoom={mapZoom}
        />
      </div>

      <div
        ref={sheetRef}
        id="route-details-sheet"
        style={{ transform: sheetTransform }}
        className={cn(
          'absolute inset-x-0 bottom-[88px] z-10 flex h-[62%] min-h-[340px] max-h-[520px] flex-col overflow-hidden rounded-t-[24px] bg-card-surface shadow-xl will-change-transform',
          dragOffset === null && 'transition-transform duration-300 ease-out'
        )}
      >
        <button
          type="button"
          className="flex h-8 w-full shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          onClick={() => {
            if (didDragRef.current) {
              didDragRef.current = false
              return
            }
            setBottomExpanded((expanded) => !expanded)
          }}
          onPointerDown={startSheetDrag}
          onPointerMove={moveSheet}
          onPointerUp={finishSheetDrag}
          onPointerCancel={cancelSheetDrag}
          aria-controls="route-details-sheet-content"
          aria-expanded={bottomExpanded}
          aria-label={bottomExpanded ? '추천 코스 상세 접기' : '추천 코스 상세 펼치기'}
        >
          <div className="h-1 w-10 rounded-full bg-border" />
        </button>

        <div
          id="route-details-sheet-content"
          className="isolate min-h-0 flex-1 overflow-y-auto rounded-t-[24px] bg-card-surface no-scrollbar"
        >
          <div className="space-y-2 px-4 pb-3 pt-1">
            <div
              role="status"
              className="rounded-xl border border-sage-green/30 bg-sage-green-light px-3 py-2 text-[11px] font-medium text-deep-brown"
            >
              POST /courses에서 생성된 실제 추천 코스입니다.
            </div>
            <div className="rounded-xl border border-soft-orange/30 bg-soft-orange/10 px-3 py-2 text-[11px] leading-relaxed text-deep-brown">
              현재 API는 출발 위치 주변 장소만 추천합니다. 선택한 도착지, 거점 수, 여행
              시간과 지도 경로선은 아직 API에 포함되지 않습니다.
            </div>
          </div>

          <div className="px-4 pb-2">
            <h4 className="mb-2 text-[13px] font-semibold text-warm-gray">
              추천 방문 장소
            </h4>
            <ol className="flex flex-col gap-2">
              {course.places.map((place) => (
                <li
                  key={place.id}
                  className="flex items-center gap-3 rounded-xl bg-muted/60 p-3"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-soft-orange text-[12px] font-bold text-white">
                    {place.visitOrder}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-deep-brown">
                      {place.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-warm-gray">
                      방문 순서 {place.visitOrder}
                    </p>
                  </div>
                  {place.isFinal && (
                    <span className="rounded-full bg-sage-green-light px-2 py-1 text-[10px] font-semibold text-sage-green">
                      마지막 장소
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <div className="px-4 pb-8 pt-2">
            <Button
              onClick={onStartTrip}
              disabled={course.places.length === 0}
              fullWidth
              size="lg"
            >
              이 코스로 여행 시작
            </Button>
          </div>
        </div>
      </div>

      <div
        data-testid="route-summary-dock"
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 h-[88px] bg-card-surface px-4 pb-1 pt-3',
          bottomExpanded ? 'rounded-t-none shadow-none' : 'rounded-t-[24px] shadow-xl'
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="line-clamp-2 min-w-0 text-[19px] font-bold leading-tight text-deep-brown">
            {routeTitle}
          </h3>
          <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-sage-green-light px-2.5 py-1 text-[12px] font-semibold text-sage-green">
            <CheckCircle2 className="h-3.5 w-3.5" /> 추천 완료
          </span>
        </div>
        <div data-testid="route-summary-stats" className="flex items-center gap-4">
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
      </div>
    </div>
  )
}
