import { afterEach, describe, expect, it } from 'vitest'
import {
  prioritizeAlbumCover,
  saveAlbumCoverPreference,
} from '@/features/album/lib/album-cover-preference'

const album = {
  courseId: 'course-1',
  travelDate: '2026-09-16',
  petId: 'pet-1',
  photos: [
    {
      photoId: 'photo-1', downloadUrl: '/images/photo-1.jpg', takenAt: null,
      externalPlaceId: 'place-1', isPublic: false,
    },
    {
      photoId: 'photo-2', downloadUrl: '/images/photo-2.jpg', takenAt: null,
      externalPlaceId: 'place-2', isPublic: false,
    },
  ],
}

afterEach(() => localStorage.clear())

describe('album cover preference', () => {
  it('moves the chosen server photo to the album cover position', () => {
    saveAlbumCoverPreference('course-1', 'photo-2')

    expect(prioritizeAlbumCover(album).photos.map((photo) => photo.photoId)).toEqual([
      'photo-2',
      'photo-1',
    ])
  })

  it('ignores a cover that no longer exists in the server album', () => {
    saveAlbumCoverPreference('course-1', 'deleted-photo')

    expect(prioritizeAlbumCover(album)).toBe(album)
  })
})
