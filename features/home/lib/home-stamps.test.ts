import { describe, expect, it } from 'vitest'
import { selectHomeStamps } from '@/features/home/lib/home-stamps'
import type { TravelStamp } from '@/features/stamps/types/stamp'

function stamp(
  stampName: string,
  firstAcquiredAt: string | null,
  stampCount: number,
  acquired = true
): TravelStamp {
  return {
    stampId: `stamp-${stampName}`,
    stampName,
    acquired,
    stampCount: acquired ? stampCount : 0,
    firstAcquiredAt,
  }
}

describe('selectHomeStamps', () => {
  it('shows only five acquired stamps ordered by visit count', () => {
    const stamps = [
      stamp('경기', '2026-09-01T00:00:00+09:00', 7),
      stamp('강원', '2026-09-06T00:00:00+09:00', 3),
      stamp('충북', null, 0, false),
      stamp('충남', '2026-09-02T00:00:00+09:00', 2),
      stamp('전북', '2026-09-03T00:00:00+09:00', 5),
      stamp('전남', '2026-09-04T00:00:00+09:00', 4),
      stamp('경북', '2026-09-05T00:00:00+09:00', 6),
    ]

    expect(selectHomeStamps(stamps).map((item) => item.stampName)).toEqual([
      '경기',
      '경북',
      '전북',
      '전남',
      '강원',
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
