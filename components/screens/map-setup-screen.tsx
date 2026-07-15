'use client'

import { useState } from 'react'
import { ChevronRight, MapPin, Navigation, Search, Trash2, X } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import TmapMap from '@/features/map/components/tmap-map'

interface MapSetupScreenProps {
  onBack: () => void
  onNext: () => void
}

const searchResults = [
  { name: '서울숲 공원', address: '서울 성동구 뚝섬로 273' },
  { name: '서울역', address: '서울 용산구 한강대로 405' },
  { name: '서울랜드', address: '경기 과천시 광명로 181' },
]

const initialRecentSearches = ['제주 올레길', '경복궁', '가평 자라섬']

export default function MapSetupScreen({ onBack, onNext }: MapSetupScreenProps) {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null)
  const [query, setQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState(initialRecentSearches)

  const setCurrentField = activeField === 'origin' ? setOrigin : setDestination

  const handleSelect = (name: string) => {
    setCurrentField(name)
    setRecentSearches((current) => [name, ...current.filter((item) => item !== name)].slice(0, 5))
    setActiveField(null)
    setQuery('')
  }

  const removeRecentSearch = (name: string) => {
    setRecentSearches((current) => current.filter((item) => item !== name))
  }

  const filteredSearchResults = searchResults.filter((result) => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) return true

    return `${result.name} ${result.address}`.toLowerCase().includes(normalizedQuery)
  })

  return (
    <div className="flex flex-col flex-1 bg-warm-beige">
      <TopBar title="경로 설정" showBack onBack={onBack} />

      <div className="flex flex-col gap-3 p-4">
        {/* Use current location */}
        <button
          onClick={() => { setOrigin('현재 위치'); setActiveField(null); setQuery('') }}
          className="ml-2 flex items-center gap-2 self-start"
        >
          <MapPin className="h-4 w-4 text-sage-green" />
          <span className="text-[13px] font-medium text-sage-green">현재 위치 사용</span>
        </button>

        {/* Origin and destination */}
        <div className="overflow-hidden rounded-card border border-border bg-card-surface shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sage-green/15">
              <Navigation className="h-4 w-4 text-sage-green" />
            </div>
            <input
              type="text"
              value={origin}
              onFocus={() => setActiveField('origin')}
              onChange={(e) => { setOrigin(e.target.value); setQuery(e.target.value) }}
              placeholder="출발지를 입력하세요"
              className="flex-1 bg-transparent text-[14px] text-deep-brown placeholder:text-warm-gray focus:outline-none"
            />
            {origin && (
              <button onClick={() => setOrigin('')} aria-label="출발지 지우기">
                <X className="h-4 w-4 text-warm-gray" />
              </button>
            )}
          </div>
          <div className="mx-4 h-px bg-border" />
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-soft-orange/15">
              <MapPin className="h-4 w-4 text-soft-orange" />
            </div>
            <input
              type="text"
              value={destination}
              onFocus={() => setActiveField('destination')}
              onChange={(e) => { setDestination(e.target.value); setQuery(e.target.value) }}
              placeholder="도착지를 입력하세요"
              className="flex-1 bg-transparent text-[14px] text-deep-brown placeholder:text-warm-gray focus:outline-none"
            />
            {destination && (
              <button onClick={() => setDestination('')} aria-label="도착지 지우기">
                <X className="h-4 w-4 text-warm-gray" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Map preview or location search */}
      <div className="relative mx-4 min-h-52 flex-1 overflow-hidden rounded-card bg-sky-blue/20 shadow-sm">
        {activeField ? (
          <div className="flex h-full flex-col bg-card-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div>
                <p className="text-[11px] font-medium text-sage-green">
                  {activeField === 'origin' ? '출발지 선택' : '도착지 선택'}
                </p>
                <h3 className="mt-0.5 text-[16px] font-semibold text-deep-brown">
                  {query ? '검색 결과' : '최근 검색 위치'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {!query && recentSearches.length > 0 && (
                  <button
                    onClick={() => setRecentSearches([])}
                    className="px-2 py-1 text-[12px] font-medium text-warm-gray"
                  >
                    전체 삭제
                  </button>
                )}
                <button
                  onClick={() => { setActiveField(null); setQuery('') }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
                  aria-label="위치 검색 닫기"
                >
                  <X className="h-4 w-4 text-warm-gray" />
                </button>
              </div>
            </div>

            <div
              className={`min-h-0 flex-1 overflow-y-auto no-scrollbar ${query ? 'py-2' : 'pb-2'}`}
            >
              {!query && recentSearches.map((recent) => (
                <div
                  key={recent}
                  className="flex items-center border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/50"
                >
                  <button
                    onClick={() => handleSelect(recent)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                      <Search className="h-4 w-4 text-warm-gray" />
                    </div>
                    <span className="truncate text-[14px] font-medium text-deep-brown">{recent}</span>
                    <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 text-warm-gray/60" />
                  </button>
                  <button
                    onClick={() => removeRecentSearch(recent)}
                    className="mr-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-warm-gray"
                    aria-label={`${recent} 최근 검색 삭제`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {!query && recentSearches.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <Search className="mb-2 h-6 w-6 text-warm-gray/40" />
                  <p className="text-[13px] font-medium text-deep-brown">최근 검색 위치가 없습니다</p>
                  <p className="mt-1 text-[12px] text-warm-gray">장소를 검색하면 여기에 표시됩니다.</p>
                </div>
              )}

              {query && filteredSearchResults.map((result) => (
                <button
                  key={result.name}
                  onClick={() => handleSelect(result.name)}
                  className="flex w-full items-center gap-3 border-b border-border/70 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sage-green/15">
                    <MapPin className="h-4 w-4 text-sage-green" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-deep-brown">{result.name}</p>
                    <p className="mt-0.5 truncate text-[12px] text-warm-gray">{result.address}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-warm-gray/60" />
                </button>
              ))}

              {query && filteredSearchResults.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <Search className="mb-2 h-6 w-6 text-warm-gray/40" />
                  <p className="text-[13px] font-medium text-deep-brown">검색 결과가 없습니다</p>
                  <p className="mt-1 text-[12px] text-warm-gray">다른 장소 이름을 입력해보세요.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <TmapMap />

            {origin && destination && (
              <>
                <div className="absolute top-[35%] left-[25%] w-3 h-3 rounded-full bg-sage-green border-2 border-white shadow" />
                <div className="absolute bottom-[20%] right-[20%] w-3 h-3 rounded-full bg-soft-orange border-2 border-white shadow" />
                <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                  <path
                    d="M 90,65% L 180,50% L 270,35%"
                    stroke="#6FAF8E"
                    strokeWidth="3"
                    strokeDasharray="6,4"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </>
            )}

            {(!origin || !destination) && (
              <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
                <div className="flex max-w-64 items-center gap-2 rounded-full bg-white/90 px-3 py-2 shadow-sm">
                  <Search className="h-4 w-4 flex-shrink-0 text-warm-gray/60" />
                  <p className="text-[12px] leading-snug text-warm-gray/80">
                    출발지와 도착지를 입력하면 지도에 경로가 표시됩니다
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* CTA */}
      <div className="safe-bottom-action mt-auto px-4 pt-4">
        <Button
          onClick={onNext}
          disabled={!origin || !destination}
          fullWidth
          size="lg"
        >
          추천 경로 보기
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
