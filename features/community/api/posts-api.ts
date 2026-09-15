'use client'

import { isDemoSessionActive } from '@/features/auth/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

export interface CreateTripPostInput {
  title: string
  content: string
  petId?: string | null
  courseId?: string | null
  coverPhotoUrl?: string | null
  takenAt?: string | null
}

function isUploadResponse(value: unknown): value is Array<{
  uploadUrl: string
  photoKey: string
  fileName: string
}> {
  if (!Array.isArray(value) || value.length !== 1) return false
  const item = value[0] as { uploadUrl?: unknown; photoKey?: unknown; fileName?: unknown }
  return (
    typeof item.uploadUrl === 'string' &&
    item.uploadUrl.startsWith('https://') &&
    typeof item.photoKey === 'string' &&
    item.photoKey.trim().length > 0 &&
    typeof item.fileName === 'string' &&
    item.fileName.trim().length > 0
  )
}

export async function createTripPost(
  input: CreateTripPostInput,
  signal?: AbortSignal
) {
  const title = input.title.trim()
  const content = input.content.trim()
  const petId = input.petId?.trim()
  const courseId = input.courseId?.trim()
  if (!title || title.length > 100 || !content) {
    throw new Error('Trip post input was invalid.')
  }

  if (isDemoSessionActive()) return

  let photos: Array<{ photoKey: string; takenAt?: string }> | undefined
  if (input.coverPhotoUrl?.startsWith('https://')) {
    const sourceResponse = await fetch(input.coverPhotoUrl, { signal })
    if (!sourceResponse.ok) throw new Error('Trip post cover download failed.')
    const photoBlob = await sourceResponse.blob()
    if (!photoBlob.type.startsWith('image/')) throw new Error('Trip post cover was not an image.')
    const extension = photoBlob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
    const fileName = `trip-cover.${extension}`
    const { data: uploadData }: { data: unknown } = await apiClient.post(
      API_ENDPOINTS.photos.uploadUrl,
      { files: [{ type: 'POST', fileName }] },
      { signal }
    )
    if (!isUploadResponse(uploadData)) throw new Error('Post photo upload response was invalid.')
    const uploadResponse = await fetch(uploadData[0].uploadUrl, {
      method: 'PUT',
      body: photoBlob,
      signal,
    })
    if (!uploadResponse.ok) throw new Error('Post photo upload failed.')
    photos = [{
      photoKey: uploadData[0].photoKey,
      ...(input.takenAt?.trim() ? { takenAt: input.takenAt.trim() } : {}),
    }]
  }

  await apiClient.post(
    API_ENDPOINTS.community.posts,
    {
      title,
      content,
      ...(petId ? { petId } : {}),
      ...(courseId ? { courseId } : {}),
      ...(photos ? { photos } : {}),
    },
    { signal }
  )
}

export function getTripPostErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return '게시글을 공유하지 못했어요. 다시 시도해주세요.'
  const normalized = error as { status?: unknown; type?: unknown }
  if (normalized.status === 401) return '로그인이 만료되었습니다. 다시 로그인해주세요.'
  if (normalized.status === 400 || normalized.status === 422) {
    return '게시글 제목과 후기 내용을 확인해주세요.'
  }
  if (normalized.type === 'network') return '네트워크 연결을 확인하고 다시 시도해주세요.'
  if (normalized.type === 'timeout') return '게시글 공유 시간이 초과되었습니다. 다시 시도해주세요.'
  return '게시글을 공유하지 못했어요. 다시 시도해주세요.'
}
