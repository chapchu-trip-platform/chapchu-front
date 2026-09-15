import { AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildCreateCourseRequest,
  createRecommendedCourse,
  fetchActiveCourse,
  formatLocalTravelDate,
  getCourseRecommendationErrorMessage,
} from '@/features/map/api/courses-api'
import type { CreateCourseRequestDto } from '@/features/map/types/course-api'
import {
  apiClient,
  sessionApiClient,
} from '@/lib/api/client'
import { useAuthStore } from '@/features/auth/stores/auth-store'

const originalAdapter = apiClient.defaults.adapter
const originalSessionAdapter = sessionApiClient.defaults.adapter

function response(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { config, data, headers: {}, status: 201, statusText: 'Created' }
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  sessionApiClient.defaults.adapter = originalSessionAdapter
  useAuthStore.setState({
    accessToken: null,
    authNotice: null,
    registrationToken: null,
    sessionEpoch: 0,
    setupStage: null,
    status: 'idle',
  })
})

const destination = {
  externalPlaceId: 'external-1',
  name: ' 서울숲 ',
  imageUrl: 'https://example.com/seoul-forest.jpg',
  latitude: 37.5444,
  longitude: 127.0374,
  address: '서울 성동구 뚝섬로 273',
  category: '관광지',
  indoorOutdoorType: '실외',
  allowedPetSize: 'ALL',
  leashRequired: true,
  carrierRequired: false,
  caution: '목줄을 착용해주세요.',
}

const createCourseRequest: CreateCourseRequestDto = {
  petId: 'pet-1',
  travelDate: '2026-09-01',
  startLocation: '서울역',
  startLat: 37.5547,
  startLng: 126.9706,
  destination: {
    externalPlaceId: 'external-1',
    placeName: '서울숲',
    placeImageUrl: 'https://example.com/seoul-forest.jpg',
    latitude: 37.5444,
    longitude: 127.0374,
    address: '서울 성동구 뚝섬로 273',
    categoryLabel: '관광지',
    indoorOutdoorType: '실외',
    allowedPetSize: 'ALL',
    leashRequired: true,
    carrierRequired: false,
    placeCaution: '목줄을 착용해주세요.',
  },
}

describe('courses API', () => {
  it('builds only the fields documented by POST /courses', () => {
    expect(
      buildCreateCourseRequest(
        {
          petId: ' pet-1 ',
          origin: {
          id: 'origin',
          name: ' 서울역 ',
          address: '서울 용산구 한강대로 405',
          latitude: 37.5547,
          longitude: 126.9706,
          },
          destination,
          weather: {
            temperature: 25,
            humidity: 60,
            weatherStatus: ' 맑음 ',
          },
        },
        new Date(2026, 8, 1, 23, 30)
      )
    ).toEqual({
      petId: 'pet-1',
      travelDate: '2026-09-01',
      startLocation: '서울역',
      startLat: 37.5547,
      startLng: 126.9706,
      destination: createCourseRequest.destination,
      temperature: 25,
      humidity: 60,
      weatherStatus: '맑음',
    })
  })

  it('formats the device-local calendar date instead of slicing UTC', () => {
    expect(formatLocalTravelDate(new Date(2026, 0, 2, 1))).toBe('2026-01-02')
  })

  it('posts the documented body with cancellation and maps the response', async () => {
    const signal = new AbortController().signal
    let capturedConfig: InternalAxiosRequestConfig | undefined
    apiClient.defaults.adapter = async (config) => {
      capturedConfig = config
      return response(config, {
        courseId: 'course-1',
        travelDate: '2026-09-01',
        startLocation: '서울역',
        endLocation: '서울숲',
        places: [
          {
            coursePlaceId: 'course-place-1',
            externalPlaceId: 'external-1',
            placeName: '서울숲',
            placeImageUrl: null,
            latitude: 37.5444,
            longitude: 127.0374,
            visitOrder: 1,
            finalPlace: true,
            petPolicy: null,
          },
        ],
      })
    }
    const request = createCourseRequest

    await expect(createRecommendedCourse(request, signal)).resolves.toMatchObject({
      id: 'course-1',
      places: [{ id: 'course-place-1', name: '서울숲', isFinal: true }],
    })
    expect(capturedConfig?.url).toBe('/courses')
    expect(capturedConfig?.method).toBe('post')
    expect(capturedConfig?.signal).toBe(signal)
    expect(capturedConfig?.timeout).toBe(60_000)
    expect(capturedConfig?.replayAfterAuthRefresh).toBe(true)
    expect(JSON.parse(capturedConfig?.data as string)).toEqual(request)
  })

  it('rejects malformed success payloads instead of exposing partial data', async () => {
    apiClient.defaults.adapter = async (config) =>
      response(config, {
        courseId: 'course-1',
        travelDate: '2026-09-01',
        startLocation: '서울역',
        places: [{ placeName: '서울숲', visitOrder: 'first' }],
      })

    await expect(
      createRecommendedCourse({
        ...createCourseRequest,
      })
    ).rejects.toThrow('Course response was invalid.')
  })

  it('loads the newest incomplete course for resuming a trip', async () => {
    useAuthStore.getState().setAccessToken('test-token')
    const requestedUrls: string[] = []
    apiClient.defaults.adapter = async (config) => {
      requestedUrls.push(String(config.url))
      if (config.url === '/users/me/courses') {
        return response(config, [
          {
            courseId: 'completed-course',
            travelDate: '2026-09-11',
            startLocation: '부산역',
            isCompleted: true,
            placeCount: 1,
          },
          {
            courseId: 'active-course',
            travelDate: '2026-09-12',
            startLocation: '서울역',
            isCompleted: false,
            placeCount: 1,
          },
        ])
      }
      return response(config, {
        courseId: 'active-course',
        travelDate: '2026-09-12',
        startLocation: '서울역',
        endLocation: '서울숲',
        places: [
          {
            coursePlaceId: 'active-place',
            externalPlaceId: 'external-1',
            placeName: '서울숲',
            placeImageUrl: null,
            latitude: 37.5444,
            longitude: 127.0374,
            visitOrder: 1,
            finalPlace: true,
            petPolicy: null,
          },
        ],
      })
    }

    await expect(fetchActiveCourse()).resolves.toMatchObject({
      id: 'active-course',
      places: [{ id: 'active-place', name: '서울숲' }],
    })
    expect(requestedUrls).toEqual(['/users/me/courses', '/courses/active-course'])
  })

  it('restores the access token before the resume lookup after a reload', async () => {
    let authorization: string | undefined
    sessionApiClient.defaults.adapter = async (config) =>
      response(config, { access_token: 'restored-token' })
    apiClient.defaults.adapter = async (config) => {
      authorization = String(AxiosHeaders.from(config.headers).get('Authorization') ?? '')
      return response(config, [])
    }

    await expect(fetchActiveCourse()).resolves.toBeNull()

    expect(authorization).toBe('Bearer restored-token')
  })

  it('maps normalized failures to safe UI messages', () => {
    expect(getCourseRecommendationErrorMessage({ type: 'network' })).toContain('네트워크')
    expect(getCourseRecommendationErrorMessage({ type: 'timeout' })).toContain('시간이 초과')
    expect(getCourseRecommendationErrorMessage({ status: 401 })).toContain('로그인')
    expect(getCourseRecommendationErrorMessage({ status: 400 })).toContain('반려동물과 선택한 장소')
    expect(getCourseRecommendationErrorMessage({ type: 'server', status: 500 })).toContain(
      '서버에서'
    )
    expect(getCourseRecommendationErrorMessage(new Error('secret'))).not.toContain('secret')
  })

  it('identifies a response that does not match the published contract', async () => {
    apiClient.defaults.adapter = async (config) => response(config, { courseId: 'course-1' })

    const error = await createRecommendedCourse({
      ...createCourseRequest,
    }).catch((caught: unknown) => caught)

    expect(getCourseRecommendationErrorMessage(error)).toContain('응답 형식')
  })
})
