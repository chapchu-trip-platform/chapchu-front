import { describe, expect, it } from 'vitest'
import { mockStampCollection } from '@/data/mock/stamps'
import { STAMP_REGIONS } from '@/features/stamps/constants/regions'

describe('mockStampCollection', () => {
  it('matches the 17-region stamp API contract', () => {
    expect(mockStampCollection.totalCount).toBe(STAMP_REGIONS.length)
    expect(mockStampCollection.stamps.map((stamp) => stamp.stampName)).toEqual(
      STAMP_REGIONS.map((region) => region.name)
    )
    expect(new Set(mockStampCollection.stamps.map((stamp) => stamp.stampId)).size).toBe(
      STAMP_REGIONS.length
    )
    expect(mockStampCollection.acquiredCount).toBe(
      mockStampCollection.stamps.filter((stamp) => stamp.acquired).length
    )
  })

  it('keeps unacquired stamps consistent with the API contract', () => {
    for (const stamp of mockStampCollection.stamps.filter((item) => !item.acquired)) {
      expect(stamp.stampCount).toBe(0)
      expect(stamp.firstAcquiredAt).toBeNull()
    }
  })
})
