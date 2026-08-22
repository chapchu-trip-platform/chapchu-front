import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import HomeScreen from '@/components/screens/home-screen'

vi.mock('@/features/map/components/tmap-map', () => ({
  default: ({
    center,
    zoom,
    locationLabel,
    showMarker,
  }: {
    center: { lat: number; lng: number }
    zoom: number
    locationLabel: string
    showMarker: boolean
  }) => (
    <div
      data-testid="home-tmap"
      data-lat={center.lat}
      data-lng={center.lng}
      data-location-label={locationLabel}
      data-show-marker={showMarker}
      data-zoom={zoom}
    />
  ),
}))

describe('HomeScreen', () => {
  it('renders the Home TMAP with the representative Seongsu location', () => {
    render(
      <HomeScreen
        onStartTrip={vi.fn()}
        onViewPost={vi.fn()}
        weather={null}
        weatherStatus="loading"
        onRetryWeather={vi.fn()}
      />
    )

    const map = screen.getByTestId('home-tmap')

    expect(map).toHaveAttribute('data-lat', '37.5446')
    expect(map).toHaveAttribute('data-lng', '127.0567')
    expect(map).toHaveAttribute('data-zoom', '15')
    expect(map).toHaveAttribute('data-location-label', '성수동 기준 · 예시 위치')
    expect(map).toHaveAttribute('data-show-marker', 'true')
  })
})
