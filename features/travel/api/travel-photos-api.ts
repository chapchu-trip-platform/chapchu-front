'use client'

import { isDemoSessionActive } from '@/features/auth/stores/auth-store'
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
  const normalizedCoursePlaceId = coursePlaceId.trim()
  if (!normalizedCoursePlaceId) throw new Error('Course place ID is required.')
  if (files.length === 0 || files.length > MAX_PHOTOS_PER_REVIEW) {
    throw new Error(`Travel photos must contain between 1 and ${MAX_PHOTOS_PER_REVIEW} files.`)
  }
  if (files.some((file) => !file.type.startsWith('image/'))) {
    throw new Error('Only image files can be uploaded as travel photos.')
  }

  if (isDemoSessionActive()) {
    return files.map((file, index) => ({
      photoId: `demo-photo-${Date.now()}-${index}`,
      downloadUrl:
        typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(file)
          : '/images/album-cover.png',
      takenAt: formatLocalDate(file.lastModified),
    }))
  }

  const { data: uploadUrls }: { data: unknown } = await apiClient.post(
    API_ENDPOINTS.photos.uploadUrl,
    {
      files: files.map((file) => ({ type: 'REVIEW', fileName: file.name })),
    },
    { signal }
  )
  if (
    !Array.isArray(uploadUrls) ||
    uploadUrls.length !== files.length ||
    !uploadUrls.every(isUploadUrlDto)
  ) {
    throw new Error('Photo upload URL response was invalid.')
  }

  await Promise.all(
    uploadUrls.map(async (upload, index) => {
      const response = await fetch(upload.uploadUrl, {
        method: 'PUT',
        body: files[index],
        signal,
      })
      if (!response.ok) throw new Error('Photo object upload failed.')
    })
  )

  const { data: savedPhotos }: { data: unknown } = await apiClient.post(
    API_ENDPOINTS.photos.create,
    {
      photos: uploadUrls.map((upload, index) => ({
        coursePlaceId: normalizedCoursePlaceId,
        photoKey: upload.photoKey,
        takenAt: formatLocalDate(files[index].lastModified),
      })),
    },
    { signal }
  )
  if (
    !Array.isArray(savedPhotos) ||
    savedPhotos.length !== files.length ||
    !savedPhotos.every(isSavedPhotoDto)
  ) {
    throw new Error('Saved photo response was invalid.')
  }

  return Promise.all(
    savedPhotos.map(async (savedPhoto) => {
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
}

export function getTravelPhotoErrorMessage(error: unknown) {
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
