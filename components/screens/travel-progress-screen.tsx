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
import {
  deleteCourse,
  getCourseDeletionErrorMessage,
} from '@/features/travel/api/course-deletion-api'
import TravelCoursePlaceCard, {
  type TravelReviewDraft,
} from '@/features/travel/components/travel-course-place-card'
import {
  getTravelPhotoErrorMessage,
  isSupportedTravelImage,
  uploadCoursePlacePhotoBatch,
} from '@/features/travel/api/travel-photos-api'
import {
  useTravelStore,
  type TravelDraftPhoto,
} from '@/features/travel/stores/travel-store'
import { formatPetName } from '@/lib/format-pet-name'
import { hideTravelPhoto } from '@/features/travel/lib/hidden-travel-photos'

interface TravelProgressScreenProps {
  course: RecommendedCourse
  petName: string | null
  onEndTrip: () => void
  onAbort: () => void
  onLeave?: () => void
  routePath?: PedestrianRouteCoordinate[]
}

interface PendingTravelPhoto extends TravelDraftPhoto {
  file: File
}

interface AbortConfirmSheetProps {
  error: string | null
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

function AbortConfirmSheet({
  error,
  isDeleting,
  onCancel,
  onConfirm,
}: AbortConfirmSheetProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={isDeleting ? undefined : onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="abort-trip-title"
        aria-describedby="abort-trip-description"
        className="relative w-full rounded-card bg-card-surface p-6 shadow-2xl"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
          <AlertTriangle className="h-6 w-6 text-danger" />
        </div>
        <h3 id="abort-trip-title" className="mb-2 text-center text-[17px] font-bold text-deep-brown">여행을 중도 종료할까요?</h3>
        <p id="abort-trip-description" className="mb-6 text-center text-[13px] leading-relaxed text-warm-gray">중도 종료하면 이 코스와 작성 중인 후기, 임시 사진이 모두 삭제됩니다.</p>
        {error && (
          <p className="mb-4 text-center text-[12px] leading-relaxed text-danger" role="alert">
            {error}
          </p>
        )}
        <ModalActions>
          <Button disabled={isDeleting} onClick={onCancel} variant="outline">계속 여행</Button>
          <Button disabled={isDeleting} onClick={onConfirm} variant="destructive">
            {isDeleting ? <><Loader2 className="animate-spin" /> 코스 삭제 중</> : '중도 종료'}
          </Button>
        </ModalActions>
      </div>
    </div>
  )
}

function LeaveProgressSheet({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-progress-title"
        aria-describedby="leave-progress-description"
        className="relative w-full rounded-card bg-card-surface p-6 shadow-2xl"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sage-green-light">
          <MapPin aria-hidden="true" className="h-6 w-6 text-sage-green" />
        </div>
        <h3 id="leave-progress-title" className="mb-2 text-center text-[17px] font-bold text-deep-brown">
          홈으로 이동할까요?
        </h3>
        <p id="leave-progress-description" className="mb-6 text-center text-[13px] leading-relaxed text-warm-gray">
          뒤로 가도 여행은 종료되지 않아요. 지도 페이지를 다시 열면 이어서 진행할 수 있어요. 아직 전송하지 않은 임시 사진은 사라집니다.
        </p>
        <ModalActions>
          <Button autoFocus onClick={onCancel} variant="outline">계속 여행</Button>
          <Button onClick={onConfirm}>홈으로 이동</Button>
        </ModalActions>
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

export default function TravelProgressScreen({
  course,
  petName,
  onEndTrip,
  onAbort,
  onLeave,
  routePath = [],
}: TravelProgressScreenProps) {
  const [showAbortConfirm, setShowAbortConfirm] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [bottomExpanded, setBottomExpanded] = useState(false)
  const [expandedPlaceIds, setExpandedPlaceIds] = useState<string[]>([])
  const [photoStatuses, setPhotoStatuses] = useState<
    Record<string, { status: 'idle' | 'loading' | 'success' | 'error'; error: string | null }>
  >({})
  const [pendingPhotosByPlace, setPendingPhotosByPlace] = useState<
    Record<string, PendingTravelPhoto[]>
  >({})
  const [finalPhotoUploadStatus, setFinalPhotoUploadStatus] = useState<
    'idle' | 'loading' | 'error'
  >('idle')
  const [courseDeletionStatus, setCourseDeletionStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [courseDeletionError, setCourseDeletionError] = useState<string | null>(null)
  const deletionControllerRef = useRef<AbortController | null>(null)
  const photoUploadControllerRef = useRef<AbortController | null>(null)
  const pendingPhotosRef = useRef<Record<string, PendingTravelPhoto[]>>({})
  const position = useLocationStore((state) => state.position)
  const refreshLocation = useLocationStore((state) => state.refreshLocation)
  const cancelLocationRequest = useLocationStore((state) => state.cancelLocationRequest)
  const noteDrafts = useTravelStore((state) => state.noteDrafts)
  const visitedPlaceIds = useTravelStore((state) => state.visitedPlaceIds)
  const beginTravelDrafts = useTravelStore((state) => state.beginTravelDrafts)
  const hydrateTravelDrafts = useTravelStore((state) => state.hydrateTravelDrafts)
  const markPlaceVisited = useTravelStore((state) => state.markPlaceVisited)
  const removeDraftPhoto = useTravelStore((state) => state.removeDraftPhoto)
  const upsertNoteDraft = useTravelStore((state) => state.upsertNoteDraft)

  const places = useMemo(() => [...course.places].sort((left, right) => left.visitOrder - right.visitOrder), [course.places])
  const visitedPlaceIdSet = useMemo(() => new Set(visitedPlaceIds), [visitedPlaceIds])
  const nextPlace = places.find(
    (place) => !visitedPlaceIdSet.has(place.id)
  ) ?? null
  const visitedCount = places.filter((place) => visitedPlaceIdSet.has(place.id)).length
  const progress = places.length === 0 ? 0 : (visitedCount / places.length) * 100
  const distanceToNext = position && nextPlace ? distanceInMeters(position, nextPlace) : null
  const distanceToNextLabel = position ? formatDistance(distanceToNext) : '거리 정보 없음'
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
        title: `${place.visitOrder}번 방문지: ${place.name}${
          visitedPlaceIdSet.has(place.id) ? ' (방문 완료)' : ''
        }`,
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
    void refreshLocation()
    const refreshTimer = window.setInterval(() => void refreshLocation(), 15_000)
    return () => {
      window.clearInterval(refreshTimer)
      deletionControllerRef.current?.abort()
      photoUploadControllerRef.current?.abort()
      Object.values(pendingPhotosRef.current).forEach((photos) => {
        photos.forEach((photo) => {
          if (photo.downloadUrl.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
            URL.revokeObjectURL(photo.downloadUrl)
          }
        })
      })
      cancelLocationRequest()
    }
  }, [beginTravelDrafts, cancelLocationRequest, course.id, hydrateTravelDrafts, refreshLocation])

  const handleCheckIn = () => {
    if (!nextPlace) return
    // Visit progress is intentionally client-owned. The store persists the
    // visited place IDs for this course in localStorage for up to 24 hours.
    markPlaceVisited(nextPlace.id)
  }

  const handleAbort = async () => {
    if (courseDeletionStatus === 'loading') return
    deletionControllerRef.current?.abort()
    const controller = new AbortController()
    deletionControllerRef.current = controller
    setCourseDeletionStatus('loading')
    setCourseDeletionError(null)

    try {
      await deleteCourse(course.id, controller.signal)
      if (controller.signal.aborted) return
      setShowAbortConfirm(false)
      setCourseDeletionStatus('idle')
      onAbort()
    } catch (error: unknown) {
      if (controller.signal.aborted) return
      setCourseDeletionStatus('error')
      setCourseDeletionError(getCourseDeletionErrorMessage(error))
    } finally {
      if (deletionControllerRef.current === controller) {
        deletionControllerRef.current = null
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
    if (!visitedPlaceIdSet.has(placeId)) return
    const place = places.find((item) => item.id === placeId)
    const current = noteDrafts.find((draft) => draft.waypointId === placeId)
    upsertNoteDraft({
      waypointId: placeId,
      externalPlaceId: place?.externalPlaceId,
      content: update.note ?? current?.content ?? '',
      rating: update.rating ?? current?.rating ?? 0,
      photos: current?.photos ?? [],
      photoUrls: current?.photoUrls ?? [],
      saved: true,
      ...(current?.reviewId ? { reviewId: current.reviewId } : {}),
    })
  }

  const stagePhotos = (placeId: string, files: File[]) => {
    if (!visitedPlaceIdSet.has(placeId)) return
    const place = places.find((item) => item.id === placeId)
    if (!place) return
    const currentDraft = useTravelStore
      .getState()
      .noteDrafts.find((draft) => draft.waypointId === placeId)
    const currentPendingPhotos = pendingPhotosRef.current[placeId] ?? []
    const selectedFiles = files.slice(
      0,
      10 - (currentDraft?.photos?.length ?? 0) - currentPendingPhotos.length
    )
    if (selectedFiles.length === 0) return
    if (selectedFiles.some((file) => !isSupportedTravelImage(file))) {
      setPhotoStatuses((current) => ({
        ...current,
        [placeId]: {
          status: 'error',
          error: '지원하는 이미지 형식인지 확인해주세요.',
        },
      }))
      return
    }

    const pendingPhotos = selectedFiles.map((file, index): PendingTravelPhoto => ({
      photoId: `pending-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      downloadUrl:
        typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(file)
          : '/images/album-cover.png',
      takenAt: null,
      file,
    }))
    setPendingPhotosByPlace((current) => {
      const next = {
        ...current,
        [placeId]: [...(current[placeId] ?? []), ...pendingPhotos],
      }
      pendingPhotosRef.current = next
      return next
    })
    setPhotoStatuses((current) => ({
      ...current,
      [placeId]: { status: 'success', error: null },
    }))
  }

  const removePhoto = (placeId: string, photoId: string) => {
    const pendingPhoto = pendingPhotosRef.current[placeId]?.find(
      (photo) => photo.photoId === photoId
    )
    if (pendingPhoto) {
      if (
        pendingPhoto.downloadUrl.startsWith('blob:') &&
        typeof URL.revokeObjectURL === 'function'
      ) {
        URL.revokeObjectURL(pendingPhoto.downloadUrl)
      }
      setPendingPhotosByPlace((current) => {
        const next = {
          ...current,
          [placeId]: (current[placeId] ?? []).filter((photo) => photo.photoId !== photoId),
        }
        pendingPhotosRef.current = next
        return next
      })
      setPhotoStatuses((current) => ({
        ...current,
        [placeId]: { status: 'idle', error: null },
      }))
      return
    }

    const photo = useTravelStore
      .getState()
      .noteDrafts.find((draft) => draft.waypointId === placeId)
      ?.photos?.find((item) => item.photoId === photoId)
    if (photo?.downloadUrl.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(photo.downloadUrl)
    }
    hideTravelPhoto(photoId)
    removeDraftPhoto(placeId, photoId)
    setPhotoStatuses((current) => ({
      ...current,
      [placeId]: { status: 'idle', error: null },
    }))
  }

  const handleEndTrip = async () => {
    if (finalPhotoUploadStatus === 'loading' || photoUploadControllerRef.current) return
    const uploads = places.flatMap((place) => {
      const photos = pendingPhotosRef.current[place.id] ?? []
      return photos.length > 0
        ? [{ coursePlaceId: place.id, files: photos.map((photo) => photo.file) }]
        : []
    })
    if (uploads.length === 0) {
      onEndTrip()
      return
    }

    const controller = new AbortController()
    photoUploadControllerRef.current = controller
    setFinalPhotoUploadStatus('loading')
    setPhotoStatuses((current) => ({
      ...current,
      ...Object.fromEntries(
        uploads.map((upload) => [
          upload.coursePlaceId,
          { status: 'loading' as const, error: null },
        ])
      ),
    }))

    try {
      const uploadedGroups = await uploadCoursePlacePhotoBatch(uploads, controller.signal)
      if (controller.signal.aborted) return
      for (const uploaded of uploadedGroups) {
        const place = places.find((item) => item.id === uploaded.coursePlaceId)
        if (!place) continue
        const draft = useTravelStore
          .getState()
          .noteDrafts.find((item) => item.waypointId === uploaded.coursePlaceId)
        const photos = [...(draft?.photos ?? []), ...uploaded.photos]
        upsertNoteDraft({
          waypointId: uploaded.coursePlaceId,
          externalPlaceId: place.externalPlaceId,
          content: draft?.content ?? '',
          rating: draft?.rating ?? 0,
          photos,
          photoUrls: photos.map((photo) => photo.downloadUrl),
          saved: draft?.saved ?? false,
          ...(draft?.reviewId ? { reviewId: draft.reviewId } : {}),
        })
      }
      Object.values(pendingPhotosRef.current).forEach((photos) => {
        photos.forEach((photo) => {
          if (photo.downloadUrl.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
            URL.revokeObjectURL(photo.downloadUrl)
          }
        })
      })
      pendingPhotosRef.current = {}
      setPendingPhotosByPlace({})
      setFinalPhotoUploadStatus('idle')
      onEndTrip()
    } catch (error: unknown) {
      if (controller.signal.aborted) return
      const message = getTravelPhotoErrorMessage(error)
      setFinalPhotoUploadStatus('error')
      setBottomExpanded(true)
      setExpandedPlaceIds((current) => [
        ...new Set([...current, ...uploads.map((upload) => upload.coursePlaceId)]),
      ])
      setPhotoStatuses((current) => ({
        ...current,
        ...Object.fromEntries(
          uploads.map((upload) => [
            upload.coursePlaceId,
            { status: 'error' as const, error: message },
          ])
        ),
      }))
    } finally {
      if (photoUploadControllerRef.current === controller) {
        photoUploadControllerRef.current = null
      }
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar
        showBack
        title="여행 진행"
        onBack={() => setShowLeaveConfirm(true)}
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
          recenterOnCenterChange={false}
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
              {position ? formatLocationTime(position.capturedAt) : '위치 없이 진행 가능'}
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
            <span>방문 {visitedCount}곳 / 전체 {places.length}곳</span>
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
                const photos = [
                  ...(cachedDraft?.photos ?? []),
                  ...(pendingPhotosByPlace[place.id] ?? []),
                ]

                return (
                  <li key={place.id}>
                    <TravelCoursePlaceCard
                      place={place}
                      visited={visited}
                      current={current}
                      distanceLabel={distanceToNextLabel}
                      expanded={expanded}
                      reviewDraft={reviewDraft}
                      reviewEnabled={visited}
                      photos={photos}
                      photoError={photoStatus.error}
                      photoStatus={photoStatus.status}
                      skipped={false}
                      onToggle={() => togglePlaceDetails(place.id)}
                      onReviewChange={(update) => updateReviewDraft(place.id, update)}
                      onPhotosSelected={(files) => stagePhotos(place.id, files)}
                      onRemovePhoto={(photoId) => removePhoto(place.id, photoId)}
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
              <p className="mt-0.5 text-[10px] text-warm-gray">중도 종료하면 현재 코스와 작성 중인 내용이 삭제됩니다.</p>
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
              방문 {visitedCount} / 전체 {places.length}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-1">
            <Clock3 className="size-4 shrink-0 text-warm-gray" />
            <span className="truncate text-[12px] text-warm-gray">
              {nextPlace ? `다음 장소까지 ${distanceToNextLabel}` : '모든 장소 확인 완료'}
            </span>
          </div>
        </div>
        {nextPlace ? (
          <div className="map-flow-dock-actions">
            <Button
              type="button"
              onClick={handleCheckIn}
              size="lg"
              className="map-flow-dock-button min-w-0 flex-1"
            >
              <MapPin /> <span className="truncate">{nextPlace.name} 방문 체크인</span>
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => void handleEndTrip()}
            disabled={finalPhotoUploadStatus === 'loading'}
            size="lg"
            className="map-flow-dock-button"
          >
            {finalPhotoUploadStatus === 'loading' ? (
              <><Loader2 className="animate-spin" /> 사진 저장 중</>
            ) : (
              '여행 완료'
            )}
          </Button>
        )}
      </MapFlowBottomDock>

      {showAbortConfirm && (
        <AbortConfirmSheet
          error={courseDeletionError}
          isDeleting={courseDeletionStatus === 'loading'}
          onCancel={() => {
            setCourseDeletionError(null)
            setCourseDeletionStatus('idle')
            setShowAbortConfirm(false)
          }}
          onConfirm={() => void handleAbort()}
        />
      )}
      {showLeaveConfirm && (
        <LeaveProgressSheet
          onCancel={() => setShowLeaveConfirm(false)}
          onConfirm={() => {
            setShowLeaveConfirm(false)
            onLeave?.()
          }}
        />
      )}
    </div>
  )
}
