'use client'

import { useState } from 'react'
import { MapPin, Navigation, Search, X, ChevronRight } from 'lucide-react'
import TopBar from '@/components/top-bar'
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

const recentSearches = ['제주 올레길', '경복궁', '가평 자라섬']

export default function MapSetupScreen({ onBack, onNext }: MapSetupScreenProps) {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null)
  const [query, setQuery] = useState('')

  const setCurrentField = activeField === 'origin' ? setOrigin : setDestination

  const handleSelect = (name: string) => {
    setCurrentField(name)
    setActiveField(null)
    setQuery('')
  }

  return (
    <div className="flex flex-col flex-1 bg-warm-beige">
      <TopBar title="경로 설정" showBack onBack={onBack} />

      <div className="flex flex-col gap-3 p-4">
        {/* Origin */}
        <div className="flex items-center gap-3 bg-card-surface rounded-card border border-border px-4 py-3.5 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-sage-green/15 flex items-center justify-center flex-shrink-0">
            <Navigation className="w-4 h-4 text-sage-green" />
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
            <button onClick={() => setOrigin('')} aria-label="지우기">
              <X className="w-4 h-4 text-warm-gray" />
            </button>
          )}
        </div>

        {/* Use current location */}
        <button
          onClick={() => { setOrigin('현재 위치'); setActiveField(null) }}
          className="flex items-center gap-2 ml-2"
        >
          <MapPin className="w-4 h-4 text-sage-green" />
          <span className="text-[13px] text-sage-green font-medium">현재 위치 사용</span>
        </button>

        {/* Destination */}
        <div className="flex items-center gap-3 bg-card-surface rounded-card border border-border px-4 py-3.5 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-soft-orange/15 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-soft-orange" />
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
            <button onClick={() => setDestination('')} aria-label="지우기">
              <X className="w-4 h-4 text-warm-gray" />
            </button>
          )}
        </div>
      </div>

      {/* Map preview */}
      <div className="mx-4 rounded-card overflow-hidden relative flex-1 min-h-52 bg-sky-blue/20 shadow-sm">
        <TmapMap />

        {/* Route path */}
        {origin && destination && (
          <>
            <div className="absolute top-[35%] left-[25%] w-3 h-3 rounded-full bg-sage-green border-2 border-white shadow" />
            <div className="absolute bottom-[20%] right-[20%] w-3 h-3 rounded-full bg-soft-orange border-2 border-white shadow" />
            {/* Dotted path line */}
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

        {/* Empty state */}
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
      </div>

      {/* Search results dropdown */}
      {activeField && (
        <div className="mx-4 mt-0 bg-card-surface rounded-card border border-border shadow-lg overflow-hidden">
          {/* Recent */}
          {!query && (
            <div>
              <p className="text-[11px] text-warm-gray font-medium px-4 pt-3 pb-1">최근 검색</p>
              {recentSearches.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(s)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                >
                  <Search className="w-4 h-4 text-warm-gray flex-shrink-0" />
                  <span className="text-[14px] text-deep-brown">{s}</span>
                </button>
              ))}
            </div>
          )}
          {/* Results */}
          {query && searchResults.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r.name)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-t border-border first:border-0"
            >
              <MapPin className="w-4 h-4 text-sage-green flex-shrink-0" />
              <div>
                <p className="text-[14px] font-medium text-deep-brown">{r.name}</p>
                <p className="text-[12px] text-warm-gray">{r.address}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="p-4 mt-auto">
        <button
          onClick={onNext}
          disabled={!origin || !destination}
          className="w-full h-12 rounded-btn bg-sage-green text-white font-semibold text-[15px] disabled:opacity-40 active:opacity-80 transition-opacity flex items-center justify-center gap-2"
        >
          추천 경로 보기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
