export const PHOTO_PURPOSES = ['PROFILE', 'POST', 'REVIEW'] as const

export type PhotoPurpose = (typeof PHOTO_PURPOSES)[number]

export interface PhotoUploadTicket {
  uploadUrl: string
  photoKey: string
  fileName: string
}

export interface PhotoDownload {
  id: string
  downloadUrl: string
  takenAt: string | null
}

export interface SavedPhoto {
  id: string
  coursePlaceId: string | null
  photoKey: string
  takenAt: string | null
  createdAt: string | null
}

export interface SavePhotoInput {
  photoKey: string
  takenAt?: string
  coursePlaceId?: string
}
