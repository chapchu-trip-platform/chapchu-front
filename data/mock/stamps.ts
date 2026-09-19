import type { StampCollection } from '@/features/stamps/types/stamp'

/**
 * GET /users/me/stamps 응답 계약을 기준으로 만든 홈 화면용 임시 데이터입니다.
 * 서버는 이미지 URL을 내려주지 않으며, 17개 시·도를 모두 포함합니다.
 * 실제 API 연동 전까지 UI 확인에만 사용합니다.
 */
export const mockStampCollection: StampCollection = {
  acquiredCount: 6,
  totalCount: 17,
  stamps: [
    {
      stampId: 'mock-stamp-seoul',
      stampName: '서울',
      acquired: false,
      stampCount: 0,
      firstAcquiredAt: null,
    },
    {
      stampId: 'mock-stamp-busan',
      stampName: '부산',
      acquired: false,
      stampCount: 0,
      firstAcquiredAt: null,
    },
    {
      stampId: 'mock-stamp-daegu',
      stampName: '대구',
      acquired: false,
      stampCount: 0,
      firstAcquiredAt: null,
    },
    {
      stampId: 'mock-stamp-incheon',
      stampName: '인천',
      acquired: false,
      stampCount: 0,
      firstAcquiredAt: null,
    },
    {
      stampId: 'mock-stamp-gwangju',
      stampName: '광주',
      acquired: false,
      stampCount: 0,
      firstAcquiredAt: null,
    },
    {
      stampId: 'mock-stamp-daejeon',
      stampName: '대전',
      acquired: false,
      stampCount: 0,
      firstAcquiredAt: null,
    },
    {
      stampId: 'mock-stamp-ulsan',
      stampName: '울산',
      acquired: false,
      stampCount: 0,
      firstAcquiredAt: null,
    },
    {
      stampId: 'mock-stamp-sejong',
      stampName: '세종',
      acquired: false,
      stampCount: 0,
      firstAcquiredAt: null,
    },
    {
      stampId: 'mock-stamp-gyeonggi',
      stampName: '경기',
      acquired: true,
      stampCount: 5,
      firstAcquiredAt: '2026-09-17T14:20:00+09:00',
    },
    {
      stampId: 'mock-stamp-gangwon',
      stampName: '강원',
      acquired: true,
      stampCount: 3,
      firstAcquiredAt: '2026-09-18T10:00:00+09:00',
    },
    {
      stampId: 'mock-stamp-chungbuk',
      stampName: '충북',
      acquired: false,
      stampCount: 0,
      firstAcquiredAt: null,
    },
    {
      stampId: 'mock-stamp-chungnam',
      stampName: '충남',
      acquired: true,
      stampCount: 2,
      firstAcquiredAt: '2026-08-25T11:30:00+09:00',
    },
    {
      stampId: 'mock-stamp-jeonbuk',
      stampName: '전북',
      acquired: false,
      stampCount: 0,
      firstAcquiredAt: null,
    },
    {
      stampId: 'mock-stamp-jeonnam',
      stampName: '전남',
      acquired: true,
      stampCount: 1,
      firstAcquiredAt: '2026-09-04T09:15:00+09:00',
    },
    {
      stampId: 'mock-stamp-gyeongbuk',
      stampName: '경북',
      acquired: true,
      stampCount: 2,
      firstAcquiredAt: '2026-09-08T16:40:00+09:00',
    },
    {
      stampId: 'mock-stamp-gyeongnam',
      stampName: '경남',
      acquired: false,
      stampCount: 0,
      firstAcquiredAt: null,
    },
    {
      stampId: 'mock-stamp-jeju',
      stampName: '제주',
      acquired: true,
      stampCount: 1,
      firstAcquiredAt: '2026-09-12T13:05:00+09:00',
    },
  ],
}
