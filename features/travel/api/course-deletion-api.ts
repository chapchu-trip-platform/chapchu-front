'use client'

import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

const COURSE_DELETION_TIMEOUT_MS = 10_000

export async function deleteCourse(courseId: string, signal?: AbortSignal) {
  const normalizedCourseId = courseId.trim()
  if (!normalizedCourseId) throw new Error('Course ID is required.')

  await apiClient.delete(API_ENDPOINTS.courses.delete(normalizedCourseId), {
    signal,
    timeout: COURSE_DELETION_TIMEOUT_MS,
    replayAfterAuthRefresh: true,
  })
}

export function getCourseDeletionErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') {
    return '코스를 삭제하지 못했어요. 다시 시도해주세요.'
  }

  const normalized = error as { status?: unknown; type?: unknown }
  if (normalized.status === 401) return '로그인이 만료되었습니다. 다시 로그인해주세요.'
  if (normalized.status === 403) return '이 코스를 삭제할 권한이 없습니다.'
  if (normalized.status === 404) return '삭제할 코스를 찾지 못했습니다.'
  if (normalized.type === 'network') return '네트워크 연결을 확인하고 다시 시도해주세요.'
  if (normalized.type === 'timeout') return '코스 삭제 시간이 초과되었습니다. 다시 시도해주세요.'
  return '코스를 삭제하지 못했어요. 다시 시도해주세요.'
}
