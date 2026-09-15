'use client'

import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

const COURSE_COMPLETION_TIMEOUT_MS = 10_000

export async function completeCourse(courseId: string, signal?: AbortSignal) {
  const normalizedCourseId = courseId.trim()
  if (!normalizedCourseId) throw new Error('Course ID is required.')

  await apiClient.post(
    API_ENDPOINTS.courses.complete(normalizedCourseId),
    undefined,
    {
      signal,
      timeout: COURSE_COMPLETION_TIMEOUT_MS,
      // The completion endpoint is documented as idempotent.
      replayAfterAuthRefresh: true,
    }
  )
}

export function getCourseCompletionErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') {
    return '코스를 완료 처리하지 못했어요. 다시 시도해주세요.'
  }

  const normalized = error as { status?: unknown; type?: unknown }
  if (normalized.status === 401) return '로그인이 만료되었습니다. 다시 로그인해주세요.'
  if (normalized.status === 403) return '이 코스를 완료 처리할 권한이 없습니다.'
  if (normalized.status === 404) return '완료할 코스를 찾지 못했습니다.'
  if (normalized.type === 'network') return '네트워크 연결을 확인하고 다시 시도해주세요.'
  if (normalized.type === 'timeout') return '코스 완료 처리 시간이 초과되었습니다. 다시 시도해주세요.'
  return '코스를 완료 처리하지 못했어요. 다시 시도해주세요.'
}
