'use client'

import { isDemoSessionActive } from '@/features/auth/stores/auth-store'
import {
  ImageMetadataSanitizationError,
  isSupportedMetadataSafeImage,
  sanitizeImageFiles,
} from '@/features/photos/lib/sanitize-image-file'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

const MAX_PHOTOS_PER_REVIEW = 10
const MAX_STRING_LENGTH = 2_048
interface UploadUrlDto {
  uploadUrl: string
  photoKey: string
  fileName: string
}

interface SavedPhotoDto {
  id: string
  coursePlaceId: string | null
  photoKey: string
  takenAt: string | null
  createdAt: string | null
}

interface PhotoDetailDto {
  id: string
  downloadUrl: string
  takenAt: string | null
}

export interface TravelPhoto {
  photoId: string
  downloadUrl: string
  takenAt: string | null
}

export interface CoursePlacePhotoUpload {
  coursePlaceId: string
  files: File[]
}

export interface UploadedCoursePlacePhotos {
  coursePlaceId: string
  photos: TravelPhoto[]
}

function isBoundedString(value: unknown, allowEmpty = false): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_STRING_LENGTH &&
    (allowEmpty || value.trim().length > 0)
  )
}

function isNullableString(value: unknown) {
  return value === null || isBoundedString(value, true)
}

function isSafeUploadUrl(value: string) {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname))
    )
  } catch {
    return false
  }
}

export function isSupportedTravelImage(file: Pick<File, 'name' | 'type'>) {
  return isSupportedMetadataSafeImage(file)
}

function isUploadUrlDto(value: unknown): value is UploadUrlDto {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<UploadUrlDto>
  return (
    isBoundedString(item.uploadUrl) &&
    isSafeUploadUrl(item.uploadUrl) &&
    isBoundedString(item.photoKey) &&
    isBoundedString(item.fileName)
  )
}

function isSavedPhotoDto(value: unknown): value is SavedPhotoDto {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<SavedPhotoDto>
  return (
    isBoundedString(item.id) &&
    (item.coursePlaceId === null || isBoundedString(item.coursePlaceId)) &&
    isBoundedString(item.photoKey) &&
    isNullableString(item.takenAt) &&
    isNullableString(item.createdAt)
  )
}

function isPhotoDetailDto(value: unknown): value is PhotoDetailDto {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<PhotoDetailDto>
  return (
    isBoundedString(item.id) &&
    isBoundedString(item.downloadUrl) &&
    isSafeUploadUrl(item.downloadUrl) &&
    isNullableString(item.takenAt)
  )
}

function formatLocalDate(timestamp: number) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function uploadCoursePlacePhotos(
  coursePlaceId: string,
  files: File[],
  signal?: AbortSignal
): Promise<TravelPhoto[]> {
  const [uploaded] = await uploadCoursePlacePhotoBatch(
    [{ coursePlaceId, files }],
    signal
  )
  return uploaded.photos
}

export async function uploadCoursePlacePhotoBatch(
  uploads: CoursePlacePhotoUpload[],
  signal?: AbortSignal
): Promise<UploadedCoursePlacePhotos[]> {
  if (uploads.length === 0) return []

  const normalizedUploads = uploads.map((upload) => ({
    coursePlaceId: upload.coursePlaceId.trim(),
    files: upload.files,
  }))
  if (normalizedUploads.some((upload) => !upload.coursePlaceId)) {
    throw new Error('Course place ID is required.')
  }
  if (
    normalizedUploads.some(
      (upload) => upload.files.length === 0 || upload.files.length > MAX_PHOTOS_PER_REVIEW
    )
  ) {
    throw new Error(
      `Travel photos must contain between 1 and ${MAX_PHOTOS_PER_REVIEW} files per place.`
    )
  }

  const pendingPhotos = normalizedUploads.flatMap((upload) =>
    upload.files.map((file) => ({ coursePlaceId: upload.coursePlaceId, file }))
  )
  if (pendingPhotos.some(({ file }) => !isSupportedTravelImage(file))) {
    throw new Error(
      'Only image files in PNG, JPEG, WEBP, GIF, HEIC, HEIF, or AVIF format can be uploaded as travel photos.'
    )
  }
  const sanitizedFiles = await sanitizeImageFiles(
    pendingPhotos.map(({ file }) => file),
    signal
  )
  const uploadDate = formatLocalDate(Date.now())

  if (isDemoSessionActive()) {
    let photoIndex = 0
    return normalizedUploads.map((upload) => ({
      coursePlaceId: upload.coursePlaceId,
      photos: upload.files.map(() => {
        const file = sanitizedFiles[photoIndex]
        const index = photoIndex
        photoIndex += 1
        return {
          photoId: `demo-photo-${Date.now()}-${index}`,
          downloadUrl:
            typeof URL.createObjectURL === 'function'
              ? URL.createObjectURL(file)
              : '/images/album-cover.png',
          takenAt: uploadDate,
        }
      }),
    }))
  }

  const { data: uploadUrls }: { data: unknown } = await apiClient.post(
    API_ENDPOINTS.photos.uploadUrl,
    {
      files: sanitizedFiles.map((file) => ({ type: 'REVIEW', fileName: file.name })),
    },
    { signal }
  )
  if (
    !Array.isArray(uploadUrls) ||
    uploadUrls.length !== sanitizedFiles.length ||
    !uploadUrls.every(isUploadUrlDto)
  ) {
    throw new Error('Photo upload URL response was invalid.')
  }

  await Promise.all(
    uploadUrls.map(async (upload, index) => {
      const response = await fetch(upload.uploadUrl, {
        method: 'PUT',
        body: sanitizedFiles[index],
        signal,
      })
      if (!response.ok) throw new Error('Photo object upload failed.')
    })
  )

  const { data: savedPhotos }: { data: unknown } = await apiClient.post(
    API_ENDPOINTS.photos.create,
    {
      photos: uploadUrls.map((upload, index) => ({
        coursePlaceId: pendingPhotos[index].coursePlaceId,
        photoKey: upload.photoKey,
        takenAt: uploadDate,
      })),
    },
    { signal }
  )
  if (
    !Array.isArray(savedPhotos) ||
    savedPhotos.length !== sanitizedFiles.length ||
    !savedPhotos.every(isSavedPhotoDto)
  ) {
    throw new Error('Saved photo response was invalid.')
  }

  const savedPhotosByKey = new Map(savedPhotos.map((photo) => [photo.photoKey, photo]))
  const orderedSavedPhotos = uploadUrls.map((upload, index) => {
    const savedPhoto = savedPhotosByKey.get(upload.photoKey)
    return savedPhoto?.coursePlaceId === pendingPhotos[index].coursePlaceId
      ? savedPhoto
      : null
  })
  if (savedPhotosByKey.size !== savedPhotos.length || orderedSavedPhotos.some((photo) => !photo)) {
    throw new Error('Saved photo response did not match the requested places.')
  }

  const savedPhotoDetails = await Promise.all(
    orderedSavedPhotos.map(async (savedPhoto): Promise<TravelPhoto> => {
      if (!savedPhoto) throw new Error('Saved photo response did not match the requested places.')
      const { data }: { data: unknown } = await apiClient.get(
        API_ENDPOINTS.photos.detail(savedPhoto.id),
        { signal }
      )
      if (!isPhotoDetailDto(data) || data.id !== savedPhoto.id) {
        throw new Error('Photo detail response was invalid.')
      }
      return {
        photoId: data.id,
        downloadUrl: data.downloadUrl,
        takenAt: data.takenAt,
      }
    })
  )

  let photoIndex = 0
  return normalizedUploads.map((upload) => {
    const photos = savedPhotoDetails.slice(photoIndex, photoIndex + upload.files.length)
    photoIndex += upload.files.length
    return { coursePlaceId: upload.coursePlaceId, photos }
  })
}

export function getTravelPhotoErrorMessage(error: unknown) {
  if (error instanceof ImageMetadataSanitizationError) {
    return '사진의 위치·촬영 정보 등 개인정보를 안전하게 제거하지 못했어요. 다른 사진을 선택해주세요.'
  }
  if (!error || typeof error !== 'object') return '사진을 저장하지 못했어요. 다시 시도해주세요.'
  const normalized = error as { status?: unknown; type?: unknown }
  if (normalized.status === 401) return '로그인이 만료되었습니다. 다시 로그인해주세요.'
  if (normalized.status === 413) return '사진 용량이 너무 큽니다. 더 작은 사진을 선택해주세요.'
  if (normalized.status === 400 || normalized.status === 422) {
    return '선택한 사진 형식과 개수를 확인해주세요.'
  }
  if (normalized.type === 'network') return '네트워크 연결을 확인하고 다시 시도해주세요.'
  if (normalized.type === 'timeout') return '사진 저장 시간이 초과되었습니다. 다시 시도해주세요.'
  return '사진을 저장하지 못했어요. 다시 시도해주세요.'
}
