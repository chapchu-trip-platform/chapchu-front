// Mock data for PawRoute app

export const mockNearbyPlaces = [
  {
    id: '1',
    name: '성수 펫 카페',
    address: '서울 성동구 성수동',
    image: '/images/place-cafe.png',
    rating: 4.8,
    reviews: 124,
    distance: '0.3km',
    tags: ['카페', '반려동물 동반'],
    hours: '09:00 - 22:00',
    petFriendlyScore: 95,
    weatherScore: 88,
    reason: '반려동물 친화적 시설과 전용 물그릇이 준비되어 있어요.',
  },
  {
    id: '2',
    name: '서울숲 공원',
    address: '서울 성동구 뚝섬로',
    image: '/images/place-park.png',
    rating: 4.9,
    reviews: 320,
    distance: '0.8km',
    tags: ['공원', '산책 코스'],
    hours: '24시간',
    petFriendlyScore: 98,
    weatherScore: 92,
    reason: '넓은 오프리시 구역과 산책 코스가 완벽해요.',
  },
  {
    id: '3',
    name: '한강 펫 레스토랑',
    address: '서울 용산구 이촌동',
    image: '/images/place-restaurant.png',
    rating: 4.6,
    reviews: 87,
    distance: '1.2km',
    tags: ['레스토랑', '반려동물 동반'],
    hours: '11:00 - 21:00',
    petFriendlyScore: 90,
    weatherScore: 85,
    reason: '반려견 메뉴가 있고 테라스 좌석이 있어요.',
  },
]

export const mockHotPosts = [
  {
    id: '1',
    title: '제주 올레길 강아지와 4박 5일 코스 완전정복',
    author: '산책왕멍이',
    views: 3420,
    likes: 289,
    comments: 47,
    bookmarks: 156,
    date: '2일 전',
    image: '/images/album-cover.png',
  },
  {
    id: '2',
    title: '가평 펫 캠핑장 후기 — 반려견과 함께 최고였어요',
    author: '캠핑러버루나',
    views: 1890,
    likes: 147,
    comments: 28,
    bookmarks: 89,
    date: '3일 전',
    image: '/images/place-park.png',
  },
  {
    id: '3',
    title: '성수동 애견 카페 TOP 5 모음',
    author: '서울산책로',
    views: 2140,
    likes: 198,
    comments: 34,
    bookmarks: 113,
    date: '5일 전',
    image: '/images/place-cafe.png',
  },
]

export const mockWaypoints = [
  {
    id: '1',
    place: mockNearbyPlaces[0],
    arrival: '09:30',
    departure: '11:00',
    note: '골든이가 물그릇을 정말 좋아했어요! 직원분들이 너무 친절했습니다.',
    rating: 5,
  },
  {
    id: '2',
    place: mockNearbyPlaces[1],
    arrival: '11:30',
    departure: '13:45',
    note: '넓은 잔디밭에서 맘껏 뛰어놀았어요. 다음에 또 와야겠다!',
    rating: 5,
  },
  {
    id: '3',
    place: mockNearbyPlaces[2],
    arrival: '14:15',
    departure: '16:00',
    note: '뷰가 정말 예뻤어요. 음식도 맛있고 반려견 메뉴도 있었어요.',
    rating: 4,
  },
]

export const mockMyPosts = [
  {
    id: '1',
    title: '월포해변에서 골든이와의 추억',
    excerpt: '바다에서 뛰어노는 골든이의 모습이 정말 사랑스러웠어요...',
    date: '2024.06.15',
    views: 245,
    likes: 34,
    image: '/images/album-cover.png',
  },
  {
    id: '2',
    title: '강남 펫 쇼핑몰 투어',
    excerpt: '반려동물 용품을 구경하며 즐거운 쇼핑 시간을 보냈습니다...',
    date: '2024.06.10',
    views: 156,
    likes: 23,
    image: '/images/place-cafe.png',
  },
]

export const mockWishlist = [
  {
    id: '1',
    name: '제주 이중섭 거리',
    address: '제주 서귀포시 이중섭로',
    rating: 4.7,
    distance: '서울에서 약 450km',
  },
  {
    id: '2',
    name: '남이섬 사슴숲',
    address: '경기 남이섬',
    rating: 4.9,
    distance: '서울에서 약 30km',
  },
  {
    id: '3',
    name: '낙산공원 산책로',
    address: '서울 성북구',
    rating: 4.6,
    distance: '서울에서 약 3km',
  },
]

export const mockBookmarks = [
  {
    id: '1',
    title: '강아지 예방접종 시즌별 가이드',
    author: '펫헬스케어',
    date: '1주일 전',
  },
  {
    id: '2',
    title: '여름 여행 시 반려견 안전 관리법',
    author: '펫안전센터',
    date: '2주일 전',
  },
  {
    id: '3',
    title: '국내 펫친화 펜션 TOP 10',
    author: '펫투어가이드',
    date: '3주일 전',
  },
]

// ─── Album list (summary cards) ──────────────────────────────────────────────

export const mockAlbums = [
  {
    id: 'A1',
    title: '골든이와 서울 성수 여행',
    date: '2024.07.04',
    weather: '맑음',
    temperature: 28,
    distance: '12.4km',
    duration: '4시간 32분',
    transport: '자차',
    stops: 3,
    rating: 5,
    photoCount: 28,
    pet: '골든이 · 골든 리트리버',
    image: '/images/album-cover.png',
  },
  {
    id: 'A2',
    title: '제주 올레길 코스',
    date: '2024.06.15',
    weather: '구름 조금',
    temperature: 24,
    distance: '24.7km',
    duration: '7시간 14분',
    transport: '도보',
    stops: 5,
    rating: 5,
    photoCount: 43,
    pet: '골든이 · 골든 리트리버',
    image: '/images/place-park.png',
  },
  {
    id: 'A3',
    title: '가평 자라섬 캠핑 여행',
    date: '2024.05.20',
    weather: '맑음',
    temperature: 21,
    distance: '8.3km',
    duration: '3시간 10분',
    transport: '자차',
    stops: 2,
    rating: 4,
    photoCount: 19,
    pet: '골든이 · 골든 리트리버',
    image: '/images/place-cafe.png',
  },
]

export type AlbumSummary = typeof mockAlbums[0]

// ─── Per-album waypoint detail ────────────────────────────────────────────────

export const mockAlbumWaypoints: Record<string, {
  order: number
  name: string
  address: string
  arrival: string
  departure: string
  note: string
  rating: number
  petFriendlyScore: number
  image: string
  photos: { id: string; url: string }[]
}[]> = {
  A1: [
    {
      order: 1,
      name: '성수 펫 카페',
      address: '서울 성동구 성수동',
      arrival: '09:30',
      departure: '11:00',
      note: '직원분들이 너무 친절했어요! 반려견 전용 트릿도 있었고 그늘막 좌석이 넓어서 쉬기 좋았습니다.',
      rating: 5,
      petFriendlyScore: 95,
      image: '/images/place-cafe.png',
      photos: [
        { id: 'p1', url: '/images/place-cafe.png' },
        { id: 'p2', url: '/images/dog-hero.png' },
      ],
    },
    {
      order: 2,
      name: '서울숲 공원',
      address: '서울 성동구 뚝섬로',
      arrival: '11:30',
      departure: '13:45',
      note: '넓은 잔디밭에서 맘껏 뛰어놀았어요. 오프리시 구역이 있어서 목줄 없이 달릴 수 있었습니다!',
      rating: 5,
      petFriendlyScore: 98,
      image: '/images/place-park.png',
      photos: [
        { id: 'p3', url: '/images/place-park.png' },
        { id: 'p4', url: '/images/album-cover.png' },
      ],
    },
    {
      order: 3,
      name: '한강 펫 레스토랑',
      address: '서울 용산구 이촌동',
      arrival: '14:15',
      departure: '16:00',
      note: '뷰가 정말 예뻤어요. 음식도 맛있고 반려견 전용 메뉴도 있었어요. 강 노을이 환상적이었습니다.',
      rating: 4,
      petFriendlyScore: 90,
      image: '/images/place-restaurant.png',
      photos: [
        { id: 'p5', url: '/images/place-restaurant.png' },
      ],
    },
  ],
  A2: [
    {
      order: 1,
      name: '제주 공항 렌터카',
      address: '제주 제주시 공항로',
      arrival: '08:00',
      departure: '09:00',
      note: '렌터카 픽업 완료. 본격적인 제주 올레 시작!',
      rating: 4,
      petFriendlyScore: 70,
      image: '/images/place-cafe.png',
      photos: [],
    },
    {
      order: 2,
      name: '성산일출봉',
      address: '제주 서귀포시 성산읍',
      arrival: '09:45',
      departure: '11:30',
      note: '골든이와 함께 정상까지! 뷰가 압도적이었어요.',
      rating: 5,
      petFriendlyScore: 85,
      image: '/images/place-park.png',
      photos: [{ id: 'p6', url: '/images/place-park.png' }],
    },
    {
      order: 3,
      name: '우도 해변',
      address: '제주 제주시 우도면',
      arrival: '12:30',
      departure: '14:45',
      note: '바다에서 첫 수영! 골든이가 너무 신나해서 놀랐어요.',
      rating: 5,
      petFriendlyScore: 92,
      image: '/images/album-cover.png',
      photos: [{ id: 'p7', url: '/images/album-cover.png' }],
    },
  ],
  A3: [
    {
      order: 1,
      name: '자라섬 오토캠핑장',
      address: '경기 가평군 가평읍',
      arrival: '10:00',
      departure: '15:00',
      note: '캠핑장 입지가 정말 좋았어요. 강변 뷰에 잔디밭이 넓어서 골든이가 뛰어다녔어요.',
      rating: 4,
      petFriendlyScore: 93,
      image: '/images/place-park.png',
      photos: [{ id: 'p8', url: '/images/place-park.png' }],
    },
    {
      order: 2,
      name: '가평 펫 카페',
      address: '경기 가평군 읍내리',
      arrival: '15:30',
      departure: '17:00',
      note: '캠핑 후 따뜻한 커피 한 잔. 반려견 입장이 무료였어요.',
      rating: 4,
      petFriendlyScore: 88,
      image: '/images/place-cafe.png',
      photos: [{ id: 'p9', url: '/images/place-cafe.png' }],
    },
  ],
}

// ─── Course detail (passed to CourseDetailScreen) ────────────────────────────

export const mockCourseDetails: Record<string, {
  from: string
  to: string
  distance: string
  duration: string
  transport: string
  weather: string
  temperature: number
  overallRating: number
  totalPhotos: number
  waypoints: typeof mockAlbumWaypoints['A1']
}> = {
  A1: {
    from: '서울 강남구 출발',
    to: '서울 용산구 한강',
    distance: '12.4km',
    duration: '4시간 32분',
    transport: '자차',
    weather: '맑음',
    temperature: 28,
    overallRating: 5,
    totalPhotos: 28,
    waypoints: mockAlbumWaypoints.A1,
  },
  A2: {
    from: '제주 국제공항',
    to: '제주 서귀포시 올레길',
    distance: '24.7km',
    duration: '7시간 14분',
    transport: '도보 + 렌터카',
    weather: '구름 조금',
    temperature: 24,
    overallRating: 5,
    totalPhotos: 43,
    waypoints: mockAlbumWaypoints.A2,
  },
  A3: {
    from: '경기 가평군 자라섬',
    to: '경기 가평군 읍내리',
    distance: '8.3km',
    duration: '3시간 10분',
    transport: '자차',
    weather: '맑음',
    temperature: 21,
    overallRating: 4,
    totalPhotos: 19,
    waypoints: mockAlbumWaypoints.A3,
  },
}

// Keep legacy export for any remaining references
export const mockCourseDetail = mockCourseDetails.A1

export const mockUserProfile = {
  nickname: '산책왕멍이',
  email: 'walker@pawroute.com',
  bio: '골든 리트리버와 함께 전국 여행 중입니다.',
  avatar: '/images/dog-hero.png',
  follower: 1245,
  following: 340,
  tripCount: 23,
  postCount: 18,
}
