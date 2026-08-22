import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WeatherCard from '@/features/home/components/weather-card'
import type { CurrentWeather } from '@/types/weather'

const weather: CurrentWeather = {
  observedAt: '2026-08-22T12:00:00+09:00',
  forecastAt: '2026-08-22T13:00:00+09:00',
  locationName: '대구광역시 수성구',
  latitude: 35.8552083333333,
  longitude: 128.632866666666,
  temperatureC: 27,
  conditionCode: 'CLEAR',
  conditionLabel: '맑음',
  humidityPercent: 58,
  windSpeedMps: 2.4,
  precipitationMm: 0,
  uvIndex: 5,
  walkAdvice: '오늘은 가볍게 걷기 좋은 날이에요.',
  source: '기상청',
}

describe('WeatherCard', () => {
  it('shows a loading state without blocking the rest of Home', () => {
    render(<WeatherCard status="loading" weather={null} onRetry={() => undefined} />)
    expect(screen.getByText('수성구 날씨를 불러오고 있어요.')).toBeInTheDocument()
  })

  it('renders normalized KMA weather data', () => {
    render(<WeatherCard status="success" weather={weather} onRetry={() => undefined} />)

    expect(screen.getByText('27°C')).toBeInTheDocument()
    expect(screen.getByText('맑음 · 대구광역시 수성구')).toBeInTheDocument()
    expect(screen.getByText('UV 5')).toBeInTheDocument()
    expect(screen.getByText('기상청 제공 · 수성구 대표 지점 기준')).toBeInTheDocument()
  })

  it('offers an isolated retry when weather loading fails', () => {
    const onRetry = vi.fn()
    render(<WeatherCard status="error" weather={null} onRetry={onRetry} />)

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
