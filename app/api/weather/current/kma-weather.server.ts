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

let weatherCache: { expiresAt: number; weather: CurrentWeather } | null = null
let pendingWeather: Promise<CurrentWeather> | null = null

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

async function requestCurrentSuseongWeather({
  serviceKey,
  now = new Date(),
  request = fetch,
}: {
  serviceKey: string
  now?: Date
  request?: typeof fetch
}) {
  const baseTimes = getKmaBaseTimes(now)
  const commonGridParams = {
    nx: String(SUSEONG_GU_WEATHER_LOCATION.gridX),
    ny: String(SUSEONG_GU_WEATHER_LOCATION.gridY),
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
  const uvUrl = buildUrl(LIVING_WEATHER_ORIGIN, 'getUVIdxV5', serviceKey, {
    numOfRows: '10',
    areaNo: SUSEONG_GU_WEATHER_LOCATION.areaNo,
    time: baseTimes.uv.time,
  })

  const [observationItems, forecastItems, uvItems] = await Promise.all([
    requestKma<ObservationItem>(observationUrl, request),
    requestKma<ForecastItem>(forecastUrl, request).catch(() => []),
    requestKma<UvItem>(uvUrl, request).catch(() => []),
  ])

  return mapKmaWeather({ observationItems, forecastItems, uvItems, baseTimes, now })
}

export function clearKmaWeatherCache() {
  weatherCache = null
  pendingWeather = null
}

export function getCurrentSuseongWeather(serviceKey: string) {
  const now = Date.now()
  if (weatherCache && weatherCache.expiresAt > now) return Promise.resolve(weatherCache.weather)
  if (pendingWeather) return pendingWeather

  pendingWeather = requestCurrentSuseongWeather({ serviceKey })
    .then((weather) => {
      weatherCache = { weather, expiresAt: Date.now() + WEATHER_CACHE_TTL_MS }
      return weather
    })
    .finally(() => {
      pendingWeather = null
    })

  return pendingWeather
}
