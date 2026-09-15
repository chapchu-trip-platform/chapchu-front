'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AlertTriangle,
  Clock3,
  Loader2,
  MapPin,
} from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { ModalActions } from '@/components/ui/modal-actions'
import MapFlowBottomDock from '@/features/map/components/map-flow-bottom-dock'
import MapFlowDetailSheet from '@/features/map/components/map-flow-detail-sheet'
import TmapMap, { type TmapMapMarker } from '@/features/map/components/tmap-map'
import type { PedestrianRouteCoordinate } from '@/features/map/api/walking-time-api'
import type { RecommendedCourse } from '@/features/map/types/course'
import { useLocationStore } from '@/features/location/stores/location-store'
import { visitCoursePlace } from '@/features/travel/api/course-place-visit-api'
import {
  completeCourse,
  getCourseCompletionErrorMessage,
} from '@/features/travel/api/course-completion-api'
import TravelCoursePlaceCard, {
  type TravelReviewDraft,
} from '@/features/travel/components/travel-course-place-card'
import {
  getTravelPhotoErrorMessage,
  uploadCoursePlacePhotos,
} from '@/features/travel/api/travel-photos-api'
import { useTravelStore } from '@/features/travel/stores/travel-store'
import { formatPetName } from '@/lib/format-pet-name'

// Temporary QA mode: the backend receives the destination coordinates so a
// tester can check in without physically moving within the 500m boundary.
const TEMPORARILY_ALLOW_REMOTE_CHECK_IN = process.env.NODE_ENV !== 'production'

interface TravelProgressScreenProps {
  course: RecommendedCourse
  petName: string | null
  onEndTrip: () => void
  onAbort: () => void
  routePath?: PedestrianRouteCoordinate[]
}

interface AbortConfirmSheetProps {
  error: string | null
  isCompleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

function AbortConfirmSheet({
  error,
  isCompleting,
  onCancel,
  onConfirm,
}: AbortConfirmSheetProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={isCompleting ? undefined : onCancel}
      />
      <div className="relative w-full rounded-card bg-card-surface p-6 shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
          <AlertTriangle className="h-6 w-6 text-danger" />
        </div>
        <h3 className="mb-2 text-center text-[17px] font-bold text-deep-brown">여행을 중도 종료할까요?</h3>
        <p className="mb-6 text-center text-[13px] leading-relaxed text-warm-gray">지금까지 저장된 노트와 사진은 앨범에 임시저장됩니다.</p>
        {error && (
          <p className="mb-4 text-center text-[12px] leading-relaxed text-danger" role="alert">
            {error}
          </p>
        )}
        <ModalActions>
          <Button disabled={isCompleting} onClick={onCancel} variant="outline">계속 여행</Button>
          <Button disabled={isCompleting} onClick={onConfirm} variant="destructive">
            {isCompleting ? <><Loader2 className="animate-spin" /> 완료 처리 중</> : '중도 종료'}
          </Button>
        </ModalActions>
      </div>
    </div>
  )
}

function VisitFailureDialog({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/45 px-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="visit-failure-title"
        aria-describedby="visit-failure-description"
        className="w-full rounded-card border border-border bg-card-surface p-5 shadow-xl"
      >
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-danger/10">
          <AlertTriangle aria-hidden="true" className="size-5 text-danger" />
        </div>
        <h2 id="visit-failure-title" className="text-center text-[17px] font-bold text-deep-brown">
          방문 인증에 실패했어요
        </h2>
        <p id="visit-failure-description" className="mt-2 text-center text-[13px] leading-relaxed text-warm-gray">
          {message}
        </p>
        <Button autoFocus onClick={onClose} fullWidth className="mt-5">
          확인
        </Button>
      </div>
    </div>
  )
}

function distanceInMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) {
  const earthRadiusMeters = 6_371_000
  const latDelta = ((to.latitude - from.latitude) * Math.PI) / 180
  const lngDelta = ((to.longitude - from.longitude) * Math.PI) / 180
  const fromLat = (from.latitude * Math.PI) / 180
  const toLat = (to.latitude * Math.PI) / 180
  const a = Math.sin(latDelta / 2) ** 2 + Math.sin(lngDelta / 2) ** 2 * Math.cos(fromLat) * Math.cos(toLat)
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(distance: number | null) {
  if (distance === null) return '계산 중'
  if (distance < 1000) return `${Math.max(1, Math.round(distance))}m`
  return `${(distance / 1000).toFixed(1)}km`
}

function formatLocationTime(capturedAt: string | undefined) {
  if (!capturedAt) return '위치 확인 중'
  const date = new Date(capturedAt)
  if (Number.isNaN(date.getTime())) return '위치 확인 중'
  return `업데이트 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
}

function getVisitErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return '방문 기록을 저장하지 못했어요. 다시 시도해주세요.'
  const normalized = error as { status?: unknown; type?: unknown }
  if (normalized.status === 400 || normalized.status === 422) return '장소에서 500m 이내인지 확인한 뒤 다시 시도해주세요.'
  if (normalized.status === 401) return '로그인이 만료되었습니다. 다시 로그인해주세요.'
  if (normalized.type === 'network') return '네트워크 연결을 확인하고 다시 시도해주세요.'
  if (normalized.type === 'timeout') return '방문 기록 시간이 초과되었습니다. 다시 시도해주세요.'
  return '방문 기록을 저장하지 못했어요. 다시 시도해주세요.'
}

export default function TravelProgressScreen({
  course,
  petName,
  onEndTrip,
  onAbort,
  routePath = [],
}: TravelProgressScreenProps) {
  const [showAbortConfirm, setShowAbortConfirm] = useState(false)
  const [bottomExpanded, setBottomExpanded] = useState(false)
  const [expandedPlaceIds, setExpandedPlaceIds] = useState<string[]>([])
  const [photoStatuses, setPhotoStatuses] = useState<
    Record<string, { status: 'idle' | 'loading' | 'success' | 'error'; error: string | null }>
  >({})
  const [visitedPlaceIds, setVisitedPlaceIds] = useState<string[]>([])
  const [checkInStatus, setCheckInStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [checkInError, setCheckInError] = useState<string | null>(null)
  const [courseCompletionStatus, setCourseCompletionStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [courseCompletionError, setCourseCompletionError] = useState<string | null>(null)
  const checkInControllerRef = useRef<AbortController | null>(null)
  const completionControllerRef = useRef<AbortController | null>(null)
  const photoControllersRef = useRef(new Map<string, AbortController>())
  const position = useLocationStore((state) => state.position)
  const refreshLocation = useLocationStore((state) => state.refreshLocation)
  const cancelLocationRequest = useLocationStore((state) => state.cancelLocationRequest)
  const noteDrafts = useTravelStore((state) => state.noteDrafts)
  const beginTravelDrafts = useTravelStore((state) => state.beginTravelDrafts)
  const hydrateTravelDrafts = useTravelStore((state) => state.hydrateTravelDrafts)
  const upsertNoteDraft = useTravelStore((state) => state.upsertNoteDraft)

  const places = useMemo(() => [...course.places].sort((left, right) => left.visitOrder - right.visitOrder), [course.places])
  const visitedPlaceIdSet = useMemo(() => new Set(visitedPlaceIds), [visitedPlaceIds])
  const nextPlace = places.find((place) => !visitedPlaceIdSet.has(place.id)) ?? null
  const visitedCount = places.filter((place) => visitedPlaceIdSet.has(place.id)).length
  const progress = places.length === 0 ? 0 : (visitedCount / places.length) * 100
  const distanceToNext = position && nextPlace ? distanceInMeters(position, nextPlace) : null
  const mapCenter = position
    ? { lat: position.latitude, lng: position.longitude }
    : nextPlace
      ? { lat: nextPlace.latitude, lng: nextPlace.longitude }
      : undefined
  const mapMarkers = useMemo<TmapMapMarker[]>(
    () => [
      ...places.map((place) => ({
        id: `course-place-${place.id}`,
        position: { lat: place.latitude, lng: place.longitude },
        title: `${place.visitOrder}번 방문지: ${place.name}${visitedPlaceIdSet.has(place.id) ? ' (방문 완료)' : ''}`,
        label: place.isFinal ? '도착' : String(place.visitOrder),
        variant: place.isFinal ? 'destination' as const : 'candidate' as const,
      })),
      ...(position ? [{ id: 'current-position', position: { lat: position.latitude, lng: position.longitude }, title: '현재 위치', variant: 'current' as const }] : []),
    ],
    [places, position, visitedPlaceIdSet]
  )
  const routeTitle = `${course.startLocation} → ${course.endLocation}`
  const displayPetName = formatPetName(petName)

  useEffect(() => {
    hydrateTravelDrafts(course.id)
    beginTravelDrafts(course.id)
    const photoControllers = photoControllersRef.current
    void refreshLocation()
    const refreshTimer = window.setInterval(() => void refreshLocation(), 15_000)
    return () => {
      window.clearInterval(refreshTimer)
      checkInControllerRef.current?.abort()
      completionControllerRef.current?.abort()
      photoControllers.forEach((controller) => controller.abort())
      photoControllers.clear()
      cancelLocationRequest()
    }
  }, [beginTravelDrafts, cancelLocationRequest, course.id, hydrateTravelDrafts, refreshLocation])

  const handleCheckIn = async () => {
    if (!nextPlace || checkInStatus === 'loading') return
    const checkInPosition = TEMPORARILY_ALLOW_REMOTE_CHECK_IN
      ? { latitude: nextPlace.latitude, longitude: nextPlace.longitude }
      : position
    if (!checkInPosition) return
    const controller = new AbortController()
    checkInControllerRef.current?.abort()
    checkInControllerRef.current = controller
    setCheckInStatus('loading')
    setCheckInError(null)
    try {
      await visitCoursePlace(nextPlace.id, checkInPosition, controller.signal)
      if (controller.signal.aborted) return
      setVisitedPlaceIds((current) => current.includes(nextPlace.id) ? current : [...current, nextPlace.id])
      setCheckInStatus('success')
    } catch (error: unknown) {
      if (controller.signal.aborted) return
      setCheckInStatus('error')
      setCheckInError(getVisitErrorMessage(error))
    } finally {
      if (checkInControllerRef.current === controller) checkInControllerRef.current = null
    }
  }

  const handleAbort = async () => {
    if (courseCompletionStatus === 'loading') return
    checkInControllerRef.current?.abort()
    completionControllerRef.current?.abort()
    const controller = new AbortController()
    completionControllerRef.current = controller
    setCourseCompletionStatus('loading')
    setCourseCompletionError(null)

    try {
      await completeCourse(course.id, controller.signal)
      if (controller.signal.aborted) return
      setShowAbortConfirm(false)
      setCourseCompletionStatus('idle')
      onAbort()
    } catch (error: unknown) {
      if (controller.signal.aborted) return
      setCourseCompletionStatus('error')
      setCourseCompletionError(getCourseCompletionErrorMessage(error))
    } finally {
      if (completionControllerRef.current === controller) {
        completionControllerRef.current = null
      }
    }
  }

  const togglePlaceDetails = (placeId: string) => {
    setExpandedPlaceIds((current) =>
      current.includes(placeId)
        ? current.filter((id) => id !== placeId)
        : [...current, placeId]
    )
  }

  const updateReviewDraft = (
    placeId: string,
    update: Partial<Pick<TravelReviewDraft, 'note' | 'rating'>>
  ) => {
    const place = places.find((item) => item.id === placeId)
    const current = noteDrafts.find((draft) => draft.waypointId === placeId)
    upsertNoteDraft({
      waypointId: placeId,
      externalPlaceId: place?.externalPlaceId,
      content: update.note ?? current?.content ?? '',
      rating: update.rating ?? current?.rating ?? 0,
      photos: current?.photos ?? [],
      photoUrls: current?.photoUrls ?? [],
      saved: false,
      ...(current?.reviewId ? { reviewId: current.reviewId } : {}),
    })
  }

  const saveReviewDraft = (placeId: string) => {
    const place = places.find((item) => item.id === placeId)
    const current = noteDrafts.find((draft) => draft.waypointId === placeId)
    upsertNoteDraft({
      waypointId: placeId,
      externalPlaceId: place?.externalPlaceId,
      content: current?.content ?? '',
      rating: current?.rating ?? 0,
      photos: current?.photos ?? [],
      photoUrls: current?.photoUrls ?? [],
      saved: true,
      ...(current?.reviewId ? { reviewId: current.reviewId } : {}),
    })
  }

  const savePhotos = async (placeId: string, files: File[]) => {
    const place = places.find((item) => item.id === placeId)
    if (!place) return
    const currentDraft = useTravelStore
      .getState()
      .noteDrafts.find((draft) => draft.waypointId === placeId)
    const selectedFiles = files.slice(0, 10 - (currentDraft?.photos?.length ?? 0))
    if (selectedFiles.length === 0) return

    photoControllersRef.current.get(placeId)?.abort()
    const controller = new AbortController()
    photoControllersRef.current.set(placeId, controller)
    setPhotoStatuses((current) => ({
      ...current,
      [placeId]: { status: 'loading', error: null },
    }))

    try {
      const photos = await uploadCoursePlacePhotos(placeId, selectedFiles, controller.signal)
      if (controller.signal.aborted) return
      const latestDraft = useTravelStore
        .getState()
        .noteDrafts.find((draft) => draft.waypointId === placeId)
      const nextPhotos = [...(latestDraft?.photos ?? []), ...photos]
      upsertNoteDraft({
        waypointId: placeId,
        externalPlaceId: place.externalPlaceId,
        content: latestDraft?.content ?? '',
        rating: latestDraft?.rating ?? 0,
        photos: nextPhotos,
        photoUrls: nextPhotos.map((photo) => photo.downloadUrl),
        saved: latestDraft?.saved ?? false,
        ...(latestDraft?.reviewId ? { reviewId: latestDraft.reviewId } : {}),
      })
      setPhotoStatuses((current) => ({
        ...current,
        [placeId]: { status: 'success', error: null },
      }))
    } catch (error: unknown) {
      if (controller.signal.aborted) return
      setPhotoStatuses((current) => ({
        ...current,
        [placeId]: { status: 'error', error: getTravelPhotoErrorMessage(error) },
      }))
    } finally {
      if (photoControllersRef.current.get(placeId) === controller) {
        photoControllersRef.current.delete(placeId)
      }
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar
        title="여행 진행"
        rightAction={
          <span className="flex size-8 items-center justify-center" aria-label="여행 진행 중">
            <span className="size-2.5 animate-pulse rounded-full bg-sage-green" />
          </span>
        }
      />

      <div className="relative z-0 flex-1 overflow-hidden bg-sky-blue/20">
        <TmapMap
          center={mapCenter}
          locationLabel={position ? '현재 위치' : course.endLocation}
          markers={mapMarkers}
          routePath={routePath}
          zoom={14}
        />
      </div>

      <MapFlowDetailSheet
        id="travel-details-sheet"
        expanded={bottomExpanded}
        onExpandedChange={setBottomExpanded}
        expandLabel="여행 진행 상세 펼치기"
        collapseLabel="여행 진행 상세 접기"
        contentClassName="mobile-scroll px-4 pb-6"
      >
        <section className="mb-4">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-sage-green">여행 현황</p>
              <h2 className="mt-0.5 text-[17px] font-bold text-deep-brown">
                {displayPetName}와 여행 중
              </h2>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-[12px] text-warm-gray">
              <Clock3 className="h-3.5 w-3.5" />
              {formatLocationTime(position?.capturedAt)}
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-sage-green transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-warm-gray">
            <span>진행률 {Math.round(progress)}%</span>
            <span>{visitedCount}/{places.length}곳 방문</span>
          </div>
        </section>

        <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-warm-gray">여행 코스</h3>
              <span className="text-[11px] text-warm-gray">장소를 눌러 후기를 작성해요</span>
            </div>
            <ol className="space-y-2">
              {places.map((place) => {
                const visited = visitedPlaceIdSet.has(place.id)
                const current = nextPlace?.id === place.id
                const expanded = expandedPlaceIds.includes(place.id)
                const cachedDraft = noteDrafts.find((draft) => draft.waypointId === place.id)
                const reviewDraft: TravelReviewDraft = {
                  note: cachedDraft?.content ?? '',
                  rating: cachedDraft?.rating ?? 0,
                  saved: cachedDraft?.saved ?? false,
                }
                const photoStatus = photoStatuses[place.id] ?? {
                  status: 'idle' as const,
                  error: null,
                }

                return (
                  <li key={place.id}>
                    <TravelCoursePlaceCard
                      place={place}
                      visited={visited}
                      current={current}
                      distanceLabel={formatDistance(distanceToNext)}
                      expanded={expanded}
                      reviewDraft={reviewDraft}
                      photos={cachedDraft?.photos ?? []}
                      photoError={photoStatus.error}
                      photoStatus={photoStatus.status}
                      onToggle={() => togglePlaceDetails(place.id)}
                      onReviewChange={(update) => updateReviewDraft(place.id, update)}
                      onPhotosSelected={(files) => void savePhotos(place.id, files)}
                      onSaveReview={() => saveReviewDraft(place.id)}
                    />
                  </li>
                )
              })}
            </ol>
        </section>

        <section className="mt-4 flex items-center gap-3 rounded-xl border border-danger/20 bg-danger/5 p-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
              <AlertTriangle className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-deep-brown">여행을 그만 진행할까요?</p>
              <p className="mt-0.5 text-[10px] text-warm-gray">작성한 후기는 임시로 보관됩니다.</p>
            </div>
          <Button
            onClick={() => setShowAbortConfirm(true)}
            variant="outline"
            size="sm"
            className="border-danger/30 text-danger"
          >
            중도 종료
          </Button>
        </section>
      </MapFlowDetailSheet>

      <MapFlowBottomDock expanded={bottomExpanded} testId="travel-progress-dock">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[15px] font-bold text-deep-brown">
            {routeTitle}
          </p>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-sage-green-light px-3 py-1 text-[13px] font-semibold text-sage-green">
            <span className="size-2 animate-pulse rounded-full bg-sage-green" />
            진행 중
          </span>
        </div>
        <div data-testid="travel-progress-stats" className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <MapPin className="size-4 text-warm-gray" />
            <span className="whitespace-nowrap text-[12px] text-warm-gray">
              방문 {visitedCount}/{places.length}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-1">
            <Clock3 className="size-4 shrink-0 text-warm-gray" />
            <span className="truncate text-[12px] text-warm-gray">
              {nextPlace ? `다음 장소까지 ${formatDistance(distanceToNext)}` : '모든 장소 방문 완료'}
            </span>
          </div>
        </div>
        <Button
          onClick={nextPlace ? () => void handleCheckIn() : onEndTrip}
          disabled={Boolean(nextPlace) && checkInStatus === 'loading'}
          size="lg"
          className="map-flow-dock-button"
        >
          {checkInStatus === 'loading' ? (
            <><Loader2 className="animate-spin" /> 방문 기록 중</>
          ) : nextPlace ? (
            <><MapPin /> {nextPlace.name} 방문 체크인</>
          ) : (
            '여행 완료'
          )}
        </Button>
      </MapFlowBottomDock>

      {showAbortConfirm && (
        <AbortConfirmSheet
          error={courseCompletionError}
          isCompleting={courseCompletionStatus === 'loading'}
          onCancel={() => {
            setCourseCompletionError(null)
            setCourseCompletionStatus('idle')
            setShowAbortConfirm(false)
          }}
          onConfirm={() => void handleAbort()}
        />
      )}
      {checkInError && (
        <VisitFailureDialog
          message={checkInError}
          onClose={() => {
            setCheckInError(null)
            setCheckInStatus('idle')
          }}
        />
      )}
    </div>
  )
}
