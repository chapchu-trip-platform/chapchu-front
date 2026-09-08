import { describe, expect, it } from 'vitest'
import { isValidRouteOptions } from '@/features/map/lib/route-options'

describe('route options', () => {
  it('accepts zero to seven intermediate stops', () => {
    expect(isValidRouteOptions(0)).toBe(true)
    expect(isValidRouteOptions(7)).toBe(true)
    expect(isValidRouteOptions(-1)).toBe(false)
    expect(isValidRouteOptions(8)).toBe(false)
    expect(isValidRouteOptions(null)).toBe(false)
  })
})
