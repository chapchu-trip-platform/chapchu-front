import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/weather/current/route'
import { clearKmaWeatherCache } from '@/app/api/weather/current/kma-weather.server'

function kmaResponse<T>(items: T[]) {
  return new Response(
    JSON.stringify({
      response: {
        header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
        body: { items: { item: items } },
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}

describe('/api/weather/current route', () => {
  const originalServiceKey = process.env.KMA_SERVICE_KEY

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    clearKmaWeatherCache()
    process.env.KMA_SERVICE_KEY = 'test%2Bservice%3D'
  })

  afterEach(() => {
    vi.unstubAllGlobals()

    if (originalServiceKey === undefined) {
      delete process.env.KMA_SERVICE_KEY
      return
    }

    process.env.KMA_SERVICE_KEY = originalServiceKey
  })

  it('fails safely when the server-only key is missing', async () => {
    delete process.env.KMA_SERVICE_KEY
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET()
    const body = await response.text()

    expect(response.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(body).not.toContain('test+service=')
  })

  it('combines KMA observation, forecast, and UV data without returning the key', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(input instanceof URL ? input.toString() : String(input))

      expect(url.searchParams.get('serviceKey')).toBe('test+service=')

      if (url.pathname.endsWith('/getUltraSrtNcst')) {
        return kmaResponse([
          { category: 'T1H', obsrValue: '27' },
          { category: 'REH', obsrValue: '58' },
          { category: 'WSD', obsrValue: '2.4' },
          { category: 'RN1', obsrValue: '0' },
          { category: 'PTY', obsrValue: '0' },
        ])
      }

      if (url.pathname.endsWith('/getUltraSrtFcst')) {
        return kmaResponse([
          { category: 'SKY', fcstDate: '20260822', fcstTime: '1300', fcstValue: '1' },
          { category: 'PTY', fcstDate: '20260822', fcstTime: '1300', fcstValue: '0' },
        ])
      }

      return kmaResponse([{ date: '2026082212', h0: '5' }])
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET()
    const body = await response.text()
    const data = JSON.parse(body) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(data).toMatchObject({
      locationName: '대구광역시 수성구',
      temperatureC: 27,
      humidityPercent: 58,
      windSpeedMps: 2.4,
      conditionCode: 'CLEAR',
      uvIndex: 5,
      source: '기상청',
    })
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=600')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(body).not.toContain('test%2Bservice%3D')
    expect(body).not.toContain('test+service=')
  })

  it('shares the successful weather result for ten minutes', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(input instanceof URL ? input.toString() : String(input))
      if (url.pathname.endsWith('/getUltraSrtNcst')) {
        return kmaResponse([{ category: 'T1H', obsrValue: '25' }])
      }
      return kmaResponse([])
    })
    vi.stubGlobal('fetch', fetchMock)

    const firstResponse = await GET()
    const secondResponse = await GET()

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('returns a generic error without leaking the key when KMA is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failed')))

    const response = await GET()
    const body = await response.text()

    expect(response.status).toBe(502)
    expect(body).toContain('날씨 정보를 잠시 불러오지 못했어요.')
    expect(body).not.toContain('test%2Bservice%3D')
    expect(body).not.toContain('test+service=')
  })
})
