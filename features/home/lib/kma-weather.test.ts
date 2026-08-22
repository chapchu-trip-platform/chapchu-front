import { describe, expect, it } from 'vitest'
import {
  getKmaBaseTimes,
  mapWeatherCondition,
  normalizeKmaServiceKey,
  pickForecast,
} from '@/features/home/lib/kma-weather'

describe('KMA weather helpers', () => {
  it('uses the previous KST release across midnight when data is not ready yet', () => {
    const result = getKmaBaseTimes(new Date('2026-08-21T15:05:00.000Z'))

    expect(result).toEqual({
      observation: { baseDate: '20260821', baseTime: '2300' },
      forecast: { baseDate: '20260821', baseTime: '2330' },
      uv: { time: '2026082121' },
    })
  })

  it('selects the latest available KST release times', () => {
    const result = getKmaBaseTimes(new Date('2026-08-22T03:50:00.000Z'))

    expect(result).toEqual({
      observation: { baseDate: '20260822', baseTime: '1200' },
      forecast: { baseDate: '20260822', baseTime: '1230' },
      uv: { time: '2026082212' },
    })
  })

  it('accepts both encoded and decoded data.go.kr service keys', () => {
    expect(normalizeKmaServiceKey('test%2Bservice%3D')).toBe('test+service=')
    expect(normalizeKmaServiceKey('test+service=')).toBe('test+service=')
  })

  it('rejects a malformed encoded service key instead of silently re-encoding it', () => {
    expect(() => normalizeKmaServiceKey('bad%key')).toThrow('encoding is invalid')
  })

  it('uses the newest past forecast when no future forecast remains', () => {
    const result = pickForecast(
      [
        { category: 'SKY', fcstDate: '20260822', fcstTime: '1000', fcstValue: '1' },
        { category: 'SKY', fcstDate: '20260822', fcstTime: '1200', fcstValue: '4' },
      ],
      new Date('2026-08-22T04:00:00.000Z')
    )

    expect(result?.timestamp).toBe('202608221200')
  })

  it('prioritizes precipitation over sky condition codes', () => {
    expect(mapWeatherCondition('1', '1')).toEqual(['RAIN', '비'])
    expect(mapWeatherCondition('0', '3')).toEqual(['MOSTLY_CLOUDY', '구름많음'])
  })
})
