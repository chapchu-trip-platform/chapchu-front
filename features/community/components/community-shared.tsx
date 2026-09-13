'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { ChevronLeft, ChevronRight, PawPrint, RotateCcw, Route, X, ZoomIn, ZoomOut } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { usePrefersReducedMotion } from '@/features/community/hooks/use-prefers-reduced-motion'
import type { Post, Review } from '@/features/community/types/community'

interface CommunityPhotoProps {
  url: string | null
  title: string
  className: string
  imageClassName?: string
  temporaryFallback?: boolean
}

export function CommunityPhoto(props: CommunityPhotoProps) {
  return <Photo key={props.url ?? ''} {...props} />
}

export function CommunityPhotoGallery({ post, onReload }: { post: Post; onReload?: () => void }) {
  if (post.photos.length === 0) {
    return (
      <CommunityPhoto
        url={post.photoUrl}
        title={post.title}
        className="h-52"
        temporaryFallback
      />
    )
  }
  return <PostPhotoGallery
    key={`${post.id}:${post.photos.map(photo => `${photo.photoId}:${photo.downloadUrl ?? ''}`).join('|')}`}
    post={post}
    onReload={onReload}
  />
}

function PostPhotoGallery({ post, onReload }: { post: Post; onReload?: () => void }) {
  const photos = post.photos
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [photoErrors, setPhotoErrors] = useState<Record<string, boolean>>({})
  const viewerHistoryRef = useRef(false)
  const draggedRef = useRef(false)
  const prefersReducedMotion = usePrefersReducedMotion()

  const photoCount = photos.length
  const activePhoto = photos[activeIndex]
  const activeUrl = activePhoto.downloadUrl ?? (activePhoto.photoId === post.photoId ? post.photoUrl : null)
  const activeError = !activeUrl || Boolean(photoErrors[activePhoto.photoId])

  const move = useCallback((nextDirection: 1 | -1) => {
    setDirection(nextDirection)
    setActiveIndex((current) =>
      (current + nextDirection + photoCount) % photoCount
    )
    setZoom(1)
  }, [photoCount])

  const openViewer = () => {
    if (!activeUrl || activeError) return
    viewerHistoryRef.current = true
    window.history.pushState({ ...window.history.state, chapchuPhotoViewer: true }, '', window.location.href)
    setViewerOpen(true)
  }

  const closeViewer = useCallback(() => {
    if (viewerHistoryRef.current) {
      viewerHistoryRef.current = false
      setViewerOpen(false)
      window.history.back()
      return
    }
    setViewerOpen(false)
  }, [])

  useEffect(() => {
    if (!viewerOpen) return
    const handlePopState = () => {
      viewerHistoryRef.current = false
      setViewerOpen(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [viewerOpen])

  const photoMotion = prefersReducedMotion
    ? {
        initial: false as const,
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 1, x: 0, scale: 1 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, x: direction * 44, scale: 0.985 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: direction * -44, scale: 0.985 },
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
      }

  return (
    <div
      className="relative outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage-green/50"
      role="region"
      aria-label={`게시글 사진 ${photoCount}장`}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' && photoCount > 1) {
          event.preventDefault()
          move(-1)
        }
        if (event.key === 'ArrowRight' && photoCount > 1) {
          event.preventDefault()
          move(1)
        }
      }}
    >
      <div className="relative h-52 overflow-hidden bg-sage-green-light">
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={activePhoto.photoId}
            className="absolute inset-0"
            drag={photoCount > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragStart={() => { draggedRef.current = true }}
            onDragEnd={(_event, info) => {
              if (Math.abs(info.offset.x) > 48 || Math.abs(info.velocity.x) > 450) {
                move(info.offset.x < 0 ? 1 : -1)
              }
              window.setTimeout(() => { draggedRef.current = false }, 0)
            }}
            {...photoMotion}
          >
            <GalleryPhoto
              url={activeUrl}
              failed={activeError}
              title={`${post.title} 사진 ${activeIndex + 1}`}
              onOpen={() => { if (!draggedRef.current) openViewer() }}
              onRetry={onReload ? () => {
                setPhotoErrors(current => ({ ...current, [activePhoto.photoId]: false }))
                onReload()
              } : undefined}
              onImageError={() => setPhotoErrors(current => ({ ...current, [activePhoto.photoId]: true }))}
            />
          </motion.div>
        </AnimatePresence>
        {photoCount > 1 && <>
          <GalleryArrow label="이전 사진" direction="left" onClick={() => move(-1)} />
          <GalleryArrow label="다음 사진" direction="right" onClick={() => move(1)} />
        </>}
        {photoCount > 1 && <span
          className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm"
          aria-hidden="true"
        >
          {activeIndex + 1} / {photoCount}
        </span>}
        <span className="sr-only" aria-live="polite" aria-atomic="true">총 {photoCount}장 중 {activeIndex + 1}번째 사진</span>
      </div>
      <PhotoViewerDialog
        open={viewerOpen}
        title={post.title}
        url={activeUrl}
        activeIndex={activeIndex}
        photoCount={photoCount}
        zoom={zoom}
        reducedMotion={prefersReducedMotion}
        onOpenChange={open => { if (!open) closeViewer() }}
        onMove={move}
        onZoom={setZoom}
        onImageError={() => {
          setPhotoErrors(current => ({ ...current, [activePhoto.photoId]: true }))
          closeViewer()
        }}
      />
    </div>
  )
}

function GalleryArrow({ label, direction, onClick }: { label: string; direction: 'left' | 'right'; onClick: () => void }) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight
  return <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className={`absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white opacity-45 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-black/45 hover:opacity-100 focus-visible:bg-black/45 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-95 active:opacity-100 ${direction === 'left' ? 'left-2' : 'right-2'}`}
  >
    <Icon className="h-5 w-5" aria-hidden="true" />
  </button>
}

function GalleryPhoto({ url, failed, title, onOpen, onRetry, onImageError }: {
  url: string | null
  failed: boolean
  title: string
  onOpen: () => void
  onRetry?: () => void
  onImageError: () => void
}) {
  if (failed) {
    return <div className="flex h-full flex-col items-center justify-center gap-3 bg-sage-green-light text-sage-green" role="alert">
      <PawPrint className="h-9 w-9" aria-hidden="true" />
      <span className="text-[12px]">사진을 불러오지 못했어요</span>
      {onRetry && <Button type="button" variant="outline" size="sm" onClick={onRetry}>사진 다시 불러오기</Button>}
    </div>
  }
  if (!url) return null
  return <button type="button" className="relative h-full w-full cursor-zoom-in bg-[#35312d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80" aria-label={`${title} 전체 화면 보기`} onClick={onOpen}>
    <Image src={url} alt="" aria-hidden="true" fill unoptimized sizes="430px" referrerPolicy="no-referrer" className="scale-110 object-cover blur-2xl brightness-[0.62] saturate-75" />
    <span className="absolute inset-0 bg-deep-brown/15" aria-hidden="true" />
    <Image src={url} alt={title} fill unoptimized sizes="430px" referrerPolicy="no-referrer" className="z-10 object-contain" onError={onImageError} />
  </button>
}

function PhotoViewerDialog({ open, title, url, activeIndex, photoCount, zoom, reducedMotion, onOpenChange, onMove, onZoom, onImageError }: {
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
}) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-sm" />
      <Dialog.Popup
        className="fixed inset-0 z-[91] flex touch-none flex-col bg-[#151413] text-white outline-none"
        onKeyDown={event => {
          if (event.key === 'ArrowLeft' && photoCount > 1) { event.preventDefault(); event.stopPropagation(); onMove(-1) }
          if (event.key === 'ArrowRight' && photoCount > 1) { event.preventDefault(); event.stopPropagation(); onMove(1) }
        }}
      >
        <Dialog.Title className="sr-only">{title} 사진 전체 화면</Dialog.Title>
        <Dialog.Description className="sr-only" aria-live="polite" aria-atomic="true">총 {photoCount}장 중 {activeIndex + 1}번째 사진</Dialog.Description>
        <div className="relative z-20 flex h-16 shrink-0 items-center justify-between px-3">
          <span className="rounded-full bg-black/45 px-3 py-1.5 text-[12px] font-semibold tabular-nums">{activeIndex + 1} / {photoCount}</span>
          <Dialog.Close className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="전체 화면 닫기">
            <X className="h-6 w-6" aria-hidden="true" />
          </Dialog.Close>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#262320]">
          {url && <motion.div
            key={`${activeIndex}:${url}`}
            className="absolute inset-0"
            initial={reducedMotion ? false : { opacity: 0.6, scale: 0.98 }}
            animate={{ opacity: 1, scale: zoom }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            drag={zoom > 1}
            dragConstraints={{ left: -240, right: 240, top: -240, bottom: 240 }}
            dragElastic={0.08}
          >
            <Image src={url} alt={`${title} 사진 ${activeIndex + 1}`} fill unoptimized sizes="100vw" referrerPolicy="no-referrer" className="select-none object-contain" onError={onImageError} priority />
          </motion.div>}
          {photoCount > 1 && <>
            <GalleryArrow label="전체 화면 이전 사진" direction="left" onClick={() => onMove(-1)} />
            <GalleryArrow label="전체 화면 다음 사진" direction="right" onClick={() => onMove(1)} />
          </>}
        </div>
        <div className="z-20 flex h-20 shrink-0 items-center justify-center gap-2 px-4">
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-35" aria-label="사진 축소" disabled={zoom <= 1} onClick={() => onZoom(Math.max(1, Number((zoom - 0.5).toFixed(1))))}><ZoomOut className="h-5 w-5" aria-hidden="true" /></button>
          <span className="w-14 text-center text-[12px] tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-35" aria-label="사진 확대" disabled={zoom >= 3} onClick={() => onZoom(Math.min(3, Number((zoom + 0.5).toFixed(1))))}><ZoomIn className="h-5 w-5" aria-hidden="true" /></button>
          <button type="button" className="ml-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-35" aria-label="확대 초기화" disabled={zoom === 1} onClick={() => onZoom(1)}><RotateCcw className="h-5 w-5" aria-hidden="true" /></button>
        </div>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
}

function Photo({ url, title, className, imageClassName = 'object-cover', temporaryFallback = false }: CommunityPhotoProps) {
  const [failed, setFailed] = useState(false)
  const [fallbackFailed, setFallbackFailed] = useState(false)
  return (
    <div className={`relative overflow-hidden bg-sage-green-light ${className}`}>
      {url && !failed ? (
        <Image src={url} alt={title} fill unoptimized sizes="430px" referrerPolicy="no-referrer" className={imageClassName} onError={() => setFailed(true)} />
      ) : temporaryFallback && !fallbackFailed ? (
        <>
          <Image src="/images/post-cover.png" alt="임시 사진: 반려견과 함께하는 해변 산책" fill sizes="430px" className="object-cover" onError={() => setFallbackFailed(true)} />
          <span className="absolute bottom-2 right-2 rounded-full bg-card-surface/95 px-2 py-1 text-[10px] font-medium text-deep-brown">임시 사진</span>
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-sage-green">
          <PawPrint className="h-9 w-9" aria-hidden="true" />
          <span className="text-[12px]">{failed ? '사진을 불러오지 못했어요' : '함께한 여행 이야기'}</span>
        </div>
      )}
    </div>
  )
}

export function CommunityFeedback({ error, notice }: { error?: string | null; notice?: string | null }) {
  return <>
    {error && <p role="alert" className="rounded-xl bg-soft-orange/10 p-3 text-[13px] text-deep-brown">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-sage-green-light p-3 text-[13px] text-deep-brown">{notice}</p>}
  </>
}

export function QueryFeedback({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  return <div className="text-[13px] text-warm-gray">
    {loading && <p role="status" className="py-4 text-center">불러오는 중이에요…</p>}
    {error && <div className="space-y-2"><CommunityFeedback error={error} /><Button variant="outline" size="sm" onClick={onRetry}>다시 시도</Button></div>}
  </div>
}

/** Review IDs do not authorize reads of another user's private pet/course details. */
export function ReviewCompanionInfo({ review }: { review: Review }) {
  return <div className="space-y-2 rounded-xl bg-muted/55 p-3">
    <div>
      <p className="flex items-center gap-1.5 text-[11px] text-warm-gray"><PawPrint className="h-3 w-3 text-sage-green" />동행 반려동물</p>
      <p className="mt-1 text-[12px] text-deep-brown">반려동물 상세 정보 준비 중</p>
    </div>
    <div>
      <p className="flex items-center gap-1.5 text-[11px] text-warm-gray"><Route className="h-3 w-3 text-soft-orange" />코스 정보</p>
      <p className="mt-1 text-[12px] text-deep-brown">{review.coursePlaceId ? '연결된 여행 정보 준비 중' : '연결된 코스가 없어요'}</p>
    </div>
  </div>
}

export const communityTextAreaClass = 'min-h-24 w-full rounded-xl border border-border bg-card-surface p-3 text-[14px] text-deep-brown outline-none focus-visible:ring-2 focus-visible:ring-sage-green/50'
