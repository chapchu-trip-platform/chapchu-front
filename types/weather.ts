export type WeatherConditionCode =
  | 'CLEAR'
  | 'MOSTLY_CLOUDY'
  | 'CLOUDY'
  | 'RAIN'
  | 'RAIN_SNOW'
  | 'SNOW'
  | 'SHOWER'
  | 'DRIZZLE'
  | 'RAIN_SNOW_FLURRY'
  | 'SNOW_FLURRY'
  | 'UNKNOWN'

export interface CurrentWeather {
  observedAt: string
  forecastAt: string | null
  locationName: string
  latitude: number
  longitude: number
  temperatureC: number | null
  conditionCode: WeatherConditionCode
  conditionLabel: string
  humidityPercent: number | null
  windSpeedMps: number | null
  precipitationMm: number | null
  uvIndex: number | null
  walkAdvice: string
  source: '기상청'
}

export type WeatherLoadStatus = 'loading' | 'success' | 'error'
