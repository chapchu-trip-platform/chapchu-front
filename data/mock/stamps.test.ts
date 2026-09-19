import { describe, expect, it } from 'vitest'
import { mockStampCollection } from '@/data/mock/stamps'

const STAMP_REGIONS = [
  '서울',
  '부산',
  '대구',
  '인천',
  '광주',
  '대전',
  '울산',
  '세종',
  '경기',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
] as const

describe('mockStampCollection', () => {
  it('matches the 17-region stamp API contract', () => {
    expect(mockStampCollection.totalCount).toBe(STAMP_REGIONS.length)
    expect(mockStampCollection.stamps.map((stamp) => stamp.stampName)).toEqual(
      STAMP_REGIONS
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
