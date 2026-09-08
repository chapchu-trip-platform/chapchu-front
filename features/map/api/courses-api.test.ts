import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildCreateCourseRequest,
  createRecommendedCourse,
  formatLocalTravelDate,
  getCourseRecommendationErrorMessage,
  isNoPlacesFoundCourseError,
} from '@/features/map/api/courses-api'
import { apiClient } from '@/lib/api/client'

const originalAdapter = apiClient.defaults.adapter

function response(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { config, data, headers: {}, status: 201, statusText: 'Created' }
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

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
          destination: {
            id: 'destination',
            name: ' 서울숲 ',
            address: '서울 성동구 뚝섬로 273',
            latitude: 37.5444,
            longitude: 127.0374,
          },
          intermediateStopCount: 2,
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
      endLocation: '서울숲',
      endLat: 37.5444,
      endLng: 127.0374,
      intermediateStopCount: 2,
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
    const request = {
      petId: 'pet-1',
      travelDate: '2026-09-01',
      startLocation: '서울역',
      startLat: 37.5547,
      startLng: 126.9706,
      endLocation: '서울숲',
      endLat: 37.5444,
      endLng: 127.0374,
      intermediateStopCount: 2,
    }

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
        petId: 'pet-1',
        travelDate: '2026-09-01',
        startLocation: '서울역',
        startLat: 37.5547,
        startLng: 126.9706,
        endLocation: '서울숲',
        endLat: 37.5444,
        endLng: 127.0374,
        intermediateStopCount: 2,
      })
    ).rejects.toThrow('Course response was invalid.')
  })

  it('maps normalized failures to safe UI messages', () => {
    expect(getCourseRecommendationErrorMessage({ type: 'network' })).toContain('네트워크')
    expect(getCourseRecommendationErrorMessage({ type: 'timeout' })).toContain('시간이 초과')
    expect(getCourseRecommendationErrorMessage({ status: 401 })).toContain('로그인')
    expect(getCourseRecommendationErrorMessage({ status: 400 })).toContain('반려동물과 경로')
    expect(getCourseRecommendationErrorMessage({ type: 'server', status: 500 })).toContain(
      '서버에서'
    )
    expect(getCourseRecommendationErrorMessage(new Error('secret'))).not.toContain('secret')
  })

  it('recognizes the backend no-places 404 without treating every 404 as empty', () => {
    expect(
      isNoPlacesFoundCourseError({
        type: 'not-found',
        status: 404,
        message: '주변에 반려동물 동반 가능 장소가 없습니다.',
      })
    ).toBe(true)
    expect(
      isNoPlacesFoundCourseError({
        type: 'not-found',
        status: 404,
        message: '다른 리소스를 찾을 수 없습니다.',
      })
    ).toBe(false)
  })

  it('identifies a response that does not match the published contract', async () => {
    apiClient.defaults.adapter = async (config) => response(config, { courseId: 'course-1' })

    const error = await createRecommendedCourse({
      petId: 'pet-1',
      travelDate: '2026-09-01',
      startLocation: '서울역',
      startLat: 37.5547,
      startLng: 126.9706,
      endLocation: '서울숲',
      endLat: 37.5444,
      endLng: 127.0374,
      intermediateStopCount: 2,
    }).catch((caught: unknown) => caught)

    expect(getCourseRecommendationErrorMessage(error)).toContain('응답 형식')
  })
})
