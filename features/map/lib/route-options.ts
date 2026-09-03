export const MAX_WAYPOINT_COUNT = 4
export const MAX_ADDITIONAL_TRAVEL_HOURS = 3

export function secondsToMinimumTravelHours(totalTimeSeconds: number) {
  if (!Number.isFinite(totalTimeSeconds) || totalTimeSeconds < 0) {
    throw new Error('Walking time must be a non-negative finite number.')
  }

  return Math.ceil(totalTimeSeconds / 3600)
}

export function getTravelTimeOptions(minimumTravelHours: number) {
  if (!Number.isInteger(minimumTravelHours) || minimumTravelHours < 0) {
    throw new Error('Minimum travel time must be a non-negative integer.')
  }

  return Array.from(
    { length: MAX_ADDITIONAL_TRAVEL_HOURS + 1 },
    (_, index) => minimumTravelHours + index
  )
}

export function isValidRouteOptions(
  minimumTravelHours: number | null,
  waypointCount: number | null,
  travelTimeHours: number | null
) {
  if (minimumTravelHours === null || waypointCount === null || travelTimeHours === null) {
    return false
  }

  return (
    Number.isInteger(waypointCount) &&
    waypointCount >= 1 &&
    waypointCount <= MAX_WAYPOINT_COUNT &&
    Number.isInteger(travelTimeHours) &&
    travelTimeHours >= minimumTravelHours &&
    travelTimeHours <= minimumTravelHours + MAX_ADDITIONAL_TRAVEL_HOURS
  )
}
