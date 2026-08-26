export {}

declare global {
  interface Window {
    Tmapv2?: Tmapv2Namespace
  }

  type Tmapv2Namespace = {
    Map: new (container: HTMLElement | string, options: TmapMapOptions) => TmapMapInstance
    LatLng: new (lat: number, lng: number) => TmapLatLng
    Marker: new (options: TmapMarkerOptions) => TmapMarkerInstance
  }

  type TmapLatLng = {
    lat?: () => number
    lng?: () => number
  }

  type TmapMapOptions = {
    center: TmapLatLng
    width?: string
    height?: string
    zoom?: number
    zoomControl?: boolean
  }

  type TmapMapInstance = {
    setCenter?: (center: TmapLatLng) => void
    destroy?: () => void
    remove?: () => void
  }

  type TmapMarkerOptions = {
    position: TmapLatLng
    map: TmapMapInstance
    title?: string
  }

  type TmapMarkerInstance = {
    setMap?: (map: TmapMapInstance | null) => void
    setPosition?: (position: TmapLatLng) => void
  }
}
