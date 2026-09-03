import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMinimumWalkingTimeSeconds } from '@/features/map/api/walking-time-api'

const origin = {
  id: 'origin',
  name: '서울역',
  address: '서울 용산구 한강대로 405',
  latitude: 37.5547,
  longitude: 126.9706,
}

const destination = {
  id: 'destination',
  name: '서울숲',
  address: '서울 성동구 뚝섬로 273',
  latitude: 37.5444,
  longitude: 127.0374,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getMinimumWalkingTimeSeconds', () => {
  it('sends only the route point fields needed by the internal TMAP adapter', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ totalTimeSeconds: 4120 }, { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      getMinimumWalkingTimeSeconds(origin, destination)
    ).resolves.toBe(4120)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/tmap/routes/pedestrian')
    expect(JSON.parse(String(init.body))).toEqual({
      origin: { name: '서울역', latitude: 37.5547, longitude: 126.9706 },
      destination: { name: '서울숲', latitude: 37.5444, longitude: 127.0374 },
    })
  })

  it('rejects invalid success payloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ totalTimeSeconds: 'fast' }))
    )

    await expect(
      getMinimumWalkingTimeSeconds(origin, destination)
    ).rejects.toThrow('Minimum walking time request failed.')
  })
})
