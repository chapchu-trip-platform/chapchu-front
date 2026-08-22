import type { CurrentWeather, WeatherConditionCode } from '@/types/weather'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

export const SUSEONG_GU_WEATHER_LOCATION = {
  name: '대구광역시 수성구',
  latitude: 35.8552083333333,
  longitude: 128.632866666666,
  gridX: 89,
  gridY: 90,
  areaNo: '2726000000',
} as const

export interface ObservationItem {
  baseDate?: string
  baseTime?: string
  category?: string
  obsrValue?: string | number
}

export interface ForecastItem {
  category?: string
  fcstDate?: string
  fcstTime?: string
  fcstValue?: string | number
}

export interface UvItem {
  date?: string
  h0?: string | number
  h3?: string | number
}

export interface KmaBaseTimes {
  observation: { baseDate: string; baseTime: string }
  forecast: { baseDate: string; baseTime: string }
  uv: { time: string }
}

function toKstClock(date: Date) {
  return new Date(date.getTime() + KST_OFFSET_MS)
}

function formatDate(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('')
}

function formatHour(date: Date) {
  return String(date.getUTCHours()).padStart(2, '0')
}

function toKstIso(date: string, time: string) {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:00+09:00`
}

export function getKmaBaseTimes(now = new Date()): KmaBaseTimes {
  const kstNow = toKstClock(now)

  const observation = new Date(kstNow)
  if (observation.getUTCMinutes() < 10) observation.setUTCHours(observation.getUTCHours() - 1)
  observation.setUTCMinutes(0, 0, 0)

  const forecast = new Date(kstNow)
  if (forecast.getUTCMinutes() < 45) forecast.setUTCHours(forecast.getUTCHours() - 1)
  forecast.setUTCMinutes(30, 0, 0)

  const uv = new Date(kstNow)
  const isReleaseWindow = uv.getUTCHours() % 3 === 0 && uv.getUTCMinutes() < 10
  if (isReleaseWindow) uv.setUTCHours(uv.getUTCHours() - 3)
  uv.setUTCHours(Math.floor(uv.getUTCHours() / 3) * 3, 0, 0, 0)

  return {
    observation: {
      baseDate: formatDate(observation),
      baseTime: `${formatHour(observation)}00`,
    },
    forecast: {
      baseDate: formatDate(forecast),
      baseTime: `${formatHour(forecast)}30`,
    },
    uv: {
      time: `${formatDate(uv)}${formatHour(uv)}`,
    },
  }
}

export function normalizeKmaServiceKey(value: string) {
  const trimmed = value.trim()
  if (!trimmed) throw new Error('KMA service key is empty.')
  if (!trimmed.includes('%')) return trimmed

  try {
    return decodeURIComponent(trimmed)
  } catch {
    throw new Error('KMA service key encoding is invalid.')
  }
}

function asNumber(value: string | number | undefined) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && Math.abs(parsed) < 900 ? parsed : null
}

function getKstStamp(now: Date) {
  const kstNow = toKstClock(now)
  return `${formatDate(kstNow)}${formatHour(kstNow)}${String(kstNow.getUTCMinutes()).padStart(2, '0')}`
}

export function pickForecast(items: ForecastItem[], now: Date) {
  const grouped = new Map<string, ForecastItem[]>()

  for (const item of items) {
    if (!item.fcstDate || !item.fcstTime) continue
    const key = `${item.fcstDate}${item.fcstTime}`
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }

  const timestamps = [...grouped.keys()].sort()
  const target =
    timestamps.find((timestamp) => timestamp >= getKstStamp(now)) ?? timestamps.at(-1)
  return target ? { timestamp: target, items: grouped.get(target) ?? [] } : null
}

export function mapWeatherCondition(pty: string | number | undefined, sky: string | number | undefined) {
  const precipitation = String(pty ?? '0')
  const precipitationMap: Record<string, [WeatherConditionCode, string]> = {
    '1': ['RAIN', '비'],
    '2': ['RAIN_SNOW', '비 또는 눈'],
    '3': ['SNOW', '눈'],
    '4': ['SHOWER', '소나기'],
    '5': ['DRIZZLE', '빗방울'],
    '6': ['RAIN_SNOW_FLURRY', '빗방울 또는 눈날림'],
    '7': ['SNOW_FLURRY', '눈날림'],
  }

  if (precipitationMap[precipitation]) return precipitationMap[precipitation]

  const skyMap: Record<string, [WeatherConditionCode, string]> = {
    '1': ['CLEAR', '맑음'],
    '3': ['MOSTLY_CLOUDY', '구름많음'],
    '4': ['CLOUDY', '흐림'],
  }

  return skyMap[String(sky ?? '')] ?? (['UNKNOWN', '날씨 정보 없음'] as const)
}

function getWalkAdvice(
  conditionCode: WeatherConditionCode,
  temperatureC: number,
  windSpeedMps: number | null,
  uvIndex: number | null
) {
  if (['RAIN', 'RAIN_SNOW', 'SHOWER', 'DRIZZLE', 'RAIN_SNOW_FLURRY'].includes(conditionCode)) {
    return '비가 내려요. 짧은 산책과 우비를 준비해 주세요.'
  }
  if (['SNOW', 'SNOW_FLURRY'].includes(conditionCode)) {
    return '눈길에 발이 시릴 수 있어요. 산책 후 발을 잘 닦아 주세요.'
  }
  if (temperatureC >= 28) return '기온이 높아요. 한낮을 피해 짧게 산책해 주세요.'
  if (temperatureC <= 2) return '쌀쌀한 날이에요. 체온을 지킬 수 있게 준비해 주세요.'
  if (windSpeedMps !== null && windSpeedMps >= 9) {
    return '바람이 강해요. 안전한 짧은 코스를 추천해요.'
  }
  if (uvIndex !== null && uvIndex >= 6) {
    return '자외선이 높아요. 그늘이 있는 산책로를 추천해요.'
  }
  return '오늘은 가볍게 걷기 좋은 날이에요.'
}

export function mapKmaWeather({
  observationItems,
  forecastItems,
  uvItems,
  baseTimes,
  now,
}: {
  observationItems: ObservationItem[]
  forecastItems: ForecastItem[]
  uvItems: UvItem[]
  baseTimes: KmaBaseTimes
  now: Date
}): CurrentWeather {
  const observationValues = new Map(
    observationItems
      .filter((item) => item.category)
      .map((item) => [item.category as string, item.obsrValue])
  )
  const selectedForecast = pickForecast(forecastItems, now)
  const forecastValues = new Map(
    (selectedForecast?.items ?? [])
      .filter((item) => item.category)
      .map((item) => [item.category as string, item.fcstValue])
  )

  const temperatureC = asNumber(observationValues.get('T1H'))
  const humidityPercent = asNumber(observationValues.get('REH'))
  const windSpeedMps = asNumber(observationValues.get('WSD'))
  const precipitationMm = asNumber(observationValues.get('RN1'))
  const uvIndex = asNumber(uvItems[0]?.h0 ?? uvItems[0]?.h3)
  const [conditionCode, conditionLabel] = mapWeatherCondition(
    observationValues.get('PTY') ?? forecastValues.get('PTY'),
    forecastValues.get('SKY')
  )

  if (temperatureC === null) throw new Error('KMA observation data was incomplete.')

  return {
    observedAt: toKstIso(baseTimes.observation.baseDate, baseTimes.observation.baseTime),
    forecastAt: selectedForecast
      ? toKstIso(selectedForecast.timestamp.slice(0, 8), selectedForecast.timestamp.slice(8))
      : null,
    locationName: SUSEONG_GU_WEATHER_LOCATION.name,
    latitude: SUSEONG_GU_WEATHER_LOCATION.latitude,
    longitude: SUSEONG_GU_WEATHER_LOCATION.longitude,
    temperatureC,
    conditionCode,
    conditionLabel,
    humidityPercent,
    windSpeedMps,
    precipitationMm,
    uvIndex,
    walkAdvice: getWalkAdvice(conditionCode, temperatureC, windSpeedMps, uvIndex),
    source: '기상청',
  }
}
