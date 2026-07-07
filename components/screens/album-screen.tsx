'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  MapPin, Navigation, CloudSun, Star,
  ChevronRight, BookOpen, Camera,
} from 'lucide-react'
import TopBar from '@/components/top-bar'
import CourseDetailScreen from '@/components/screens/course-detail-screen'
import { mockAlbums, mockCourseDetails, type AlbumSummary } from '@/data/mock'
import { cn } from '@/lib/utils'

interface AlbumScreenProps {
  onViewDetail: () => void
}

// ─── Star row helper ──────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'w-3 h-3',
            i < rating ? 'text-soft-orange fill-soft-orange' : 'text-border fill-border',
          )}
        />
      ))}
    </div>
  )
}

// ─── Album summary card ───────────────────────────────────────────────────────

function AlbumCard({
  album,
  onClick,
}: {
  album: AlbumSummary
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-card-surface rounded-card border border-border overflow-hidden shadow-sm text-left active:opacity-80 transition-opacity"
    >
      {/* Cover image */}
      <div className="relative h-48">
        <Image src={album.image} alt={album.title} fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />

        {/* Top-right badge: photo count */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
          <Camera className="w-3 h-3 text-white" />
          <span className="text-white text-[11px] font-semibold">{album.photoCount}</span>
        </div>

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <h3 className="text-[16px] font-bold text-white text-balance leading-snug">{album.title}</h3>
          <p className="text-[11px] text-white/75 mt-0.5">{album.date} · {album.weather} {album.temperature}°</p>
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-warm-gray" />
            <span className="text-[12px] text-warm-gray">{album.distance}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-warm-gray" />
            <span className="text-[12px] text-warm-gray">{album.stops}곳</span>
          </div>
          <div className="flex items-center gap-1">
            <CloudSun className="w-3.5 h-3.5 text-warm-gray" />
            <span className="text-[12px] text-warm-gray">{album.duration}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <StarRow rating={album.rating} />
          <ChevronRight className="w-4 h-4 text-warm-gray" />
        </div>
      </div>

      {/* Pet pill */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <div className="relative w-6 h-6 rounded-full overflow-hidden border border-border flex-shrink-0">
          <Image src="/images/dog-hero.png" alt="반려동물" fill className="object-cover" />
        </div>
        <span className="text-[11px] text-warm-gray">{album.pet}</span>
      </div>
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AlbumScreen({ onViewDetail }: AlbumScreenProps) {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)

  const selectedAlbum = selectedAlbumId ? mockAlbums.find((a) => a.id === selectedAlbumId) : null
  const selectedCourse = selectedAlbumId ? mockCourseDetails[selectedAlbumId] : null

  // Show course detail inline when an album is selected
  if (selectedAlbum && selectedCourse) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <CourseDetailScreen
          albumTitle={selectedAlbum.title}
          albumImage={selectedAlbum.image}
          pet={selectedAlbum.pet}
          from={selectedCourse.from}
          to={selectedCourse.to}
          distance={selectedCourse.distance}
          duration={selectedCourse.duration}
          transport={selectedCourse.transport}
          weather={selectedCourse.weather}
          temperature={selectedCourse.temperature}
          overallRating={selectedCourse.overallRating}
          totalPhotos={selectedCourse.totalPhotos}
          waypoints={selectedCourse.waypoints}
          onBack={() => setSelectedAlbumId(null)}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="여행 앨범" />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {mockAlbums.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-24 gap-4">
            <BookOpen className="w-12 h-12 text-warm-gray/40" />
            <p className="text-[15px] text-warm-gray font-medium">아직 여행 기록이 없어요</p>
            <p className="text-[13px] text-warm-gray/70">반려동물과 첫 여행을 떠나볼까요?</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4">
            {/* Summary stat strip */}
            <div className="flex gap-2">
              {[
                { label: '총 여행', value: `${mockAlbums.length}회` },
                { label: '방문 장소', value: `${mockAlbums.reduce((s, a) => s + a.stops, 0)}곳` },
                { label: '총 사진', value: `${mockAlbums.reduce((s, a) => s + a.photoCount, 0)}장` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex-1 text-center py-3 bg-card-surface rounded-card border border-border"
                >
                  <p className="text-[15px] font-bold text-deep-brown">{stat.value}</p>
                  <p className="text-[10px] text-warm-gray mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {mockAlbums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onClick={() => setSelectedAlbumId(album.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
