import { describe, expect, it } from 'vitest'
import {
  getSelectedRecommendedPlace,
  toggleRecommendedPlaceSelection,
} from '@/features/map/lib/recommended-place-selection'
import type { RecommendedPlace } from '@/features/map/types/recommended-place'

const places = ['first', 'second', 'third', 'fourth'].map(
  (externalPlaceId, index): RecommendedPlace => ({
    externalPlaceId,
    name: externalPlaceId,
    imageUrl: null,
    latitude: 37 + index * 0.01,
    longitude: 127,
    address: '서울',
    category: '공원',
    indoorOutdoorType: '실외',
    allowedPetSize: null,
    leashRequired: null,
    carrierRequired: null,
    caution: null,
  })
)

describe('recommended place selection', () => {
  it('selects one destination at a time and allows clearing it', () => {
    expect(toggleRecommendedPlaceSelection(null, 'first')).toBe('first')
    expect(toggleRecommendedPlaceSelection('first', 'second')).toBe('second')
    expect(toggleRecommendedPlaceSelection('first', 'first')).toBeNull()
  })

  it('returns only the selected final destination', () => {
    expect(getSelectedRecommendedPlace(places, 'third')?.externalPlaceId).toBe('third')
    expect(getSelectedRecommendedPlace(places, null)).toBeNull()
    expect(getSelectedRecommendedPlace(places, 'missing')).toBeNull()
  })
})
