'use client'

import Image from 'next/image'
import { ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchPhotoDownload } from '@/features/photos/api/photo-api'

interface PhotoImageProps {
  src?: string | null
  photoId?: string | null
  alt: string
  className?: string
  imageClassName?: string
  sizes?: string
  fallbackSrc?: string
  fallbackAlt?: string
  emptyLabel?: string
  priority?: boolean
}

export function PhotoImage({
  src = null,
  photoId = null,
  ...props
}: PhotoImageProps) {
  return <PhotoImageSource key={`${src ?? ''}:${photoId ?? ''}`} src={src} photoId={photoId} {...props} />
}

function PhotoImageSource({
  src = null,
  photoId = null,
  alt,
  className = '',
  imageClassName = 'object-cover',
  sizes = '430px',
  fallbackSrc,
  fallbackAlt = '기본 이미지',
  emptyLabel = '사진이 없어요',
  priority = false,
}: PhotoImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(src)
  const [failed, setFailed] = useState(false)
  const [fallbackFailed, setFallbackFailed] = useState(false)

  useEffect(() => {
    if (src || !photoId) return

    const controller = new AbortController()
    void fetchPhotoDownload(photoId, controller.signal)
      .then((photo) => {
        if (!controller.signal.aborted) setResolvedSrc(photo.downloadUrl)
      })
      .catch(() => {
        // The visual fallback remains local to this image when a signed URL expires or fails.
      })
    return () => controller.abort()
  }, [photoId, src])

  return (
    <div className={`relative overflow-hidden bg-sage-green-light ${className}`}>
      {resolvedSrc && !failed ? (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          unoptimized
          sizes={sizes}
          priority={priority}
          referrerPolicy="no-referrer"
          className={imageClassName}
          onError={() => setFailed(true)}
        />
      ) : fallbackSrc && !fallbackFailed ? (
        <Image
          src={fallbackSrc}
          alt={fallbackAlt}
          fill
          sizes={sizes}
          priority={priority}
          className={imageClassName}
          onError={() => setFallbackFailed(true)}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center text-sage-green">
          <ImageOff className="h-7 w-7" aria-hidden="true" />
          <span className="text-[11px]">{failed ? '사진을 불러오지 못했어요' : emptyLabel}</span>
        </div>
      )}
    </div>
  )
}
