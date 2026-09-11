import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { fetchHomeSummary, fetchNearbyPlaces, fetchPopularPosts } from '@/features/home/api/home-api'
import { apiClient, publicApiClient } from '@/lib/api/client'

const originalAdapter = apiClient.defaults.adapter
const originalPublicAdapter = publicApiClient.defaults.adapter

function response(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { config, data, headers: {}, status: 200, statusText: 'OK' }
}

function post(recommendationCount: number) {
  return {
    id: `post-${recommendationCount}`,
    nickname: `작성자 ${recommendationCount}`,
    title: `게시글 ${recommendationCount}`,
    recommendationCount,
    commentCount: recommendationCount + 1,
    thumbnail: recommendationCount === 4 ? { photoId: 'photo-id', photoKey: 'post/user/photo.jpg' } : null,
    createdAt: null,
  }
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  publicApiClient.defaults.adapter = originalPublicAdapter
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
        {
          posts: [4, 2, 3].map(post),
          nextCursor: null,
        }
      )
    }

    const posts = await fetchPopularPosts(signal)

    expect(capturedConfig?.url).toBe('/posts')
    expect(capturedConfig?.method).toBe('get')
    expect(capturedConfig?.params?.sort).toBe('popular')
    expect(capturedConfig?.params?.size).toBe(3)
    expect(capturedConfig?.signal).toBe(signal)
    expect(posts.map((post) => post.id)).toEqual(['post-4', 'post-3', 'post-2'])
    expect(posts[0].photoId).toBe('photo-id')
    expect(posts[0]).toMatchObject({ nickname: '작성자 4', commentCount: 5 })
  })

  it('requests nearby places within 1500 meters and maps them by distance', async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined
    publicApiClient.defaults.adapter = async (config) => {
      capturedConfig = config
      return response(config, [{
        externalPlaceId: 'place-1',
        placeName: '산책 공원',
        placeImageUrl: 'https://example.com/place.jpg',
        address: '대구 수성구',
        latitude: 35.856,
        longitude: 128.633,
        rating: 4.5,
        reviewNum: 8,
        petPolicy: { leashRequired: true },
      }])
    }

    const places = await fetchNearbyPlaces({ latitude: 35.8552, longitude: 128.6329 })

    expect(capturedConfig?.url).toBe('/places/nearby')
    expect(capturedConfig?.params).toMatchObject({ lat: 35.855, lng: 128.633, radiusMeters: 1500 })
    expect(places[0]).toMatchObject({ id: 'place-1', name: '산책 공원', hasPetPolicy: true })
    expect(places[0].distanceMeters).toBeLessThan(1500)
  })

  it('rejects an invalid post response instead of rendering partial data', async () => {
    apiClient.defaults.adapter = async (config) =>
      response(config, {
        posts: [{ id: 'post-1', recommendationCount: 'many' }],
        nextCursor: null,
      })

    await expect(fetchPopularPosts()).rejects.toThrow('response was invalid')
  })

  it('accepts empty pages and non-empty cursor values', async () => {
    apiClient.defaults.adapter = async (config) =>
      response(config, { posts: [], nextCursor: 'next-page' })

    await expect(fetchPopularPosts()).resolves.toEqual([])
  })

  it('rejects pages larger than the requested size', async () => {
    apiClient.defaults.adapter = async (config) =>
      response(config, { posts: [1, 2, 3, 4].map(post), nextCursor: null })

    await expect(fetchPopularPosts()).rejects.toThrow('response was invalid')
  })

  it('rejects invalid counts and cursor values', async () => {
    apiClient.defaults.adapter = async (config) =>
      response(config, {
        posts: [{ ...post(1), recommendationCount: 1.5 }],
        nextCursor: '',
      })

    await expect(fetchPopularPosts()).rejects.toThrow('response was invalid')
  })

  it.each([
    ['an empty nickname', { ...post(1), nickname: '   ' }],
    ['a negative comment count', { ...post(1), commentCount: -1 }],
    ['a fractional comment count', { ...post(1), commentCount: 1.5 }],
  ])('rejects posts with %s', async (_caseName, invalidPost) => {
    apiClient.defaults.adapter = async (config) =>
      response(config, { posts: [invalidPost], nextCursor: null })

    await expect(fetchPopularPosts()).rejects.toThrow('response was invalid')
  })

  it('rejects the legacy top-level array because the API now returns a cursor page', async () => {
    apiClient.defaults.adapter = async (config) => response(config, [])

    await expect(fetchPopularPosts()).rejects.toThrow('response was invalid')
  })
})
