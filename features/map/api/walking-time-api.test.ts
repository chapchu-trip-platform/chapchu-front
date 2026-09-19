import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatWalkingTime,
  getMinimumWalkingTimeSeconds,
  getPedestrianRoute,
} from '@/features/map/api/walking-time-api'

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
      Response.json({
        totalDistanceMeters: 5100,
        totalTimeSeconds: 4120,
        path: [],
      }, { status: 200 })
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
      waypoints: [],
    })
  })

  it('rejects invalid success payloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ totalTimeSeconds: 'fast' }))
    )

    await expect(
      getMinimumWalkingTimeSeconds(origin, destination)
    ).rejects.toThrow('Pedestrian route request failed.')
  })
})

describe('getPedestrianRoute', () => {
  it('passes ordered waypoints and validates the returned route path', async () => {
    const route = {
      totalDistanceMeters: 5100,
      totalTimeSeconds: 4120,
      path: [
        { lat: 37.5547, lng: 126.9706 },
        { lat: 37.55, lng: 127.01 },
        { lat: 37.5444, lng: 127.0374 },
      ],
    }
    const fetchMock = vi.fn().mockResolvedValue(Response.json(route))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getPedestrianRoute(
      origin,
      destination,
      [{ name: '반려견 카페', latitude: 37.55, longitude: 127.01 }]
    )).resolves.toEqual(route)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({
      waypoints: [{ name: '반려견 카페', latitude: 37.55, longitude: 127.01 }],
    })
  })
})

describe('formatWalkingTime', () => {
  it('formats minutes and hours for the options summary', () => {
    expect(formatWalkingTime(59)).toBe('약 1분')
    expect(formatWalkingTime(4120)).toBe('약 1시간 9분')
    expect(formatWalkingTime(7200)).toBe('약 2시간')
  })
})
