import { describe, expect, it } from 'vitest'
import { convertLatLngToKmaGrid } from '@/features/home/lib/kma-grid'

describe('KMA grid conversion', () => {
  it('converts the Suseong-gu representative point to the documented grid', () => {
    expect(convertLatLngToKmaGrid(35.8552083333333, 128.632866666666)).toEqual({
      nx: 89,
      ny: 90,
    })
  })

  it('converts Seoul City Hall to its KMA grid', () => {
    expect(convertLatLngToKmaGrid(37.5665, 126.978)).toEqual({ nx: 60, ny: 127 })
  })

  it('rejects invalid coordinates', () => {
    expect(() => convertLatLngToKmaGrid(91, 126)).toThrow('Invalid coordinates')
  })
})
