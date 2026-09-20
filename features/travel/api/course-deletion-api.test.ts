import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  deleteCourse,
  getCourseDeletionErrorMessage,
} from '@/features/travel/api/course-deletion-api'
import { apiClient } from '@/lib/api/client'

afterEach(() => vi.restoreAllMocks())

describe('course deletion API', () => {
  it('deletes the course when an in-progress trip is aborted', async () => {
    const deleteRequest = vi.spyOn(apiClient, 'delete').mockResolvedValue({} as never)
    const signal = new AbortController().signal

    await deleteCourse(' course/1 ', signal)

    expect(deleteRequest).toHaveBeenCalledWith('/courses/course%2F1', {
      signal,
      timeout: 10_000,
      replayAfterAuthRefresh: true,
    })
  })

  it('rejects an empty course ID before making a request', async () => {
    const deleteRequest = vi.spyOn(apiClient, 'delete').mockResolvedValue({} as never)

    await expect(deleteCourse(' ')).rejects.toThrow('Course ID is required.')
    expect(deleteRequest).not.toHaveBeenCalled()
  })

  it('maps deletion failures to safe messages', () => {
    expect(getCourseDeletionErrorMessage({ status: 401 })).toContain('로그인')
    expect(getCourseDeletionErrorMessage({ status: 403 })).toContain('권한')
    expect(getCourseDeletionErrorMessage({ type: 'network' })).toContain('네트워크')
    expect(getCourseDeletionErrorMessage(new Error('secret'))).not.toContain('secret')
  })
})
