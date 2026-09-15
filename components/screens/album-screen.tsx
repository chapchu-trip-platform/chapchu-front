'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Camera,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import TopBar from '@/components/top-bar'
import CourseDetailScreen from '@/components/screens/course-detail-screen'
import { Button } from '@/components/ui/button'
import { InteractiveCard } from '@/components/ui/interactive-card'
import {
  fetchAlbumDetail,
  fetchMyAlbums,
  getAlbumErrorMessage,
} from '@/features/album/api/albums-api'
import type { AlbumDetail, AlbumSummary } from '@/features/album/types/album'
import { fetchSelectablePets } from '@/features/profile/api/pets-api'
import { formatPetName } from '@/lib/format-pet-name'

function formatDate(value: string | null) {
  if (!value) return '여행 날짜 미정'
  const [year, month, day] = value.split('-')
  return year && month && day ? `${year}.${month}.${day}` : value
}

function getPetName(petId: string | null, petNames: Map<string, string>) {
  if (!petId) return formatPetName(null)
  return formatPetName(petNames.get(petId))
}

function AlbumCard({
  album,
  petName,
  onClick,
}: {
  album: AlbumSummary
  petName: string
  onClick: () => void
}) {
  const coverImage = album.photos[0]?.downloadUrl ?? '/placeholder.jpg'
  const publicCount = album.photos.filter((photo) => photo.isPublic).length
  const privateCount = album.photos.length - publicCount

  return (
    <InteractiveCard onClick={onClick} padding="none" className="overflow-hidden">
      <div className="relative h-48">
        <Image src={coverImage} alt={`${petName} 여행 앨범`} fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
          <Camera className="size-3 text-white" />
          <span className="text-[11px] font-semibold text-white">{album.photos.length}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
          <h3 className="text-balance text-[16px] font-bold leading-snug text-white">{petName}와 함께한 여행</h3>
          <p className="mt-0.5 text-[11px] text-white/75">{formatDate(album.travelDate)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4 text-[11px] text-warm-gray">
          <span className="flex items-center gap-1"><Eye className="size-3.5 text-sage-green" /> 공개 {publicCount}</span>
          <span className="flex items-center gap-1"><EyeOff className="size-3.5" /> 나만 보기 {privateCount}</span>
        </div>
        <ChevronRight className="size-4 text-warm-gray" />
      </div>
    </InteractiveCard>
  )
}

export default function AlbumScreen() {
  const [albums, setAlbums] = useState<AlbumSummary[]>([])
  const [petNames, setPetNames] = useState(new Map<string, string>())
  const [listStatus, setListStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [listError, setListError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumSummary | null>(null)
  const [detail, setDetail] = useState<AlbumDetail | null>(null)
  const [detailStatus, setDetailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailReloadKey, setDetailReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    void fetchMyAlbums(controller.signal)
      .then((nextAlbums) => {
        if (controller.signal.aborted) return
        setAlbums(nextAlbums)
        setListStatus('success')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setListStatus('error')
        setListError(getAlbumErrorMessage(error))
      })

    void fetchSelectablePets(controller.signal)
      .then((pets) => {
        if (controller.signal.aborted) return
        setPetNames(new Map(pets.map((pet) => [pet.id, pet.name])))
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setPetNames(new Map())
      })

    return () => controller.abort()
  }, [reloadKey])

  useEffect(() => {
    if (!selectedAlbum) return
    const controller = new AbortController()

    void fetchAlbumDetail(selectedAlbum, controller.signal)
      .then((nextDetail) => {
        if (controller.signal.aborted) return
        setDetail(nextDetail)
        setDetailStatus('success')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setDetailStatus('error')
        setDetailError(getAlbumErrorMessage(error))
      })

    return () => controller.abort()
  }, [detailReloadKey, selectedAlbum])

  const openAlbum = (album: AlbumSummary) => {
    setDetail(null)
    setDetailStatus('loading')
    setDetailError(null)
    setSelectedAlbum(album)
  }

  const stats = useMemo(() => ({
    trips: albums.length,
    photos: albums.reduce((count, album) => count + album.photos.length, 0),
    publicPhotos: albums.reduce(
      (count, album) => count + album.photos.filter((photo) => photo.isPublic).length,
      0
    ),
  }), [albums])

  if (selectedAlbum) {
    if (detailStatus === 'success' && detail) {
      return (
        <CourseDetailScreen
          detail={detail}
          petName={getPetName(selectedAlbum.petId, petNames)}
          onBack={() => setSelectedAlbum(null)}
        />
      )
    }
    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-warm-beige">
        <TopBar title="앨범 상세" showBack onBack={() => setSelectedAlbum(null)} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          {detailStatus === 'loading' ? (
            <><Loader2 className="size-8 animate-spin text-sage-green" /><p className="text-[13px] text-warm-gray">앨범 상세를 불러오는 중이에요.</p></>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-danger" role="alert">{detailError}</p>
              <Button onClick={() => {
                setDetail(null)
                setDetailStatus('loading')
                setDetailError(null)
                setDetailReloadKey((value) => value + 1)
              }} variant="outline">다시 시도</Button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar title="여행 앨범" />

      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        {listStatus === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-3 py-28">
            <Loader2 className="size-8 animate-spin text-sage-green" />
            <p className="text-[13px] text-warm-gray">앨범을 불러오는 중이에요.</p>
          </div>
        )}

        {listStatus === 'error' && (
          <div className="flex flex-col items-center justify-center gap-4 px-8 py-28 text-center">
            <BookOpen className="size-12 text-warm-gray/40" />
            <p className="text-[13px] leading-relaxed text-danger" role="alert">{listError}</p>
            <Button onClick={() => {
              setListStatus('loading')
              setListError(null)
              setReloadKey((value) => value + 1)
            }} variant="outline">다시 시도</Button>
          </div>
        )}

        {listStatus === 'success' && albums.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <BookOpen className="size-12 text-warm-gray/40" />
            <p className="text-[15px] font-medium text-warm-gray">아직 여행 사진이 없어요</p>
            <p className="text-[13px] text-warm-gray/70">여행 중 사진을 저장하면 앨범이 만들어져요.</p>
          </div>
        )}

        {listStatus === 'success' && albums.length > 0 && (
          <div className="flex flex-col gap-4 p-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '총 여행', value: `${stats.trips}회` },
                { label: '총 사진', value: `${stats.photos}장` },
                { label: '공개 사진', value: `${stats.publicPhotos}장` },
              ].map((stat) => (
                <div key={stat.label} className="rounded-card border border-border bg-card-surface py-3 text-center">
                  <p className="text-[15px] font-bold text-deep-brown">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] text-warm-gray">{stat.label}</p>
                </div>
              ))}
            </div>

            {albums.map((album) => (
              <AlbumCard
                key={album.courseId}
                album={album}
                petName={getPetName(album.petId, petNames)}
                onClick={() => openAlbum(album)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
