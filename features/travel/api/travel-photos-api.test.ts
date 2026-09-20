import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  uploadCoursePlacePhotoBatch,
  uploadCoursePlacePhotos,
} from '@/features/travel/api/travel-photos-api'
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

  it('uploads photos from multiple places in one metadata request', async () => {
    const requests: InternalAxiosRequestConfig[] = []
    apiClient.defaults.adapter = async (config) => {
      requests.push(config)
      if (config.url === '/photos/upload-url') {
        return response(config, [
          {
            uploadUrl: 'https://bucket.example/review/one.jpg?signature=one',
            photoKey: 'review/user/one.jpg',
            fileName: '첫번째.jpg',
          },
          {
            uploadUrl: 'https://bucket.example/review/two.jpg?signature=one',
            photoKey: 'review/user/two.jpg',
            fileName: '두번째.jpg',
          },
        ], 201)
      }
      if (config.url === '/photos') {
        return response(config, [
          {
            id: 'photo-1',
            coursePlaceId: 'course-place-1',
            photoKey: 'review/user/one.jpg',
            takenAt: '2026-09-15',
            createdAt: null,
          },
          {
            id: 'photo-2',
            coursePlaceId: 'course-place-2',
            photoKey: 'review/user/two.jpg',
            takenAt: '2026-09-15',
            createdAt: null,
          },
        ], 201)
      }
      const photoId = config.url?.endsWith('photo-2') ? 'photo-2' : 'photo-1'
      return response(config, {
        id: photoId,
        downloadUrl: `https://bucket.example/review/${photoId}.jpg?signature=two`,
        takenAt: '2026-09-15',
      })
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))

    const firstFile = jpegFileWithMetadata('첫번째.jpg')
    const secondFile = jpegFileWithMetadata('두번째.jpg')
    await expect(uploadCoursePlacePhotoBatch([
      { coursePlaceId: 'course-place-1', files: [firstFile] },
      { coursePlaceId: 'course-place-2', files: [secondFile] },
    ])).resolves.toEqual([
      {
        coursePlaceId: 'course-place-1',
        photos: [{
          photoId: 'photo-1',
          downloadUrl: 'https://bucket.example/review/photo-1.jpg?signature=two',
          takenAt: '2026-09-15',
        }],
      },
      {
        coursePlaceId: 'course-place-2',
        photos: [{
          photoId: 'photo-2',
          downloadUrl: 'https://bucket.example/review/photo-2.jpg?signature=two',
          takenAt: '2026-09-15',
        }],
      },
    ])

    expect(requests.filter((request) => request.url === '/photos/upload-url')).toHaveLength(1)
    expect(requests.filter((request) => request.url === '/photos')).toHaveLength(1)
    expect(JSON.parse(String(requests.find((request) => request.url === '/photos')?.data))).toEqual({
      photos: [
        {
          coursePlaceId: 'course-place-1',
          photoKey: 'review/user/one.jpg',
          takenAt: expect.any(String),
        },
        {
          coursePlaceId: 'course-place-2',
          photoKey: 'review/user/two.jpg',
          takenAt: expect.any(String),
        },
      ],
    })
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
