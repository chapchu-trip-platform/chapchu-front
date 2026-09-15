import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchLocations } from '@/features/location/api/location-search-api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('location search API', () => {
  const location = {
    id: 'tmap-poi-219821',
    name: '서울역',
    address: '서울 용산구 한강대로 405',
    latitude: 37.55326112,
    longitude: 126.96913336,
  }

  it('requests the server adapter and returns validated locations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ items: [location] }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(searchLocations(' 서울역 ')).resolves.toEqual([location])

    const [endpoint, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(endpoint).toBe('/api/tmap/pois')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ query: '서울역', limit: 10 })
  })

  it('does not request the adapter for fewer than two trimmed characters', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(searchLocations(' 한 ')).resolves.toEqual([])

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('passes the cancellation signal to fetch', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ items: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await searchLocations('서울역', { signal: controller.signal })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tmap/pois',
      expect.objectContaining({ signal: controller.signal })
    )
  })

  it('rejects an invalid success response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ items: [{}] })))

    await expect(searchLocations('서울역')).rejects.toThrow(
      'Location search request failed.'
    )
  })

  it('rejects an adapter error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({ message: '위치 검색 실패' }, { status: 502 })
      )
    )

    await expect(searchLocations('서울역')).rejects.toThrow(
      'Location search request failed.'
    )
  })
})
