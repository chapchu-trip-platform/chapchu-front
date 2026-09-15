import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildRecommendedPlacesRequest,
  fetchRecommendedPlaces,
  getPlaceRecommendationErrorMessage,
} from '@/features/map/api/recommended-places-api'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { apiClient } from '@/lib/api/client'

const originalAdapter = apiClient.defaults.adapter

function response(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { config, data, headers: {}, status: 200, statusText: 'OK' }
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  useAuthStore.setState({ status: 'idle' })
  sessionStorage.clear()
})

describe('recommended places API', () => {
  it('returns local candidates for the development test account', async () => {
    useAuthStore.getState().startDemoSession()
    let requestedBackend = false
    apiClient.defaults.adapter = async (config) => {
      requestedBackend = true
      return response(config, [])
    }

    const places = await fetchRecommendedPlaces({
      petId: 'demo-pet-1',
      lat: 37.524,
      lng: 126.9335,
      radiusMeters: 5_000,
      limit: 5,
    })

    expect(places).toHaveLength(3)
    expect(places[0]).toMatchObject({
      externalPlaceId: 'demo-place-1',
      name: '반려견 산책 공원',
    })
    expect(requestedBackend).toBe(false)
  })

  it('builds a five-place request around the destination area', () => {
    expect(
      buildRecommendedPlacesRequest({
        destination: {
          id: 'destination-area',
          name: '성수동',
          address: '서울 성동구',
          latitude: 37.5444,
          longitude: 127.0374,
        },
        petId: ' pet-1 ',
        weather: {
          temperature: 25,
          humidity: 60,
          weatherStatus: ' 맑음 ',
        },
      })
    ).toEqual({
      petId: 'pet-1',
      lat: 37.5444,
      lng: 127.0374,
      radiusMeters: 5_000,
      limit: 5,
      temperature: 25,
      humidity: 60,
      weatherStatus: '맑음',
    })
  })

  it('posts the documented request and maps validated candidates', async () => {
    const signal = new AbortController().signal
    let capturedConfig: InternalAxiosRequestConfig | undefined
    apiClient.defaults.adapter = async (config) => {
      capturedConfig = config
      return response(config, [
        {
          externalPlaceId: 'ext-001',
          placeName: ' 한강공원 ',
          placeImageUrl: 'https://example.com/park.jpg',
          latitude: 37.524,
          longitude: 126.9335,
          address: ' 서울시 마포구 ',
          categoryLabel: ' 관광지 ',
          indoorOutdoorType: ' 실외 ',
          allowedPetSize: null,
          leashRequired: true,
          carrierRequired: false,
          placeCaution: ' 배변봉투 지참 ',
        },
      ])
    }

    await expect(
      fetchRecommendedPlaces(
        {
          petId: 'pet-1',
          lat: 37.524,
          lng: 126.9335,
          radiusMeters: 5_000,
          limit: 5,
        },
        signal
      )
    ).resolves.toEqual([
      {
        externalPlaceId: 'ext-001',
        name: '한강공원',
        imageUrl: 'https://example.com/park.jpg',
        latitude: 37.524,
        longitude: 126.9335,
        address: '서울시 마포구',
        category: '관광지',
        indoorOutdoorType: '실외',
        allowedPetSize: null,
        leashRequired: true,
        carrierRequired: false,
        caution: '배변봉투 지참',
      },
    ])
    expect(capturedConfig?.url).toBe('/recommended-places')
    expect(capturedConfig?.method).toBe('post')
    expect(capturedConfig?.timeout).toBe(60_000)
    expect(capturedConfig?.signal).toBe(signal)
    expect(capturedConfig?.replayAfterAuthRefresh).toBe(true)
  })

  it('normalizes empty display fields returned by the production API', async () => {
    apiClient.defaults.adapter = async (config) =>
      response(config, [
        {
          externalPlaceId: '3465128',
          placeName: '힐튼 가든 인 서울 강남',
          placeImageUrl: '',
          latitude: 37.485,
          longitude: 127.034,
          address: '',
          categoryLabel: '숙박',
          indoorOutdoorType: 'BOTH',
          allowedPetSize: null,
          leashRequired: null,
          carrierRequired: null,
          placeCaution: '',
        },
      ])

    await expect(
      fetchRecommendedPlaces({
        petId: 'pet-1',
        lat: 37.485,
        lng: 127.034,
        radiusMeters: 5_000,
        limit: 5,
      })
    ).resolves.toEqual([
      expect.objectContaining({
        externalPlaceId: '3465128',
        imageUrl: null,
        address: '주소 정보 없음',
        caution: null,
      }),
    ])
  })

  it('rejects malformed candidate payloads', async () => {
    apiClient.defaults.adapter = async (config) =>
      response(config, [{ externalPlaceId: 'ext-001', placeName: '좌표 없는 장소' }])

    const error = await fetchRecommendedPlaces({
      petId: 'pet-1',
      lat: 37.524,
      lng: 126.9335,
      radiusMeters: 5_000,
      limit: 5,
    }).catch((caught: unknown) => caught)

    expect(getPlaceRecommendationErrorMessage(error)).toContain('응답 형식')
  })

  it('maps request failures to safe messages', () => {
    expect(getPlaceRecommendationErrorMessage({ type: 'network' })).toContain('네트워크')
    expect(getPlaceRecommendationErrorMessage({ type: 'timeout' })).toContain('시간이 초과')
    expect(getPlaceRecommendationErrorMessage({ status: 401 })).toContain('로그인')
    expect(getPlaceRecommendationErrorMessage(new Error('secret'))).not.toContain('secret')
  })
})
