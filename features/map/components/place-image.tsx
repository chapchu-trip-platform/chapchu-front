'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlaceImageProps {
  alt?: string
  fallbackClassName?: string
  iconClassName?: string
  sizes: string
  src: string | null
}

function isRenderableImageSource(value: string | null) {
  return Boolean(value && /^(https?:\/\/|\/(?!\/))/.test(value))
}

export default function PlaceImage({
  alt = '',
  fallbackClassName,
  iconClassName,
  sizes,
  src,
}: PlaceImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const normalizedSource = src?.trim() || null
  const hasImage =
    normalizedSource !== failedSource && isRenderableImageSource(normalizedSource)

  if (!hasImage || !normalizedSource) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-sage-green/10 text-warm-gray',
          fallbackClassName
        )}
      >
        <ImageIcon aria-hidden="true" className={cn('size-5', iconClassName)} />
      </div>
    )
  }

  return (
    <Image
      src={normalizedSource}
      alt={alt}
      fill
      sizes={sizes}
      className="object-cover"
      onError={() => setFailedSource(normalizedSource)}
    />
  )
}
