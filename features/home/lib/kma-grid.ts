const EARTH_RADIUS_KM = 6371.00877
const GRID_KM = 5
const STANDARD_LATITUDE_1 = 30
const STANDARD_LATITUDE_2 = 60
const ORIGIN_LONGITUDE = 126
const ORIGIN_LATITUDE = 38
const ORIGIN_X = 43
const ORIGIN_Y = 136
const DEGREES_TO_RADIANS = Math.PI / 180

export interface KmaGridCoordinate {
  nx: number
  ny: number
}

export function convertLatLngToKmaGrid(latitude: number, longitude: number): KmaGridCoordinate {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('Invalid coordinates for KMA grid conversion.')
  }

  const re = EARTH_RADIUS_KM / GRID_KM
  const slat1 = STANDARD_LATITUDE_1 * DEGREES_TO_RADIANS
  const slat2 = STANDARD_LATITUDE_2 * DEGREES_TO_RADIANS
  const olon = ORIGIN_LONGITUDE * DEGREES_TO_RADIANS
  const olat = ORIGIN_LATITUDE * DEGREES_TO_RADIANS

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5)
  ro = (re * sf) / Math.pow(ro, sn)

  let ra = Math.tan(Math.PI * 0.25 + latitude * DEGREES_TO_RADIANS * 0.5)
  ra = (re * sf) / Math.pow(ra, sn)
  let theta = longitude * DEGREES_TO_RADIANS - olon
  if (theta > Math.PI) theta -= 2 * Math.PI
  if (theta < -Math.PI) theta += 2 * Math.PI
  theta *= sn

  return {
    nx: Math.floor(ra * Math.sin(theta) + ORIGIN_X + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + ORIGIN_Y + 0.5),
  }
}
