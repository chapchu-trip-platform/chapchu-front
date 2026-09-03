'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  ChevronRight,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { InteractiveCard } from '@/components/ui/interactive-card'
import { searchLocations } from '@/features/location/api/location-search-api'
import type { LocationLoadStatus } from '@/features/location/stores/location-store'
import type { SearchableLocation } from '@/features/location/types/location'
import TmapMap from '@/features/map/components/tmap-map'

interface MapSetupScreenProps {
  onBack: () => void
  onNext: (origin: SearchableLocation, destination: SearchableLocation) => void
  currentLocation?: { lat: number; lng: number }
  initialDestination?: SearchableLocation | null
  initialOrigin?: SearchableLocation | null
  locationStatus: LocationLoadStatus
}

type ActiveField = 'origin' | 'destination'
type SearchStatus = 'idle' | 'loading' | 'success' | 'error'

const SEARCH_DEBOUNCE_MS = 300
const MAX_RECENT_LOCATIONS = 5

interface LocationSearchFeedbackProps {
  action?: ReactNode
  description?: string
  icon: ReactNode
  role?: 'alert' | 'status'
  title: string
}

function LocationSearchFeedback({
  action,
  description,
  icon,
  role,
  title,
}: LocationSearchFeedbackProps) {
  return (
    <div
      role={role}
      className="flex h-full flex-col items-center justify-center px-6 text-center"
    >
      {icon}
      <p className="text-[13px] font-medium text-deep-brown">{title}</p>
      {description && <p className="mt-1 text-[12px] text-warm-gray">{description}</p>}
      {action}
    </div>
  )
}

export default function MapSetupScreen({
  onBack,
  onNext,
  currentLocation,
  initialDestination = null,
  initialOrigin = null,
  locationStatus,
}: MapSetupScreenProps) {
  const [origin, setOrigin] = useState<SearchableLocation | null>(initialOrigin)
  const [destination, setDestination] = useState<SearchableLocation | null>(
    initialDestination
  )
  const [originInput, setOriginInput] = useState(initialOrigin?.name ?? '')
  const [destinationInput, setDestinationInput] = useState(
    initialDestination?.name ?? ''
  )
  const [activeField, setActiveField] = useState<ActiveField | null>(null)
  const [recentLocations, setRecentLocations] = useState<SearchableLocation[]>([])
  const [searchResults, setSearchResults] = useState<SearchableLocation[]>([])
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle')
  const [retryCount, setRetryCount] = useState(0)

  const query = activeField === 'origin' ? originInput : destinationInput
  const normalizedQuery = activeField ? query.trim() : ''

  useEffect(() => {
    if (!activeField || normalizedQuery.length < 2) return

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      setSearchStatus('loading')
      void searchLocations(normalizedQuery, {
        signal: controller.signal,
      })
        .then((results) => {
          setSearchResults(results)
          setSearchStatus('success')
        })
        .catch((error: unknown) => {
          if ((error as { name?: string }).name === 'AbortError') return
          setSearchResults([])
          setSearchStatus('error')
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [activeField, normalizedQuery, retryCount])

  const activateField = (field: ActiveField) => {
    setSearchResults([])
    setSearchStatus('idle')
    setActiveField(field)
  }

  const saveRecentLocation = (location: SearchableLocation) => {
    const nextLocations = [
      location,
      ...recentLocations.filter((item) => item.id !== location.id),
    ].slice(0, MAX_RECENT_LOCATIONS)
    setRecentLocations(nextLocations)
  }

  const clearRecentLocations = () => {
    setRecentLocations([])
  }

  const handleSelect = (location: SearchableLocation) => {
    if (!activeField) return

    if (activeField === 'origin') {
      setOrigin(location)
      setOriginInput(location.name)
    } else {
      setDestination(location)
      setDestinationInput(location.name)
    }

    saveRecentLocation(location)
    setActiveField(null)
    setSearchResults([])
    setSearchStatus('idle')
  }

  const removeRecentLocation = (locationId: string) => {
    setRecentLocations((current) =>
      current.filter((item) => item.id !== locationId)
    )
  }

  const useCurrentLocation = () => {
    if (!currentLocation) return
    const location: SearchableLocation = {
      id: 'current-location',
      name: '현재 위치',
      address: '기기에서 확인한 현재 위치',
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
    }
    setOrigin(location)
    setOriginInput(location.name)
    setActiveField(null)
  }

  const selectedMapLocation = destination ?? origin
  const mapCenter = selectedMapLocation
    ? { lat: selectedMapLocation.latitude, lng: selectedMapLocation.longitude }
    : currentLocation
  const mapLocationLabel =
    selectedMapLocation?.name ?? (currentLocation ? '현재 위치' : '서울 시청 기준')

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar title="경로 설정" showBack onBack={onBack} />

      <div className="flex shrink-0 flex-col gap-3 p-4">
        <Button
          onClick={useCurrentLocation}
          disabled={locationStatus === 'requesting' || !currentLocation}
          variant="link"
          size="sm"
          className="ml-2 h-auto self-start p-0 no-underline"
        >
          <MapPin className="h-4 w-4 text-sage-green" />
          <span className="text-[13px] font-medium text-sage-green">
            {locationStatus === 'requesting' ? '현재 위치 확인 중' : '현재 위치 사용'}
          </span>
        </Button>

        <div className="overflow-hidden rounded-card border border-border bg-card-surface shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sage-green/15">
              <Navigation className="h-4 w-4 text-sage-green" />
            </div>
            <input
              aria-label="출발지"
              type="text"
              role="searchbox"
              inputMode="search"
              value={originInput}
              onFocus={() => activateField('origin')}
              onChange={(event) => {
                setOriginInput(event.target.value)
                setOrigin(null)
                activateField('origin')
              }}
              placeholder="출발지를 입력하세요"
              autoComplete="off"
              className="flex-1 bg-transparent text-[14px] text-deep-brown placeholder:text-warm-gray focus:outline-none"
            />
            {originInput && (
              <IconButton
                onClick={() => {
                  setOrigin(null)
                  setOriginInput('')
                  activateField('origin')
                }}
                size="sm"
                aria-label="출발지 지우기"
              >
                <X className="h-4 w-4 text-warm-gray" />
              </IconButton>
            )}
          </div>
          <div className="mx-4 h-px bg-border" />
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-soft-orange/15">
              <MapPin className="h-4 w-4 text-soft-orange" />
            </div>
            <input
              aria-label="도착지"
              type="text"
              role="searchbox"
              inputMode="search"
              value={destinationInput}
              onFocus={() => activateField('destination')}
              onChange={(event) => {
                setDestinationInput(event.target.value)
                setDestination(null)
                activateField('destination')
              }}
              placeholder="도착지를 입력하세요"
              autoComplete="off"
              className="flex-1 bg-transparent text-[14px] text-deep-brown placeholder:text-warm-gray focus:outline-none"
            />
            {destinationInput && (
              <IconButton
                onClick={() => {
                  setDestination(null)
                  setDestinationInput('')
                  activateField('destination')
                }}
                size="sm"
                aria-label="도착지 지우기"
              >
                <X className="h-4 w-4 text-warm-gray" />
              </IconButton>
            )}
          </div>
        </div>
      </div>

      <div
        data-testid="location-search-viewport"
        className="relative mx-4 h-0 min-h-52 flex-1 overflow-hidden rounded-card bg-sky-blue/20 shadow-sm"
      >
        {activeField ? (
          <div className="flex h-full min-h-0 flex-col bg-card-surface">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-4">
              <div>
                <p className="text-[11px] font-medium text-sage-green">
                  {activeField === 'origin' ? '출발지 선택' : '도착지 선택'}
                </p>
                <h3 className="mt-0.5 text-[16px] font-semibold text-deep-brown">
                  {normalizedQuery ? '검색 결과' : '최근 검색 위치'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {!normalizedQuery && recentLocations.length > 0 && (
                  <Button
                    onClick={clearRecentLocations}
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-[12px] text-warm-gray"
                  >
                    전체 삭제
                  </Button>
                )}
                <IconButton
                  onClick={() => setActiveField(null)}
                  variant="muted"
                  aria-label="위치 검색 닫기"
                >
                  <X className="h-4 w-4 text-warm-gray" />
                </IconButton>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pb-2 no-scrollbar">
              {!normalizedQuery && recentLocations.map((recent) => (
                <div
                  key={recent.id}
                  className="flex items-center border-b border-border/70 transition-[filter,background-color] last:border-b-0 hover:bg-muted/50 hover:brightness-[0.97] has-[button:active]:bg-muted has-[button:active]:brightness-[0.94]"
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(recent)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                      <Search className="h-4 w-4 text-warm-gray" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-deep-brown">
                        {recent.name}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-warm-gray">
                        {recent.address}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-warm-gray/60" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRecentLocation(recent.id)}
                    className="mr-3 flex size-9 flex-shrink-0 items-center justify-center text-warm-gray"
                    aria-label={`${recent.name} 최근 검색 삭제`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {!normalizedQuery && recentLocations.length === 0 && (
                <LocationSearchFeedback
                  icon={<Search className="mb-2 h-6 w-6 text-warm-gray/40" />}
                  title="최근 검색 위치가 없습니다"
                  description="장소를 검색하면 여기에 표시됩니다."
                />
              )}

              {normalizedQuery.length === 1 && (
                <LocationSearchFeedback
                  icon={<Search className="mb-2 h-6 w-6 text-warm-gray/40" />}
                  title="두 글자 이상 입력해주세요"
                />
              )}

              {normalizedQuery.length >= 2 && searchStatus === 'loading' && (
                <div
                  role="status"
                  className="flex h-full items-center justify-center gap-2 text-[13px] text-warm-gray"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-sage-green" />
                  위치를 검색하고 있어요…
                </div>
              )}

              {normalizedQuery.length >= 2 && searchStatus === 'error' && (
                <LocationSearchFeedback
                  role="alert"
                  icon={<AlertCircle className="mb-2 h-6 w-6 text-soft-orange" />}
                  title="위치를 검색하지 못했어요"
                  action={
                    <Button
                      onClick={() => {
                        setSearchResults([])
                        setSearchStatus('idle')
                        setRetryCount((count) => count + 1)
                      }}
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-sage-green"
                    >
                      다시 시도
                    </Button>
                  }
                />
              )}

              {normalizedQuery.length >= 2 &&
                searchStatus === 'success' &&
                searchResults.map((result) => (
                  <InteractiveCard
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    variant="plain"
                    padding="none"
                    className="flex items-center gap-3 rounded-none border-b border-border/70 px-4 py-3 transition-[background-color,filter] last:border-b-0 hover:bg-muted/50 hover:brightness-[0.97] active:bg-muted active:brightness-[0.94] focus-visible:bg-muted/50"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sage-green/15">
                      <MapPin className="h-4 w-4 text-sage-green" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-deep-brown">
                        {result.name}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-warm-gray">
                        {result.address}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-warm-gray/60" />
                  </InteractiveCard>
                ))}

              {normalizedQuery.length >= 2 &&
                searchStatus === 'success' &&
                searchResults.length === 0 && (
                  <LocationSearchFeedback
                    icon={<Search className="mb-2 h-6 w-6 text-warm-gray/40" />}
                    title="검색 결과가 없습니다"
                    description="다른 장소 이름이나 주소를 입력해보세요."
                  />
                )}
            </div>
          </div>
        ) : (
          <>
            <TmapMap
              center={mapCenter}
              locationLabel={mapLocationLabel}
              showMarker={Boolean(mapCenter)}
            />

            {(!origin || !destination) && (
              <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
                <div className="flex max-w-64 items-center gap-2 rounded-full bg-white/90 px-3 py-2 shadow-sm">
                  <Search className="h-4 w-4 flex-shrink-0 text-warm-gray/60" />
                  <p className="text-[12px] leading-snug text-warm-gray/80">
                    검색 결과에서 출발지와 도착지를 선택해주세요
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="safe-bottom-action mt-auto shrink-0 px-4 pt-4">
        <Button
          onClick={() => {
            if (origin && destination) onNext(origin, destination)
          }}
          disabled={!origin || !destination}
          fullWidth
          size="lg"
        >
          다음
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
