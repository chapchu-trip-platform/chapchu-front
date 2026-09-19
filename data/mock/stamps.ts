import type { StampCollection } from '@/features/stamps/types/stamp'

/**
 * GET /users/me/stamps 응답 계약을 기준으로 만든 홈 화면용 임시 데이터입니다.
 * 실제 API 연동 전까지 UI 확인에만 사용합니다.
 */
export const mockStampCollection: StampCollection = {
  acquiredCount: 6,
  totalCount: 9,
  stamps: [
    {
      stampId: 'mock-stamp-gyeonggi',
      stampName: '경기',
      imageUrl: null,
      acquired: true,
      stampCount: 5,
      firstAcquiredAt: '2026-09-17T14:20:00+09:00',
    },
    {
      stampId: 'mock-stamp-gangwon',
      stampName: '강원',
      imageUrl: null,
      acquired: true,
      stampCount: 3,
      firstAcquiredAt: '2026-09-18T10:00:00+09:00',
    },
    {
      stampId: 'mock-stamp-chungbuk',
      stampName: '충북',
      imageUrl: null,
      acquired: false,
      stampCount: 0,
      firstAcquiredAt: null,
    },
    {
      stampId: 'mock-stamp-chungnam',
      stampName: '충남',
      imageUrl: null,
      acquired: true,
      stampCount: 2,
      firstAcquiredAt: '2026-08-25T11:30:00+09:00',
    },
    {
      stampId: 'mock-stamp-jeonbuk',
      stampName: '전북',
      imageUrl: null,
      acquired: false,
      stampCount: 0,
      firstAcquiredAt: null,
    },
    {
      stampId: 'mock-stamp-jeonnam',
      stampName: '전남',
      imageUrl: null,
      acquired: true,
      stampCount: 1,
      firstAcquiredAt: '2026-09-04T09:15:00+09:00',
    },
    {
      stampId: 'mock-stamp-gyeongbuk',
      stampName: '경북',
      imageUrl: null,
      acquired: true,
      stampCount: 2,
      firstAcquiredAt: '2026-09-08T16:40:00+09:00',
    },
    {
      stampId: 'mock-stamp-gyeongnam',
      stampName: '경남',
      imageUrl: null,
      acquired: false,
      stampCount: 0,
      firstAcquiredAt: null,
    },
    {
      stampId: 'mock-stamp-jeju',
      stampName: '제주',
      imageUrl: null,
      acquired: true,
      stampCount: 1,
      firstAcquiredAt: '2026-09-12T13:05:00+09:00',
    },
  ],
}
