import { describe, expect, it } from 'vitest'
import { mapCourse } from '@/features/map/lib/course-mapper'

describe('mapCourse', () => {
  it('maps the documented response and sorts places by visit order', () => {
    expect(
      mapCourse({
        courseId: 'course-1',
        travelDate: '2026-09-01',
        startLocation: ' 서울역 ',
        places: [
          {
            coursePlaceId: 'course-place-2',
            externalPlaceId: 'external-2',
            placeName: ' 서울숲 ',
            visitOrder: 2,
            finalPlace: true,
          },
          {
            coursePlaceId: 'course-place-1',
            externalPlaceId: 'external-1',
            placeName: '반려견 카페',
            visitOrder: 1,
            finalPlace: false,
          },
        ],
      })
    ).toEqual({
      id: 'course-1',
      travelDate: '2026-09-01',
      startLocation: '서울역',
      places: [
        {
          id: 'course-place-1',
          externalPlaceId: 'external-1',
          name: '반려견 카페',
          visitOrder: 1,
          isFinal: false,
        },
        {
          id: 'course-place-2',
          externalPlaceId: 'external-2',
          name: '서울숲',
          visitOrder: 2,
          isFinal: true,
        },
      ],
    })
  })
})
