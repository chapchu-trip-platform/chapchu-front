import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  archivePetToMemory,
  createPet,
  deletePet,
  fetchBookmarks,
  fetchMyPosts,
  fetchMyReviews,
  fetchPetOptions,
  fetchPets,
  fetchProfilePhoto,
  fetchProfileSummary,
  fetchStampCollection,
  fetchWishlist,
  getProfileErrorMessage,
  removeBookmark,
  removeWishlistPlace,
  updateNickname,
  updatePet,
  updatePetPhoto,
  updateProfilePhoto,
  withdrawAccount,
} from '@/features/profile/api/profile-api'
import { apiClient, publicApiClient } from '@/lib/api/client'
import { useAuthStore } from '@/features/auth/stores/auth-store'

const originalApiAdapter = apiClient.defaults.adapter
const originalPublicAdapter = publicApiClient.defaults.adapter
const originalSessionEpoch = useAuthStore.getState().sessionEpoch

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve })
  return { promise, resolve }
}

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
  isDie: false,
  profilePhoto: null,
  activities: [{ id: 'activity-id', name: ' 산책 ' }],
  createdAt: null,
  updatedAt: null,
}

const postResponse = {
  id: 'post-id',
  petId: 'pet-id',
  photoId: 'post-photo-id',
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
  useAuthStore.setState({ sessionEpoch: originalSessionEpoch })
})

describe('Profile API', () => {
  it('loads and updates the documented profile photo contract', async () => {
    const requests: InternalAxiosRequestConfig[] = []
    apiClient.defaults.adapter = async (config) => {
      requests.push(config)
      return response(config, {
        id: 'user-1',
        profilePhoto: {
          photoId: config.method === 'patch' ? 'photo-1' : null,
          downloadUrl: 'https://bucket.example/profile?signature=test',
        },
      })
    }

    await expect(fetchProfilePhoto()).resolves.toEqual({
      photoId: null,
      downloadUrl: 'https://bucket.example/profile?signature=test',
    })
    await expect(updateProfilePhoto('photo-1')).resolves.toEqual({
      photoId: 'photo-1',
      downloadUrl: 'https://bucket.example/profile?signature=test',
    })
    expect(requests.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: 'get', url: '/users/me' },
      { method: 'patch', url: '/users/me/photo' },
    ])
    expect(JSON.parse(requests[1].data as string)).toEqual({ photoId: 'photo-1' })
  })

  it('rejects a custom profile photo without a safe download URL', async () => {
    apiClient.defaults.adapter = async (config) => response(config, {
      profilePhoto: { photoId: 'photo-1', downloadUrl: 'http://bucket.example/profile' },
    })
    await expect(fetchProfilePhoto()).rejects.toThrow('Profile photo response was invalid')
  })

  it('does not patch a nickname after the session changes during availability checking', async () => {
    const request = createDeferred<void>()
    const publicAdapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      await request.promise
      return response(config, { nickname: '새닉네임', available: true })
    })
    const protectedAdapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, {}))
    publicApiClient.defaults.adapter = publicAdapter
    apiClient.defaults.adapter = protectedAdapter
    const result = expect(updateNickname('현재닉네임', '새닉네임')).rejects.toThrow()
    await vi.waitFor(() => expect(publicAdapter).toHaveBeenCalledOnce())
    useAuthStore.setState({ sessionEpoch: originalSessionEpoch + 1 })
    request.resolve()
    await result
    expect(protectedAdapter).not.toHaveBeenCalled()
  })

  it('does not confirm a nullable nickname update using a different session', async () => {
    const request = createDeferred<void>()
    const protectedAdapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      await request.promise
      return response(config, { nickname: null })
    })
    apiClient.defaults.adapter = protectedAdapter
    const result = expect(updateNickname('현재닉네임', '현재닉네임')).rejects.toThrow()
    await vi.waitFor(() => expect(protectedAdapter).toHaveBeenCalledOnce())
    useAuthStore.setState({ sessionEpoch: originalSessionEpoch + 1 })
    request.resolve()
    await result
    expect(protectedAdapter).toHaveBeenCalledOnce()
  })

  it.each(['session', 'abort'] as const)('stops queued wishlist detail reads after %s changes', async (change) => {
    const controller = new AbortController()
    const details = createDeferred<void>()
    const detailCalls: string[] = []
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/users/me/wishlist') {
        return response(config, Array.from({ length: 10 }, (_, index) => ({ placeId: `place-${index}`, createdAt: null })))
      }
      detailCalls.push(config.url ?? '')
      await details.promise
      return response(config, { externalPlaceId: 'place', placeName: '장소', address: '', rating: 0, reviewNum: 0 })
    }
    const result = expect(fetchWishlist(controller.signal)).rejects.toBeDefined()
    await vi.waitFor(() => expect(detailCalls).toHaveLength(6))
    if (change === 'session') useAuthStore.setState({ sessionEpoch: originalSessionEpoch + 1 })
    else controller.abort()
    details.resolve()
    await result
    expect(detailCalls).toHaveLength(6)
  })

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

  it('loads, validates, and orders the documented regional stamp collection', async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined
    apiClient.defaults.adapter = async (config) => {
      capturedConfig = config
      return response(config, {
        acquiredCount: 1,
        totalCount: 2,
        stamps: [
          {
            stampId: 'stamp-busan',
            stampName: '부산',
            acquired: false,
            stampCount: 0,
          },
          {
            stampId: 'stamp-seoul',
            stampName: '서울',
            acquired: true,
            stampCount: 2,
            firstAcquiredAt: '2026-09-01T10:00:00.123456',
          },
        ],
      })
    }

    await expect(fetchStampCollection()).resolves.toEqual({
      acquiredCount: 1,
      totalCount: 2,
      stamps: [
        {
          stampId: 'stamp-seoul',
          stampName: '서울',
          acquired: true,
          stampCount: 2,
          firstAcquiredAt: '2026-09-01T10:00:00.123456',
        },
        {
          stampId: 'stamp-busan',
          stampName: '부산',
          acquired: false,
          stampCount: 0,
          firstAcquiredAt: null,
        },
      ],
    })
    expect(capturedConfig).toMatchObject({ method: 'get', url: '/users/me/stamps' })
  })

  it('rejects an inconsistent stamp collection response', async () => {
    apiClient.defaults.adapter = async (config) => response(config, {
      acquiredCount: 0,
      totalCount: 1,
      stamps: [{
        stampId: 'stamp-seoul',
        stampName: '서울',
        acquired: false,
        stampCount: 2,
        firstAcquiredAt: null,
      }],
    })

    await expect(fetchStampCollection()).rejects.toThrow('Stamp collection response was invalid')
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
        isDie: false,
        profilePhoto: null,
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

  it('archives a pet with the documented isDie update and validates the response', async () => {
    const requests: Array<{ method?: string; url?: string; body?: unknown }> = []
    apiClient.defaults.adapter = async (config) => {
      requests.push({
        method: config.method,
        url: config.url,
        body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
      })
      return response(config, { ...petResponse, id: 'pet/id', isDie: true })
    }

    await expect(archivePetToMemory('pet/id')).resolves.toMatchObject({
      id: 'pet/id',
      isDie: true,
    })
    expect(requests).toEqual([
      { method: 'patch', url: '/pets/pet%2Fid', body: { isDie: true } },
    ])

    apiClient.defaults.adapter = async (config) => response(config, petResponse)
    await expect(archivePetToMemory('pet-id')).rejects.toThrow(
      'Pet memory status response was invalid.'
    )
  })

  it('sets and removes a pet profile photo with the documented response', async () => {
    const requests: Array<{ method?: string; url?: string; body?: unknown }> = []
    apiClient.defaults.adapter = async (config) => {
      const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
      requests.push({ method: config.method, url: config.url, body })
      return response(config, {
        ...petResponse,
        profilePhoto: body.photoId
          ? {
              photoId: body.photoId,
              downloadUrl: 'https://bucket.example/profile/pet.jpg?signature=test',
            }
          : null,
      })
    }

    await expect(updatePetPhoto('pet/id', 'photo-1')).resolves.toMatchObject({
      id: 'pet-id',
      profilePhoto: {
        photoId: 'photo-1',
        downloadUrl: 'https://bucket.example/profile/pet.jpg?signature=test',
      },
    })
    await expect(updatePetPhoto('pet/id', null)).resolves.toMatchObject({
      profilePhoto: null,
    })
    expect(requests).toEqual([
      { method: 'patch', url: '/pets/pet%2Fid/photo', body: { photoId: 'photo-1' } },
      { method: 'patch', url: '/pets/pet%2Fid/photo', body: { photoId: null } },
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

  it('confirms a nullable nickname update response through the summary without replaying the patch', async () => {
    publicApiClient.defaults.adapter = async (config) =>
      response(config, { nickname: '새닉네임', available: true })
    const requests: Array<{ method?: string; url?: string }> = []
    apiClient.defaults.adapter = async (config) => {
      requests.push({ method: config.method, url: config.url })
      return response(config, config.method === 'patch'
        ? { nickname: null }
        : { nickname: '새닉네임', email: 'user@example.com', petCount: 1 })
    }

    await expect(updateNickname('현재닉네임', '새닉네임')).resolves.toBe('새닉네임')
    expect(requests).toEqual([
      { method: 'patch', url: '/users/me' },
      { method: 'get', url: '/users/me/mypage' },
    ])
  })

  it.each(['mismatch', 'failed read'] as const)(
    'does not claim nickname success or replay the patch when confirmation returns %s',
    async (scenario) => {
      publicApiClient.defaults.adapter = async (config) =>
        response(config, { nickname: '새닉네임', available: true })
      const requests: string[] = []
      apiClient.defaults.adapter = async (config) => {
        requests.push(config.method ?? '')
        if (config.method === 'patch') return response(config, { nickname: null })
        if (scenario === 'failed read') throw new Error('Summary unavailable')
        return response(config, { nickname: '현재닉네임', email: 'user@example.com', petCount: 1 })
      }

      await expect(updateNickname('현재닉네임', '새닉네임')).rejects.toThrow()
      expect(requests).toEqual(['patch', 'get'])
    }
  )

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

    await expect(fetchMyPosts()).resolves.toEqual([
      expect.objectContaining({ id: 'post-id', photoId: 'post-photo-id' }),
    ])
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
    await expect(archivePetToMemory('   ')).rejects.toThrow('Pet ID is required')
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
