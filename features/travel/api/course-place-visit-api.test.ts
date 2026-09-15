import { afterEach, describe, expect, it, vi } from 'vitest'
import { visitCoursePlace } from '@/features/travel/api/course-place-visit-api'
import { apiClient } from '@/lib/api/client'

afterEach(() => vi.restoreAllMocks())

describe('visitCoursePlace', () => {
  it('patches the documented course place visit endpoint with the current position', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({} as never)

    await visitCoursePlace('course-place-1', {
      latitude: 37.5665,
      longitude: 126.978,
    })

    expect(patch).toHaveBeenCalledWith(
      '/course-places/course-place-1/visit',
      { lat: 37.5665, lng: 126.978 },
      expect.objectContaining({
        timeout: 10_000,
        replayAfterAuthRefresh: true,
      })
    )
  })

  it('rejects missing IDs and invalid coordinates before making a request', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({} as never)

    await expect(
      visitCoursePlace(' ', { latitude: 37.5, longitude: 127 })
    ).rejects.toThrow('Course place ID is required.')
    await expect(
      visitCoursePlace('course-place-1', { latitude: Number.NaN, longitude: 127 })
    ).rejects.toThrow('Course place visit coordinates are invalid.')
    expect(patch).not.toHaveBeenCalled()
  })
})
