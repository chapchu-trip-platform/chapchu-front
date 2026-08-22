import {
  Cloud,
  CloudRain,
  CloudSun,
  Droplets,
  Snowflake,
  Sun,
  Wind,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CurrentWeather, WeatherConditionCode, WeatherLoadStatus } from '@/types/weather'

interface WeatherCardProps {
  status: WeatherLoadStatus
  weather: CurrentWeather | null
  onRetry: () => void
}

function WeatherIcon({ conditionCode }: { conditionCode: WeatherConditionCode }) {
  if (['RAIN', 'RAIN_SNOW', 'SHOWER', 'DRIZZLE', 'RAIN_SNOW_FLURRY'].includes(conditionCode)) {
    return <CloudRain className="h-6 w-6 text-sky-blue" aria-hidden="true" />
  }
  if (['SNOW', 'SNOW_FLURRY'].includes(conditionCode)) {
    return <Snowflake className="h-6 w-6 text-sky-blue" aria-hidden="true" />
  }
  if (conditionCode === 'CLEAR') {
    return <Sun className="h-6 w-6 text-soft-orange" aria-hidden="true" />
  }
  if (conditionCode === 'CLOUDY') {
    return <Cloud className="h-6 w-6 text-warm-gray" aria-hidden="true" />
  }
  return <CloudSun className="h-6 w-6 text-sky-blue" aria-hidden="true" />
}

function formatValue(value: number | null, suffix: string) {
  return value === null ? '—' : `${Math.round(value)}${suffix}`
}

export default function WeatherCard({ status, weather, onRetry }: WeatherCardProps) {
  if (status === 'loading') {
    return (
      <section
        className="mx-4 mt-3 rounded-card border border-border bg-card-surface p-4 shadow-sm"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-full bg-sky-blue/15 motion-reduce:animate-none" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-24 animate-pulse rounded bg-warm-beige motion-reduce:animate-none" />
            <p className="text-[12px] text-warm-gray">수성구 날씨를 불러오고 있어요.</p>
          </div>
        </div>
      </section>
    )
  }

  if (status === 'error' || !weather) {
    return (
      <section
        className="mx-4 mt-3 rounded-card border border-border bg-card-surface p-4 shadow-sm"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-deep-brown">날씨를 잠시 불러오지 못했어요.</p>
            <p className="mt-1 text-[12px] text-warm-gray">다른 홈 기능은 그대로 이용할 수 있어요.</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section
      className="mx-4 mt-3 rounded-card border border-border bg-card-surface p-4 shadow-sm"
      aria-label={`${weather.locationName} 현재 날씨`}
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-sky-blue/20">
            <WeatherIcon conditionCode={weather.conditionCode} />
          </div>
          <div className="min-w-0">
            <p className="text-[22px] font-bold leading-none text-deep-brown">
              {formatValue(weather.temperatureC, '°C')}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-warm-gray">
              {weather.conditionLabel} · {weather.locationName}
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-3 text-right">
          <div className="flex flex-col items-center gap-0.5">
            <Wind className="h-3.5 w-3.5 text-warm-gray" aria-hidden="true" />
            <span className="text-[11px] text-warm-gray">
              {formatValue(weather.windSpeedMps, 'm/s')}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Droplets className="h-3.5 w-3.5 text-sky-blue" aria-hidden="true" />
            <span className="text-[11px] text-warm-gray">
              {formatValue(weather.humidityPercent, '%')}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Sun className="h-3.5 w-3.5 text-soft-orange" aria-hidden="true" />
            <span className="text-[11px] text-warm-gray">
              {weather.uvIndex === null ? 'UV —' : `UV ${Math.round(weather.uvIndex)}`}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <p className="text-[13px] font-medium text-sage-green">{weather.walkAdvice}</p>
        <p className="mt-1 text-[10px] text-warm-gray">기상청 제공 · 수성구 대표 지점 기준</p>
      </div>
    </section>
  )
}
