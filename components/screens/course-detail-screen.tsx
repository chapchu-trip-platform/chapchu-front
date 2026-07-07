'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  Navigation, Clock, CloudSun, Thermometer, Camera,
  Star, MapPin, ChevronDown, ChevronUp, Car, Footprints, ThumbsUp,
} from 'lucide-react'
import TopBar from '@/components/top-bar'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WaypointData {
  order: number
  name: string
  address: string
  arrival: string
  departure: string
  note: string
  rating: number
  petFriendlyScore: number
  image: string
  photos: { id: string; url: string }[]
}

interface CourseDetailScreenProps {
  albumTitle: string
  albumImage: string
  pet: string
  from: string
  to: string
  distance: string
  duration: string
  transport: string
  weather: string
  temperature: number
  overallRating: number
  totalPhotos: number
  waypoints: WaypointData[]
  onBack: () => void
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatChip({
  icon: Icon,
  label,
  value,
  iconClass,
}: {
  icon: React.ElementType
  label: string
  value: string
  iconClass?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 p-3 bg-warm-beige rounded-card">
      <Icon className={cn('w-4 h-4', iconClass ?? 'text-soft-orange')} />
      <p className="text-[12px] font-bold text-deep-brown leading-tight">{value}</p>
      <p className="text-[10px] text-warm-gray">{label}</p>
    </div>
  )
}

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-4 h-4' : 'w-3 h-3'
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(sz, i < rating ? 'text-soft-orange fill-soft-orange' : 'text-border fill-border')}
        />
      ))}
    </div>
  )
}

function WaypointCard({ stop, isLast }: { stop: WaypointData; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0 pt-1">
        <div className="w-7 h-7 rounded-full bg-sage-green flex items-center justify-center shadow-sm z-10">
          <span className="text-[11px] font-bold text-white">{stop.order}</span>
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-sage-green/25 mt-1 min-h-[2rem]" />}
      </div>

      {/* Card */}
      <div className="flex-1 pb-4">
        <div
          className={cn(
            'bg-card-surface rounded-card border border-border overflow-hidden',
            'transition-shadow active:opacity-90',
          )}
        >
          {/* Place image + name */}
          <div className="relative h-28">
            <Image src={stop.image} alt={stop.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5">
              <p className="text-white text-[13px] font-bold leading-tight">{stop.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-white/70 flex-shrink-0" />
                <p className="text-white/70 text-[10px] truncate">{stop.address}</p>
              </div>
            </div>
          </div>

          {/* Arrival / departure / pet score row */}
          <div className="flex items-center gap-0 border-b border-border">
            <div className="flex-1 flex flex-col items-center py-2.5 border-r border-border">
              <p className="text-[9px] font-semibold text-warm-gray tracking-wide uppercase">도착</p>
              <p className="text-[13px] font-bold text-deep-brown mt-0.5">{stop.arrival}</p>
            </div>
            <div className="flex-1 flex flex-col items-center py-2.5 border-r border-border">
              <p className="text-[9px] font-semibold text-warm-gray tracking-wide uppercase">출발</p>
              <p className="text-[13px] font-bold text-deep-brown mt-0.5">{stop.departure}</p>
            </div>
            <div className="flex-1 flex flex-col items-center py-2.5">
              <p className="text-[9px] font-semibold text-warm-gray tracking-wide uppercase">반려견</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                <ThumbsUp className="w-3 h-3 text-sage-green" />
                <p className="text-[13px] font-bold text-sage-green">{stop.petFriendlyScore}%</p>
              </div>
            </div>
          </div>

          {/* Note + rating */}
          <div className="px-3 pt-2.5 pb-2">
            <div className="flex items-center justify-between mb-1.5">
              <StarRow rating={stop.rating} />
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-0.5 text-[11px] text-warm-gray"
                aria-label={expanded ? '접기' : '메모 더 보기'}
              >
                {expanded ? '접기' : '더보기'}
                {expanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className={cn('text-[12px] text-warm-gray leading-relaxed', !expanded && 'line-clamp-2')}>
              {stop.note}
            </p>
          </div>

          {/* Photo strip — shown when expanded */}
          {expanded && stop.photos.length > 0 && (
            <div className="px-3 pb-3">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {stop.photos.map((ph) => (
                  <div
                    key={ph.id}
                    className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-border"
                  >
                    <Image src={ph.url} alt="" fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Route Map SVG ────────────────────────────────────────────────────────────

function RouteMapSVG({ stopCount }: { stopCount: number }) {
  // Fixed control-point path for up to 5 stops
  const paths = [
    'M 24,72 C 70,40 140,72 200,48 C 255,24 310,56 346,36',
    'M 24,72 C 60,44 110,68 165,52 C 215,36 265,60 315,44 C 340,36 355,30 366,24',
  ]
  const path = stopCount <= 3 ? paths[0] : paths[1]

  const stops = Array.from({ length: stopCount }, (_, i) => {
    const t = i / (stopCount - 1)
    // Approximate positions along the bezier
    const positions = [
      { cx: 24, cy: 72 },
      { cx: 110, cy: 54 },
      { cx: 200, cy: 48 },
      { cx: 290, cy: 40 },
      { cx: 366, cy: 24 },
    ]
    return positions[Math.round(t * (stopCount - 1))] ?? { cx: 24 + t * 342, cy: 72 - t * 48 }
  })

  return (
    <div className="mx-4 mt-3 rounded-card overflow-hidden bg-sky-blue/15 border border-sky-blue/30">
      <svg viewBox="0 0 390 96" className="w-full h-24" aria-hidden="true">
        {/* Grid lines */}
        {[24, 48, 72].map((y) => (
          <line key={y} x1="0" y1={y} x2="390" y2={y} stroke="#8ECAE6" strokeWidth="0.5" strokeDasharray="4,6" />
        ))}
        {/* Route path */}
        <path d={path} stroke="#6FAF8E" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,3" />
        {/* Stop dots */}
        {stops.map((s, i) => (
          <g key={i}>
            <circle cx={s.cx} cy={s.cy} r="6" fill="white" stroke="#6FAF8E" strokeWidth="2" />
            <circle
              cx={s.cx}
              cy={s.cy}
              r="3"
              fill={i === 0 ? '#6FAF8E' : i === stops.length - 1 ? '#E76F51' : '#F4A261'}
            />
          </g>
        ))}
      </svg>
      <div className="flex items-center justify-between px-4 pb-2 -mt-1">
        <p className="text-[10px] text-warm-gray font-medium truncate max-w-[120px]">출발</p>
        <div className="flex gap-3">
          {[
            { color: 'bg-sage-green', label: '출발' },
            { color: 'bg-soft-orange', label: '경유' },
            { color: 'bg-danger', label: '도착' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <div className={cn('w-2 h-2 rounded-full', l.color)} />
              <span className="text-[9px] text-warm-gray">{l.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-warm-gray font-medium truncate max-w-[120px] text-right">도착</p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CourseDetailScreen({
  albumTitle,
  albumImage,
  pet,
  from,
  to,
  distance,
  duration,
  transport,
  weather,
  temperature,
  overallRating,
  totalPhotos,
  waypoints,
  onBack,
}: CourseDetailScreenProps) {
  const TransportIcon = transport.includes('도보') ? Footprints : Car

  return (
    <div className="flex flex-col flex-1 bg-warm-beige overflow-hidden">
      <TopBar title="코스 상세" showBack onBack={onBack} />

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Hero */}
        <div className="relative h-52 mx-4 mt-4 rounded-card overflow-hidden">
          <Image src={albumImage} alt={albumTitle} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2 className="text-white text-[16px] font-bold text-balance leading-snug">{albumTitle}</h2>
            <p className="text-white/75 text-[12px] mt-1">{pet}</p>
          </div>
          {/* Overall rating badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
            <Star className="w-3.5 h-3.5 text-soft-orange fill-soft-orange" />
            <span className="text-white text-[12px] font-bold">{overallRating}.0</span>
          </div>
        </div>

        {/* Route header */}
        <div className="mx-4 mt-3 p-4 bg-card-surface rounded-card border border-border">
          {/* From → To */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-semibold text-warm-gray uppercase tracking-wide mb-0.5">출발지</p>
              <p className="text-[12px] font-semibold text-deep-brown truncate">{from}</p>
            </div>
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-sage-green border-2 border-white shadow-sm" />
              <div className="w-px h-5 bg-sage-green/30" />
              <TransportIcon className="w-4 h-4 text-soft-orange" />
              <div className="w-px h-5 bg-danger/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-danger border-2 border-white shadow-sm" />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[9px] font-semibold text-warm-gray uppercase tracking-wide mb-0.5">도착지</p>
              <p className="text-[12px] font-semibold text-deep-brown truncate">{to}</p>
            </div>
          </div>

          {/* 5-chip stat row */}
          <div className="flex gap-2">
            <StatChip icon={Navigation} label="거리" value={distance} iconClass="text-soft-orange" />
            <StatChip icon={Clock} label="소요시간" value={duration} iconClass="text-soft-orange" />
            <StatChip icon={CloudSun} label="날씨" value={weather} iconClass="text-sky-blue" />
            <StatChip icon={Thermometer} label="기온" value={`${temperature}°`} iconClass="text-danger" />
            <StatChip icon={Camera} label="사진" value={`${totalPhotos}장`} iconClass="text-sage-green" />
          </div>
        </div>

        {/* Route map */}
        <RouteMapSVG stopCount={waypoints.length} />

        {/* Overall rating row */}
        <div className="mx-4 mt-3 flex items-center justify-between px-4 py-3 bg-card-surface rounded-card border border-border">
          <p className="text-[13px] font-semibold text-deep-brown">전체 만족도</p>
          <div className="flex items-center gap-2">
            <StarRow rating={overallRating} size="md" />
            <span className="text-[13px] font-bold text-soft-orange">{overallRating}.0</span>
          </div>
        </div>

        {/* Waypoint timeline */}
        <div className="mx-4 mt-4 mb-2">
          <p className="text-[13px] font-bold text-deep-brown mb-3">
            방문 코스 <span className="text-warm-gray font-normal">({waypoints.length}곳)</span>
          </p>
          <div>
            {waypoints.map((stop, i) => (
              <WaypointCard key={stop.order} stop={stop} isLast={i === waypoints.length - 1} />
            ))}
          </div>
        </div>

        <div className="pb-10" />
      </div>
    </div>
  )
}
