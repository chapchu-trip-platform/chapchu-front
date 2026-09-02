import type {
  PetOptions,
  ProfileMemoryAlbum,
  ProfilePet,
  ProfilePost,
  ProfileReview,
  ProfileStamp,
  ProfileSummary,
  WishlistPlace,
} from '@/features/profile/types/profile'

export const mockProfileSummary = {
  nickname: '초코맘',
  email: 'user@example.com',
  petCount: 3,
} satisfies ProfileSummary

export const mockProfilePets = [
  {
    id: 'pet-choco',
    petName: '초코',
    breedId: 7,
    breedName: '골든리트리버',
    size: 'MEDIUM',
    age: 3,
    activities: [
      { id: 'activity-walk', name: '산책' },
      { id: 'activity-water', name: '물놀이' },
    ],
  },
  {
    id: 'pet-bori',
    petName: '보리',
    breedId: 3,
    breedName: '포메라니안',
    size: 'SMALL',
    age: 5,
    activities: [{ id: 'activity-cafe', name: '카페' }],
  },
  {
    id: 'pet-maru',
    petName: '마루',
    breedId: 11,
    breedName: '진돗개',
    size: 'LARGE',
    age: 2,
    activities: [{ id: 'activity-hiking', name: '등산' }],
  },
] satisfies ProfilePet[]

export const mockProfilePetOptions = {
  breeds: [
    { id: 7, name: '골든리트리버' },
    { id: 3, name: '포메라니안' },
    { id: 11, name: '진돗개' },
  ],
  activities: [
    { id: 'activity-walk', name: '산책' },
    { id: 'activity-water', name: '물놀이' },
    { id: 'activity-cafe', name: '카페' },
    { id: 'activity-hiking', name: '등산' },
  ],
} satisfies PetOptions

export const mockProfileStamps = [
  { id: 'stamp-seoul', region: '서울', acquired: true, date: '2026.08.24', count: 8, color: '#6FAF8E', mascot: '해치' },
  { id: 'stamp-jeju', region: '제주', acquired: true, date: '2026.07.15', count: 3, color: '#F4A261', mascot: '돌하르방' },
  { id: 'stamp-gangwon', region: '강원', acquired: true, date: '2026.06.20', count: 2, color: '#8ECAE6', mascot: '반달곰' },
  { id: 'stamp-gyeonggi', region: '경기', acquired: false, date: null, count: 0, color: '#DDD4C0', mascot: '?' },
  { id: 'stamp-busan', region: '부산', acquired: false, date: null, count: 0, color: '#DDD4C0', mascot: '?' },
  { id: 'stamp-jeonnam', region: '전남', acquired: false, date: null, count: 0, color: '#DDD4C0', mascot: '?' },
] satisfies ProfileStamp[]

export const mockProfileMemoryAlbums = [
  {
    id: 'memory-haru',
    petName: '하루',
    breed: '포메라니안',
    period: '2019.03 ~ 2023.11',
    coverImage: '/images/album-cover.png',
    albumCount: 12,
    note: '영원히 기억할게, 하루야',
  },
  {
    id: 'memory-byeori',
    petName: '별이',
    breed: '말티즈',
    period: '2015.05 ~ 2022.09',
    coverImage: '/images/dog-hero.png',
    albumCount: 7,
    note: '함께한 모든 길이 행복했어',
  },
] satisfies ProfileMemoryAlbum[]

export const mockProfilePosts = [
  {
    id: 'post-trip-choco',
    title: '초코와 여행 기록',
    content: '강릉 바닷길을 함께 걸으며 즐거운 시간을 보냈어요.',
    viewCount: 128,
    recommendationCount: 24,
    commentCount: 9,
    nickname: '초코맘',
    photoUrl: null,
    createdAt: '2026-08-24T10:00:00+09:00',
  },
  {
    id: 'post-cafe-bori',
    title: '보리와 찾은 조용한 카페',
    content: '테라스가 넓고 물그릇도 준비된 반려견 동반 카페예요.',
    viewCount: 64,
    recommendationCount: 12,
    commentCount: 4,
    nickname: '초코맘',
    photoUrl: null,
    createdAt: '2026-08-19T14:30:00+09:00',
  },
] satisfies ProfilePost[]

export const mockProfileWishlist = [
  {
    placeId: 'place-forest',
    createdAt: '2026-08-28T09:00:00+09:00',
    placeName: '서울숲 반려견 산책길',
    address: '서울특별시 성동구 뚝섬로',
    rating: 4.8,
    reviewCount: 132,
  },
  {
    placeId: 'place-beach',
    createdAt: '2026-08-26T11:00:00+09:00',
    placeName: '안목해변 펫존',
    address: '강원특별자치도 강릉시 창해로',
    rating: 4.6,
    reviewCount: 87,
  },
] satisfies WishlistPlace[]

export const mockProfileBookmarks = [
  {
    id: 'bookmark-jeju',
    title: '제주 반려견 동반 여행 체크리스트',
    content: '이동장과 산책 용품을 미리 준비해요.',
    viewCount: 251,
    recommendationCount: 38,
    commentCount: 16,
    nickname: '제주멍멍이',
    photoUrl: null,
    createdAt: '2026-08-17T08:15:00+09:00',
  },
  {
    id: 'bookmark-camping',
    title: '대형견과 캠핑할 때 준비할 것',
    content: '긴 리드줄과 야외용 방석을 챙겨주세요.',
    viewCount: 144,
    recommendationCount: 27,
    commentCount: 11,
    nickname: '마루아빠',
    photoUrl: null,
    createdAt: '2026-08-11T19:20:00+09:00',
  },
] satisfies ProfilePost[]

export const mockProfileReviews = [
  {
    id: 'review-forest',
    placeId: 'place-forest',
    petId: 'pet-choco',
    rating: 4.8,
    contents: '그늘이 많고 산책로가 넓어서 초코와 걷기 좋았어요.',
    weather: 'SUNNY',
    recommendationCount: 14,
    createdAt: '2026-08-29T13:10:00+09:00',
    coursePlaceId: null,
  },
  {
    id: 'review-beach',
    placeId: 'place-beach',
    petId: 'pet-bori',
    rating: 4.5,
    contents: '이른 아침에는 모래가 시원하고 사람도 적어서 편안했어요.',
    weather: 'CLOUDY',
    recommendationCount: 8,
    createdAt: '2026-08-22T07:40:00+09:00',
    coursePlaceId: null,
  },
] satisfies ProfileReview[]
