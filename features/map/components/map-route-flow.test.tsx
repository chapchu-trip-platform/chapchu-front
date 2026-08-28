import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MapRouteFlow from '@/features/map/components/map-route-flow'
import { webLocationProvider } from '@/features/location/providers/web-location-provider'
import { useLocationStore } from '@/features/location/stores/location-store'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/features/location/providers/web-location-provider', () => ({
  webLocationProvider: {
    checkPermission: vi.fn(),
    requestCurrentPosition: vi.fn(),
  },
}))

vi.mock('@/components/screens/map-setup-screen', () => ({
  default: ({ currentLocation }: { currentLocation?: { lat: number; lng: number } }) => (
    <div data-testid="map-setup" data-lat={currentLocation?.lat} data-lng={currentLocation?.lng} />
  ),
}))

vi.mock('@/components/screens/map-route-screen', () => ({ default: () => null }))
vi.mock('@/components/screens/travel-progress-screen', () => ({ default: () => null }))
vi.mock('@/components/screens/trip-end-screen', () => ({ default: () => null }))
vi.mock('@/components/screens/post-share-sheet', () => ({ default: () => null }))
vi.mock('@/components/screens/error-screen', () => ({ default: () => null }))

beforeEach(() => {
  useLocationStore.getState().reset()
  vi.mocked(webLocationProvider.checkPermission).mockReset().mockResolvedValue('granted')
  vi.mocked(webLocationProvider.requestCurrentPosition).mockReset().mockResolvedValue({
    ok: true,
    position: {
      latitude: 35.858,
      longitude: 128.63,
      accuracyMeters: 25,
      capturedAt: '2026-08-26T05:00:00.000Z',
      precision: 'precise',
      source: 'web',
    },
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('MapRouteFlow location entry', () => {
  it('refreshes location on entry and passes it to the map setup screen', async () => {
    render(<MapRouteFlow />)

    await waitFor(() => {
      expect(screen.getByTestId('map-setup')).toHaveAttribute('data-lat', '35.858')
    })
    expect(screen.getByTestId('map-setup')).toHaveAttribute('data-lng', '128.63')
    expect(webLocationProvider.requestCurrentPosition).toHaveBeenCalledOnce()
  })

  it('requests the device position automatically when permission can prompt', async () => {
    vi.mocked(webLocationProvider.checkPermission).mockResolvedValue('prompt')

    render(<MapRouteFlow />)

    await waitFor(() => expect(webLocationProvider.requestCurrentPosition).toHaveBeenCalledOnce())
  })

  it('does not access location while an error route is displayed', () => {
    render(<MapRouteFlow initialErrorType="location-denied" />)

    expect(webLocationProvider.checkPermission).not.toHaveBeenCalled()
    expect(webLocationProvider.requestCurrentPosition).not.toHaveBeenCalled()
  })
})
