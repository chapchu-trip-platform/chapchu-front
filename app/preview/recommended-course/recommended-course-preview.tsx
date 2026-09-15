'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MapRouteScreen from '@/components/screens/map-route-screen'
import type { RecommendedCourse } from '@/features/map/types/course'

const origin = {
  id: 'preview-origin',
  name: '서울역',
  address: '서울 용산구 한강대로 405',
  latitude: 37.5547,
  longitude: 126.9706,
}

const destination = {
  id: 'preview-destination',
  name: '서울숲',
  address: '서울 성동구 뚝섬로 273',
  latitude: 37.5444,
  longitude: 127.0374,
}

// Temporary, development-only fixtures for reviewing the restored detail sheet.
const originalReviews = [
  { author: '산책러버', text: '반려견과 함께 최고의 시간! 직원분들도 친절했어요.', rating: 5 },
  { author: '멍뭉이맘', text: '물그릇과 간식도 챙겨줘서 감동이었어요.', rating: 5 },
]

const course: RecommendedCourse = {
  id: 'preview-course',
  travelDate: '2026-09-09',
  startLocation: origin.name,
  endLocation: destination.name,
  places: [
    {
      id: 'preview-cafe',
      externalPlaceId: 'preview-cafe',
      name: '성수 펫 카페',
      imageUrl: '/images/place-cafe.png',
      latitude: 37.5447,
      longitude: 127.0438,
      visitOrder: 1,
      isFinal: false,
      petPolicy: '목줄 착용 필수',
      details: {
        address: '서울 성동구 성수동 2가',
        hours: '10:00 ~ 21:00',
        rating: 4.8,
        reviewCount: 124,
        category: '카페',
        petFriendly: true,
        reviews: originalReviews,
      },
    },
    {
      id: 'preview-park',
      externalPlaceId: 'preview-park',
      name: '서울숲 공원',
      imageUrl: '/images/place-park.png',
      latitude: 37.546,
      longitude: 127.039,
      visitOrder: 2,
      isFinal: false,
      petPolicy: '목줄 착용, 배변봉투 필수',
      details: {
        address: '서울 성동구 뚝섬로 273',
        hours: '상시 개방',
        rating: 4.9,
        reviewCount: 320,
        category: '공원',
        petFriendly: true,
        reviews: originalReviews,
      },
    },
    {
      id: 'preview-restaurant',
      externalPlaceId: 'preview-restaurant',
      name: '한강 펫 레스토랑',
      imageUrl: '/images/place-restaurant.png',
      latitude: 37.52,
      longitude: 126.97,
      visitOrder: 3,
      isFinal: false,
      petPolicy: '소형견만 동반 가능',
      details: {
        address: '서울 용산구 이촌동',
        hours: '11:30 ~ 22:00',
        rating: 4.6,
        reviewCount: 87,
        category: '레스토랑',
        petFriendly: true,
        reviews: originalReviews,
      },
    },
    {
      id: 'preview-missing',
      externalPlaceId: 'preview-missing',
      name: '사진과 이용 규칙이 없는 장소',
      imageUrl: null,
      latitude: 37.545,
      longitude: 127.038,
      visitOrder: 4,
      isFinal: false,
      petPolicy: null,
    },
    {
      id: 'preview-broken-image',
      externalPlaceId: 'preview-broken-image',
      name: '사진 로딩 실패 확인 장소',
      imageUrl: '/images/preview-missing-photo.png',
      latitude: destination.latitude,
      longitude: destination.longitude,
      visitOrder: 5,
      isFinal: true,
      petPolicy: '목줄 착용 및 배변봉투 지참 필수',
    },
  ],
}

export default function RecommendedCoursePreview() {
  const router = useRouter()
  const [notice, setNotice] = useState(false)

  return (
    <main className="flex h-dvh justify-center overflow-hidden bg-warm-beige">
      <div className="flex h-full w-full max-w-[430px] flex-col overflow-hidden shadow-2xl">
        <div className="shrink-0 bg-sage-green-light px-4 py-2 text-center text-[11px] font-medium text-deep-brown">
          이전 디자인 복원 목업 · 장소 정보와 리뷰는 예시입니다
          {notice && <p role="status" className="mt-1">미리보기에서는 여행을 시작하지 않아요.</p>}
        </div>
        <MapRouteScreen
          course={course}
          origin={origin}
          destination={destination}
          pedestrianRoute={{
            totalDistanceMeters: 8831,
            totalTimeSeconds: 7055,
            path: [
              { lat: origin.latitude, lng: origin.longitude },
              ...course.places.map((place) => ({
                lat: place.latitude,
                lng: place.longitude,
              })),
            ],
          }}
          pedestrianRouteStatus="success"
          onBack={() => router.push('/map')}
          onStartTrip={() => setNotice(true)}
        />
      </div>
    </main>
  )
}
