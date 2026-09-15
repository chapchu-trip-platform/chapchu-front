import { beforeEach, describe, expect, it } from 'vitest'
import {
  loadRecentLocations,
  MAX_RECENT_LOCATIONS,
  RECENT_LOCATION_RETENTION_MS,
  RECENT_LOCATIONS_STORAGE_KEY,
  saveRecentLocations,
  toRecentLocation,
} from '@/features/location/lib/recent-locations'

beforeEach(() => window.localStorage.clear())

describe('recent locations', () => {
  it('stores only reusable location labels without coordinates', () => {
    const recent = toRecentLocation(
      {
        id: 'poi-1',
        name: '서울숲',
        address: '서울 성동구 뚝섬로 273',
        latitude: 37.5444,
        longitude: 127.0374,
      },
      1_000
    )
    saveRecentLocations([recent])

    const serialized = window.localStorage.getItem(RECENT_LOCATIONS_STORAGE_KEY) ?? ''
    expect(serialized).toContain('서울숲')
    expect(serialized).not.toContain('latitude')
    expect(serialized).not.toContain('longitude')
  })

  it('keeps valid searches for 30 days and removes expired entries', () => {
    const now = 2_000_000_000_000
    window.localStorage.setItem(
      RECENT_LOCATIONS_STORAGE_KEY,
      JSON.stringify([
        { id: 'valid', name: '서울숲', address: '서울', savedAt: now - 1_000 },
        {
          id: 'expired',
          name: '오래된 장소',
          address: '서울',
          savedAt: now - RECENT_LOCATION_RETENTION_MS - 1,
        },
      ])
    )

    expect(loadRecentLocations(now).map((location) => location.id)).toEqual(['valid'])
  })

  it('limits restored history and ignores malformed storage', () => {
    const now = 2_000_000_000_000
    window.localStorage.setItem(
      RECENT_LOCATIONS_STORAGE_KEY,
      JSON.stringify(
        Array.from({ length: MAX_RECENT_LOCATIONS + 3 }, (_, index) => ({
          id: `poi-${index}`,
          name: `장소 ${index}`,
          address: '서울',
          savedAt: now - index,
        }))
      )
    )
    expect(loadRecentLocations(now)).toHaveLength(MAX_RECENT_LOCATIONS)

    window.localStorage.setItem(RECENT_LOCATIONS_STORAGE_KEY, '{invalid')
    expect(loadRecentLocations(now)).toEqual([])
  })
})
