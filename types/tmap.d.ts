export {}

declare global {
  interface Window {
    Tmapv2?: Tmapv2Namespace
  }

  type Tmapv2Namespace = {
    Map: new (container: HTMLElement | string, options: TmapMapOptions) => TmapMapInstance
    LatLng: new (lat: number, lng: number) => TmapLatLng
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
  }

  type TmapMapInstance = {
    destroy?: () => void
    remove?: () => void
  }
}
