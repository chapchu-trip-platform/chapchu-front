import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createPet,
  deletePet,
  fetchBookmarks,
  fetchMyPosts,
  fetchMyReviews,
  fetchPetOptions,
  fetchPets,
  fetchProfileSummary,
  fetchWishlist,
  getProfileErrorMessage,
  removeBookmark,
  removeWishlistPlace,
  updateNickname,
  updatePet,
  withdrawAccount,
} from '@/features/profile/api/profile-api'
import { apiClient, publicApiClient } from '@/lib/api/client'

const originalApiAdapter = apiClient.defaults.adapter
const originalPublicAdapter = publicApiClient.defaults.adapter

function response(
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200
): AxiosResponse {
  return {
    config,
    data,
    headers: {},
    status,
    statusText: status === 201 ? 'Created' : status === 204 ? 'No Content' : 'OK',
  }
}

const petResponse = {
  id: 'pet-id',
  petName: ' 초코 ',
  breedId: null,
  breedName: ' 골든리트리버 ',
  size: 'MEDIUM',
  age: 3,
  activities: [{ id: 'activity-id', name: ' 산책 ' }],
  createdAt: null,
  updatedAt: null,
}

const postResponse = {
  id: 'post-id',
  petId: 'pet-id',
  photoId: null,
  courseId: null,
  title: ' 여행 기록 ',
  content: ' 즐거운 여행 ',
  viewCount: 10,
  recommendationCount: 3,
  commentCount: 2,
  nickname: ' 초코맘 ',
  photoUrl: null,
  createdAt: null,
}

afterEach(() => {
  apiClient.defaults.adapter = originalApiAdapter
  publicApiClient.defaults.adapter = originalPublicAdapter
})

describe('Profile API', () => {
  it('loads and validates the mypage summary', async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined
    apiClient.defaults.adapter = async (config) => {
      capturedConfig = config
      return response(config, {
        nickname: ' 초코맘 ',
        email: ' user@example.com ',
        petCount: 1,
      })
    }

    await expect(fetchProfileSummary()).resolves.toEqual({
      nickname: '초코맘',
      email: 'user@example.com',
      petCount: 1,
    })
    expect(capturedConfig?.method).toBe('get')
    expect(capturedConfig?.url).toBe('/users/me/mypage')
  })

  it('loads pets and maps the documented nullable breed id', async () => {
    apiClient.defaults.adapter = async (config) => response(config, [petResponse])

    await expect(fetchPets()).resolves.toEqual([
      {
        id: 'pet-id',
        petName: '초코',
        breedId: null,
        breedName: '골든리트리버',
        size: 'MEDIUM',
        age: 3,
        activities: [{ id: 'activity-id', name: '산책' }],
      },
    ])
  })

  it('loads public breed and activity options without an access token', async () => {
    const requests: string[] = []
    publicApiClient.defaults.adapter = async (config) => {
      requests.push(config.url ?? '')
      return response(
        config,
        config.url === '/breeds'
          ? [{ id: 7, name: '골든리트리버' }]
          : [{ id: 'activity-id', name: '산책' }]
      )
    }

    await expect(fetchPetOptions()).resolves.toEqual({
      breeds: [{ id: 7, name: '골든리트리버' }],
      activities: [{ id: 'activity-id', name: '산책' }],
    })
    expect(requests).toEqual(['/breeds', '/activities'])
  })

  it('sends the documented pet create, update, and delete requests', async () => {
    const requests: Array<{ method?: string; url?: string; body?: unknown }> = []
    apiClient.defaults.adapter = async (config) => {
      requests.push({
        method: config.method,
        url: config.url,
        body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
      })
      return response(config, config.method === 'delete' ? undefined : petResponse)
    }
    const input = {
      petName: '초코',
      breedId: 7,
      size: 'MEDIUM' as const,
      age: 3,
      activityIds: ['activity-id'],
    }

    await createPet(input)
    await updatePet('pet/id', input)
    await deletePet('pet/id')

    expect(requests).toEqual([
      { method: 'post', url: '/pets', body: input },
      { method: 'patch', url: '/pets/pet%2Fid', body: input },
      { method: 'delete', url: '/pets/pet%2Fid', body: undefined },
    ])
  })

  it('checks nickname availability before patching the user', async () => {
    const publicAdapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      response(config, { nickname: '새닉네임', available: true })
    )
    const protectedAdapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      response(config, { nickname: '새닉네임' })
    )
    publicApiClient.defaults.adapter = publicAdapter
    apiClient.defaults.adapter = protectedAdapter

    await expect(updateNickname('현재닉네임', ' 새닉네임 ')).resolves.toBe('새닉네임')
    expect(publicAdapter.mock.calls[0][0]).toMatchObject({
      method: 'get',
      url: '/users/nickname/availability',
      params: { nickname: '새닉네임' },
    })
    expect(JSON.parse(protectedAdapter.mock.calls[0][0].data as string)).toEqual({
      nickname: '새닉네임',
    })
  })

  it('blocks an unavailable nickname before sending the patch', async () => {
    publicApiClient.defaults.adapter = async (config) =>
      response(config, { nickname: '중복닉네임', available: false })
    const protectedAdapter = vi.fn()
    apiClient.defaults.adapter = protectedAdapter

    await expect(updateNickname('현재닉네임', '중복닉네임')).rejects.toMatchObject({
      status: 409,
    })
    expect(protectedAdapter).not.toHaveBeenCalled()
  })

  it('patches the documented withdrawn account status', async () => {
    let body: unknown
    apiClient.defaults.adapter = async (config) => {
      body = JSON.parse(config.data as string)
      return response(config, { accountStatus: 'WITHDRAWN' })
    }

    await withdrawAccount()
    expect(body).toEqual({ accountStatus: 'WITHDRAWN' })
  })

  it('loads posts, bookmarks, and reviews from their mypage endpoints', async () => {
    const requests: string[] = []
    apiClient.defaults.adapter = async (config) => {
      requests.push(config.url ?? '')
      if (config.url === '/users/me/reviews') {
        return response(config, [
          {
            id: 'review-id',
            placeId: 'place-id',
            petId: 'pet-id',
            rating: 5,
            contents: '좋았어요',
            weather: 'SUNNY',
            recommendationCount: 1,
            createdAt: null,
            coursePlaceId: null,
          },
        ])
      }
      return response(config, [postResponse])
    }

    await expect(fetchMyPosts()).resolves.toHaveLength(1)
    await expect(fetchBookmarks()).resolves.toHaveLength(1)
    await expect(fetchMyReviews()).resolves.toEqual([
      expect.objectContaining({ id: 'review-id', weather: 'SUNNY' }),
    ])
    expect(requests).toEqual([
      '/users/me/posts',
      '/users/me/bookmarks',
      '/users/me/reviews',
    ])
  })

  it('hydrates wishlist ids with place details and supports removals', async () => {
    const requests: Array<{ method?: string; url?: string }> = []
    apiClient.defaults.adapter = async (config) => {
      requests.push({ method: config.method, url: config.url })
      if (config.url === '/users/me/wishlist') {
        return response(config, [{ placeId: 'place/id', createdAt: null }])
      }
      if (config.url === '/places/place%2Fid') {
        return response(config, {
          externalPlaceId: 'different-detail-id',
          placeName: '한강공원',
          address: '서울시 영등포구',
          rating: 4.5,
          reviewNum: 12,
        })
      }
      return response(config, undefined, 204)
    }

    await expect(fetchWishlist()).resolves.toEqual([
      {
        placeId: 'place/id',
        createdAt: null,
        placeName: '한강공원',
        address: '서울시 영등포구',
        rating: 4.5,
        reviewCount: 12,
      },
    ])
    await removeWishlistPlace('place/id')
    await removeBookmark('post/id')
    expect(requests.slice(-2)).toEqual([
      { method: 'delete', url: '/users/me/wishlist/place%2Fid' },
      { method: 'delete', url: '/posts/post%2Fid/bookmarks' },
    ])
  })

  it('rejects malformed API responses instead of rendering partial data', async () => {
    apiClient.defaults.adapter = async (config) => response(config, { nickname: '초코맘' })

    await expect(fetchProfileSummary()).rejects.toThrow('response was invalid')
  })

  it('rejects oversized wishlist responses before place-detail fan-out', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      response(
        config,
        Array.from({ length: 201 }, (_, index) => ({
          placeId: `place-${index}`,
          createdAt: null,
        }))
      )
    )
    apiClient.defaults.adapter = adapter

    await expect(fetchWishlist()).rejects.toThrow('response was invalid')
    expect(adapter).toHaveBeenCalledOnce()
  })

  it('rejects blank mutation ids and duplicate pet activities', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      response(config, [{
        ...petResponse,
        activities: [
          { id: 'duplicate', name: '산책' },
          { id: 'duplicate', name: '달리기' },
        ],
      }])
    )
    apiClient.defaults.adapter = adapter

    await expect(fetchPets()).rejects.toThrow('duplicate activities')
    await expect(deletePet('   ')).rejects.toThrow('Pet ID is required')
    await expect(removeWishlistPlace('')).rejects.toThrow('Place ID is required')
    await expect(removeBookmark('   ')).rejects.toThrow('Post ID is required')
    expect(adapter).toHaveBeenCalledOnce()
  })

  it('maps API failures to safe profile messages', () => {
    expect(getProfileErrorMessage({ status: 409 })).toContain('이미 사용')
    expect(getProfileErrorMessage({ type: 'network' })).toContain('네트워크')
    expect(getProfileErrorMessage({ type: 'timeout' })).toContain('서버')
  })
})
