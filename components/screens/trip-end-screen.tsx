'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import {
  BookOpen,
  Camera,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Loader2,
  Share2,
  Star,
} from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { InteractiveCard } from '@/components/ui/interactive-card'
import { ModalActions } from '@/components/ui/modal-actions'
import type { RecommendedCourse } from '@/features/map/types/course'
import type { TravelNoteDraft } from '@/features/travel/stores/travel-store'
import { formatPetName } from '@/lib/format-pet-name'

interface TripEndScreenProps {
  course?: RecommendedCourse | null
  petName?: string | null
  noteDrafts?: TravelNoteDraft[]
  initialReview?: string
  onReviewChange?: (review: string) => void
  onSave: (review: string) => void | Promise<void>
  onShare?: (review: string) => void
}

const defaultWaypoints = [
  { id: 'default-1', name: '성수 펫 카페', note: '골든이가 물그릇을 정말 좋아했어요! 직원분들이 너무 친절했습니다.', rating: 5, image: '/images/place-cafe.png' },
  { id: 'default-2', name: '서울숲 공원', note: '넓은 잔디밭에서 맘껏 뛰어놀았어요. 다음에 또 와야겠다!', rating: 5, image: '/images/place-park.png' },
  { id: 'default-3', name: '한강 펫 레스토랑', note: '뷰가 정말 예뻤어요. 음식도 맛있고 반려견 메뉴도 있었어요.', rating: 4, image: '/images/place-restaurant.png' },
]

function formatTravelDate(value: string | undefined) {
  if (!value) return '여행 날짜 미정'
  const [year, month, day] = value.split('-')
  return year && month && day ? `${year}.${month}.${day}` : value
}

export default function TripEndScreen({
  course,
  petName,
  noteDrafts = [],
  initialReview = '',
  onReviewChange,
  onSave,
  onShare,
}: TripEndScreenProps) {
  const [review, setReview] = useState(initialReview)
  const [expandedNotes, setExpandedNotes] = useState<number[]>([0])
  const [showSNSModal, setShowSNSModal] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const waypoints = useMemo(() => {
    if (!course) return defaultWaypoints
    return [...course.places]
      .sort((first, second) => first.visitOrder - second.visitOrder)
      .map((place) => {
        const draft = noteDrafts.find((item) => item.waypointId === place.id)
        return {
          id: place.id,
          name: place.name,
          note: draft?.content ?? '',
          rating: draft?.rating ?? 0,
          image: draft?.photos?.[0]?.downloadUrl ?? place.imageUrl ?? '/placeholder.jpg',
        }
      })
  }, [course, noteDrafts])

  const photoCount = noteDrafts.reduce((count, draft) => count + (draft.photos?.length ?? 0), 0)
  const coverImage =
    noteDrafts.find((draft) => (draft.photos?.length ?? 0) > 0)?.photos?.[0]?.downloadUrl ??
    course?.places.find((place) => place.imageUrl)?.imageUrl ??
    '/images/album-cover.png'
  const companionName = formatPetName(petName)
  const tripTitle = course
    ? `${companionName}와의 ${course.endLocation} 여행`
    : '골든이와의 서울 성수 여행'

  const toggleNote = (index: number) => {
    setExpandedNotes((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index]
    )
  }

  const handleSave = async () => {
    if (!review.trim() || saveStatus === 'saving') return
    setSaveStatus('saving')
    setSaveError(null)
    try {
      await onSave(review.trim())
    } catch (error: unknown) {
      setSaveStatus('error')
      setSaveError(error instanceof Error ? error.message : '앨범을 저장하지 못했어요. 다시 시도해주세요.')
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar title="여행 종료" />

      <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
        <div className="mx-4 mt-4 rounded-card bg-sage-green p-5 text-center text-white">
          <p className="mb-1 text-[13px] text-white/80">여행 완료!</p>
          <h2 className="text-balance text-[20px] font-bold leading-snug">{tripTitle}</h2>
          <p className="mt-1 text-[12px] text-white/70">{formatTravelDate(course?.travelDate)}</p>
          <div className="mt-4 flex justify-center gap-8">
            <div className="text-center">
              <p className="text-[22px] font-bold">{waypoints.length}</p>
              <p className="text-[11px] text-white/70">장소 방문</p>
            </div>
            <div className="w-px bg-white/30" />
            <div className="text-center">
              <p className="text-[22px] font-bold">{photoCount}</p>
              <p className="text-[11px] text-white/70">사진 저장</p>
            </div>
          </div>
        </div>

        <div className="mx-4 mt-3 flex items-center gap-3 rounded-card border border-border bg-card-surface p-3">
          <div className="relative size-12 overflow-hidden rounded-full border-2 border-sage-green/30">
            <Image src="/images/dog-hero.png" alt={companionName} fill className="object-cover" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-deep-brown">{companionName}와 함께한 여행</p>
            <p className="text-[12px] text-warm-gray">사진과 장소별 후기를 확인해주세요.</p>
          </div>
        </div>

        <div className="mx-4 mt-4">
          <p className="mb-2 text-[14px] font-semibold text-deep-brown">앨범 대표 사진</p>
          <div className="relative h-44 overflow-hidden rounded-card border border-border bg-muted">
            <Image src={coverImage} alt="앨범 대표 사진" fill className="object-cover" />
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-white backdrop-blur-sm">
              <Camera className="size-3.5" />
              <span className="text-[11px] font-semibold">{photoCount}장</span>
            </div>
          </div>
        </div>

        <div className="mx-4 mt-4">
          <p className="mb-3 text-[14px] font-semibold text-deep-brown">거점별 여행 노트</p>
          <div className="flex flex-col gap-2">
            {waypoints.map((waypoint, index) => (
              <div key={waypoint.id} className="isolate overflow-hidden rounded-card border border-border bg-card-surface">
                <InteractiveCard
                  id={`waypoint-note-trigger-${index}`}
                  type="button"
                  aria-expanded={expandedNotes.includes(index)}
                  aria-controls={`waypoint-note-panel-${index}`}
                  variant="plain"
                  padding="sm"
                  className="relative z-10 flex min-h-[68px] items-center gap-3 rounded-none bg-card-surface"
                  onClick={() => toggleNote(index)}
                >
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-xl">
                    <Image src={waypoint.image} alt={waypoint.name} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-deep-brown">{waypoint.name}</p>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Star
                          key={starIndex}
                          className={starIndex < waypoint.rating ? 'size-3 fill-soft-orange text-soft-orange' : 'size-3 text-border'}
                        />
                      ))}
                    </div>
                  </div>
                  {expandedNotes.includes(index) ? <ChevronUp className="size-4 shrink-0 text-warm-gray" /> : <ChevronDown className="size-4 shrink-0 text-warm-gray" />}
                </InteractiveCard>
                {expandedNotes.includes(index) && (
                  <div
                    id={`waypoint-note-panel-${index}`}
                    role="region"
                    aria-labelledby={`waypoint-note-trigger-${index}`}
                    className="relative z-0 bg-card-surface px-4 py-3"
                  >
                    <p className="break-words text-[13px] leading-relaxed text-warm-gray">{waypoint.note || '작성한 장소 후기가 없어요.'}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-4 mt-4">
          <p className="mb-2 text-[14px] font-semibold text-deep-brown">전체 후기 작성</p>
          <Textarea
            value={review}
            onChange={(event) => {
              setReview(event.target.value)
              onReviewChange?.(event.target.value)
            }}
            placeholder="오늘 여행을 어떠셨나요? 소중한 기억을 기록해보세요..."
            rows={4}
            className="px-3 py-2.5"
          />
          <p className="mt-1 text-[11px] leading-relaxed text-warm-gray">전체 후기는 게시판에 공유할 때 코스와 함께 저장됩니다.</p>
        </div>

        {saveError && <p className="mx-4 mt-3 text-[12px] leading-relaxed text-danger" role="alert">{saveError}</p>}

        <div className="mx-4 mt-4 flex flex-col gap-2">
          <Button onClick={() => void handleSave()} disabled={!review.trim() || saveStatus === 'saving'} fullWidth size="lg">
            {saveStatus === 'saving' ? <Loader2 className="size-4 animate-spin" /> : <BookOpen className="size-4" />}
            {saveStatus === 'saving' ? '앨범 저장 중' : '앨범에 저장하기'}
          </Button>
          <ModalActions>
            <Button onClick={() => onShare?.(review.trim())} disabled={!review.trim() || saveStatus === 'saving'} variant="outline">
              <Share2 className="size-4 text-sage-green" /> 게시판 공유
            </Button>
            <Button onClick={() => setShowSNSModal(true)} variant="outline">
              <ImageIcon className="size-4 text-soft-orange" /> SNS 카드 생성
            </Button>
          </ModalActions>
        </div>
      </div>

      {showSNSModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSNSModal(false)} />
          <div className="relative w-full rounded-card bg-card-surface p-5 shadow-2xl">
            <h3 className="mb-4 text-center text-[16px] font-bold text-deep-brown">SNS 코스 카드</h3>
            <div className="relative mx-auto aspect-[9/16] max-h-72 overflow-hidden rounded-card bg-sage-green">
              <Image src={coverImage} alt="여행 대표사진" fill className="object-cover opacity-70" />
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                  <p className="text-[11px] text-white/80">{formatTravelDate(course?.travelDate)}</p>
                  <p className="text-[15px] font-bold leading-snug text-white">{tripTitle}</p>
                  <p className="mt-1 text-[11px] text-white/80">{waypoints.length}곳 방문 · 사진 {photoCount}장</p>
                </div>
              </div>
            </div>
            <ModalActions className="mt-4">
              <Button onClick={() => setShowSNSModal(false)} variant="outline">닫기</Button>
              <Button>저장하기</Button>
            </ModalActions>
          </div>
        </div>
      )}
    </div>
  )
}
