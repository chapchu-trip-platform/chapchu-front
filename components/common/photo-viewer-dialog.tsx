'use client'

import Image from 'next/image'
import { Dialog } from '@base-ui/react/dialog'
import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react'
import { motion } from 'motion/react'

interface PhotoViewerDialogProps {
  open: boolean
  title: string
  url: string | null
  activeIndex: number
  photoCount: number
  zoom: number
  reducedMotion: boolean
  onOpenChange: (open: boolean) => void
  onMove: (direction: 1 | -1) => void
  onZoom: (zoom: number) => void
  onImageError: () => void
}

function ViewerArrow({
  label,
  direction,
  onClick,
}: {
  label: string
  direction: 'left' | 'right'
  onClick: () => void
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white opacity-45 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-black/45 hover:opacity-100 focus-visible:bg-black/45 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-95 active:opacity-100 ${direction === 'left' ? 'left-2' : 'right-2'}`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  )
}

export function PhotoViewerDialog({
  open,
  title,
  url,
  activeIndex,
  photoCount,
  zoom,
  reducedMotion,
  onOpenChange,
  onMove,
  onZoom,
  onImageError,
}: PhotoViewerDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-sm" />
        <Dialog.Popup
          className="fixed inset-0 z-[91] flex touch-none flex-col bg-[#151413] text-white outline-none"
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' && photoCount > 1) {
              event.preventDefault()
              event.stopPropagation()
              onMove(-1)
            }
            if (event.key === 'ArrowRight' && photoCount > 1) {
              event.preventDefault()
              event.stopPropagation()
              onMove(1)
            }
          }}
        >
          <Dialog.Title className="sr-only">{title} 사진 전체 화면</Dialog.Title>
          <Dialog.Description className="sr-only" aria-live="polite" aria-atomic="true">
            총 {photoCount}장 중 {activeIndex + 1}번째 사진
          </Dialog.Description>
          <div className="relative z-20 flex h-16 shrink-0 items-center justify-between px-3">
            <span className="rounded-full bg-black/45 px-3 py-1.5 text-[12px] font-semibold tabular-nums">
              {activeIndex + 1} / {photoCount}
            </span>
            <Dialog.Close
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="전체 화면 닫기"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden bg-[#262320]">
            {url && (
              <motion.div
                key={`${activeIndex}:${url}`}
                className="absolute inset-0"
                initial={reducedMotion ? false : { opacity: 0.6, scale: 0.98 }}
                animate={{ opacity: 1, scale: zoom }}
                transition={{
                  duration: reducedMotion ? 0 : 0.22,
                  ease: [0.22, 1, 0.36, 1],
                }}
                drag={zoom > 1}
                dragConstraints={{ left: -240, right: 240, top: -240, bottom: 240 }}
                dragElastic={0.08}
              >
                <Image
                  src={url}
                  alt={`${title} 사진 ${activeIndex + 1}`}
                  fill
                  unoptimized
                  sizes="100vw"
                  referrerPolicy="no-referrer"
                  className="select-none object-contain"
                  onError={onImageError}
                  priority
                />
              </motion.div>
            )}
            {photoCount > 1 && (
              <>
                <ViewerArrow label="전체 화면 이전 사진" direction="left" onClick={() => onMove(-1)} />
                <ViewerArrow label="전체 화면 다음 사진" direction="right" onClick={() => onMove(1)} />
              </>
            )}
          </div>
          <div className="z-20 flex h-20 shrink-0 items-center justify-center gap-2 px-4">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-35"
              aria-label="사진 축소"
              disabled={zoom <= 1}
              onClick={() => onZoom(Math.max(1, Number((zoom - 0.5).toFixed(1))))}
            >
              <ZoomOut className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="w-14 text-center text-[12px] tabular-nums" aria-live="polite">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-35"
              aria-label="사진 확대"
              disabled={zoom >= 3}
              onClick={() => onZoom(Math.min(3, Number((zoom + 0.5).toFixed(1))))}
            >
              <ZoomIn className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="ml-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-35"
              aria-label="확대 초기화"
              disabled={zoom === 1}
              onClick={() => onZoom(1)}
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
