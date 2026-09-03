import { describe, expect, it } from 'vitest'
import {
  getTravelTimeOptions,
  isValidRouteOptions,
  secondsToMinimumTravelHours,
} from '@/features/map/lib/route-options'

describe('route options', () => {
  it('rounds TMAP seconds up to the next H unit', () => {
    expect(secondsToMinimumTravelHours(3600)).toBe(1)
    expect(secondsToMinimumTravelHours(3601)).toBe(2)
    expect(secondsToMinimumTravelHours(0)).toBe(0)
  })

  it('offers the minimum through three additional hours', () => {
    expect(getTravelTimeOptions(2)).toEqual([2, 3, 4, 5])
  })

  it('accepts one to four waypoints and the allowed time window', () => {
    expect(isValidRouteOptions(2, 1, 2)).toBe(true)
    expect(isValidRouteOptions(2, 4, 5)).toBe(true)
    expect(isValidRouteOptions(2, 0, 2)).toBe(false)
    expect(isValidRouteOptions(2, 5, 2)).toBe(false)
    expect(isValidRouteOptions(2, 2, 6)).toBe(false)
  })
})
