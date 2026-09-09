'use client'

import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import {
  PHOTO_PURPOSES,
  type PhotoDownload,
  type PhotoPurpose,
  type PhotoUploadTicket,
  type SavedPhoto,
  type SavePhotoInput,
} from '@/features/photos/types/photo'

const MAX_POST_PHOTOS = 10
const PHOTO_UPLOAD_TIMEOUT_MS = 30_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isText(value: unknown, maxLength = 4_096): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function isNullableText(value: unknown, maxLength = 4_096): value is string | null {
  return value === null || isText(value, maxLength)
}

function safeHttpsUrl(value: unknown) {
  if (!isText(value)) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url.href
  } catch {
    return null
  }
}

function parseUploadTicket(value: unknown): PhotoUploadTicket {
  if (!isRecord(value) || !isText(value.photoKey) || !isText(value.fileName, 500)) {
    throw new Error('Photo upload ticket response was invalid.')
  }
  const uploadUrl = safeHttpsUrl(value.uploadUrl)
  if (!uploadUrl) throw new Error('Photo upload URL was invalid.')
  return { uploadUrl, photoKey: value.photoKey.trim(), fileName: value.fileName }
}

function parsePhotoDownload(value: unknown): PhotoDownload {
  if (!isRecord(value) || !isText(value.id, 200) || !isNullableText(value.takenAt, 100)) {
    throw new Error('Photo download response was invalid.')
  }
  const downloadUrl = safeHttpsUrl(value.downloadUrl)
  if (!downloadUrl) throw new Error('Photo download URL was invalid.')
  return { id: value.id, downloadUrl, takenAt: value.takenAt }
}

function parseSavedPhoto(value: unknown): SavedPhoto {
  if (
    !isRecord(value) ||
    !isText(value.id, 200) ||
    !isNullableText(value.coursePlaceId, 200) ||
    !isText(value.photoKey) ||
    !isNullableText(value.takenAt, 100) ||
    !isNullableText(value.createdAt, 100)
  ) {
    throw new Error('Saved photo response was invalid.')
  }
  return {
    id: value.id,
    coursePlaceId: value.coursePlaceId,
    photoKey: value.photoKey.trim(),
    takenAt: value.takenAt,
    createdAt: value.createdAt,
  }
}

export async function requestPhotoUploadUrls(
  files: Array<{ type: PhotoPurpose; fileName: string }>,
  signal?: AbortSignal
) {
  if (
    files.length === 0 ||
    files.length > MAX_POST_PHOTOS ||
    files.some(({ type, fileName }) => !PHOTO_PURPOSES.includes(type) || !fileName.trim())
  ) {
    throw new Error('Photo upload request was invalid.')
  }

  const { data }: { data: unknown } = await apiClient.post(
    API_ENDPOINTS.photos.uploadUrl,
    { files },
    { signal }
  )
  if (!Array.isArray(data) || data.length !== files.length) {
    throw new Error('Photo upload ticket response was invalid.')
  }
  const tickets = data.map(parseUploadTicket)
  if (tickets.some((ticket, index) => ticket.fileName !== files[index].fileName)) {
    throw new Error('Photo upload tickets did not match the selected files.')
  }
  return tickets
}

export async function uploadPhotoFile(
  ticket: PhotoUploadTicket,
  file: File,
  signal?: AbortSignal
) {
  if (ticket.fileName !== file.name || !file.type.startsWith('image/')) {
    throw new Error('Selected photo did not match its upload ticket.')
  }
  const uploadController = new AbortController()
  let timedOut = false
  const handleCallerAbort = () => uploadController.abort(signal?.reason)
  if (signal?.aborted) handleCallerAbort()
  else signal?.addEventListener('abort', handleCallerAbort, { once: true })
  const timeoutId = window.setTimeout(() => {
    timedOut = true
    uploadController.abort()
  }, PHOTO_UPLOAD_TIMEOUT_MS)

  try {
    const response = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      body: file,
      signal: uploadController.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
    if (!response.ok) throw new Error('Photo upload failed.')
  } catch (error) {
    if (timedOut) throw new Error('Photo upload timed out.', { cause: error })
    throw error
  } finally {
    window.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', handleCallerAbort)
  }
}

export async function uploadPhotoFiles(
  files: File[],
  type: PhotoPurpose,
  signal?: AbortSignal
) {
  const tickets = await requestPhotoUploadUrls(
    files.map((file) => ({ type, fileName: file.name })),
    signal
  )
  await Promise.all(tickets.map((ticket, index) => uploadPhotoFile(ticket, files[index], signal)))
  return tickets
}

export async function savePhotos(inputs: SavePhotoInput[], signal?: AbortSignal) {
  if (inputs.length === 0 || inputs.length > MAX_POST_PHOTOS) {
    throw new Error('Photo save request was invalid.')
  }
  const { data }: { data: unknown } = await apiClient.post(
    API_ENDPOINTS.photos.list,
    { photos: inputs },
    { signal }
  )
  if (!Array.isArray(data) || data.length !== inputs.length) {
    throw new Error('Saved photo response was invalid.')
  }
  return data.map(parseSavedPhoto)
}

export async function fetchPhotoDownload(photoId: string, signal?: AbortSignal) {
  if (!photoId.trim()) throw new Error('Photo ID is required.')
  const { data }: { data: unknown } = await apiClient.get(
    API_ENDPOINTS.photos.detail(photoId),
    { signal }
  )
  const photo = parsePhotoDownload(data)
  if (photo.id !== photoId) throw new Error('Photo response did not match the request.')
  return photo
}
