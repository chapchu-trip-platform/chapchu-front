'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Camera,
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
import { DEFAULT_ALBUM_COVER_URL } from '@/features/album/constants'
import type { AlbumDetail, AlbumSummary } from '@/features/album/types/album'
import { prioritizeAlbumCover } from '@/features/album/lib/album-cover-preference'
import { findTravelDiaryForCourse } from '@/features/album/lib/album-diary'
import { fetchMyPosts } from '@/features/community/api/community-api'
import { fetchSelectablePets } from '@/features/profile/api/pets-api'
import { formatPetName } from '@/lib/format-pet-name'

const ALBUM_PAGE_SIZE = 20

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
  const coverImage = album.photos[0]?.downloadUrl ?? DEFAULT_ALBUM_COVER_URL

  return (
    <InteractiveCard
      onClick={onClick}
      padding="none"
      className="group relative aspect-square overflow-hidden"
    >
      <Image
        src={coverImage}
        alt={`${petName} 여행 앨범`}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

      <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 backdrop-blur-sm">
        <Camera className="size-3 text-white" />
        <span className="text-[11px] font-semibold text-white">{album.photos.length}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 min-w-0 px-3 pb-3 pt-8">
        <h3 className="truncate text-[14px] font-bold leading-snug text-white">
          {petName}와 함께한 여행
        </h3>
        <p className="mt-1 text-[10px] text-white/75">{formatDate(album.travelDate)}</p>
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
  const [serverDiaries, setServerDiaries] = useState<Record<string, string>>({})
  const [visibleAlbumCount, setVisibleAlbumCount] = useState(ALBUM_PAGE_SIZE)
  const albumScrollRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScrollTop = () => {
      albumScrollRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('album-scroll-top', handleScrollTop)
    return () => window.removeEventListener('album-scroll-top', handleScrollTop)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    void fetchMyAlbums(controller.signal)
      .then((nextAlbums) => {
        if (controller.signal.aborted) return
        setAlbums(nextAlbums.map(prioritizeAlbumCover))
        setVisibleAlbumCount(ALBUM_PAGE_SIZE)
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
    const loadMoreElement = loadMoreRef.current
    const scrollElement = albumScrollRef.current
    if (
      listStatus !== 'success' ||
      !loadMoreElement ||
      visibleAlbumCount >= albums.length
    ) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setVisibleAlbumCount((current) => Math.min(current + ALBUM_PAGE_SIZE, albums.length))
      },
      {
        root: scrollElement,
        rootMargin: '0px 0px 240px 0px',
      }
    )

    observer.observe(loadMoreElement)
    return () => observer.disconnect()
  }, [albums.length, listStatus, visibleAlbumCount])

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

    void fetchMyPosts(controller.signal)
      .then((posts) => {
        if (controller.signal.aborted) return
        const serverDiary = findTravelDiaryForCourse(posts, selectedAlbum.courseId)
        setServerDiaries((current) => {
          if (serverDiary) {
            return { ...current, [selectedAlbum.courseId]: serverDiary }
          }
          if (!(selectedAlbum.courseId in current)) return current
          const next = { ...current }
          delete next[selectedAlbum.courseId]
          return next
        })
      })
      .catch(() => {
        // The album remains available even if the separate post request fails.
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
  }), [albums])
  const visibleAlbums = useMemo(
    () => albums.slice(0, visibleAlbumCount),
    [albums, visibleAlbumCount]
  )

  if (selectedAlbum) {
    if (detailStatus === 'success' && detail) {
      return (
        <CourseDetailScreen
          detail={detail}
          petName={getPetName(selectedAlbum.petId, petNames)}
          overallReview={serverDiaries[selectedAlbum.courseId]}
          onBack={() => setSelectedAlbum(null)}
        />
      )
    }
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-beige">
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar title="여행 앨범" />

      <div ref={albumScrollRef} className="flex-1 overflow-y-auto pb-24 no-scrollbar">
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
            <p className="text-[15px] font-medium text-warm-gray">아직 저장한 여행이 없어요</p>
            <p className="text-[13px] text-warm-gray/70">여행을 완료하고 후기를 저장하면 앨범이 만들어져요.</p>
          </div>
        )}

        {listStatus === 'success' && albums.length > 0 && (
          <div className="flex flex-col gap-3 p-4">
            <div
              aria-label="앨범 요약"
              className="flex items-center justify-center divide-x divide-border rounded-xl border border-border bg-card-surface px-2 py-2.5"
            >
              {[
                { label: '총 여행', value: `${stats.trips}회` },
                { label: '총 사진', value: `${stats.photos}장` },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-1 items-baseline justify-center gap-1 px-2 text-center">
                  <span className="text-[10px] text-warm-gray">{stat.label}</span>
                  <strong className="text-[12px] text-deep-brown">{stat.value}</strong>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {visibleAlbums.map((album) => (
                <AlbumCard
                  key={album.courseId}
                  album={album}
                  petName={getPetName(album.petId, petNames)}
                  onClick={() => openAlbum(album)}
                />
              ))}
            </div>

            {visibleAlbumCount < albums.length && (
              <div
                ref={loadMoreRef}
                aria-label="앨범 더 불러오기"
                className="flex h-8 items-center justify-center"
              >
                <Loader2 className="size-4 animate-spin text-sage-green" aria-hidden="true" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
