'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, MapPin } from 'lucide-react'
import { loadTmapSdk } from '@/lib/load-tmap-sdk'
import { cn } from '@/lib/utils'

const SEOUL_CITY_HALL = {
  lat: 37.5665,
  lng: 126.978,
}

type TmapLoadStatus = 'loading' | 'ready' | 'error'
type TmapMarkerVariant = 'default' | 'profile'

interface TmapMapProps {
  center?: {
    lat: number
    lng: number
  }
  zoom?: number
  className?: string
  locationLabel?: string
  showMarker?: boolean
  showZoomControl?: boolean
  interactive?: boolean
  markerVariant?: TmapMarkerVariant
  profileImageSrc?: string
}

export default function TmapMap({
  center = SEOUL_CITY_HALL,
  zoom = 15,
  className = '',
  locationLabel = '서울 시청 기준',
  showMarker = false,
  showZoomControl = true,
  interactive = true,
  markerVariant = 'default',
  profileImageSrc = '/images/dog-hero.png',
}: TmapMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef(center)
  const mapInstanceRef = useRef<TmapMapInstance | null>(null)
  const markerInstanceRef = useRef<TmapMarkerInstance | null>(null)
  const tmapNamespaceRef = useRef<Tmapv2Namespace | null>(null)
  const [status, setStatus] = useState<TmapLoadStatus>('loading')

  useEffect(() => {
    centerRef.current = center
  }, [center])

  useEffect(() => {
    let isMounted = true
    const mapRoot = containerRef.current

    loadTmapSdk()
      .then((Tmapv2) => {
        if (!isMounted || !mapRoot) return

        const initialCenter = centerRef.current
        const mapCenter = new Tmapv2.LatLng(initialCenter.lat, initialCenter.lng)

        tmapNamespaceRef.current = Tmapv2
        mapInstanceRef.current = new Tmapv2.Map(mapRoot, {
          center: mapCenter,
          width: '100%',
          height: '100%',
          zoom,
          zoomControl: showZoomControl,
        })

        setStatus('ready')
      })
      .catch(() => {
        if (isMounted) {
          setStatus('error')
        }
      })

    return () => {
      isMounted = false
      markerInstanceRef.current?.setMap?.(null)
      markerInstanceRef.current = null
      mapInstanceRef.current?.destroy?.()
      mapInstanceRef.current?.remove?.()
      mapInstanceRef.current = null
      tmapNamespaceRef.current = null
      mapRoot?.replaceChildren()
    }
  }, [showZoomControl, zoom])

  useEffect(() => {
    if (status !== 'ready') return
    const Tmapv2 = tmapNamespaceRef.current
    const mapInstance = mapInstanceRef.current
    if (!Tmapv2 || !mapInstance) return

    const nextCenter = new Tmapv2.LatLng(center.lat, center.lng)
    mapInstance.setCenter?.(nextCenter)

    if (!showMarker || markerVariant === 'profile') {
      markerInstanceRef.current?.setMap?.(null)
      markerInstanceRef.current = null
      return
    }

    if (markerInstanceRef.current) {
      markerInstanceRef.current.setPosition?.(nextCenter)
      return
    }

    markerInstanceRef.current = new Tmapv2.Marker({
      position: nextCenter,
      map: mapInstance,
      title: locationLabel,
    })
  }, [center.lat, center.lng, locationLabel, markerVariant, showMarker, status])

  return (
    <div
      className={cn(
        'relative h-full min-h-52 w-full overflow-hidden bg-sky-blue/20',
        className
      )}
    >
      <div
        ref={containerRef}
        aria-label="TMAP 지도"
        className={cn(
          'absolute inset-0',
          !interactive && 'pointer-events-none select-none touch-none'
        )}
        data-testid="tmap-container"
      />

      {status === 'ready' && showMarker && markerVariant === 'profile' && (
        <div
          aria-label={`${locationLabel} 프로필 위치 마커`}
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-full flex-col items-center"
          data-testid="profile-location-marker"
        >
          <div className="relative z-10 size-12 overflow-hidden rounded-full border-[3px] border-white bg-card-surface shadow-md ring-2 ring-sage-green">
            <Image src={profileImageSrc} alt="" fill sizes="48px" className="object-cover" />
          </div>
          <div className="-mt-1.5 size-3.5 rotate-45 rounded-[3px] border-b-2 border-r-2 border-sage-green bg-white shadow-sm" />
        </div>
      )}

      {status === 'loading' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-sky-blue/20 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-sage-green" />
            <span className="text-[12px] font-medium text-deep-brown">지도를 불러오는 중입니다</span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-sky-blue/20 px-6">
          <div className="max-w-56 rounded-card bg-white/90 px-4 py-3 text-center shadow-sm">
            <AlertCircle className="mx-auto mb-2 h-5 w-5 text-soft-orange" />
            <p className="text-[13px] font-semibold text-deep-brown">지도를 불러오지 못했어요</p>
            <p className="mt-1 text-[11px] leading-relaxed text-warm-gray">
              잠시 후 다시 시도하거나 TMAP 설정을 확인해주세요.
            </p>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 shadow-sm">
          <MapPin className="h-3.5 w-3.5 text-sage-green" />
          <span className="text-[11px] font-medium text-deep-brown">{locationLabel}</span>
        </div>
      )}
    </div>
  )
}
