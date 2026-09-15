import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  completeCourse,
  getCourseCompletionErrorMessage,
} from '@/features/travel/api/course-completion-api'
import { apiClient } from '@/lib/api/client'

afterEach(() => vi.restoreAllMocks())

describe('course completion API', () => {
  it('posts the documented idempotent course completion endpoint', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({} as never)
    const signal = new AbortController().signal

    await completeCourse(' course-1 ', signal)

    expect(post).toHaveBeenCalledWith(
      '/courses/course-1/complete',
      undefined,
      {
        signal,
        timeout: 10_000,
        replayAfterAuthRefresh: true,
      }
    )
  })

  it('rejects an empty course ID before making a request', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({} as never)

    await expect(completeCourse(' ')).rejects.toThrow('Course ID is required.')
    expect(post).not.toHaveBeenCalled()
  })

  it('maps completion failures to safe messages', () => {
    expect(getCourseCompletionErrorMessage({ status: 401 })).toContain('로그인')
    expect(getCourseCompletionErrorMessage({ status: 403 })).toContain('권한')
    expect(getCourseCompletionErrorMessage({ type: 'network' })).toContain('네트워크')
    expect(getCourseCompletionErrorMessage(new Error('secret'))).not.toContain('secret')
  })
})
