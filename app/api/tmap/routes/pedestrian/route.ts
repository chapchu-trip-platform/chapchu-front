const TMAP_PEDESTRIAN_ROUTE_ENDPOINT =
  'https://apis.openapi.sk.com/tmap/routes/pedestrian'
const TMAP_API_VERSION = '1'
const TMAP_REQUEST_TIMEOUT_MS = 10_000

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
}

interface PedestrianRoutePoint {
  latitude: number
  longitude: number
  name: string
}

interface PedestrianRouteRequest {
  origin: PedestrianRoutePoint
  destination: PedestrianRoutePoint
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isRoutePoint(value: unknown): value is PedestrianRoutePoint {
  if (!isRecord(value)) return false

  return (
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    value.name.length <= 100 &&
    typeof value.latitude === 'number' &&
    Number.isFinite(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180
  )
}

function parseRequestBody(value: unknown): PedestrianRouteRequest | null {
  if (!isRecord(value)) return null
  if (!isRoutePoint(value.origin) || !isRoutePoint(value.destination)) return null

  return {
    origin: value.origin,
    destination: value.destination,
  }
}

function readTotalTimeSeconds(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.features)) return null

  for (const feature of value.features) {
    if (!isRecord(feature) || !isRecord(feature.properties)) continue
    const totalTime = feature.properties.totalTime
    if (typeof totalTime === 'number' && Number.isFinite(totalTime) && totalTime >= 0) {
      return totalTime
    }
  }

  return null
}

export async function POST(request: Request) {
  const apiKey = process.env.T_MAP_APIKEY?.trim()

  if (!apiKey) {
    return Response.json(
      { message: 'TMAP 보행자 경로 서비스가 아직 설정되지 않았어요.' },
      { status: 503, headers: RESPONSE_HEADERS }
    )
  }

  let body: PedestrianRouteRequest | null = null
  try {
    body = parseRequestBody(await request.json())
  } catch {
    // Invalid JSON is handled by the shared validation response below.
  }

  if (!body) {
    return Response.json(
      { message: '출발지와 도착지 정보가 올바르지 않아요.' },
      { status: 400, headers: RESPONSE_HEADERS }
    )
  }

  const upstreamUrl = new URL(TMAP_PEDESTRIAN_ROUTE_ENDPOINT)
  upstreamUrl.searchParams.set('version', TMAP_API_VERSION)
  upstreamUrl.searchParams.set('format', 'json')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TMAP_REQUEST_TIMEOUT_MS)

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        appKey: apiKey,
      },
      body: JSON.stringify({
        startX: body.origin.longitude,
        startY: body.origin.latitude,
        endX: body.destination.longitude,
        endY: body.destination.latitude,
        reqCoordType: 'WGS84GEO',
        resCoordType: 'WGS84GEO',
        startName: encodeURIComponent(body.origin.name.trim()),
        endName: encodeURIComponent(body.destination.name.trim()),
        searchOption: '0',
      }),
    })

    if (!upstreamResponse.ok) {
      return Response.json(
        { message: '최소 도보 이동 시간을 확인하지 못했어요.' },
        { status: 502, headers: RESPONSE_HEADERS }
      )
    }

    const totalTimeSeconds = readTotalTimeSeconds(await upstreamResponse.json())
    if (totalTimeSeconds === null) {
      return Response.json(
        { message: 'TMAP 보행자 경로 응답이 올바르지 않아요.' },
        { status: 502, headers: RESPONSE_HEADERS }
      )
    }

    return Response.json(
      { totalTimeSeconds },
      { status: 200, headers: RESPONSE_HEADERS }
    )
  } catch {
    return Response.json(
      { message: '최소 도보 이동 시간을 잠시 불러오지 못했어요.' },
      { status: 502, headers: RESPONSE_HEADERS }
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
