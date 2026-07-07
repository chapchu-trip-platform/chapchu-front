'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Camera, MapPin, Navigation, CloudSun, Share2, Image as ImageIcon, BookOpen, Star, ChevronDown, ChevronUp } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { cn } from '@/lib/utils'

interface TripEndScreenProps {
  onSave: () => void
  onShare?: () => void
}

const waypoints = [
  { name: '성수 펫 카페', note: '골든이가 물그릇을 정말 좋아했어요! 직원분들이 너무 친절했습니다.', rating: 5, image: '/images/place-cafe.png' },
  { name: '서울숲 공원', note: '넓은 잔디밭에서 맘껏 뛰어놀았어요. 다음에 또 와야겠다!', rating: 5, image: '/images/place-park.png' },
  { name: '한강 펫 레스토랑', note: '뷰가 정말 예뻤어요. 음식도 맛있고 반려견 메뉴도 있었어요.', rating: 4, image: '/images/place-restaurant.png' },
]

export default function TripEndScreen({ onSave, onShare }: TripEndScreenProps) {
  const [review, setReview] = useState('')
  const [expandedNotes, setExpandedNotes] = useState<number[]>([0])
  const [showSNSModal, setShowSNSModal] = useState(false)

  const toggleNote = (i: number) => {
    setExpandedNotes(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  return (
    <div className="flex flex-col flex-1 bg-warm-beige overflow-hidden">
      <TopBar title="여행 종료" />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {/* Hero confetti header */}
        <div className="mx-4 mt-4 p-5 bg-sage-green rounded-card text-white text-center">
          <p className="text-[13px] text-white/80 mb-1">여행 완료!</p>
          <h2 className="text-[20px] font-bold leading-snug text-balance">골든이와의 서울 성수 여행</h2>
          <p className="text-[12px] text-white/70 mt-1">2024.07.04 · 맑음 · 4시간 32분</p>
          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center">
              <p className="text-[22px] font-bold">12.4</p>
              <p className="text-[11px] text-white/70">km 이동</p>
            </div>
            <div className="w-px bg-white/30" />
            <div className="text-center">
              <p className="text-[22px] font-bold">3</p>
              <p className="text-[11px] text-white/70">장소 방문</p>
            </div>
            <div className="w-px bg-white/30" />
            <div className="text-center">
              <p className="text-[22px] font-bold">23°C</p>
              <p className="text-[11px] text-white/70">날씨</p>
            </div>
          </div>
        </div>

        {/* Companion pet */}
        <div className="mx-4 mt-3 flex items-center gap-3 p-3 bg-card-surface rounded-card border border-border">
          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-sage-green/30">
            <Image src="/images/dog-hero.png" alt="골든이" fill className="object-cover" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-deep-brown">골든이와 함께한 여행</p>
            <p className="text-[12px] text-warm-gray">골든 리트리버 · 3살 · 소형 → 대형</p>
          </div>
        </div>

        {/* Representative photo */}
        <div className="mx-4 mt-4">
          <p className="text-[14px] font-semibold text-deep-brown mb-2">대표 사진 등록</p>
          <div className="relative h-44 rounded-card overflow-hidden bg-muted border-2 border-dashed border-border">
            <Image src="/images/album-cover.png" alt="대표 사진" fill className="object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                <Camera className="w-4 h-4 text-deep-brown" />
                <span className="text-[13px] font-semibold text-deep-brown">사진 변경</span>
              </div>
            </div>
          </div>
        </div>

        {/* Waypoints & Notes */}
        <div className="mx-4 mt-4">
          <p className="text-[14px] font-semibold text-deep-brown mb-3">거점별 여행 노트</p>
          <div className="flex flex-col gap-2">
            {waypoints.map((wp, i) => (
              <div key={i} className="bg-card-surface rounded-card border border-border overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-3 text-left"
                  onClick={() => toggleNote(i)}
                >
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0">
                    <Image src={wp.image} alt={wp.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-deep-brown truncate">{wp.name}</p>
                    <div className="flex">
                      {Array.from({ length: wp.rating }).map((_, j) => (
                        <Star key={j} className="w-3 h-3 text-soft-orange fill-soft-orange" />
                      ))}
                    </div>
                  </div>
                  {expandedNotes.includes(i) ? (
                    <ChevronUp className="w-4 h-4 text-warm-gray flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-warm-gray flex-shrink-0" />
                  )}
                </button>
                {expandedNotes.includes(i) && (
                  <div className="px-4 pb-3 pt-0 border-t border-border">
                    <p className="text-[13px] text-warm-gray leading-relaxed">{wp.note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Overall review */}
        <div className="mx-4 mt-4">
          <p className="text-[14px] font-semibold text-deep-brown mb-2">전체 후기 작성</p>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="오늘 여행을 어떠셨나요? 소중한 기억을 기록해보세요..."
            rows={4}
            className="w-full px-3 py-2.5 rounded-card border border-border bg-card text-[14px] text-deep-brown placeholder:text-warm-gray focus:outline-none focus:ring-2 focus:ring-sage-green/50 resize-none"
          />
        </div>

        {/* Share options */}
        <div className="mx-4 mt-4 flex flex-col gap-2">
          <button
            onClick={onSave}
            className="w-full h-12 rounded-btn bg-sage-green text-white font-semibold text-[15px] flex items-center justify-center gap-2 active:opacity-80"
          >
            <BookOpen className="w-4 h-4" />
            앨범에 저장하기
          </button>
          <div className="flex gap-2">
            <button
              onClick={onShare}
              className="flex-1 h-11 rounded-btn border border-border bg-card-surface text-deep-brown font-medium text-[13px] flex items-center justify-center gap-1.5 active:opacity-80"
            >
              <Share2 className="w-4 h-4 text-sage-green" />
              게시판 공유
            </button>
            <button
              onClick={() => setShowSNSModal(true)}
              className="flex-1 h-11 rounded-btn border border-border bg-card-surface text-deep-brown font-medium text-[13px] flex items-center justify-center gap-1.5 active:opacity-80"
            >
              <ImageIcon className="w-4 h-4 text-soft-orange" />
              SNS 카드 생성
            </button>
          </div>
        </div>
      </div>

      {/* SNS Card Modal */}
      {showSNSModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSNSModal(false)} />
          <div className="relative bg-card-surface rounded-card p-5 w-full shadow-2xl">
            <h3 className="text-[16px] font-bold text-deep-brown mb-4 text-center">SNS 코스 카드</h3>
            {/* SNS Card Preview */}
            <div className="rounded-card overflow-hidden bg-sage-green aspect-[9/16] relative mx-auto max-h-72">
              <Image src="/images/album-cover.png" alt="여행 대표사진" fill className="object-cover opacity-70" />
              <div className="absolute inset-0 p-4 flex flex-col justify-end">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <p className="text-[11px] text-white/80">2024.07.04 · 맑음</p>
                  <p className="text-[15px] font-bold text-white leading-snug">골든이와 서울 성수 여행</p>
                  <p className="text-[11px] text-white/80 mt-1">12.4km · 3곳 방문 · 4시간 32분</p>
                  <div className="flex gap-1 mt-2">
                    {['성수 펫 카페', '서울숲', '한강'].map((s, i) => (
                      <span key={i} className="bg-white/30 text-white text-[9px] px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                  <p className="text-[9px] text-white/60 mt-2">PawRoute</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowSNSModal(false)} className="flex-1 h-11 rounded-btn border border-border text-warm-gray font-semibold text-[14px]">
                닫기
              </button>
              <button className="flex-1 h-11 rounded-btn bg-sage-green text-white font-semibold text-[14px]">
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
