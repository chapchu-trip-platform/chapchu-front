import { describe, expect, it } from 'vitest'
import { formatPetName } from '@/lib/format-pet-name'

describe('formatPetName', () => {
  it('keeps names up to ten characters and truncates longer names', () => {
    expect(formatPetName('가나다라마바사아자차')).toBe('가나다라마바사아자차')
    expect(formatPetName('가나다라마바사아자차카')).toBe('가나다라마바사아자차...')
  })

  it('uses the default companion label for an empty name', () => {
    expect(formatPetName('  ')).toBe('반려동물')
  })
})
