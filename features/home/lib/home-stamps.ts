import type { TravelStamp } from '@/features/stamps/types/stamp'

const HOME_STAMP_LIMIT = 5

function getAcquiredTimestamp(stamp: TravelStamp) {
  if (!stamp.firstAcquiredAt) return Number.NEGATIVE_INFINITY
  const timestamp = Date.parse(stamp.firstAcquiredAt)
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY
}

export function selectHomeStamps(stamps: TravelStamp[]) {
  return stamps
    .filter((stamp) => stamp.acquired)
    .sort((first, second) => {
      const timeDifference = getAcquiredTimestamp(second) - getAcquiredTimestamp(first)
      return timeDifference || first.stampName.localeCompare(second.stampName, 'ko-KR')
    })
    .slice(0, HOME_STAMP_LIMIT)
}
