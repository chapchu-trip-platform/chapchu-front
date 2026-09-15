'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  MapPin,
  Star,
} from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import type { AlbumDetail, AlbumStop } from '@/features/album/types/album'
import { formatPetName } from '@/lib/format-pet-name'
import { cn } from '@/lib/utils'

interface CourseDetailScreenProps {
  detail: AlbumDetail
  petName: string
  onBack: () => void
}

function formatDate(value: string | null) {
  if (!value) return '여행 날짜 미정'
  const [year, month, day] = value.split('-')
  return year && month && day ? `${year}.${month}.${day}` : value
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating}점`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            'size-3.5',
            index < rating ? 'fill-soft-orange text-soft-orange' : 'text-border'
          )}
        />
      ))}
    </div>
  )
}

function StopCard({ stop, isLast }: { stop: AlbumStop; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const image = stop.photos[0]?.downloadUrl ?? stop.imageUrl ?? '/placeholder.jpg'

  return (
    <div className="flex gap-3">
      <div className="flex shrink-0 flex-col items-center pt-1">
        <div className="z-10 flex size-7 items-center justify-center rounded-full bg-sage-green shadow-sm">
          <span className="text-[11px] font-bold text-white">{stop.visitOrder}</span>
        </div>
        {!isLast && <div className="mt-1 min-h-8 w-0.5 flex-1 bg-sage-green/25" />}
      </div>

      <div className="flex-1 pb-4">
        <article className="overflow-hidden rounded-card border border-border bg-card-surface">
          <div className="relative h-32">
            <Image src={image} alt={stop.placeName} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="text-[14px] font-bold text-white">{stop.placeName}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-white/75">
                <Camera className="size-3" /> 사진 {stop.photos.length}장
              </p>
            </div>
          </div>

          <div className="p-3">
            <div className="flex items-center justify-between gap-3">
              {stop.review ? <StarRow rating={stop.review.rating} /> : <span className="text-[11px] text-warm-gray">작성한 장소 후기가 없어요.</span>}
              <Button
                onClick={() => setExpanded((value) => !value)}
                variant="ghost"
                size="sm"
                className="h-auto gap-0.5 p-0 text-[11px] text-warm-gray"
                aria-expanded={expanded}
                aria-label={`${stop.placeName} ${expanded ? '상세 접기' : '상세 펼치기'}`}
              >
                {expanded ? '접기' : '더보기'}
                {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </Button>
            </div>

            {stop.review && (
              <p className={cn('mt-2 text-[12px] leading-relaxed text-warm-gray', !expanded && 'line-clamp-2')}>
                {stop.review.contents}
              </p>
            )}

            {expanded && stop.photos.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {stop.photos.map((photo) => (
                  <div key={photo.photoId} className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-border">
                    <Image src={photo.downloadUrl} alt={`${stop.placeName} 사진`} fill className="object-cover" />
                    <span className="absolute bottom-1 right-1 flex items-center rounded-full bg-black/45 p-1 text-white">
                      {photo.isPublic ? <Eye className="size-3" aria-label="공개 사진" /> : <EyeOff className="size-3" aria-label="나만 보기 사진" />}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}

export default function CourseDetailScreen({ detail, petName, onBack }: CourseDetailScreenProps) {
  const { course, summary, stops } = detail
  const coverImage = summary.photos[0]?.downloadUrl ?? course.places.find((place) => place.imageUrl)?.imageUrl ?? '/placeholder.jpg'
  const publicCount = summary.photos.filter((photo) => photo.isPublic).length
  const privateCount = summary.photos.length - publicCount
  const title = `${formatPetName(petName)}와의 ${course.endLocation} 여행`

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar title="앨범 상세" showBack onBack={onBack} />

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="relative mx-4 mt-4 h-52 overflow-hidden rounded-card">
          <Image src={coverImage} alt={title} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h2 className="text-balance text-[17px] font-bold leading-snug text-white">{title}</h2>
            <p className="mt-1 text-[12px] text-white/75">{formatDate(summary.travelDate)}</p>
          </div>
        </div>

        <div className="mx-4 mt-3 rounded-card border border-border bg-card-surface p-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-warm-gray">출발지</p>
              <p className="truncate text-[13px] font-semibold text-deep-brown">{course.startLocation}</p>
            </div>
            <MapPin className="size-4 shrink-0 text-sage-green" />
            <div className="min-w-0 flex-1 text-right">
              <p className="text-[10px] font-semibold text-warm-gray">도착지</p>
              <p className="truncate text-[13px] font-semibold text-deep-brown">{course.endLocation}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: '전체 사진', value: `${summary.photos.length}장` },
              { label: '공개', value: `${publicCount}장` },
              { label: '나만 보기', value: `${privateCount}장` },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-warm-beige p-2.5 text-center">
                <p className="text-[14px] font-bold text-deep-brown">{stat.value}</p>
                <p className="text-[10px] text-warm-gray">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-4 mt-4">
          <p className="mb-3 text-[13px] font-bold text-deep-brown">
            방문 코스 <span className="font-normal text-warm-gray">({stops.length}곳)</span>
          </p>
          {stops.map((stop, index) => (
            <StopCard key={stop.coursePlaceId} stop={stop} isLast={index === stops.length - 1} />
          ))}
        </div>
        <div className="pb-10" />
      </div>
    </div>
  )
}
