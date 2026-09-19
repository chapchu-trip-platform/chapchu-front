import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/tmap/pois/route'

function request(body: unknown) {
  return new Request('http://localhost/api/tmap/pois', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function tmapPoi(overrides: Record<string, unknown> = {}) {
  return {
    id: '219821',
    name: '서울역',
    upperAddrName: '서울',
    middleAddrName: '용산구',
    lowerAddrName: '동자동',
    detailAddrName: '',
    pnsLat: '37.55326112',
    pnsLon: '126.96913336',
    frontLat: '37.55320000',
    frontLon: '126.96910000',
    noorLat: '37.55470543',
    noorLon: '126.97068873',
    newAddressList: {
      newAddress: [{ fullAddressRoad: '서울 용산구 한강대로 405' }],
    },
    ...overrides,
  }
}

describe('/api/tmap/pois route', () => {
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

  it('searches TMAP nationwide while keeping the API key server-only', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        searchPoiInfo: {
          totalCount: '1',
          pois: { poi: [tmapPoi()] },
        },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(request({ query: ' 서울역 ', limit: 10 }))
    const data = (await response.json()) as Record<string, unknown>
    const [requestedUrl, init] = fetchMock.mock.calls[0] as [URL, RequestInit]

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0')
    expect(requestedUrl.origin + requestedUrl.pathname).toBe(
      'https://apis.openapi.sk.com/tmap/pois'
    )
    expect(requestedUrl.searchParams.get('searchKeyword')).toBe('서울역')
    expect(requestedUrl.searchParams.get('searchType')).toBe('all')
    expect(requestedUrl.searchParams.get('searchtypCd')).toBe('A')
    expect(requestedUrl.searchParams.get('radius')).toBe('0')
    expect(requestedUrl.searchParams.get('count')).toBe('10')
    expect(requestedUrl.searchParams.get('reqCoordType')).toBe('WGS84GEO')
    expect(requestedUrl.searchParams.get('resCoordType')).toBe('WGS84GEO')
    expect(new Headers(init.headers).get('appKey')).toBe('test-tmap-key')
    expect(data).toEqual({
      items: [
        {
          id: 'tmap-poi-219821',
          name: '서울역',
          address: '서울 용산구 한강대로 405',
          latitude: 37.55326112,
          longitude: 126.96913336,
        },
      ],
    })
    expect(JSON.stringify(data)).not.toContain('test-tmap-key')
  })

  it('falls back to entrance and center coordinates and an administrative address', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          searchPoiInfo: {
            totalCount: '3',
            pois: {
              poi: [
                tmapPoi({
                  id: 'front-coordinate',
                  newAddressList: {},
                  pnsLat: '',
                  pnsLon: '',
                }),
                tmapPoi({
                  id: 'center-coordinate',
                  pnsLat: 'invalid',
                  frontLat: '',
                  frontLon: '',
                }),
                tmapPoi({ id: 'invalid-coordinate', pnsLat: '', frontLat: '', noorLat: '' }),
              ],
            },
          },
        })
      )
    )

    const response = await POST(request({ query: '서울역', limit: 10 }))
    const data = (await response.json()) as { items: Array<Record<string, unknown>> }

    expect(data.items).toHaveLength(2)
    expect(data.items[0]).toMatchObject({
      id: 'tmap-poi-front-coordinate',
      address: '서울 용산구 동자동',
      latitude: 37.5532,
      longitude: 126.9691,
    })
    expect(data.items[1]).toMatchObject({
      id: 'tmap-poi-center-coordinate',
      latitude: 37.55470543,
      longitude: 126.97068873,
    })
  })

  it('maps TMAP 204 to an empty successful result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))

    const response = await POST(request({ query: '없는 장소' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ items: [] })
  })

  it.each([
    { query: '한' },
    { query: '서울역', limit: 0 },
    { query: '서울역', limit: 21 },
    { query: '서울역', limit: 1.5 },
  ])('rejects an invalid request before calling TMAP: %o', async (body) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(request(body))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fails safely when the server-only key is missing', async () => {
    delete process.env.T_MAP_APIKEY
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(request({ query: '서울역' }))

    expect(response.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await response.text()).not.toContain('test-tmap-key')
  })

  it('rejects a malformed upstream response without exposing provider details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ unexpected: 'provider payload' }))
    )

    const response = await POST(request({ query: '서울역' }))
    const body = await response.text()

    expect(response.status).toBe(502)
    expect(body).not.toContain('provider payload')
    expect(body).not.toContain('test-tmap-key')
  })

  it('preserves a provider rate limit without exposing the upstream response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('provider limit details', {
          status: 429,
          headers: { 'Retry-After': '12' },
        })
      )
    )

    const response = await POST(request({ query: '서울역' }))

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('12')
    expect(await response.text()).not.toContain('provider limit details')
  })
})
