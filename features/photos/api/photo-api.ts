'use client'

import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { publishDiagnosticEvent } from '@/features/devtools/lib/dev-diagnostics'
import { sanitizeImageFiles } from '@/features/photos/lib/sanitize-image-file'
import {
  PHOTO_PURPOSES,
  type PhotoDownload,
  type PhotoPurpose,
  type PhotoUploadTicket,
  type SavedPhoto,
  type SavePhotoInput,
} from '@/features/photos/types/photo'

const MAX_POST_PHOTOS = 10
const MIN_PHOTO_UPLOAD_TIMEOUT_MS = 30_000
const MAX_PHOTO_UPLOAD_TIMEOUT_MS = 9 * 60_000
const ASSUMED_MIN_UPLOAD_BYTES_PER_SECOND = 512 * 1024
let photoUploadSequence = 0

export type PhotoUploadFailureStage = 'metadata-sanitization' | 'upload-ticket' | 'object-storage'
export type PhotoUploadFailureReason =
  | 'connection-or-cors'
  | 'contract'
  | 'http'
  | 'network'
  | 'timeout'

export interface SuccessfulPhotoUpload {
  photoKey: string
  fileName: string
}

export class PhotoUploadError extends Error {
  override readonly name = 'PhotoUploadError'

  constructor(
    readonly stage: PhotoUploadFailureStage,
    readonly reason: PhotoUploadFailureReason,
    readonly status?: number,
    options?: ErrorOptions,
    readonly photoIndex?: number,
    readonly successfulUploads?: Array<SuccessfulPhotoUpload | null>,
    readonly failedPhotoIndexes?: number[]
  ) {
    super(
      stage === 'metadata-sanitization'
        ? 'Photo metadata could not be removed.'
        : stage === 'upload-ticket'
        ? 'Photo upload ticket request failed.'
        : reason === 'timeout'
          ? 'Photo upload timed out.'
          : 'Photo object-storage upload failed.',
      options
    )
  }
}

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

function nextPhotoUploadId() {
  photoUploadSequence += 1
  return `photo-upload-${Date.now()}-${photoUploadSequence}`
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function safeStatus(error: unknown) {
  if (!isRecord(error)) return undefined
  return typeof error.status === 'number' && Number.isInteger(error.status)
    ? error.status
    : undefined
}

function recordPhotoUploadStage(
  operationId: string,
  summary: string,
  details: Record<string, unknown>,
  failed = false
) {
  const safeDetails = { operationId, ...details }
  publishDiagnosticEvent({
    kind: 'network',
    summary,
    requestId: operationId,
    details: safeDetails,
  })
  if (failed && process.env.NODE_ENV !== 'production') {
    // Keep this available even when the live diagnostics viewer was opened after the failure.
    console.error('[photo-upload] request failed', safeDetails)
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
  signal?: AbortSignal,
  onStatusChange?: (event: PhotoUploadStatusEvent) => void
) {
  const operationId = nextPhotoUploadId()
  const [sanitizedFile] = await sanitizeFilesForUpload([file], signal, operationId)
  return putPhotoFile(ticket, sanitizedFile, signal, {
    operationId,
    photoIndex: 0,
    photoCount: 1,
    sourceFileSize: file.size,
  }, onStatusChange)
}

async function sanitizeFilesForUpload(
  files: File[],
  signal: AbortSignal | undefined,
  operationId: string
) {
  recordPhotoUploadStage(operationId, 'PHOTO_UPLOAD metadata sanitization started', {
    phase: 'request',
    stage: 'metadata-sanitization',
    photoCount: files.length,
  })
  try {
    const sanitizedFiles = await sanitizeImageFiles(files, signal)
    recordPhotoUploadStage(operationId, 'PHOTO_UPLOAD metadata sanitization completed', {
      phase: 'response',
      stage: 'metadata-sanitization',
      photoCount: files.length,
    })
    return sanitizedFiles
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) throw error
    const failure = new PhotoUploadError(
      'metadata-sanitization',
      'contract',
      undefined,
      { cause: error }
    )
    recordPhotoUploadStage(
      operationId,
      'PHOTO_UPLOAD metadata sanitization failed',
      {
        phase: 'error',
        stage: failure.stage,
        reason: failure.reason,
        photoCount: files.length,
      },
      true
    )
    throw failure
  }
}

export interface PhotoUploadStatusEvent {
  photoIndex: number
  photoCount: number
  status: 'uploading' | 'success'
}

function notifyUploadStatus(
  listener: ((event: PhotoUploadStatusEvent) => void) | undefined,
  event: PhotoUploadStatusEvent
) {
  try {
    listener?.(event)
  } catch {
    // UI status reporting must never change the outcome of the storage request.
  }
}

function photoUploadTimeoutMs(fileSize: number) {
  const estimatedMs = Math.ceil(fileSize / ASSUMED_MIN_UPLOAD_BYTES_PER_SECOND * 1_000) + 15_000
  return Math.min(MAX_PHOTO_UPLOAD_TIMEOUT_MS, Math.max(MIN_PHOTO_UPLOAD_TIMEOUT_MS, estimatedMs))
}

async function putPhotoFile(
  ticket: PhotoUploadTicket,
  file: File,
  signal: AbortSignal | undefined,
  context: {
    operationId: string
    photoIndex: number
    photoCount: number
    sourceFileSize: number
  },
  onStatusChange?: (event: PhotoUploadStatusEvent) => void
) {
  const uploadUrl = safeHttpsUrl(ticket.uploadUrl)
  if (!uploadUrl) throw new Error('Photo upload URL was invalid.')
  if (ticket.fileName !== file.name || !file.type.startsWith('image/')) {
    throw new Error('Selected photo did not match its upload ticket.')
  }
  const startedAt = performance.now()
  const destinationOrigin = new URL(uploadUrl).origin
  notifyUploadStatus(onStatusChange, {
    photoIndex: context.photoIndex,
    photoCount: context.photoCount,
    status: 'uploading',
  })
  recordPhotoUploadStage(context.operationId, 'PHOTO_UPLOAD storage PUT started', {
    phase: 'request',
    stage: 'object-storage',
    method: 'PUT',
    destinationOrigin,
    sourceOrigin: window.location.origin,
    contentType: file.type,
    photoIndex: context.photoIndex,
    photoCount: context.photoCount,
  })
  const uploadController = new AbortController()
  let timedOut = false
  const handleCallerAbort = () => uploadController.abort(signal?.reason)
  if (signal?.aborted) handleCallerAbort()
  else signal?.addEventListener('abort', handleCallerAbort, { once: true })
  const timeoutId = window.setTimeout(() => {
    timedOut = true
    uploadController.abort()
  }, photoUploadTimeoutMs(Math.max(file.size, context.sourceFileSize)))

  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      signal: uploadController.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      redirect: 'error',
    })
    if (!response.ok) {
      throw new PhotoUploadError(
        'object-storage',
        'http',
        response.status,
        undefined,
        context.photoIndex
      )
    }
    notifyUploadStatus(onStatusChange, {
      photoIndex: context.photoIndex,
      photoCount: context.photoCount,
      status: 'success',
    })
    recordPhotoUploadStage(context.operationId, 'PHOTO_UPLOAD storage PUT completed', {
      phase: 'response',
      stage: 'object-storage',
      method: 'PUT',
      destinationOrigin,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      photoIndex: context.photoIndex,
      photoCount: context.photoCount,
    })
  } catch (error) {
    if (signal?.aborted || isAbortError(error) && !timedOut) throw error
    const failure =
      error instanceof PhotoUploadError
        ? error.photoIndex === undefined
          ? new PhotoUploadError(
              error.stage,
              error.reason,
              error.status,
              { cause: error },
              context.photoIndex
            )
          : error
        : new PhotoUploadError(
            'object-storage',
            timedOut ? 'timeout' : 'connection-or-cors',
            undefined,
            { cause: error },
            context.photoIndex
          )
    recordPhotoUploadStage(
      context.operationId,
      'PHOTO_UPLOAD storage PUT failed',
      {
        phase: 'error',
        stage: failure.stage,
        method: 'PUT',
        destinationOrigin,
        sourceOrigin: window.location.origin,
        status: failure.status,
        reason: failure.reason,
        corsCandidate:
          failure.reason === 'connection-or-cors' &&
          (typeof navigator === 'undefined' || navigator.onLine),
        durationMs: Math.round(performance.now() - startedAt),
        contentType: file.type,
        photoIndex: context.photoIndex,
        photoCount: context.photoCount,
      },
      true
    )
    throw failure
  } finally {
    window.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', handleCallerAbort)
  }
}

export async function uploadPhotoFiles(
  files: File[],
  type: PhotoPurpose,
  signal?: AbortSignal,
  onStatusChange?: (event: PhotoUploadStatusEvent) => void
) {
  const operationId = nextPhotoUploadId()
  const sanitizedFiles = await sanitizeFilesForUpload(files, signal, operationId)
  recordPhotoUploadStage(operationId, 'PHOTO_UPLOAD ticket request started', {
    phase: 'request',
    stage: 'upload-ticket',
    method: 'POST',
    purpose: type,
    photoCount: files.length,
  })
  let tickets: PhotoUploadTicket[]
  try {
    tickets = await requestPhotoUploadUrls(
      sanitizedFiles.map((file) => ({ type, fileName: file.name })),
      signal
    )
    recordPhotoUploadStage(operationId, 'PHOTO_UPLOAD ticket request completed', {
      phase: 'response',
      stage: 'upload-ticket',
      purpose: type,
      photoCount: files.length,
    })
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) throw error
    const status = safeStatus(error)
    const errorType = isRecord(error) ? error.type : undefined
    const failure = new PhotoUploadError(
      'upload-ticket',
      status
        ? 'http'
        : errorType === 'timeout'
          ? 'timeout'
          : error instanceof Error
            ? 'contract'
            : 'network',
      status,
      { cause: error }
    )
    recordPhotoUploadStage(
      operationId,
      'PHOTO_UPLOAD ticket request failed',
      {
        phase: 'error',
        stage: failure.stage,
        method: 'POST',
        status: failure.status,
        reason: failure.reason,
        photoCount: files.length,
      },
      true
    )
    throw failure
  }
  const uploads = await Promise.allSettled(
    tickets.map((ticket, index) =>
      putPhotoFile(ticket, sanitizedFiles[index], signal, {
        operationId,
        photoIndex: index,
        photoCount: files.length,
        sourceFileSize: files[index].size,
      }, onStatusChange)
    )
  )
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('Aborted', 'AbortError')
  }
  const failedPhotoIndexes = uploads.flatMap((result, index) => result.status === 'rejected' ? [index] : [])
  if (failedPhotoIndexes.length > 0) {
    const firstIndex = failedPhotoIndexes[0]
    const firstResult = uploads[firstIndex]
    const firstReason = firstResult.status === 'rejected' ? firstResult.reason : undefined
    const firstFailure = firstReason instanceof PhotoUploadError
      ? firstReason
      : new PhotoUploadError('object-storage', 'contract', undefined, { cause: firstReason }, firstIndex)
    throw new PhotoUploadError(
      firstFailure.stage,
      firstFailure.reason,
      firstFailure.status,
      { cause: firstFailure },
      firstFailure.photoIndex ?? firstIndex,
      uploads.map((result, index) => result.status === 'fulfilled'
        ? { photoKey: tickets[index].photoKey, fileName: tickets[index].fileName }
        : null),
      failedPhotoIndexes
    )
  }
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
