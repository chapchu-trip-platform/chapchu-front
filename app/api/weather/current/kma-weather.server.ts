import {
  getKmaBaseTimes,
  mapKmaWeather,
  normalizeKmaServiceKey,
  SUSEONG_GU_WEATHER_LOCATION,
  type ForecastItem,
  type ObservationItem,
  type UvItem,
} from '@/features/home/lib/kma-weather'
import type { CurrentWeather } from '@/types/weather'

// Server boundary: keep this upstream client inside the Route Handler tree.
const KMA_TIMEOUT_MS = 8_000
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000
const SHORT_FORECAST_ORIGIN = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0'
const LIVING_WEATHER_ORIGIN = 'https://apis.data.go.kr/1360000/LivingWthrIdxServiceV5'

interface KmaEnvelope<T> {
  response?: {
    header?: { resultCode?: string }
    body?: { items?: { item?: T | T[] } }
  }
}

export interface KmaWeatherLocation {
  name: string
  gridX: number
  gridY: number
  areaNo?: string
}

const MAX_WEATHER_CACHE_ENTRIES = 50
const MAX_PENDING_WEATHER_REQUESTS = 20
const weatherCache = new Map<string, { expiresAt: number; weather: CurrentWeather }>()
const pendingWeather = new Map<string, Promise<CurrentWeather>>()

export class WeatherRequestCapacityError extends Error {
  constructor() {
    super('Too many pending weather requests.')
    this.name = 'WeatherRequestCapacityError'
  }
}

function asArray<T>(item: T | T[] | undefined): T[] {
  if (item === undefined) return []
  return Array.isArray(item) ? item : [item]
}

function buildUrl(origin: string, pathname: string, serviceKey: string, params: Record<string, string>) {
  const url = new URL(`${origin}/${pathname}`)
  url.search = new URLSearchParams({
    serviceKey: normalizeKmaServiceKey(serviceKey),
    pageNo: '1',
    dataType: 'JSON',
    ...params,
  }).toString()
  return url
}

async function requestKma<T>(url: URL, request: typeof fetch) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), KMA_TIMEOUT_MS)

  try {
    const response = await request(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error('KMA upstream request failed.')

    const text = await response.text()
    let payload: KmaEnvelope<T>
    try {
      payload = JSON.parse(text) as KmaEnvelope<T>
    } catch {
      throw new Error('KMA upstream returned an unsupported response.')
    }

    const resultCode = payload.response?.header?.resultCode
    if (resultCode !== '00' && resultCode !== '0') {
      throw new Error('KMA upstream returned an API error.')
    }

    return asArray(payload.response?.body?.items?.item)
  } finally {
    clearTimeout(timeoutId)
  }
}

async function requestCurrentWeather({
  serviceKey,
  location,
  now = new Date(),
  request = fetch,
}: {
  serviceKey: string
  location: KmaWeatherLocation
  now?: Date
  request?: typeof fetch
}) {
  const baseTimes = getKmaBaseTimes(now)
  const commonGridParams = {
    nx: String(location.gridX),
    ny: String(location.gridY),
  }

  const observationUrl = buildUrl(SHORT_FORECAST_ORIGIN, 'getUltraSrtNcst', serviceKey, {
    numOfRows: '10',
    base_date: baseTimes.observation.baseDate,
    base_time: baseTimes.observation.baseTime,
    ...commonGridParams,
  })
  const forecastUrl = buildUrl(SHORT_FORECAST_ORIGIN, 'getUltraSrtFcst', serviceKey, {
    numOfRows: '100',
    base_date: baseTimes.forecast.baseDate,
    base_time: baseTimes.forecast.baseTime,
    ...commonGridParams,
  })
  const uvRequest = location.areaNo
    ? requestKma<UvItem>(
        buildUrl(LIVING_WEATHER_ORIGIN, 'getUVIdxV5', serviceKey, {
          numOfRows: '10',
          areaNo: location.areaNo,
          time: baseTimes.uv.time,
        }),
        request
      ).catch(() => [])
    : Promise.resolve([] as UvItem[])

  const [observationItems, forecastItems, uvItems] = await Promise.all([
    requestKma<ObservationItem>(observationUrl, request),
    requestKma<ForecastItem>(forecastUrl, request).catch(() => []),
    uvRequest,
  ])

  return mapKmaWeather({
    observationItems,
    forecastItems,
    uvItems,
    baseTimes,
    now,
    locationName: location.name,
  })
}

export function clearKmaWeatherCache() {
  weatherCache.clear()
  pendingWeather.clear()
}

function createCacheKey(location: KmaWeatherLocation) {
  return [location.gridX, location.gridY, location.areaNo ?? '-', location.name].join(':')
}

export function getCurrentWeather(
  serviceKey: string,
  location: KmaWeatherLocation = SUSEONG_GU_WEATHER_LOCATION
) {
  const now = Date.now()
  const cacheKey = createCacheKey(location)
  const cached = weatherCache.get(cacheKey)
  if (cached && cached.expiresAt > now) return Promise.resolve(cached.weather)
  const pending = pendingWeather.get(cacheKey)
  if (pending) return pending
  if (pendingWeather.size >= MAX_PENDING_WEATHER_REQUESTS) {
    throw new WeatherRequestCapacityError()
  }

  const request = requestCurrentWeather({ serviceKey, location })
    .then((weather) => {
      if (weatherCache.size >= MAX_WEATHER_CACHE_ENTRIES) {
        const oldestKey = weatherCache.keys().next().value
        if (oldestKey) weatherCache.delete(oldestKey)
      }
      weatherCache.set(cacheKey, {
        weather,
        expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
      })
      return weather
    })
    .finally(() => {
      pendingWeather.delete(cacheKey)
    })

  pendingWeather.set(cacheKey, request)
  return request
}
