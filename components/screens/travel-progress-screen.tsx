'use client'

import Image from 'next/image'
import { useState } from 'react'
import { MapPin, X, Camera, Star, BookOpen, AlertTriangle } from 'lucide-react'
import {
  BottomSheetBackdrop,
  BottomSheetHandle,
  BottomSheetRoot,
  BottomSheetSurface,
} from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Textarea } from '@/components/ui/input'
import { ModalActions } from '@/components/ui/modal-actions'
import { cn } from '@/lib/utils'

interface TravelProgressScreenProps {
  onEndTrip: () => void
  onAbort: () => void
}

interface TravelNoteSheetProps {
  placeName: string
  onClose: () => void
  onSave: () => void
}

function TravelNoteSheet({ placeName, onClose, onSave }: TravelNoteSheetProps) {
  const [note, setNote] = useState('')
  const [rating, setRating] = useState(0)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => {
      onSave()
    }, 1000)
  }

  return (
    <BottomSheetRoot>
      <BottomSheetBackdrop onClick={onClose} />
      <BottomSheetSurface className="slide-up">
        <BottomSheetHandle />
        <IconButton onClick={onClose} className="absolute top-3 right-4" variant="muted" size="sm" aria-label="닫기">
          <X className="w-4 h-4 text-warm-gray" />
        </IconButton>

        <div className="px-4 pb-8 max-h-[85vh] overflow-y-auto no-scrollbar">
          <h3 className="text-[16px] font-bold text-deep-brown mb-1">{placeName}</h3>
          <p className="text-[12px] text-warm-gray mb-4">이 장소에서의 기억을 남겨보세요</p>

          {/* Photo add */}
          <div className="flex gap-2 mb-4">
            <div className="w-20 h-20 rounded-xl bg-muted flex flex-col items-center justify-center gap-1 border-2 border-dashed border-border cursor-pointer">
              <Camera className="w-5 h-5 text-warm-gray" />
              <span className="text-[10px] text-warm-gray">사진 추가</span>
            </div>
          </div>

          {/* Note input */}
          <div className="mb-4">
            <label className="text-[13px] font-semibold text-deep-brown mb-2 block">간단 후기</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="이 장소에서의 느낌을 자유롭게 기록해보세요..."
              rows={3}
              className="rounded-xl bg-muted px-3 py-2.5"
            />
          </div>

          {/* Rating */}
          <div className="mb-6">
            <label className="text-[13px] font-semibold text-deep-brown mb-2 block">만족도</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <IconButton
                  key={v}
                  onClick={() => setRating(v)}
                  aria-label={`${v}점`}
                  size="sm"
                >
                  <Star
                    className={cn('w-7 h-7 transition-colors', v <= rating ? 'text-soft-orange fill-soft-orange' : 'text-border')}
                  />
                </IconButton>
              ))}
            </div>
          </div>

          {/* Buttons */}
          {saved ? (
            <div className="w-full h-12 rounded-btn bg-sage-green-light flex items-center justify-center gap-2">
              <span className="text-sage-green font-semibold text-[15px]">임시저장 완료!</span>
            </div>
          ) : (
            <ModalActions>
              <Button
                onClick={handleSave}
                variant="secondary"
                size="lg"
              >
                임시저장
              </Button>
              <Button
                onClick={onSave}
                size="lg"
              >
                다음 장소로
              </Button>
            </ModalActions>
          )}
        </div>
      </BottomSheetSurface>
    </BottomSheetRoot>
  )
}

interface AbortConfirmSheetProps {
  onCancel: () => void
  onConfirm: () => void
}

function AbortConfirmSheet({ onCancel, onConfirm }: AbortConfirmSheetProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-card-surface rounded-card p-6 w-full shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6 text-danger" />
        </div>
        <h3 className="text-[17px] font-bold text-deep-brown text-center mb-2">여행을 중도 종료할까요?</h3>
        <p className="text-[13px] text-warm-gray text-center mb-6 leading-relaxed">
          지금까지 저장된 노트와 사진은 앨범에 임시저장됩니다.
        </p>
        <ModalActions>
          <Button onClick={onCancel} variant="outline">
            계속 여행
          </Button>
          <Button onClick={onConfirm} variant="destructive">
            중도 종료
          </Button>
        </ModalActions>
      </div>
    </div>
  )
}

export default function TravelProgressScreen({ onEndTrip, onAbort }: TravelProgressScreenProps) {
  const [showNoteSheet, setShowNoteSheet] = useState(false)
  const [showAbortConfirm, setShowAbortConfirm] = useState(false)
  const [currentStop, setCurrentStop] = useState(1)

  const stops = ['성수 펫 카페', '서울숲 공원', '한강 펫 레스토랑']
  const progress = (currentStop / stops.length) * 100

  return (
    <div className="flex flex-col flex-1 relative overflow-hidden">
      {/* Top bar overlay */}
      <div className="absolute top-0 left-0 right-0 z-40">
        <div className="flex items-center justify-between px-4 py-3 bg-card-surface/95 backdrop-blur-sm border-b border-border">
          <div>
            <p className="text-[11px] text-warm-gray">여행 진행 중</p>
            <p className="text-[15px] font-bold text-deep-brown">서울 성수 → 용산 코스</p>
          </div>
          <div className="flex items-center gap-1.5 text-sage-green">
            <div className="w-2 h-2 rounded-full bg-sage-green animate-pulse" />
            <span className="text-[12px] font-semibold">진행 중</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="absolute inset-0 bg-sky-blue/25">
        {[0,1,2,3,4,5,6,7].map(i => (
          <div key={i} className="absolute w-full h-px bg-white/25" style={{ top: `${i * 14}%` }} />
        ))}
        {[0,1,2,3,4,5,6].map(i => (
          <div key={i} className="absolute h-full w-px bg-white/25" style={{ left: `${i * 17}%` }} />
        ))}
        <div className="absolute top-[35%] w-full h-3 bg-white/50 rounded" />
        <div className="absolute left-[25%] h-full w-3 bg-white/50 rounded" />

        {/* Route */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <path
            d="M 60,35% Q 100,42% 160,40% Q 200,38% 240,48% Q 290,58% 320,55%"
            stroke="#6FAF8E"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            opacity="0.8"
          />
        </svg>

        {/* Current position */}
        <div className="absolute top-[38%] left-[38%] -translate-x-1/2 -translate-y-1/2">
          <div className="w-5 h-5 rounded-full bg-sage-green border-3 border-white shadow-lg pulse-dot" />
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-sage-green text-white text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap">
            현재 위치
          </div>
        </div>

        {/* Stop markers */}
        {[
          { top: '36%', left: '30%', label: '1', done: true },
          { top: '42%', left: '55%', label: '2', done: false },
          { top: '50%', left: '75%', label: '3', done: false },
        ].map((m, i) => (
          <div
            key={i}
            className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
            style={{ top: m.top, left: m.left }}
          >
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center shadow border-2 border-white',
              m.done ? 'bg-warm-gray' : 'bg-soft-orange'
            )}>
              <span className="text-[11px] font-bold text-white">{m.label}</span>
            </div>
          </div>
        ))}

        {/* Destination */}
        <div className="absolute top-[52%] left-[83%] -translate-x-1/2 -translate-y-1/2">
          <div className="w-8 h-8 rounded-full bg-danger flex items-center justify-center shadow border-2 border-white">
            <MapPin className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-40">
        <div className="bg-card-surface rounded-t-[24px] shadow-xl px-4 pt-4 pb-8">
          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-semibold text-sage-green">진행률 {Math.round(progress)}%</span>
              <span className="text-[12px] text-warm-gray">출발 10:23</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-sage-green rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Travel Progress Card */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 p-3 bg-muted rounded-xl text-center">
              <p className="text-[11px] text-warm-gray mb-1">현재 위치</p>
              <p className="text-[13px] font-semibold text-deep-brown truncate">이동 중</p>
            </div>
            <div className="flex-1 p-3 bg-muted rounded-xl text-center">
              <p className="text-[11px] text-warm-gray mb-1">다음 장소</p>
              <p className="text-[13px] font-semibold text-deep-brown truncate">{stops[currentStop - 1]}</p>
            </div>
            <div className="flex-1 p-3 bg-muted rounded-xl text-center">
              <p className="text-[11px] text-warm-gray mb-1">이동 거리</p>
              <p className="text-[13px] font-semibold text-deep-brown">3.2km</p>
            </div>
          </div>

          {/* Pet info */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-border">
              <Image src="/images/dog-hero.png" alt="골든이" fill className="object-cover" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-deep-brown">골든이와 함께</p>
              <p className="text-[11px] text-warm-gray">골든 리트리버 · 3살</p>
            </div>
          </div>

          {/* Actions */}
          <ModalActions>
            <Button
              onClick={() => setShowAbortConfirm(true)}
              variant="outline"
              size="sm"
              className="h-11"
            >
              중도 종료
            </Button>
            <Button
              onClick={() => setShowNoteSheet(true)}
              variant="secondary"
              size="sm"
              className="h-11"
            >
              <BookOpen className="w-4 h-4" />
              여행 노트
            </Button>
            <Button
              onClick={onEndTrip}
              size="sm"
              className="h-11"
            >
              여행 완료
            </Button>
          </ModalActions>
        </div>
      </div>

      {/* Overlays */}
      {showNoteSheet && (
        <TravelNoteSheet
          placeName={stops[currentStop - 1]}
          onClose={() => setShowNoteSheet(false)}
          onSave={() => { setShowNoteSheet(false); if (currentStop < stops.length) setCurrentStop(c => c + 1) }}
        />
      )}
      {showAbortConfirm && (
        <AbortConfirmSheet
          onCancel={() => setShowAbortConfirm(false)}
          onConfirm={onAbort}
        />
      )}
    </div>
  )
}
