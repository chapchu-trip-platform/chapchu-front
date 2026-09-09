import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api/client'
import {
  fetchPhotoDownload,
  savePhotos,
  uploadPhotoFile,
  uploadPhotoFiles,
} from '@/features/photos/api/photo-api'

const originalAdapter = apiClient.defaults.adapter

function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { config, data, headers: {}, status, statusText: 'OK' }
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('photo API', () => {
  it('requests a matching upload ticket and PUTs the selected image without API credentials', async () => {
    const requests: InternalAxiosRequestConfig[] = []
    apiClient.defaults.adapter = async (config) => {
      requests.push(config)
      return response(config, [{
        uploadUrl: 'https://bucket.example/upload?signature=test',
        photoKey: 'post/user/photo.jpg',
        fileName: 'photo.jpg',
      }], 201)
    }
    const put = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', put)
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })

    const tickets = await uploadPhotoFiles([file], 'POST')

    expect(JSON.parse(requests[0].data as string)).toEqual({
      files: [{ type: 'POST', fileName: 'photo.jpg' }],
    })
    expect(put).toHaveBeenCalledWith(
      'https://bucket.example/upload?signature=test',
      expect.objectContaining({
        method: 'PUT',
        body: file,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      })
    )
    expect(tickets[0].photoKey).toBe('post/user/photo.jpg')
  })

  it('saves uploaded profile metadata and resolves the documented download URL', async () => {
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/photos') {
        return response(config, [{
          id: 'photo-1',
          coursePlaceId: null,
          photoKey: 'profile/user/photo.jpg',
          takenAt: null,
          createdAt: null,
        }], 201)
      }
      return response(config, {
        id: 'photo-1',
        downloadUrl: 'https://bucket.example/download?signature=test',
        takenAt: null,
      })
    }

    await expect(savePhotos([{ photoKey: 'profile/user/photo.jpg' }])).resolves.toMatchObject([
      { id: 'photo-1', photoKey: 'profile/user/photo.jpg' },
    ])
    await expect(fetchPhotoDownload('photo-1')).resolves.toEqual({
      id: 'photo-1',
      downloadUrl: 'https://bucket.example/download?signature=test',
      takenAt: null,
    })
  })

  it('rejects non-HTTPS presigned URLs and mismatched response order', async () => {
    apiClient.defaults.adapter = async (config) => response(config, [{
      uploadUrl: 'http://bucket.example/upload',
      photoKey: 'post/user/photo.jpg',
      fileName: 'different.jpg',
    }], 201)
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })

    await expect(uploadPhotoFiles([file], 'POST')).rejects.toThrow('upload URL was invalid')
  })

  it('aborts a stalled object-storage upload after the finite timeout', async () => {
    vi.useFakeTimers()
    const put = vi.fn((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    )
    vi.stubGlobal('fetch', put)
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
    const uploadExpectation = expect(uploadPhotoFile({
      uploadUrl: 'https://bucket.example/upload?signature=test',
      photoKey: 'post/user/photo.jpg',
      fileName: 'photo.jpg',
    }, file)).rejects.toThrow('Photo upload timed out.')

    await vi.advanceTimersByTimeAsync(30_000)

    await uploadExpectation
  })
})
