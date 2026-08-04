# PawRoute 🐾

반려동물과 함께하는 따뜻한 여행 다이어리 모바일 웹앱 프로토타입

## 개요

PawRoute는 반려동물 주인들이 여행을 계획하고, 기록하고, 공유할 수 있는 통합 플랫폼입니다. 지도 기반의 경로 추천, 반려동물 친화적 장소 검색, 여행 기록 및 커뮤니티 기능을 제공합니다.

## 주요 기능

### 1. 초기 가입 흐름
- Splash → Onboarding → Login → Signup → Home
- 사용자 기본 정보(닉네임, 선호 테마, 지역) 입력
- 반려동물 등록 및 관리

### 1-1. 로그인 (chapchu-auth 연동)

구글 로그인 한 번으로 가입까지 끝난다. **별도의 회원가입 API는 없다.** 처음 로그인하는 계정은
인증 서버가 그 자리에서 `users`에 등록하며, 이때 닉네임은 비어 있다.

```
로그인 버튼 → auth.chapchu.site/oauth2/authorize (전체 페이지 이동)
            → 구글 로그인 → (미가입이면 자동 등록)
            → /login/callback?code=... → 토큰 교환
            → GET /users/me
               · nickname 없음 → Signup(닉네임 등록)
               · nickname 있음 → Home
```

관련 코드는 `lib/auth.ts` 한 곳에 모여 있다. 서버 명세는
[auth.chapchu.site/docs](https://auth.chapchu.site/docs/index.html) 참고.

**주의**
- `redirect_uri`는 인증 서버에 등록된 값과 **정확히 일치**해야 한다. 다르면 에러 없이 구글 로그인만
  거친 뒤 콜백까지 오지 못한다. 새 주소에서 쓰려면 chapchu-auth의 `FRONT_REDIRECT_URI`에 먼저 추가하라.
- 현재 refresh token이 발급되지 않는다 (chapchu-auth 이슈 #9). access token 30분이 지나면
  다시 로그인해야 한다.
- 카카오/애플 버튼은 서버 연동이 없어 비활성 상태다.
- "로그인 없이 둘러보기"는 목업 화면 확인용 경로이며 실제 인증이 아니다.

### 2. 여행 계획 (지도 플로우)
- **Route Setup**: 출발지/목적지 선택 또는 주소 직접 입력
- **Recommended Route**: 중간 거점 선택 (반려동물/날씨 적합도 표시)
- **Travel Progress**: 실시간 여행 추적 및 노트 작성
- **Trip End**: 여행 완료, 앨범 저장, 게시글 공유

### 3. 중간 거점 선택
- 반려동물 친화도 배지 (0-100점)
- 날씨 적합도 배지
- 운영시간 주의 경고
- 추천 이유 카드
- "이 장소 선택하기" 기능

### 4. 여행 노트 저장
- 각 거점에서 사진 및 노트 작성
- 여행 종료 시 "거점별 여행 노트" 자동 표시
- 별점 평가

### 5. 게시글 공유
- 여행 후기 작성 (제목, 내용)
- 대표 사진 선택
- 게시판 선택 (전체, 여행후기, 팁/정보, 장소리뷰, 포토)
- 위치 공개 범위 선택 (정확한 위치/대략적 지역/비공개)
- 동행 반려동물, 코스 정보 자동 포함

### 6. 앨범 상세
- 여행 기록 조회
- 코스별 사진 열람
- 코스 상세: 출발지→도착지, 거리, 소요시간, 이동 경로, 사진 위치 정보

### 7. 내 정보 (My Page)
- **반려동물 관리**: 펫 등록/수정/삭제, 추억 앨범
- **스탬프**: 지역별 획득 현황
- **추억 앨범**: 추억의 반려동물 기념
- **닉네임 변경**: 프로필 닉네임 수정
- **사용자 정보 수정**: 이메일, 소개 수정
- **내가 작성한 글**: 게시글 목록 조회
- **장소 위시리스트**: 방문 희망 장소
- **게시글 북마크**: 저장한 글

### 8. 오류 상태 화면
- 위치 권한 요청/거부 (대체 경로: 주소 직접 입력)
- 날씨 정보 로드 실패
- 추천 경로 없음
- 주변 반려동물 동반 장소 없음
- 사진 업로드 실패
- 세션 만료

### 9. 커뮤니티 보드
- 여행 후기 피드
- 좋아요, 댓글, 북마크 기능

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Image**: Next.js Image

## 디자인 시스템

### 색상 팔레트
- **Primary**: Sage Green (#6FAF8E)
- **Accent**: Soft Orange (#F4A261)
- **Background**: Warm Beige (#F7F1E7)
- **Text**: Deep Brown (#3A2F2A)
- **Secondary**: Warm Gray (#7A706A)
- **Sky**: Sky Blue (#8ECAE6)
- **Danger**: Danger Red (#E76F51)

### 타이포그래피
- **Font Family**: Inter (Google Fonts)
- **Body**: 14px line-height 1.6
- **Heading**: Bold weight

### 컴포넌트 Radius
- **Cards**: 20px (rounded-card)
- **Buttons**: 16px (rounded-btn)

## 프로젝트 구조

```
/components
  /screens          # 각 화면 컴포넌트
  /ui               # UI 기본 컴포넌트
  bottom-nav.tsx    # 하단 네비게이션
  top-bar.tsx       # 상단 바
  mobile-shell.tsx  # 모바일 쉘

/app
  layout.tsx        # 루트 레이아웃
  page.tsx          # 메인 라우터 (상태 관리)
  globals.css       # 글로벌 스타일

/data
  mock.ts           # 더미 데이터

/types
  index.ts          # 타입 정의

/lib
  utils.ts          # 유틸리티 함수

/public
  /images           # 이미지 자산
```

## 상태 관리

- **Client-side state**: React `useState`
- **App Screen**: splash → onboarding → login → signup → main
- **Map Flow**: setup → route → progress → end (또는 error, sharing)
- **Active Tab**: home, map, board, album, profile
- **Modal Overlays**: Error screen, Post share sheet, Course detail, Profile settings

## 더미 데이터

모든 데이터는 `data/mock.ts`에서 관리:
- `mockNearbyPlaces`: 주변 장소
- `mockHotPosts`: 인기 게시글
- `mockWaypoints`: 여행 거점
- `mockMyPosts`: 내 게시글
- `mockWishlist`: 위시리스트
- `mockBookmarks`: 북마크
- `mockAlbums`: 앨범
- `mockUserProfile`: 사용자 프로필

## 라우팅 흐름

```
Splash (2.2s auto-advance)
  ↓
Onboarding (Skip or complete)
  ↓
Login (Test account or signup)
  ↓
Signup (User info + Pet registration)
  ↓
Main App
  ├─ Home Tab
  │   └─ 여행 시작 → Map Setup
  ├─ Community Tab
  │   └─ 게시글 피드
  ├─ Album Tab
  │   └─ 여행 기록 → Course Detail
  └─ Profile Tab
      └─ My Page
          ├─ Pets
          ├─ Stamps
          ├─ Memory Album
          ├─ Nickname Change
          ├─ User Info Edit
          ├─ My Posts
          ├─ Wishlist
          └─ Bookmarks
```

## 개발 시작

```bash
# 프로젝트 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 빌드
pnpm build

# 프로덕션 시작
pnpm start

# Lint 검사
pnpm lint
```

## 주요 개선사항

✅ 초기 가입 플로우 연결  
✅ 중간 거점 선택 UI 고도화  
✅ 여행 노트 저장 흐름 강화  
✅ 오류 상태 화면 추가  
✅ 게시글 공유 기능  
✅ 앨범 상세 화면  
✅ My Page 하위 화면  
✅ 개발 구조 정리 (types, mock data)  

## 라이선스

MIT License
