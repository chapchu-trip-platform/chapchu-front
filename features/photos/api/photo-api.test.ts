import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
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
        redirect: 'error',
      })
    )
    expect(tickets[0].photoKey).toBe('post/user/photo.jpg')
  })

  it('reports per-photo upload start and completion without exposing signed request data', async () => {
    apiClient.defaults.adapter = async (config) => response(config, [{
      uploadUrl: 'https://bucket.example/upload?signature=test',
      photoKey: 'post/user/photo.jpg',
      fileName: 'photo.jpg',
    }], 201)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))
    const progress = vi.fn()

    await uploadPhotoFiles(
      [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })],
      'POST',
      undefined,
      progress,
    )

    expect(progress.mock.calls.map(([event]) => event)).toEqual([
      { photoIndex: 0, photoCount: 1, status: 'uploading' },
      { photoIndex: 0, photoCount: 1, status: 'success' },
    ])
  })

  it('does not turn a UI status-listener exception into an upload failure', async () => {
    apiClient.defaults.adapter = async (config) => response(config, [{
      uploadUrl: 'https://bucket.example/upload?signature=test',
      photoKey: 'post/user/photo.jpg',
      fileName: 'photo.jpg',
    }], 201)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))

    await expect(uploadPhotoFiles(
      [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })],
      'POST',
      undefined,
      () => { throw new Error('UI listener failed') },
    )).resolves.toHaveLength(1)
  })

  it('waits for all photo uploads and reports tickets that already succeeded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    apiClient.defaults.adapter = async (config) => response(config, [
      {
        uploadUrl: 'https://bucket.example/upload-one?signature=test',
        photoKey: 'post/user/one.jpg',
        fileName: 'one.jpg',
      },
      {
        uploadUrl: 'https://bucket.example/upload-two?signature=test',
        photoKey: 'post/user/two.jpg',
        fileName: 'two.jpg',
      },
    ], 201)
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch')))
    const files = [
      new File(['one'], 'one.jpg', { type: 'image/jpeg' }),
      new File(['two'], 'two.jpg', { type: 'image/jpeg' }),
    ]

    const failure = await uploadPhotoFiles(files, 'POST').catch(error => error)
    expect(failure).toMatchObject({
      name: 'PhotoUploadError',
      photoIndex: 1,
      successfulUploads: [{ photoKey: 'post/user/one.jpg', fileName: 'one.jpg' }, null],
      failedPhotoIndexes: [1],
    })
    expect(JSON.stringify(failure.successfulUploads)).not.toContain('signature')
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

    await expect(uploadPhotoFiles([file], 'POST')).rejects.toMatchObject({
      name: 'PhotoUploadError',
      stage: 'upload-ticket',
      reason: 'contract',
    })
  })

  it('classifies upload-ticket network failure separately from storage CORS candidates', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config)
    }
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })

    await expect(uploadPhotoFiles([file], 'POST')).rejects.toMatchObject({
      name: 'PhotoUploadError',
      stage: 'upload-ticket',
      reason: 'network',
    })
    expect(log).toHaveBeenCalledWith(
      '[photo-upload] request failed',
      expect.objectContaining({
        stage: 'upload-ticket',
        reason: 'network',
      })
    )
  })

  it('aborts a stalled object-storage upload after the finite timeout', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
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
    expect(log).toHaveBeenCalledWith(
      '[photo-upload] request failed',
      expect.objectContaining({
        stage: 'object-storage',
        reason: 'timeout',
        method: 'PUT',
      })
    )
  })

  it('allows a 250MB upload longer than the small-file timeout', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.useFakeTimers()
    let aborted = false
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          aborted = true
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    ))
    const file = new File(['photo'], 'large.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { configurable: true, value: 250 * 1024 * 1024 })
    const uploadExpectation = expect(uploadPhotoFile({
      uploadUrl: 'https://bucket.example/upload?signature=test',
      photoKey: 'post/user/large.jpg',
      fileName: 'large.jpg',
    }, file)).rejects.toThrow('Photo upload timed out.')

    await vi.advanceTimersByTimeAsync(30_000)
    expect(aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(9 * 60_000)

    await uploadExpectation
    expect(aborted).toBe(true)
  })

  it('tracks a likely CORS failure without logging the signed URL or file name', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch signed-secret')))
    const file = new File(['photo'], 'private-name.jpg', { type: 'image/jpeg' })

    await expect(uploadPhotoFile({
      uploadUrl: 'https://bucket.example/upload?signature=signed-secret',
      photoKey: 'post/user/private-name.jpg',
      fileName: 'private-name.jpg',
    }, file)).rejects.toMatchObject({
      name: 'PhotoUploadError',
      stage: 'object-storage',
      reason: 'connection-or-cors',
      photoIndex: 0,
    })

    const logged = JSON.stringify(log.mock.calls)
    expect(logged).toContain('corsCandidate')
    expect(logged).not.toContain('signed-secret')
    expect(logged).not.toContain('private-name.jpg')
  })
})
