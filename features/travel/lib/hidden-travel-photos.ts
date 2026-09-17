'use client'

const STORAGE_KEY = 'chapchu.hidden-travel-photo-ids'
const MAX_HIDDEN_PHOTOS = 500

export function getHiddenTravelPhotoIds() {
  if (typeof window === 'undefined') return new Set<string>()
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(value)) return new Set<string>()
    return new Set(
      value.filter(
        (photoId): photoId is string =>
          typeof photoId === 'string' && photoId.trim().length > 0 && photoId.length <= 500
      ).slice(-MAX_HIDDEN_PHOTOS)
    )
  } catch {
    return new Set<string>()
  }
}

export function hideTravelPhoto(photoId: string) {
  if (typeof window === 'undefined' || !photoId.trim()) return
  const photoIds = [...getHiddenTravelPhotoIds(), photoId.trim()].slice(-MAX_HIDDEN_PHOTOS)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(photoIds))
  } catch {
    // The current screen still removes the photo when browser storage is unavailable.
  }
}
