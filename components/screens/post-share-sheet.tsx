'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Image as ImageIcon, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChoiceChip } from '@/components/ui/choice-chip'
import { IconButton } from '@/components/ui/icon-button'
import { Input, Textarea } from '@/components/ui/input'
import { ModalActions } from '@/components/ui/modal-actions'
import { cn } from '@/lib/utils'

type LocationPrivacy = 'precise' | 'approximate' | 'none'

interface SharedPost {
  title: string
  content: string
  board: string
  locationPrivacy: LocationPrivacy
  image: string
  pet: string
}

interface PostShareSheetProps {
  onClose: () => void
  onShare: (post: SharedPost) => void
  tripTitle: string
  tripImage: string
  petName: string
}

const boards = ['전체', '여행후기', '팁/정보', '장소리뷰', '포토']
const locationPrivacy: Array<{ value: LocationPrivacy; label: string; description: string }> = [
  { value: 'precise', label: '정확한 위치 공개', description: '경로와 방문 장소 노출' },
  { value: 'approximate', label: '대략적인 지역만 공개', description: '광역도시 단위로 표시' },
  { value: 'none', label: '위치 비공개', description: '위치 정보 숨김' },
]

export default function PostShareSheet({ onClose, onShare, tripTitle, tripImage, petName }: PostShareSheetProps) {
  const [title, setTitle] = useState(tripTitle || '')
  const [content, setContent] = useState('')
  const [selectedBoard, setSelectedBoard] = useState('여행후기')
  const [selectedPrivacy, setSelectedPrivacy] = useState<LocationPrivacy>('approximate')
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해주세요.')
      return
    }

    setIsSharing(true)
    // Simulate API call
    await new Promise((r) => setTimeout(r, 800))

    onShare({
      title,
      content,
      board: selectedBoard,
      locationPrivacy: selectedPrivacy,
      image: tripImage,
      pet: petName,
    })

    setIsSharing(false)
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="bg-card-surface rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-[16px] font-bold text-deep-brown">여행 후기 공유</h3>
          <IconButton
            onClick={onClose}
            aria-label="공유 창 닫기"
          >
            <X className="w-5 h-5 text-deep-brown" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
          {/* Featured image */}
          <div className="mb-4">
            <p className="text-[12px] font-semibold text-warm-gray mb-2">대표 사진</p>
            <div className="relative h-32 rounded-card overflow-hidden">
              <Image
                src={tripImage}
                alt="대표 사진"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <button className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-deep-brown" />
                  <span className="text-[12px] font-semibold text-deep-brown">변경</span>
                </button>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="text-[12px] font-semibold text-warm-gray mb-2 block">제목</label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="여행의 제목을 입력하세요"
              maxLength={80}
              size="compact"
            />
            <p className="text-[11px] text-warm-gray mt-1 text-right">
              {title.length}/80
            </p>
          </div>

          {/* Content */}
          <div className="mb-4">
            <label className="text-[12px] font-semibold text-warm-gray mb-2 block">후기</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="여행의 경험을 공유해주세요"
              maxLength={1000}
              rows={5}
              className="p-3"
            />
            <p className="text-[11px] text-warm-gray mt-1 text-right">
              {content.length}/1000
            </p>
          </div>

          {/* Pet info */}
          <div className="mb-4">
            <p className="text-[12px] font-semibold text-warm-gray mb-2">동행한 반려동물</p>
            <div className="px-3 py-2.5 bg-card rounded-card border border-border text-[13px] text-deep-brown">
              {petName}
            </div>
          </div>

          {/* Board selection */}
          <div className="mb-4">
            <p className="text-[12px] font-semibold text-warm-gray mb-2">게시판</p>
            <div className="flex flex-wrap gap-2">
              {boards.map((board) => (
                <ChoiceChip
                  key={board}
                  onClick={() => setSelectedBoard(board)}
                  selected={selectedBoard === board}
                  size="sm"
                >
                  {board}
                </ChoiceChip>
              ))}
            </div>
          </div>

          {/* Location privacy */}
          <div className="mb-6">
            <p className="text-[12px] font-semibold text-warm-gray mb-3 flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              위치 공개 범위
            </p>
            <div className="space-y-2">
              {locationPrivacy.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-card border cursor-pointer transition-all',
                    selectedPrivacy === opt.value
                      ? 'bg-sage-green/10 border-sage-green'
                      : 'bg-card border-border hover:bg-muted'
                  )}
                >
                  <input
                    type="radio"
                    name="privacy"
                    value={opt.value}
                    checked={selectedPrivacy === opt.value}
                    onChange={(e) => setSelectedPrivacy(e.target.value as LocationPrivacy)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="text-[13px] font-medium text-deep-brown">{opt.label}</p>
                    <p className="text-[11px] text-warm-gray">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <ModalActions className="p-4 border-t border-border bg-card-surface gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            size="lg"
          >
            취소
          </Button>
          <Button
            onClick={handleShare}
            disabled={isSharing}
            size="lg"
          >
            {isSharing ? '공유 중...' : '공유하기'}
          </Button>
        </ModalActions>
      </div>
    </div>
  )
}
