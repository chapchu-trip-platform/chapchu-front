const TMAP_POI_SEARCH_ENDPOINT = 'https://apis.openapi.sk.com/tmap/pois'
const TMAP_API_VERSION = '1'
const TMAP_REQUEST_TIMEOUT_MS = 8_000
const DEFAULT_RESULT_LIMIT = 10
const MAX_RESULT_LIMIT = 20

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
}

interface PoiSearchRequest {
  query: string
  limit: number
}

interface LocationSearchItem {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readTrimmedString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readCoordinate(value: unknown, minimum: number, maximum: number) {
  const normalizedValue = typeof value === 'number' ? value : readTrimmedString(value)
  if (normalizedValue === null) return null
  const numberValue = Number(normalizedValue)
  if (!Number.isFinite(numberValue) || numberValue < minimum || numberValue > maximum) {
    return null
  }
  return numberValue
}

function parseRequestBody(value: unknown): PoiSearchRequest | null {
  if (!isRecord(value)) return null

  const query = readTrimmedString(value.query)
  const limit = value.limit === undefined ? DEFAULT_RESULT_LIMIT : value.limit
  if (
    !query ||
    query.length < 2 ||
    query.length > 100 ||
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_RESULT_LIMIT
  ) {
    return null
  }

  return { query, limit }
}

function readRoadAddress(poi: Record<string, unknown>) {
  if (!isRecord(poi.newAddressList)) return null
  const newAddress = poi.newAddressList.newAddress
  const candidates = Array.isArray(newAddress) ? newAddress : [newAddress]

  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue
    const fullAddressRoad = readTrimmedString(candidate.fullAddressRoad)
    if (fullAddressRoad) return fullAddressRoad
  }

  return null
}

function readAdministrativeAddress(poi: Record<string, unknown>) {
  return [
    poi.upperAddrName,
    poi.middleAddrName,
    poi.lowerAddrName,
    poi.detailAddrName,
  ]
    .map(readTrimmedString)
    .filter((part): part is string => part !== null)
    .join(' ')
}

function readPoiCoordinates(poi: Record<string, unknown>) {
  const coordinateKeys = [
    ['pnsLat', 'pnsLon'],
    ['frontLat', 'frontLon'],
    ['noorLat', 'noorLon'],
  ] as const

  for (const [latitudeKey, longitudeKey] of coordinateKeys) {
    const latitude = readCoordinate(poi[latitudeKey], -90, 90)
    const longitude = readCoordinate(poi[longitudeKey], -180, 180)
    if (latitude !== null && longitude !== null) return { latitude, longitude }
  }

  return null
}

function mapPoi(value: unknown): LocationSearchItem | null {
  if (!isRecord(value)) return null

  const providerId = readTrimmedString(value.id)
  const name = readTrimmedString(value.name)
  const coordinates = readPoiCoordinates(value)
  if (!providerId || !name || !coordinates) return null

  return {
    id: `tmap-poi-${providerId}`,
    name,
    address: readRoadAddress(value) || readAdministrativeAddress(value) || '주소 정보 없음',
    ...coordinates,
  }
}

function readPoiItems(value: unknown): unknown[] | null {
  if (!isRecord(value) || !isRecord(value.searchPoiInfo)) return null

  const totalCount = Number(value.searchPoiInfo.totalCount)
  if (Number.isFinite(totalCount) && totalCount === 0) return []
  if (!isRecord(value.searchPoiInfo.pois)) return null

  const poi = value.searchPoiInfo.pois.poi
  if (Array.isArray(poi)) return poi
  if (isRecord(poi)) return [poi]
  return null
}

function mapPoiResponse(value: unknown, limit: number) {
  const rawItems = readPoiItems(value)
  if (rawItems === null) return null

  const seenIds = new Set<string>()
  const items: LocationSearchItem[] = []
  for (const rawItem of rawItems) {
    const item = mapPoi(rawItem)
    if (!item || seenIds.has(item.id)) continue
    seenIds.add(item.id)
    items.push(item)
    if (items.length === limit) break
  }

  return items
}

export async function POST(request: Request) {
  const apiKey = process.env.T_MAP_APIKEY?.trim()
  if (!apiKey) {
    return Response.json(
      { message: 'TMAP 장소 검색 서비스가 아직 설정되지 않았어요.' },
      { status: 503, headers: RESPONSE_HEADERS }
    )
  }

  let body: PoiSearchRequest | null = null
  try {
    body = parseRequestBody(await request.json())
  } catch {
    // Invalid JSON is handled by the shared validation response below.
  }

  if (!body) {
    return Response.json(
      { message: '위치 검색어가 올바르지 않아요.' },
      { status: 400, headers: RESPONSE_HEADERS }
    )
  }

  const upstreamUrl = new URL(TMAP_POI_SEARCH_ENDPOINT)
  upstreamUrl.search = new URLSearchParams({
    version: TMAP_API_VERSION,
    format: 'json',
    searchKeyword: body.query,
    searchType: 'all',
    searchtypCd: 'A',
    radius: '0',
    page: '1',
    count: String(body.limit),
    multiPoint: 'Y',
    poiGroupYn: 'N',
    reqCoordType: 'WGS84GEO',
    resCoordType: 'WGS84GEO',
  }).toString()

  const controller = new AbortController()
  const abortUpstream = () => controller.abort()
  request.signal.addEventListener('abort', abortUpstream, { once: true })
  const timeoutId = setTimeout(() => controller.abort(), TMAP_REQUEST_TIMEOUT_MS)

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        appKey: apiKey,
      },
    })

    if (upstreamResponse.status === 204) {
      return Response.json({ items: [] }, { status: 200, headers: RESPONSE_HEADERS })
    }

    if (upstreamResponse.status === 429) {
      return Response.json(
        { message: '위치 검색 요청이 많아요. 잠시 후 다시 시도해주세요.' },
        {
          status: 429,
          headers: {
            ...RESPONSE_HEADERS,
            'Retry-After': upstreamResponse.headers.get('Retry-After') ?? '5',
          },
        }
      )
    }

    if (!upstreamResponse.ok) {
      return Response.json(
        { message: 'TMAP에서 위치를 검색하지 못했어요.' },
        { status: 502, headers: RESPONSE_HEADERS }
      )
    }

    const items = mapPoiResponse(await upstreamResponse.json(), body.limit)
    if (!items) {
      return Response.json(
        { message: 'TMAP 장소 검색 응답이 올바르지 않아요.' },
        { status: 502, headers: RESPONSE_HEADERS }
      )
    }

    return Response.json({ items }, { status: 200, headers: RESPONSE_HEADERS })
  } catch {
    return Response.json(
      { message: '위치를 잠시 검색하지 못했어요.' },
      { status: 502, headers: RESPONSE_HEADERS }
    )
  } finally {
    clearTimeout(timeoutId)
    request.signal.removeEventListener('abort', abortUpstream)
  }
}
