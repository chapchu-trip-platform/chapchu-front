'use client'

import type { AlbumSummary } from '@/features/album/types/album'

const STORAGE_KEY = 'chapchu.album-cover-preferences'
const MAX_PREFERENCES = 100

function readPreferences(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([courseId, photoId]) =>
            courseId.trim().length > 0 &&
            courseId.length <= 500 &&
            typeof photoId === 'string' &&
            photoId.trim().length > 0 &&
            photoId.length <= 500
        )
        .slice(-MAX_PREFERENCES)
    )
  } catch {
    return {}
  }
}

export function saveAlbumCoverPreference(courseId: string, photoId: string | null) {
  if (typeof window === 'undefined') return
  const normalizedCourseId = courseId.trim()
  if (!normalizedCourseId) return
  const preferences = readPreferences()
  if (photoId?.trim()) {
    preferences[normalizedCourseId] = photoId.trim()
  } else {
    delete preferences[normalizedCourseId]
  }
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Object.fromEntries(Object.entries(preferences).slice(-MAX_PREFERENCES)))
    )
  } catch {
    // Saving the review must remain usable when browser storage is unavailable.
  }
}

export function prioritizeAlbumCover(album: AlbumSummary): AlbumSummary {
  const preferredPhotoId = readPreferences()[album.courseId]
  if (!preferredPhotoId) return album
  const coverIndex = album.photos.findIndex((photo) => photo.photoId === preferredPhotoId)
  if (coverIndex <= 0) return album
  return {
    ...album,
    photos: [album.photos[coverIndex], ...album.photos.filter((_, index) => index !== coverIndex)],
  }
}
