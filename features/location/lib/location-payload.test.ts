import { describe, expect, it } from 'vitest'
import {
  createHomeLocationContextCandidate,
  normalizeWebPosition,
} from '@/features/location/lib/location-payload'

function createPosition({
  accuracy = 42,
  latitude = 35.8584,
  longitude = 128.6304,
  timestamp = Date.parse('2026-08-22T07:00:00Z'),
} = {}) {
  return {
    coords: {
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      latitude,
      longitude,
      speed: null,
    },
    timestamp,
  } as GeolocationPosition
}

describe('location payload preparation', () => {
  it('normalizes a valid web position without persisting unused movement data', () => {
    expect(normalizeWebPosition(createPosition())).toEqual({
      latitude: 35.8584,
      longitude: 128.6304,
      accuracyMeters: 42,
      capturedAt: '2026-08-22T07:00:00.000Z',
      precision: 'precise',
      source: 'web',
    })
  })

  it('marks lower-accuracy positions as approximate', () => {
    expect(normalizeWebPosition(createPosition({ accuracy: 450 }))).toEqual(
      expect.objectContaining({ precision: 'approximate' })
    )
  })

  it.each([
    { latitude: 91 },
    { latitude: Number.NaN },
    { longitude: 181 },
    { accuracy: -1 },
    { timestamp: Number.MAX_VALUE },
  ])('rejects an invalid web position %#', (overrides) => {
    expect(normalizeWebPosition(createPosition(overrides))).toBeNull()
  })

  it('creates a purpose-limited Home candidate with reduced coordinate precision', () => {
    const position = normalizeWebPosition(createPosition())

    expect(position && createHomeLocationContextCandidate(position)).toEqual({
      position: {
        latitude: 35.858,
        longitude: 128.63,
        accuracyMeters: 42,
        capturedAt: '2026-08-22T07:00:00.000Z',
        precision: 'precise',
      },
      purposes: ['MAP_CENTER', 'WEATHER', 'NEARBY_PLACES'],
    })
  })

  it('rounds negative coordinates without changing their sign', () => {
    const position = normalizeWebPosition(
      createPosition({ latitude: -35.8586, longitude: -128.6306 })
    )

    expect(position && createHomeLocationContextCandidate(position)).toEqual(
      expect.objectContaining({
        position: expect.objectContaining({
          latitude: -35.859,
          longitude: -128.631,
        }),
      })
    )
  })

  it.each([
    { latitude: Number.NaN },
    { latitude: 90.001 },
    { longitude: Number.POSITIVE_INFINITY },
    { longitude: -180.001 },
    { accuracyMeters: -1 },
    { capturedAt: 'invalid-date' },
    { precision: 'unknown' },
    { source: 'unknown' },
  ])('does not create a Home candidate from invalid position data %#', (overrides) => {
    const position = {
      latitude: 35.8584,
      longitude: 128.6304,
      accuracyMeters: 42,
      capturedAt: '2026-08-22T07:00:00.000Z',
      precision: 'precise',
      source: 'web',
      ...overrides,
    } as Parameters<typeof createHomeLocationContextCandidate>[0]

    expect(createHomeLocationContextCandidate(position)).toBeNull()
  })

  it('accepts valid coordinate range boundaries', () => {
    const position = {
      latitude: -90,
      longitude: 180,
      accuracyMeters: 0,
      capturedAt: '2026-08-22T07:00:00.000Z',
      precision: 'precise',
      source: 'native',
    } as const

    expect(createHomeLocationContextCandidate(position)).not.toBeNull()
  })
})
