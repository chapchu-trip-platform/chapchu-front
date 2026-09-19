import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { uploadCoursePlacePhotos } from '@/features/travel/api/travel-photos-api'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { apiClient } from '@/lib/api/client'
import { jpegFileWithMetadata } from '@/test/fixtures/images'

const originalAdapter = apiClient.defaults.adapter

function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { config, data, headers: {}, status, statusText: status === 201 ? 'Created' : 'OK' }
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  useAuthStore.setState({ status: 'idle' })
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('travel photo API', () => {
  it('uploads to the presigned URL, saves metadata, and returns a display URL', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 15, 12))
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
    const file = jpegFileWithMetadata('산책.jpg', {
      lastModified: new Date(2026, 8, 15).getTime(),
      metadata: 'Exif\0\0GPS=37.5444,127.0374',
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
      expect.objectContaining({ method: 'PUT', body: expect.any(File) })
    )
    const uploadedFile = upload.mock.calls[0][1].body as File
    expect(uploadedFile).not.toBe(file)
    expect(await uploadedFile.text()).not.toContain('GPS=')
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

  it('rejects unsupported or disguised image formats before upload', async () => {
    let requested = false
    apiClient.defaults.adapter = async (config) => {
      requested = true
      return response(config, [])
    }

    await expect(
      uploadCoursePlacePhotos(
        'course-place-1',
        [new File(['<svg/>'], 'illustration.svg', { type: 'image/svg+xml' })]
      )
    ).rejects.toThrow('Only image files')
    await expect(
      uploadCoursePlacePhotos(
        'course-place-1',
        [new File(['text'], 'disguised.jpg', { type: 'text/plain' })]
      )
    ).rejects.toThrow('Only image files')
    expect(requested).toBe(false)
  })

  it('rejects malformed image bytes before requesting an upload URL', async () => {
    const adapter = vi.fn()
    apiClient.defaults.adapter = adapter
    const upload = vi.fn()
    vi.stubGlobal('fetch', upload)

    await expect(uploadCoursePlacePhotos('course-place-1', [
      new File(['not a jpeg'], 'disguised.jpg', { type: 'image/jpeg' }),
    ])).rejects.toThrow('JPEG signature was invalid.')
    expect(adapter).not.toHaveBeenCalled()
    expect(upload).not.toHaveBeenCalled()
  })
})
