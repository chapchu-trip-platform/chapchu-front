'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, X } from 'lucide-react'
import {
  BottomSheetBackdrop,
  BottomSheetRoot,
  BottomSheetSurface,
} from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { ModalActions } from '@/components/ui/modal-actions'
import { cn } from '@/lib/utils'
import { formatPetName } from '@/lib/format-pet-name'

export interface SharedPost {
  title: string
  content: string
  image: string
  pet: string
}

interface PostShareSheetProps {
  onClose: () => void
  onShare: (post: SharedPost) => void | Promise<void>
  tripTitle: string
  tripImage: string
  petName: string
  tripReview: string
}

const BACKDROP_EXIT_MS = 80
const SHEET_EXIT_MS = 320
const SHARE_SUCCESS_DISPLAY_MS = 600

export default function PostShareSheet({
  onClose,
  onShare,
  tripTitle,
  tripImage,
  petName,
  tripReview,
}: PostShareSheetProps) {
  const displayPetName = formatPetName(petName)
  const [title, setTitle] = useState(tripTitle || '')
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'success' | 'error'>('idle')
  const [shareError, setShareError] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [isSheetClosing, setIsSheetClosing] = useState(false)

  useEffect(() => {
    if (!isClosing) return

    const sheetTimer = window.setTimeout(() => setIsSheetClosing(true), BACKDROP_EXIT_MS)
    const closeTimer = window.setTimeout(onClose, BACKDROP_EXIT_MS + SHEET_EXIT_MS)

    return () => {
      window.clearTimeout(sheetTimer)
      window.clearTimeout(closeTimer)
    }
  }, [isClosing, onClose])

  useEffect(() => {
    if (shareStatus !== 'success' || isClosing) return

    const successTimer = window.setTimeout(
      () => setIsClosing(true),
      SHARE_SUCCESS_DISPLAY_MS
    )
    return () => window.clearTimeout(successTimer)
  }, [isClosing, shareStatus])

  const requestClose = () => {
    if (isClosing || shareStatus === 'sharing') return
    setIsClosing(true)
  }

  const handleShare = async () => {
    if (!title.trim() || !tripReview.trim()) {
      alert('제목과 전체 후기 내용을 확인해주세요.')
      return
    }

    if (shareStatus === 'sharing' || shareStatus === 'success') return

    setShareStatus('sharing')
    setShareError(null)
    try {
      await onShare({
        title: title.trim(),
        content: tripReview.trim(),
        image: tripImage,
        pet: petName,
      })
      setShareStatus('success')
    } catch (error: unknown) {
      setShareStatus('error')
      setShareError(error instanceof Error ? error.message : '게시글을 공유하지 못했어요. 다시 시도해주세요.')
    }
  }

  return (
    <BottomSheetRoot>
      {/* Backdrop */}
      <BottomSheetBackdrop
        className={cn(
          'transition-colors duration-75',
          isClosing ? 'bg-transparent' : 'bg-black/25'
        )}
        onClick={requestClose}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-share-sheet-title"
        className={cn(
          'relative z-10 translate-y-0 drop-shadow-[0_-10px_24px_rgba(58,47,42,0.18)] transition-transform duration-[320ms] ease-in will-change-transform',
          isSheetClosing ? 'translate-y-full' : 'slide-up'
        )}
      >
        <BottomSheetSurface className="flex max-h-[85vh] flex-col rounded-t-[28px] [clip-path:inset(0_round_28px_28px_0_0)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 id="post-share-sheet-title" className="text-[16px] font-bold text-deep-brown">여행 후기 공유</h3>
          <IconButton
            onClick={requestClose}
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

          {/* Pet info */}
          <div className="mb-4">
            <p className="text-[12px] font-semibold text-warm-gray mb-2">동행한 반려동물</p>
            <div className="px-3 py-2.5 bg-card rounded-card border border-border text-[13px] text-deep-brown">
              {displayPetName}
            </div>
          </div>

          <div className="mb-6 rounded-card border border-sage-green/20 bg-sage-green/5 p-3">
            <p className="text-[12px] font-semibold text-deep-brown">여행 후기 게시글</p>
            <p className="mt-1 text-[11px] leading-relaxed text-warm-gray">
              전체 후기와 이번 여행 코스가 함께 연결되어 공유됩니다.
            </p>
          </div>
          {shareError && (
            <p className="mb-4 text-[12px] leading-relaxed text-danger" role="alert">
              {shareError}
            </p>
          )}
        </div>

        {/* Actions */}
        <ModalActions className="p-4 border-t border-border bg-card-surface gap-3">
          <Button
            onClick={requestClose}
            variant="outline"
            size="lg"
          >
            취소
          </Button>
          <Button
            onClick={handleShare}
            disabled={shareStatus === 'sharing' || shareStatus === 'success'}
            size="lg"
            aria-live="polite"
          >
            {shareStatus === 'success' ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                공유 완료
              </>
            ) : shareStatus === 'sharing' ? (
              '공유 중...'
            ) : (
              '공유하기'
            )}
          </Button>
        </ModalActions>
        </BottomSheetSurface>
      </div>
    </BottomSheetRoot>
  )
}
