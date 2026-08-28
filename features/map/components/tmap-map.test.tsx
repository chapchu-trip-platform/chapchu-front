import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TmapMap from '@/features/map/components/tmap-map'
import { loadTmapSdk } from '@/lib/load-tmap-sdk'

vi.mock('@/lib/load-tmap-sdk', () => ({
  loadTmapSdk: vi.fn(),
}))

describe('TmapMap', () => {
  beforeEach(() => {
    vi.mocked(loadTmapSdk).mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders a loading state while the SDK is loading', () => {
    vi.mocked(loadTmapSdk).mockReturnValue(new Promise(() => undefined))
    render(<TmapMap />)

    expect(screen.getByText('지도를 불러오는 중입니다')).toBeInTheDocument()
    expect(screen.getByTestId('tmap-container')).toBeInTheDocument()
  })

  it('creates a centered marker and removes map resources on unmount', async () => {
    const mapInstance = { destroy: vi.fn(), remove: vi.fn(), setCenter: vi.fn() }
    const markerInstance = { setMap: vi.fn(), setPosition: vi.fn() }
    const LatLng = vi.fn(function (this: { lat: number; lng: number }, lat: number, lng: number) {
      this.lat = lat
      this.lng = lng
    })
    const Map = vi.fn(function MapConstructor(container: HTMLElement) {
      container.appendChild(document.createElement('div'))
      return mapInstance
    })
    const Marker = vi.fn(function MarkerConstructor() {
      return markerInstance
    })

    vi.mocked(loadTmapSdk).mockResolvedValue({
      LatLng,
      Map,
      Marker,
    } as unknown as Tmapv2Namespace)

    const { getByTestId, unmount } = render(
      <TmapMap
        center={{ lat: 37.5446, lng: 127.0567 }}
        locationLabel="성수동 기준 · 예시 위치"
        showMarker
      />
    )

    expect(await screen.findByText('성수동 기준 · 예시 위치')).toBeInTheDocument()
    expect(LatLng).toHaveBeenCalledWith(37.5446, 127.0567)
    const mapCenter = LatLng.mock.instances[0]
    const mapContainer = getByTestId('tmap-container')

    expect(Map).toHaveBeenCalledWith(mapContainer, {
      center: mapCenter,
      width: '100%',
      height: '100%',
      zoom: 15,
      zoomControl: true,
    })
    await waitFor(() =>
      expect(Marker).toHaveBeenCalledWith({
        position: expect.any(Object),
        map: mapInstance,
        title: '성수동 기준 · 예시 위치',
      })
    )
    expect(mapInstance.setCenter).toHaveBeenCalledWith(expect.any(Object))

    unmount()
    await waitFor(() => expect(markerInstance.setMap).toHaveBeenCalledWith(null))
    expect(mapInstance.destroy).toHaveBeenCalledOnce()
    expect(mapInstance.remove).toHaveBeenCalledOnce()
    expect(mapContainer).toBeEmptyDOMElement()
  })

  it('can hide the TMAP zoom control for the compact Home preview', async () => {
    const Map = vi.fn(function MapConstructor() {
      return { destroy: vi.fn(), remove: vi.fn() }
    })
    vi.mocked(loadTmapSdk).mockResolvedValue({
      LatLng: vi.fn(function LatLng() {}),
      Map,
      Marker: vi.fn(),
    } as unknown as Tmapv2Namespace)

    render(<TmapMap showZoomControl={false} />)
    await screen.findByText('서울 시청 기준')

    expect(Map).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ zoomControl: false })
    )
  })

  it('updates the map and marker position without recreating the TMAP instance', async () => {
    const mapInstance = { destroy: vi.fn(), remove: vi.fn(), setCenter: vi.fn() }
    const markerInstance = { setMap: vi.fn(), setPosition: vi.fn() }
    const Map = vi.fn(function MapConstructor() {
      return mapInstance
    })
    const Marker = vi.fn(function MarkerConstructor() {
      return markerInstance
    })
    vi.mocked(loadTmapSdk).mockResolvedValue({
      LatLng: vi.fn(function LatLng() {}),
      Map,
      Marker,
    } as unknown as Tmapv2Namespace)

    const { rerender } = render(
      <TmapMap center={{ lat: 35.123456789012, lng: 128.123456789012 }} showMarker />
    )
    await waitFor(() => expect(Marker).toHaveBeenCalledOnce())

    rerender(<TmapMap center={{ lat: 35.123456789099, lng: 128.123456789099 }} showMarker />)

    await waitFor(() => expect(markerInstance.setPosition).toHaveBeenCalled())
    expect(Map).toHaveBeenCalledOnce()
    expect(mapInstance.setCenter).toHaveBeenCalledTimes(2)
  })

  it('renders a profile pin and blocks direct interaction for the Home tracking map', async () => {
    const Map = vi.fn(function MapConstructor() {
      return { destroy: vi.fn(), remove: vi.fn(), setCenter: vi.fn() }
    })
    const Marker = vi.fn()
    vi.mocked(loadTmapSdk).mockResolvedValue({
      LatLng: vi.fn(function LatLng() {}),
      Map,
      Marker,
    } as unknown as Tmapv2Namespace)

    render(
      <TmapMap
        center={{ lat: 35.858412345678, lng: 128.630412345678 }}
        locationLabel="현재 위치"
        showMarker
        markerVariant="profile"
        interactive={false}
      />
    )

    expect(await screen.findByTestId('profile-location-marker')).toHaveAccessibleName(
      '현재 위치 프로필 위치 마커'
    )
    expect(screen.getByTestId('tmap-container')).toHaveClass('pointer-events-none')
    expect(Marker).not.toHaveBeenCalled()
  })
})
