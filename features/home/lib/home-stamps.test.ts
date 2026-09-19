import { describe, expect, it } from 'vitest'
import { selectHomeStamps } from '@/features/home/lib/home-stamps'
import type { TravelStamp } from '@/features/stamps/types/stamp'

function stamp(
  stampName: string,
  firstAcquiredAt: string | null,
  acquired = true
): TravelStamp {
  return {
    stampId: `stamp-${stampName}`,
    stampName,
    acquired,
    stampCount: acquired ? 1 : 0,
    firstAcquiredAt,
  }
}

describe('selectHomeStamps', () => {
  it('shows only the five most recently acquired stamps', () => {
    const stamps = [
      stamp('경기', '2026-09-01T00:00:00+09:00'),
      stamp('강원', '2026-09-06T00:00:00+09:00'),
      stamp('충북', null, false),
      stamp('충남', '2026-09-02T00:00:00+09:00'),
      stamp('전북', '2026-09-03T00:00:00+09:00'),
      stamp('전남', '2026-09-04T00:00:00+09:00'),
      stamp('경북', '2026-09-05T00:00:00+09:00'),
    ]

    expect(selectHomeStamps(stamps).map((item) => item.stampName)).toEqual([
      '강원',
      '경북',
      '전남',
      '전북',
      '충남',
    ])
    expect(stamps.map((item) => item.stampName)).toEqual([
      '경기',
      '강원',
      '충북',
      '충남',
      '전북',
      '전남',
      '경북',
    ])
  })
})
