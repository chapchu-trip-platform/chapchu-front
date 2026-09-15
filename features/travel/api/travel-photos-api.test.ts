import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { uploadCoursePlacePhotos } from '@/features/travel/api/travel-photos-api'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { apiClient } from '@/lib/api/client'

const originalAdapter = apiClient.defaults.adapter

function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { config, data, headers: {}, status, statusText: status === 201 ? 'Created' : 'OK' }
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  useAuthStore.setState({ status: 'idle' })
  vi.unstubAllGlobals()
})

describe('travel photo API', () => {
  it('uploads to the presigned URL, saves metadata, and returns a display URL', async () => {
    const requests: InternalAxiosRequestConfig[] = []
    apiClient.defaults.adapter = async (config) => {
      requests.push(config)
      if (config.url === '/photos/upload-url') {
        return response(config, [{
          uploadUrl: 'https://bucket.example/review/photo.jpg?signature=one',
          photoKey: 'review/user/photo.jpg',
          fileName: '산책.jpg',
        }], 201)
      }
      if (config.url === '/photos') {
        return response(config, [{
          id: 'photo-1',
          coursePlaceId: 'course-place-1',
          photoKey: 'review/user/photo.jpg',
          takenAt: '2026-09-15',
          createdAt: null,
        }], 201)
      }
      return response(config, {
        id: 'photo-1',
        downloadUrl: 'https://bucket.example/review/photo.jpg?signature=two',
        takenAt: '2026-09-15',
      })
    }
    const upload = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', upload)
    const file = new File(['image'], '산책.jpg', {
      type: 'image/jpeg',
      lastModified: new Date(2026, 8, 15).getTime(),
    })

    await expect(uploadCoursePlacePhotos('course-place-1', [file])).resolves.toEqual([
      {
        photoId: 'photo-1',
        downloadUrl: 'https://bucket.example/review/photo.jpg?signature=two',
        takenAt: '2026-09-15',
      },
    ])
    expect(requests.map((request) => [request.method, request.url])).toEqual([
      ['post', '/photos/upload-url'],
      ['post', '/photos'],
      ['get', '/photos/photo-1'],
    ])
    expect(JSON.parse(String(requests[0].data))).toEqual({
      files: [{ type: 'REVIEW', fileName: '산책.jpg' }],
    })
    expect(JSON.parse(String(requests[1].data))).toEqual({
      photos: [{
        coursePlaceId: 'course-place-1',
        photoKey: 'review/user/photo.jpg',
        takenAt: '2026-09-15',
      }],
    })
    expect(upload).toHaveBeenCalledWith(
      'https://bucket.example/review/photo.jpg?signature=one',
      expect.objectContaining({ method: 'PUT', body: file })
    )
  })

  it('rejects non-image files before requesting an upload URL', async () => {
    let requested = false
    apiClient.defaults.adapter = async (config) => {
      requested = true
      return response(config, [])
    }

    await expect(
      uploadCoursePlacePhotos('course-place-1', [new File(['text'], 'memo.txt', { type: 'text/plain' })])
    ).rejects.toThrow('Only image files')
    expect(requested).toBe(false)
  })
})
