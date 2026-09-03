export const posts = [
  {
    id: 1,
    title: '제주 올레길 강아지와 4박 5일 코스 완전정복',
    body: '제주 올레길을 강아지와 함께 4박 5일 동안 걷고 왔어요. 각 코스별 반려동물 동반 가능 여부와 최적 루트를 정리해봤습니다. 7코스가 가장 좋았고 개방감이 넘쳐서 강아지도 정말 좋아했어요!',
    author: '산책왕멍이',
    views: 3420,
    likes: 289,
    comments: 47,
    bookmarks: 156,
    date: '2024.07.02',
    image: '/images/album-cover.png',
    tab: 'HOT',
    pet: { name: '봄이', breed: '비글', size: '중형견', age: '4살' },
    course: {
      name: '제주 올레 7코스',
      distance: '17.6km',
      duration: '5시간 30분',
      places: ['제주올레 여행자센터', '법환포구', '월평포구', '월평 아왜낭목 쉼터'],
    },
  },
  {
    id: 2,
    title: '가평 펫 캠핑장 후기 — 반려견과 함께 최고였어요',
    body: '가평 자라섬 근처 펫 캠핑장을 다녀왔어요. 반려동물 전용 놀이터도 있고, 수영장도 있어서 강아지가 너무 좋아했습니다!',
    author: '캠핑러버루나',
    views: 1890,
    likes: 147,
    comments: 28,
    bookmarks: 89,
    date: '2024.06.30',
    image: '/images/place-park.png',
    tab: 'HOT',
    pet: { name: '루나', breed: '알래스칸 말라뮤트', size: '대형견', age: '5살' },
    course: {
      name: '가평 자라섬 캠핑 코스',
      distance: '8.3km',
      duration: '3시간 10분',
      places: ['가평역', '자라섬 남도 꽃정원', '자라섬 반려동물 놀이터', '자라섬 오토캠핑장'],
    },
  },
  {
    id: 3,
    title: '성수동 애견 카페 TOP 5 모음',
    body: '성수동 주변 애견 카페 5곳을 직접 다녀보고 정리한 후기입니다. 추천 순위도 함께 공유해요!',
    author: '서울산책로',
    views: 2140,
    likes: 198,
    comments: 34,
    bookmarks: 113,
    date: '2024.06.28',
    image: '/images/place-cafe.png',
    tab: '자유게시판',
    pet: { name: '코코', breed: '포메라니안', size: '소형견', age: '3살' },
    course: {
      name: '성수동 애견 카페 투어',
      distance: '4.2km',
      duration: '2시간 40분',
      places: ['서울숲', '성수 펫 카페', '뚝섬 산책로', '서울숲 반려견 놀이터', '성수 수제간식 공방'],
    },
  },
]

export const comments = [
  { author: '멍뭉이맘', text: '저도 가보고 싶어요! 어떤 코스가 제일 좋았나요?', time: '2시간 전', likes: 12, replies: [
    { author: '산책왕멍이', text: '7코스가 뷰도 예쁘고 강아지도 정말 좋아했어요!', time: '1시간 전', likes: 5 }
  ] },
  { author: '제주여행가', text: '저도 다음 달에 제주 가려고 했는데 정보 감사해요!', time: '5시간 전', likes: 8, replies: [] },
]
