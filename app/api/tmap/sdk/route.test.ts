import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/tmap/sdk/route'

describe('/api/tmap/sdk route', () => {
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
      return
    }

    process.env.T_MAP_APIKEY = originalApiKey
  })

  it('fails safely when the server-only API key is missing', async () => {
    delete process.env.T_MAP_APIKEY

    const response = await GET()
    const body = await response.text()

    expect(response.status).toBe(500)
    expect(body).toBe('TMAP SDK is not configured.')
    expect(body).not.toContain('test-tmap-key')
  })

  it('does not return an SDK response that echoes the API key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('window.Tmapv2 = {}; test-tmap-key', {
          status: 200,
        })
      )
    )

    const response = await GET()
    const body = await response.text()

    expect(response.status).toBe(502)
    expect(body).toBe('TMAP SDK response failed security validation.')
    expect(body).not.toContain('test-tmap-key')
  })

  it('does not return an SDK response that echoes a URL-encoded API key', async () => {
    const apiKey = 'test+tmap/key=='
    const encodedApiKey = encodeURIComponent(apiKey)
    process.env.T_MAP_APIKEY = apiKey
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(`window.Tmapv2 = {}; appKey=${encodedApiKey}`, {
          status: 200,
        })
      )
    )

    const response = await GET()
    const body = await response.text()

    expect(response.status).toBe(502)
    expect(body).toBe('TMAP SDK response failed security validation.')
    expect(body).not.toContain(apiKey)
    expect(body).not.toContain(encodedApiKey)
  })

  it('proxies safe SDK JavaScript with security-focused headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('window.Tmapv2 = {};', {
        status: 200,
      })
    )

    vi.stubGlobal('fetch', fetchMock)

    const response = await GET()
    const body = await response.text()
    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as URL)

    expect(response.status).toBe(200)
    expect(body).toBe('window.Tmapv2 = {};')
    expect(response.headers.get('Content-Type')).toContain('application/javascript')
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(requestedUrl.searchParams.get('version')).toBe('1')
    expect(requestedUrl.searchParams.get('appKey')).toBe('test-tmap-key')
  })

  it('fails safely when the upstream SDK request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('upstream error', {
          status: 403,
        })
      )
    )

    const response = await GET()
    const body = await response.text()

    expect(response.status).toBe(502)
    expect(body).toBe('Failed to load TMAP SDK.')
    expect(body).not.toContain('test-tmap-key')
  })

  it('fails safely when the upstream SDK request throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failed')))

    const response = await GET()
    const body = await response.text()

    expect(response.status).toBe(502)
    expect(body).toBe('Failed to request TMAP SDK.')
    expect(body).not.toContain('test-tmap-key')
  })
})
