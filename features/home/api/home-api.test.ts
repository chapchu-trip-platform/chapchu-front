import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { fetchHomeSummary, fetchPopularPosts } from '@/features/home/api/home-api'
import { apiClient } from '@/lib/api/client'

const originalAdapter = apiClient.defaults.adapter

function response(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { config, data, headers: {}, status: 200, statusText: 'OK' }
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

describe('Home API', () => {
  it('normalizes the Home summary pet names', async () => {
    const signal = new AbortController().signal
    let capturedConfig: InternalAxiosRequestConfig | undefined
    apiClient.defaults.adapter = async (config) => {
      capturedConfig = config
      return response(config, { nickname: ' 초롱 ', petNames: [' 루이 ', '바다'] })
    }

    await expect(fetchHomeSummary(signal)).resolves.toEqual({
      nickname: '초롱',
      petNames: ['루이', '바다'],
    })
    expect(capturedConfig?.url).toBe('/home')
    expect(capturedConfig?.method).toBe('get')
    expect(capturedConfig?.signal).toBe(signal)
  })

  it('rejects a malformed or oversized Home response', async () => {
    apiClient.defaults.adapter = async (config) =>
      response(config, { nickname: '초롱', petNames: '루이' })

    await expect(fetchHomeSummary()).rejects.toThrow('response was invalid')
  })

  it('requests popular posts and keeps only the top three recommendations', async () => {
    const signal = new AbortController().signal
    let capturedConfig: InternalAxiosRequestConfig | undefined
    apiClient.defaults.adapter = async (config) => {
      capturedConfig = config
      return response(
        config,
        [1, 4, 2, 3].map((recommendationCount) => ({
          id: `post-${recommendationCount}`,
          photoId: recommendationCount === 4 ? 'photo-id' : null,
          title: `게시글 ${recommendationCount}`,
          content: '내용',
          viewCount: recommendationCount * 10,
          recommendationCount,
          createdAt: null,
        }))
      )
    }

    const posts = await fetchPopularPosts(signal)

    expect(capturedConfig?.url).toBe('/posts')
    expect(capturedConfig?.method).toBe('get')
    expect(capturedConfig?.params?.sort).toBe('popular')
    expect(capturedConfig?.signal).toBe(signal)
    expect(posts.map((post) => post.id)).toEqual(['post-4', 'post-3', 'post-2'])
    expect(posts[0].hasPhoto).toBe(true)
  })

  it('rejects an invalid post response instead of rendering partial data', async () => {
    apiClient.defaults.adapter = async (config) =>
      response(config, [{ id: 'post-1', recommendationCount: 'many' }])

    await expect(fetchPopularPosts()).rejects.toThrow('response was invalid')
  })
})
