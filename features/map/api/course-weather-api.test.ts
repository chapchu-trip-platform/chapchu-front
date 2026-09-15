import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCourseWeather } from '@/features/map/api/course-weather-api'

const origin = {
  id: 'origin',
  name: '서울역',
  address: '서울 용산구 한강대로 405',
  latitude: 37.5547,
  longitude: 126.9706,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('course weather API', () => {
  it('requests fresh weather for the origin grid and maps optional course fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          temperatureC: 25,
          humidityPercent: 60,
          conditionLabel: ' 맑음 ',
        }),
        { status: 200 }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchCourseWeather(origin)).resolves.toEqual({
      temperature: 25,
      humidity: 60,
      weatherStatus: '맑음',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/weather\/current\?nx=\d+&ny=\d+$/),
      { signal: undefined }
    )
  })

  it('omits unavailable weather values', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            temperatureC: null,
            humidityPercent: null,
            conditionLabel: '',
          }),
          { status: 200 }
        )
      )
    )

    await expect(fetchCourseWeather(origin)).resolves.toEqual({})
  })
})
