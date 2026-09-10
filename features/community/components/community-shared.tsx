'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, PawPrint, Route } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { fetchPhotoDownload } from '@/features/community/api/community-api'
import { usePrefersReducedMotion } from '@/features/community/hooks/use-prefers-reduced-motion'
import type { Post, Review } from '@/features/community/types/community'

interface CommunityPhotoProps {
  url: string | null
  photoId?: string | null
  title: string
  className: string
  temporaryFallback?: boolean
}

export function CommunityPhoto(props: CommunityPhotoProps) {
  return <Photo key={`${props.url ?? ''}:${props.photoId ?? ''}`} {...props} />
}

export function CommunityPhotoGallery({ post }: { post: Post }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const prefersReducedMotion = usePrefersReducedMotion()

  if (post.photos.length === 0) {
    return (
      <CommunityPhoto
        url={post.photoUrl}
        photoId={post.photoId}
        title={post.title}
        className="h-52"
        temporaryFallback
      />
    )
  }

  if (post.photos.length === 1) {
    const photo = post.photos[0]
    return (
      <CommunityPhoto
        url={photo.photoId === post.photoId ? post.photoUrl : null}
        photoId={photo.photoId}
        title={`${post.title} 사진 1`}
        className="h-52"
      />
    )
  }

  const move = (nextDirection: 1 | -1) => {
    setDirection(nextDirection)
    setActiveIndex((current) =>
      (current + nextDirection + post.photos.length) % post.photos.length
    )
  }
  const activePhoto = post.photos[activeIndex]
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
      className="relative mx-4 mt-4 rounded-card border border-border bg-card-surface p-2 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-sage-green/50"
      role="region"
      aria-label={`게시글 사진 ${post.photos.length}장`}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          move(-1)
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          move(1)
        }
      }}
    >
      <div className="relative h-56 overflow-hidden rounded-[calc(var(--radius-card)-0.35rem)] bg-sage-green-light">
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={activePhoto.photoId}
            className="absolute inset-0"
            {...photoMotion}
          >
          <CommunityPhoto
              url={activePhoto.photoId === post.photoId ? post.photoUrl : null}
              photoId={activePhoto.photoId}
              title={`${post.title} 사진 ${activeIndex + 1}`}
              className="h-full w-full"
          />
          </motion.div>
        </AnimatePresence>
        <button
          type="button"
          aria-label="이전 사진"
          onClick={() => move(-1)}
          className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-card-surface/90 text-deep-brown shadow-md backdrop-blur-sm transition-colors hover:bg-card-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-green"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="다음 사진"
          onClick={() => move(1)}
          className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-card-surface/90 text-deep-brown shadow-md backdrop-blur-sm transition-colors hover:bg-card-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-green"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <span
          className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white"
          aria-live="polite"
          aria-atomic="true"
        >
          {activeIndex + 1} / {post.photos.length}
        </span>
      </div>
    </div>
  )
}

function Photo({ url, photoId, title, className, temporaryFallback = false }: CommunityPhotoProps) {
  const [resolvedUrl, setResolvedUrl] = useState(url)
  const [failed, setFailed] = useState(false)
  const [fallbackFailed, setFallbackFailed] = useState(false)
  useEffect(() => {
    if (url || !photoId) return
    const controller = new AbortController()
    void fetchPhotoDownload(photoId, controller.signal)
      .then(photo => { if (!controller.signal.aborted) setResolvedUrl(photo.downloadUrl) })
      .catch(() => { /* Keep the visual fallback when the photo is unavailable. */ })
    return () => controller.abort()
  }, [photoId, url])
  return (
    <div className={`relative overflow-hidden bg-sage-green-light ${className}`}>
      {resolvedUrl && !failed ? (
        <Image src={resolvedUrl} alt={title} fill unoptimized sizes="430px" referrerPolicy="no-referrer" className="object-cover" onError={() => setFailed(true)} />
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
