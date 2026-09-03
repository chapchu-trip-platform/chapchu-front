// Test fixtures only. Do not import into runtime screens or API code.
import type {
  PetOptions,
  ProfilePet,
  ProfilePost,
  ProfileReview,
  ProfileSummary,
  WishlistPlace,
} from '@/features/profile/types/profile'

export const PROFILE_MOCK_COUNTS = {
  pets: 12,
  posts: 24,
  wishlist: 24,
  bookmarks: 24,
  reviews: 24,
} as const

export const mockProfilePetOptions: PetOptions = {
  breeds: [
    { id: 7, name: '골든리트리버' },
    { id: 3, name: '포메라니안' },
    { id: 11, name: '진돗개' },
    { id: 15, name: '말티즈' },
    { id: 18, name: '비숑 프리제' },
    { id: 22, name: '웰시코기' },
  ],
  activities: [
    { id: 'activity-walk', name: '산책' },
    { id: 'activity-water', name: '물놀이' },
    { id: 'activity-cafe', name: '카페' },
    { id: 'activity-hiking', name: '등산' },
    { id: 'activity-camping', name: '캠핑' },
    { id: 'activity-drive', name: '드라이브' },
  ],
}

const petNames = [
  '초코',
  '보리',
  '마루',
  '두부',
  '콩이',
  '호두',
  '구름',
  '몽이',
  '탄이',
  '봄이',
  '별이',
  '라떼',
] as const

const petSizes: ProfilePet['size'][] = ['SMALL', 'MEDIUM', 'LARGE']

export const mockProfilePets: ProfilePet[] = Array.from(
  { length: PROFILE_MOCK_COUNTS.pets },
  (_, index) => {
    const breed = mockProfilePetOptions.breeds[index % mockProfilePetOptions.breeds.length]
    const activity = mockProfilePetOptions.activities[index % mockProfilePetOptions.activities.length]
    const nextActivity =
      mockProfilePetOptions.activities[(index + 1) % mockProfilePetOptions.activities.length]

    return {
      id: `pet-${String(index + 1).padStart(2, '0')}`,
      petName: petNames[index % petNames.length],
      breedId: breed.id,
      breedName: breed.name,
      size: petSizes[index % petSizes.length],
      age: (index % 9) + 1,
      activities: [activity, nextActivity],
    }
  }
)

export const mockProfileSummary = {
  nickname: '초코맘',
  email: 'user@example.com',
  petCount: mockProfilePets.length,
} satisfies ProfileSummary

const postSubjects = ['바닷길 여행', '숲길 산책', '펫 카페 방문', '캠핑 기록'] as const

export const mockProfilePosts: ProfilePost[] = Array.from(
  { length: PROFILE_MOCK_COUNTS.posts },
  (_, index) => ({
    id: `post-${String(index + 1).padStart(2, '0')}`,
    title: index === 0 ? '초코와 여행 기록' : `${petNames[index % petNames.length]}와 ${postSubjects[index % postSubjects.length]} ${index + 1}`,
    content: `${index + 1}번째 반려견 동반 여행에서 찾은 장소와 준비물을 기록했어요. 산책 동선과 쉬어가기 좋은 지점도 함께 소개합니다.`,
    viewCount: 64 + index * 17,
    recommendationCount: 8 + index * 2,
    commentCount: 2 + (index % 12),
    nickname: '초코맘',
    photoUrl: null,
    createdAt: `2026-08-${String(24 - (index % 20)).padStart(2, '0')}T10:00:00+09:00`,
  })
)

const placeNames = ['반려견 산책길', '해변 펫존', '숲속 캠핑장', '테라스 카페'] as const
const placeCities = ['서울특별시', '강원특별자치도', '제주특별자치도', '부산광역시'] as const

export const mockProfileWishlist: WishlistPlace[] = Array.from(
  { length: PROFILE_MOCK_COUNTS.wishlist },
  (_, index) => ({
    placeId: `wishlist-place-${String(index + 1).padStart(2, '0')}`,
    createdAt: `2026-08-${String(28 - (index % 20)).padStart(2, '0')}T09:00:00+09:00`,
    placeName: `${placeCities[index % placeCities.length]} ${placeNames[index % placeNames.length]} ${index + 1}`,
    address: `${placeCities[index % placeCities.length]} 여행로 ${index + 1}길`,
    rating: 4 + (index % 10) / 10,
    reviewCount: 32 + index * 7,
  })
)

const bookmarkAuthors = ['제주멍멍이', '마루아빠', '두부누나', '보리엄마'] as const

export const mockProfileBookmarks: ProfilePost[] = Array.from(
  { length: PROFILE_MOCK_COUNTS.bookmarks },
  (_, index) => ({
    id: `bookmark-${String(index + 1).padStart(2, '0')}`,
    title: `${postSubjects[index % postSubjects.length]} 준비 체크리스트 ${index + 1}`,
    content: '이동장, 물그릇, 긴 리드줄과 야외용 방석을 미리 준비해요.',
    viewCount: 120 + index * 13,
    recommendationCount: 12 + index * 2,
    commentCount: 3 + (index % 10),
    nickname: bookmarkAuthors[index % bookmarkAuthors.length],
    photoUrl: null,
    createdAt: `2026-07-${String(28 - (index % 20)).padStart(2, '0')}T08:15:00+09:00`,
  })
)

const reviewWeather: ProfileReview['weather'][] = ['SUNNY', 'CLOUDY', 'RAINY', 'SNOWY']

export const mockProfileReviews: ProfileReview[] = Array.from(
  { length: PROFILE_MOCK_COUNTS.reviews },
  (_, index) => ({
    id: `review-${String(index + 1).padStart(2, '0')}`,
    placeId: mockProfileWishlist[index % mockProfileWishlist.length].placeId,
    petId: mockProfilePets[index % mockProfilePets.length].id,
    rating: 4 + (index % 10) / 10,
    contents: `${index + 1}번째 방문 후기예요. 산책로가 넓고 쉬어갈 공간이 있어 반려견과 편안하게 머물렀어요.`,
    weather: reviewWeather[index % reviewWeather.length],
    recommendationCount: 4 + index,
    createdAt: `2026-08-${String(29 - (index % 20)).padStart(2, '0')}T13:10:00+09:00`,
    coursePlaceId: null,
  })
)
