import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomeScreen from '@/components/screens/home-screen'
import type { HotPost, NearbyPlace } from '@/features/home/types/home'

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

const nearbyPlaces: NearbyPlace[] = [
  { id: 'place-1', name: '반려견 공원', imageUrl: null, address: '대구 수성구', rating: 4.5, reviewCount: 12, distanceMeters: 300, hasPetPolicy: true },
  { id: 'place-2', name: '반려견 카페', imageUrl: null, address: '대구 수성구', rating: 4.2, reviewCount: 8, distanceMeters: 700, hasPetPolicy: true },
  { id: 'place-3', name: '산책로', imageUrl: null, address: '대구 수성구', rating: 4, reviewCount: 3, distanceMeters: 1_400, hasPetPolicy: false },
]

const defaultProps = {
  onStartTrip: vi.fn(),
  onViewAllPosts: vi.fn(),
  mapCenter: { lat: 35.858, lng: 128.63 },
  mapLocationLabel: '현재 위치',
  locationStatus: 'success' as const,
  petNames: ['루이'],
  petNamesStatus: 'success' as const,
  nearbyPlaces,
  nearbyPlacesStatus: 'success' as const,
  onRetryNearbyPlaces: vi.fn(),
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
    expect(screen.getByText('주변 추천 장소')).toBeInTheDocument()
    expect(screen.getByText('현재 위치 반경 1.5km 안의 반려동물 동반 장소예요.')).toBeInTheDocument()
    const hotBadge = screen.getByText('HOT').parentElement
    expect(hotBadge).toHaveClass('items-center', 'justify-center')
    expect(screen.getByText('HOT')).toHaveClass('leading-none')
  })

  it('keeps nearby places in a native free-scroll carousel', () => {
    render(<HomeScreen {...defaultProps} />)

    const carousel = screen.getByTestId('nearby-place-carousel')
    expect(carousel).toHaveClass(
      'overflow-x-auto',
      'overscroll-x-contain',
      'px-4'
    )
    expect(carousel).not.toHaveClass('scroll-smooth', 'snap-x', 'snap-mandatory')
    expect(carousel).toHaveStyle({ touchAction: 'auto' })
    expect(carousel.querySelectorAll('article')).toHaveLength(3)
    const distanceBadge = screen.getByText('300m').parentElement
    expect(distanceBadge).toHaveClass('flex', 'items-center', 'justify-center')
    expect(screen.getByText('300m')).toHaveClass('leading-none')
  })

  it('applies Motion transitions only to the Home content sections', () => {
    render(<HomeScreen {...defaultProps} />)

    expect(document.querySelector('[data-motion-section="map"]')).toBeInTheDocument()
    expect(document.querySelector('[data-motion-section="weather"]')).toBeInTheDocument()
    expect(document.querySelector('[data-motion-section="trip-cta"]')).toBeInTheDocument()
    expect(document.querySelector('[data-motion-section="nearby"]')).toBeInTheDocument()
    expect(document.querySelector('[data-motion-section="hot-posts"]')).toBeInTheDocument()
  })

  it('moves the recommendation carousel when a pointer drags horizontally', () => {
    render(<HomeScreen {...defaultProps} />)

    const carousel = screen.getByTestId('nearby-place-carousel')
    fireEvent.pointerDown(carousel, {
      button: 0,
      clientX: 280,
      clientY: 100,
      pointerId: 1,
      pointerType: 'mouse',
    })
    fireEvent.pointerMove(carousel, {
      clientX: 100,
      clientY: 104,
      pointerId: 1,
      pointerType: 'mouse',
    })
    fireEvent.pointerUp(carousel, { pointerId: 1, pointerType: 'mouse' })

    expect(carousel.scrollLeft).toBe(180)
  })

  it('leaves touch gestures to native overflow scrolling on mobile', () => {
    render(<HomeScreen {...defaultProps} />)

    const carousel = screen.getByTestId('nearby-place-carousel')
    fireEvent.pointerDown(carousel, {
      clientX: 280,
      clientY: 100,
      pointerId: 2,
      pointerType: 'touch',
    })
    fireEvent.pointerMove(carousel, {
      clientX: 100,
      clientY: 104,
      pointerId: 2,
      pointerType: 'touch',
    })
    fireEvent.pointerUp(carousel, { pointerId: 2, pointerType: 'touch' })

    expect(carousel).toHaveStyle({ touchAction: 'auto' })
    expect(carousel.scrollLeft).toBe(0)
  })

  it('does not place a second service-consent action over the Home map', () => {
    render(<HomeScreen {...defaultProps} locationStatus="error" />)

    expect(screen.queryByRole('button', { name: '현재 위치 사용' })).not.toBeInTheDocument()
  })
})
