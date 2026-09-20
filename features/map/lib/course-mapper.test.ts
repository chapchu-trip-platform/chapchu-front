import { describe, expect, it } from 'vitest'
import { mapCourse } from '@/features/map/lib/course-mapper'

describe('mapCourse', () => {
  it('maps the documented response and sorts places by visit order', () => {
    expect(
      mapCourse({
        courseId: 'course-1',
        travelDate: '2026-09-01',
        startLocation: ' 서울역 ',
        endLocation: ' 서울숲 ',
        places: [
          {
            coursePlaceId: 'course-place-2',
            externalPlaceId: null,
            placeName: ' 서울숲 ',
            placeImageUrl: 'https://example.com/forest.jpg',
            latitude: 37.5444,
            longitude: 127.0374,
            visitOrder: 2,
            finalPlace: true,
            petPolicy: { leashRequired: true },
          },
          {
            coursePlaceId: 'course-place-1',
            externalPlaceId: 'external-1',
            placeName: '반려견 카페',
            placeImageUrl: null,
            latitude: 37.55,
            longitude: 127.01,
            visitOrder: 1,
            finalPlace: false,
            reason: '반려견 선호 활동과 가까운 카페예요.',
            petPolicy: null,
          },
        ],
      })
    ).toEqual({
      id: 'course-1',
      travelDate: '2026-09-01',
      startLocation: '서울역',
      endLocation: '서울숲',
      places: [
        {
          id: 'course-place-1',
          externalPlaceId: 'external-1',
          name: '반려견 카페',
          imageUrl: null,
          latitude: 37.55,
          longitude: 127.01,
          visitOrder: 1,
          isFinal: false,
          reason: '반려견 선호 활동과 가까운 카페예요.',
          petPolicy: null,
        },
        {
          id: 'course-place-2',
          externalPlaceId: '',
          name: '서울숲',
          imageUrl: 'https://example.com/forest.jpg',
          latitude: 37.5444,
          longitude: 127.0374,
          visitOrder: 2,
          isFinal: true,
          petPolicy: { leashRequired: true },
        },
      ],
    })
  })
})
