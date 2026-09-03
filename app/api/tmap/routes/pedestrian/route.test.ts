import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/tmap/routes/pedestrian/route'

function request(body: unknown) {
  return new Request('http://localhost/api/tmap/routes/pedestrian', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validRequest = {
  origin: { name: '서울역', latitude: 37.5547, longitude: 126.9706 },
  destination: { name: '서울숲', latitude: 37.5444, longitude: 127.0374 },
}

describe('/api/tmap/routes/pedestrian route', () => {
  const originalApiKey = process.env.T_MAP_APIKEY

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    process.env.T_MAP_APIKEY = 'test-tmap-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalApiKey === undefined) {
      delete process.env.T_MAP_APIKEY
    } else {
      process.env.T_MAP_APIKEY = originalApiKey
    }
  })

  it('keeps the API key server-only and returns only the total walking time', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { totalDistance: 5100, totalTime: 4120 },
            geometry: { type: 'Point', coordinates: [126.9706, 37.5547] },
          },
        ],
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(request(validRequest))
    const data = (await response.json()) as Record<string, unknown>
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    const upstreamBody = JSON.parse(String(init.body)) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(data).toEqual({ totalTimeSeconds: 4120 })
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0')
    expect(url.toString()).toContain('/tmap/routes/pedestrian')
    expect(new Headers(init.headers).get('appKey')).toBe('test-tmap-key')
    expect(upstreamBody).toMatchObject({
      startX: 126.9706,
      startY: 37.5547,
      endX: 127.0374,
      endY: 37.5444,
      reqCoordType: 'WGS84GEO',
      resCoordType: 'WGS84GEO',
    })
    expect(JSON.stringify(data)).not.toContain('test-tmap-key')
  })

  it('rejects invalid coordinates before requesting TMAP', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(
      request({
        ...validRequest,
        origin: { ...validRequest.origin, latitude: 100 },
      })
    )

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails safely when the server-only key is missing', async () => {
    delete process.env.T_MAP_APIKEY
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(request(validRequest))

    expect(response.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await response.text()).not.toContain('test-tmap-key')
  })

  it('rejects an upstream response without totalTime', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ type: 'FeatureCollection', features: [] }))
    )

    const response = await POST(request(validRequest))

    expect(response.status).toBe(502)
    expect(await response.text()).toContain('응답이 올바르지 않아요')
  })

  it('returns a generic error when TMAP is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failed')))

    const response = await POST(request(validRequest))
    const body = await response.text()

    expect(response.status).toBe(502)
    expect(body).not.toContain('network failed')
    expect(body).not.toContain('test-tmap-key')
  })
})
