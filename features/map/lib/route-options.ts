export const MIN_WAYPOINT_COUNT = 0
export const MAX_WAYPOINT_COUNT = 7

export function isValidRouteOptions(waypointCount: number | null) {
  if (waypointCount === null) return false
  return (
    Number.isInteger(waypointCount) &&
    waypointCount >= MIN_WAYPOINT_COUNT &&
    waypointCount <= MAX_WAYPOINT_COUNT
  )
}
