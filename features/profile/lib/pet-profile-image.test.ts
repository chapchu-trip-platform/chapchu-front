import { describe, expect, it } from 'vitest'
import {
  isCommonPetProfileImage,
  PET_PROFILE_IMAGE_ACCEPT,
} from '@/features/profile/lib/pet-profile-image'

describe('pet profile image validation', () => {
  it.each([
    ['photo.jpg', 'image/jpeg'],
    ['photo.jpeg', 'image/jpeg'],
    ['photo.png', 'image/png'],
    ['photo.webp', 'image/webp'],
  ])('accepts the common image format %s', (name, type) => {
    expect(isCommonPetProfileImage({ name, type })).toBe(true)
  })

  it.each([
    ['photo.gif', 'image/gif'],
    ['photo.heic', 'image/heic'],
    ['photo.avif', 'image/avif'],
    ['photo.svg', 'image/svg+xml'],
    ['photo.jpg', 'image/png'],
    ['photo', 'image/jpeg'],
  ])('rejects an unsupported or mismatched format %s', (name, type) => {
    expect(isCommonPetProfileImage({ name, type })).toBe(false)
  })

  it('advertises only JPEG, PNG, and WebP file choices', () => {
    expect(PET_PROFILE_IMAGE_ACCEPT).toBe(
      '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'
    )
  })
})
