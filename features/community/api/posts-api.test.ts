import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTripPost } from '@/features/community/api/posts-api'
import { apiClient } from '@/lib/api/client'

const originalAdapter = apiClient.defaults.adapter

function response(config: InternalAxiosRequestConfig): AxiosResponse {
  return { config, data: undefined, headers: {}, status: 201, statusText: 'Created' }
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  vi.unstubAllGlobals()
})

describe('trip post API', () => {
  it('shares the overall review with its pet and course references', async () => {
    let captured!: InternalAxiosRequestConfig
    apiClient.defaults.adapter = async (config) => {
      captured = config
      return response(config)
    }

    await createTripPost({
      title: ' 서울숲 여행 ',
      content: ' 즐거운 하루였어요. ',
      petId: 'pet-1',
      courseId: 'course-1',
    })

    expect(captured.url).toBe('/posts')
    expect(captured.method).toBe('post')
    expect(JSON.parse(String(captured.data))).toEqual({
      title: '서울숲 여행',
      content: '즐거운 하루였어요.',
      postType: 'TRAVEL_REVIEW',
      petId: 'pet-1',
      courseId: 'course-1',
    })
  })

  it('copies the selected album cover into POST storage before sharing', async () => {
    const requests: InternalAxiosRequestConfig[] = []
    apiClient.defaults.adapter = async (config) => {
      requests.push(config)
      if (config.url === '/photos/upload-url') {
        return {
          ...response(config),
          data: [{
            uploadUrl: 'https://bucket.example/post/cover.jpg?put-signature',
            photoKey: 'post/user/cover.jpg',
            fileName: 'trip-cover.jpg',
          }],
        }
      }
      return response(config)
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        blob: vi.fn().mockResolvedValue({ type: 'image/jpeg' } as Blob),
      })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await createTripPost({
      title: '서울숲 여행',
      content: '즐거운 하루였어요.',
      coverPhotoUrl: 'https://bucket.example/review/cover.jpg?get-signature',
      takenAt: '2026-09-15',
    })

    expect(requests.map((request) => request.url)).toEqual(['/photos/upload-url', '/posts'])
    expect(JSON.parse(String(requests[1].data)).photos).toEqual([{
      photoKey: 'post/user/cover.jpg',
      takenAt: '2026-09-15',
    }])
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://bucket.example/post/cover.jpg?put-signature',
      expect.objectContaining({ method: 'PUT' })
    )
  })
})
