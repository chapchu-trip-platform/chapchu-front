'use client'

const PET_PROFILE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const PET_PROFILE_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])

export const PET_PROFILE_IMAGE_ACCEPT = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  ...PET_PROFILE_IMAGE_TYPES,
].join(',')

function extensionOf(fileName: string) {
  const match = /\.([^.]+)$/.exec(fileName.trim().toLowerCase())
  return match?.[1] ?? ''
}

export function isCommonPetProfileImage(file: Pick<File, 'name' | 'type'>) {
  const extension = extensionOf(file.name)
  if (!PET_PROFILE_IMAGE_EXTENSIONS.has(extension) || !PET_PROFILE_IMAGE_TYPES.has(file.type)) {
    return false
  }
  return file.type === 'image/jpeg'
    ? extension === 'jpg' || extension === 'jpeg'
    : file.type === `image/${extension}`
}
