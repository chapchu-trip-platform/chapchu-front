import { describe, expect, it } from 'vitest'
import { parsePetPolicy } from '@/features/map/lib/pet-policy'

describe('parsePetPolicy', () => {
  it('reads the deployed placeCaution field and preserves each rule on its own line', () => {
    expect(parsePetPolicy({
      allowedPetSize: 'ALL',
      leashRequired: true,
      placeCaution: '- 맹견의 경우, 입마개 착용 필수 - 배변봉투 지참 및 배변처리 필수',
    })).toEqual({
      labels: ['허용 크기 ALL', '목줄 필수'],
      text: '- 맹견의 경우, 입마개 착용 필수\n- 배변봉투 지참 및 배변처리 필수',
    })
  })

  it('renders array policies as separate lines', () => {
    expect(parsePetPolicy(['목줄 착용', '배변봉투 지참']).text).toBe(
      '목줄 착용\n배변봉투 지참'
    )
  })
})
