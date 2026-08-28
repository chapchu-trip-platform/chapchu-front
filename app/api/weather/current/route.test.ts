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

  it('uses a privacy-reduced KMA grid without requesting mismatched UV data', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(input instanceof URL ? input.toString() : String(input))
      expect(url.searchParams.get('nx')).toBe('60')
      expect(url.searchParams.get('ny')).toBe('127')

      if (url.pathname.endsWith('/getUltraSrtNcst')) {
        return kmaResponse([{ category: 'T1H', obsrValue: '24' }])
      }
      return kmaResponse([])
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(
      new Request('http://localhost/api/weather/current?nx=60&ny=127')
    )
    const data = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(data).toMatchObject({
      locationName: '현재 위치 주변',
      temperatureC: 24,
      uvIndex: null,
    })
  })

  it('keeps weather cache and pending work isolated by KMA grid', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(input instanceof URL ? input.toString() : String(input))
      if (url.pathname.endsWith('/getUltraSrtNcst')) {
        const temperature = url.searchParams.get('nx') === '60' ? '24' : '19'
        return kmaResponse([{ category: 'T1H', obsrValue: temperature }])
      }
      return kmaResponse([])
    })
    vi.stubGlobal('fetch', fetchMock)

    const firstGrid = new Request('http://localhost/api/weather/current?nx=60&ny=127')
    const secondGrid = new Request('http://localhost/api/weather/current?nx=89&ny=90')
    const [first, firstDuplicate, second] = await Promise.all([
      GET(firstGrid),
      GET(new Request(firstGrid.url)),
      GET(secondGrid),
    ])

    expect((await first.json()).temperatureC).toBe(24)
    expect((await firstDuplicate.json()).temperatureC).toBe(24)
    expect((await second.json()).temperatureC).toBe(19)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('caps unique in-flight grid requests before calling KMA again', async () => {
    let releaseRequests!: () => void
    const gate = new Promise<void>((resolve) => {
      releaseRequests = resolve
    })
    const fetchMock = vi.fn(async () => {
      await gate
      return kmaResponse([])
    })
    vi.stubGlobal('fetch', fetchMock)

    const pending = Array.from({ length: 20 }, (_, index) =>
      GET(new Request(`http://localhost/api/weather/current?nx=${index + 1}&ny=90`))
    )
    const overflow = await GET(
      new Request('http://localhost/api/weather/current?nx=21&ny=90')
    )

    expect(overflow.status).toBe(503)
    expect(overflow.headers.get('Retry-After')).toBe('5')
    expect(fetchMock).toHaveBeenCalledTimes(40)

    releaseRequests()
    await Promise.all(pending)
  })

  it('rejects incomplete or out-of-range weather grids before calling KMA', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const incomplete = await GET(
      new Request('http://localhost/api/weather/current?nx=60')
    )
    const invalid = await GET(
      new Request('http://localhost/api/weather/current?nx=999&ny=127')
    )

    expect(incomplete.status).toBe(400)
    expect(invalid.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
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
