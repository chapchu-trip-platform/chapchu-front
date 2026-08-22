'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, MapPin } from 'lucide-react'
import { loadTmapSdk } from '@/lib/load-tmap-sdk'
import { cn } from '@/lib/utils'

const SEOUL_CITY_HALL = {
  lat: 37.5665,
  lng: 126.978,
}

type TmapLoadStatus = 'loading' | 'ready' | 'error'

interface TmapMapProps {
  center?: {
    lat: number
    lng: number
  }
  zoom?: number
  className?: string
  locationLabel?: string
  showMarker?: boolean
}

export default function TmapMap({
  center = SEOUL_CITY_HALL,
  zoom = 15,
  className = '',
  locationLabel = '서울 시청 기준',
  showMarker = false,
}: TmapMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<TmapLoadStatus>('loading')

  useEffect(() => {
    let isMounted = true
    let mapInstance: TmapMapInstance | null = null
    let markerInstance: TmapMarkerInstance | null = null
    const mapRoot = containerRef.current

    loadTmapSdk()
      .then((Tmapv2) => {
        if (!isMounted || !mapRoot) return

        const mapCenter = new Tmapv2.LatLng(center.lat, center.lng)

        mapInstance = new Tmapv2.Map(mapRoot, {
          center: mapCenter,
          width: '100%',
          height: '100%',
          zoom,
        })

        if (showMarker) {
          markerInstance = new Tmapv2.Marker({
            position: mapCenter,
            map: mapInstance,
            title: locationLabel,
          })
        }

        setStatus('ready')
      })
      .catch(() => {
        if (isMounted) {
          setStatus('error')
        }
      })

    return () => {
      isMounted = false
      markerInstance?.setMap?.(null)
      mapInstance?.destroy?.()
      mapInstance?.remove?.()
      mapRoot?.replaceChildren()
    }
  }, [center.lat, center.lng, locationLabel, showMarker, zoom])

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
        className="absolute inset-0"
        data-testid="tmap-container"
      />

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
