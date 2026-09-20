import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomeScreen from '@/components/screens/home-screen'
import type { HotPost } from '@/features/home/types/home'
import type { TravelStamp } from '@/features/stamps/types/stamp'

vi.mock('@/features/map/components/tmap-map', () => ({
  default: ({
    center,
    zoom,
    locationLabel,
    showMarker,
    showZoomControl,
    interactive,
    markerVariant,
  }: {
    center: { lat: number; lng: number }
    zoom: number
    locationLabel: string
    showMarker: boolean
    showZoomControl: boolean
    interactive: boolean
    markerVariant: string
  }) => (
    <div
      data-testid="home-tmap"
      data-lat={center.lat}
      data-lng={center.lng}
      data-location-label={locationLabel}
      data-show-marker={showMarker}
      data-show-zoom-control={showZoomControl}
      data-interactive={interactive}
      data-marker-variant={markerVariant}
      data-zoom={zoom}
    />
  ),
}))

const hotPosts: HotPost[] = [
  {
    id: 'post-1',
    nickname: '멍멍이아빠',
    title: '첫추 인기 여행기',
    recommendationCount: 42,
    commentCount: 7,
    createdAt: null,
    photoUrl: null,
  },
]

const stamps: TravelStamp[] = ['강원', '경기', '제주', '경북', '전남', '충남'].map(
  (stampName, index) => ({
    stampId: `stamp-${stampName}`,
    stampName,
    acquired: true,
    stampCount: index + 1,
    firstAcquiredAt: `2026-09-${String(18 - index).padStart(2, '0')}T10:00:00+09:00`,
  })
)

const defaultProps = {
  onStartTrip: vi.fn(),
  onViewAllPosts: vi.fn(),
  mapCenter: { lat: 35.858, lng: 128.63 },
  mapLocationLabel: '현재 위치',
  locationStatus: 'success' as const,
  petNames: ['루이'],
  petNamesStatus: 'success' as const,
  stamps,
  stampsStatus: 'success' as const,
  acquiredStampCount: 6,
  totalStampCount: 17,
  onRetryStamps: vi.fn(),
  hotPosts,
  hotPostsStatus: 'success' as const,
  onRetryHotPosts: vi.fn(),
  weather: null,
  weatherStatus: 'loading' as const,
  onRetryWeather: vi.fn(),
}

afterEach(() => cleanup())

describe('HomeScreen', () => {
  it('renders the current position without the compact Home zoom control', () => {
    render(<HomeScreen {...defaultProps} />)

    const map = screen.getByTestId('home-tmap')
    expect(map).toHaveAttribute('data-lat', '35.858')
    expect(map).toHaveAttribute('data-lng', '128.63')
    expect(map).toHaveAttribute('data-zoom', '16')
    expect(map).toHaveAttribute('data-location-label', '현재 위치')
    expect(map).toHaveAttribute('data-show-marker', 'true')
    expect(map).toHaveAttribute('data-show-zoom-control', 'false')
    expect(map).toHaveAttribute('data-interactive', 'false')
    expect(map).toHaveAttribute('data-marker-variant', 'profile')
  })

  it('shows the first pet and the remaining pet count from the Home API', () => {
    render(<HomeScreen {...defaultProps} petNames={['루이', '바다', '초코']} />)

    expect(screen.getByText('루이와 2마리')).toBeInTheDocument()
  })

  it('renders API-backed HOT summary fields with a fallback image', () => {
    render(<HomeScreen {...defaultProps} />)

    expect(screen.getByText('첫추 인기 여행기')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('멍멍이아빠')).toBeInTheDocument()
    expect(screen.getByLabelText('댓글 7개')).toHaveTextContent('7')
    expect(screen.queryByText('주변 추천 장소')).not.toBeInTheDocument()
    const hotBadge = screen.getByText('HOT').parentElement
    expect(hotBadge).toHaveClass('items-center', 'justify-center')
    expect(screen.getByText('HOT')).toHaveClass('leading-none')
  })

  it('shows at most five acquired stamps immediately above the trip CTA', () => {
    render(<HomeScreen {...defaultProps} />)

    const stampRegion = screen.getByRole('region', { name: '여행 스탬프' })
    expect(within(stampRegion).getByLabelText('전체 17개 중 6개 획득')).toHaveTextContent('6/17')
    expect(within(stampRegion).getAllByRole('listitem')).toHaveLength(5)
    expect(within(stampRegion).getByText('강원')).toBeInTheDocument()
    expect(within(stampRegion).queryByText('충남')).not.toBeInTheDocument()
    expect(within(stampRegion).getByRole('img', { name: '강원 여행 스탬프' })).toHaveAttribute(
      'src',
      expect.stringContaining('/stamps/achieved/gangwon.png')
    )

    const sections = Array.from(document.querySelectorAll('[data-motion-section]')).map(
      (section) => section.getAttribute('data-motion-section')
    )
    expect(sections).toEqual(['map', 'weather', 'stamps', 'trip-cta', 'hot-posts'])
  })

  it('explains when the user has not acquired a travel stamp yet', () => {
    render(<HomeScreen {...defaultProps} stamps={[]} acquiredStampCount={0} />)

    const stampRegion = screen.getByRole('region', { name: '여행 스탬프' })
    expect(stampRegion).toHaveTextContent(
      '아직 획득한 여행 스탬프가 없어요.여행을 완료하면 이곳에 표시돼요.'
    )
  })

  it('applies Motion transitions only to the Home content sections', () => {
    render(<HomeScreen {...defaultProps} />)

    expect(document.querySelector('[data-motion-section="map"]')).toBeInTheDocument()
    expect(document.querySelector('[data-motion-section="weather"]')).toBeInTheDocument()
    expect(document.querySelector('[data-motion-section="stamps"]')).toBeInTheDocument()
    expect(document.querySelector('[data-motion-section="trip-cta"]')).toBeInTheDocument()
    expect(document.querySelector('[data-motion-section="nearby"]')).not.toBeInTheDocument()
    expect(document.querySelector('[data-motion-section="hot-posts"]')).toBeInTheDocument()
  })

  it('does not place a second service-consent action over the Home map', () => {
    render(<HomeScreen {...defaultProps} locationStatus="error" />)

    expect(screen.queryByRole('button', { name: '현재 위치 사용' })).not.toBeInTheDocument()
  })
})
