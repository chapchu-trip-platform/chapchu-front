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
    expect(screen.getByTestId('tmap-container').parentElement).toHaveClass('isolate')
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

  it('renders route markers and cleans them up on unmount', async () => {
    const mapInstance = { destroy: vi.fn(), remove: vi.fn(), setCenter: vi.fn() }
    const originMarker = { setMap: vi.fn(), setPosition: vi.fn() }
    const destinationMarker = { setMap: vi.fn(), setPosition: vi.fn() }
    let markerCount = 0
    const Marker = vi.fn(function MarkerConstructor() {
      markerCount += 1
      return markerCount === 1 ? originMarker : destinationMarker
    })
    vi.mocked(loadTmapSdk).mockResolvedValue({
      LatLng: vi.fn(function LatLng() {}),
      Map: vi.fn(function MapConstructor() {
        return mapInstance
      }),
      Marker,
    } as unknown as Tmapv2Namespace)

    const { unmount } = render(
      <TmapMap
        center={{ lat: 37.55, lng: 127 }}
        markers={[
          {
            id: 'origin',
            position: { lat: 37.5547, lng: 126.9706 },
            title: '출발지: 서울역',
          },
          {
            id: 'destination',
            position: { lat: 37.5444, lng: 127.0374 },
            title: '도착지: 서울숲',
          },
        ]}
      />
    )

    await waitFor(() => expect(Marker).toHaveBeenCalledTimes(2))
    expect(Marker).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ map: mapInstance, title: '출발지: 서울역' })
    )
    expect(Marker).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ map: mapInstance, title: '도착지: 서울숲' })
    )

    unmount()
    expect(originMarker.setMap).toHaveBeenCalledWith(null)
    expect(destinationMarker.setMap).toHaveBeenCalledWith(null)
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
