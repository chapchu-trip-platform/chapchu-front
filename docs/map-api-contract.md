# 지도 페이지 백엔드 API 계약

## 문서 상태

- 상태: `VERIFIED WITH BLOCKERS`
- 확인일: 2026-09-01
- 기준 문서: <https://api.chapchu.site/docs/index.html>
- 프론트엔드 Base URL: `NEXT_PUBLIC_API_BASE_URL`

이 문서는 공개 백엔드 API 문서에서 확인된 사실과 지도 페이지 목표 흐름 사이의 차이를
관리한다. 공개 문서에 없는 endpoint, 요청 필드, 응답 필드는 구현 편의를 위해 추정하지
않는다.

## 목표 화면 흐름

```text
setup: 출발지·도착지 선택
  → options: 프론트에서 최소 도보 이동 시간 산정
  → options: 중간 거점 개수·여행 시간 선택
  → recommendation: 네 조건으로 자동 추천 경로 요청
  → route: 추천 경로 표시 및 여행 시작 활성화
  → progress: 여행 진행
  → end: 여행 종료
```

2026-09-01 사용자 결정에 따라 사용자가 후보 장소를 직접 선택·정렬하는 기존
`places` 단계는 목표 흐름에서 제외한다. 추천 요청의 논리 입력은 다음 네 가지다.

- 출발지
- 도착지
- 중간 거점 개수
- 여행 시간(프론트가 산정한 최소 도보 이동 시간 이상)

여행 시작 버튼은 추천 API가 성공하여 유효한 추천 경로를 받은 뒤에만 활성화한다.
API 실패 또는 빈 응답을 기존 mock 추천 경로로 대체하지 않는다.

2026-09-01 사용자 확인에 따라 `POST /courses`를 현재 코스 추천 API로 연결한다. 다만
공개 요청 계약은 위 네 가지 목표 입력을 모두 받지 않으므로, 지원되지 않는 도착지·거점
수·여행 시간 필드를 요청에 임의로 추가하지 않는다. 화면에는 이 제한을 명시한다.

## 최소 도보 이동 시간

2026-09-01 사용자 결정:

- TMAP 보행자 경로 안내 API를 사용한다.
- 브라우저는 내부 `POST /api/tmap/routes/pedestrian`만 호출한다.
- 서버 Route Handler가 `T_MAP_APIKEY`로 TMAP을 호출하고 `totalTimeSeconds`만 반환한다.
- 화면에서는 초 단위 결과를 H 단위로 올림한다.
- 여행 시간은 최소 H부터 `최소 H + 3H`까지 1H 단위로 선택한다.
- 중간 거점은 1개부터 최대 4개까지 선택한다.

## 자동 추천 요청 목표 JSON

다음은 제품 목표 입력 모델이다. 현재 `POST /courses` 요청 DTO와는 구분하며, 백엔드가
추가 입력을 지원하기 전까지 실제 요청으로 변환하지 않는다.

```ts
type RouteRecommendationCriteria = {
  origin: {
    name: string
    address: string
    latitude: number
    longitude: number
  }
  destination: {
    name: string
    address: string
    latitude: number
    longitude: number
  }
  waypointCount: number // 1..4
  travelTimeHours: number // minimumWalkingTimeHours..+3
}
```

다음은 geometry를 포함하는 향후 목표 UI model이다. 현재 `POST /courses` 응답에는 거리,
시간, 좌표, polyline이 없으므로 실제 응답 화면에 해당 값을 표시하지 않는다.

```ts
type MapRoute = {
  id: string
  totalDistanceMeters: number
  totalTravelTimeHours: number
  waypoints: Array<{
    id: string
    name: string
    address: string
    latitude: number
    longitude: number
    visitOrder: number
  }>
  polyline: Array<{
    latitude: number
    longitude: number
  }>
}
```

현재 연결에서는 문서화된 `CourseDto` 런타임 검증을 통과하고 `places`가 한 개 이상인
경우에만 여행 시작 버튼을 활성화한다. 거리·시간·polyline 조건은 해당 필드를 제공하는
계약이 추가된 뒤 적용한다.

## 확인된 Endpoint

### 주변 장소 조회

```http
GET /places/nearby?lat={lat}&lng={lng}&radiusMeters={radiusMeters}
```

| Query | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `lat` | number | 필수 | 검색 중심 위도 |
| `lng` | number | 필수 | 검색 중심 경도 |
| `radiusMeters` | number | 선택 | 검색 반경, 기본값 5000m |

응답은 장소 배열이다.

2026-08-31에 공개 문서의 예시 좌표로 인증 헤더 없이 호출했을 때 `200 OK`와 `[]`를
확인했다. 이는 현재 배포 환경의 관찰 결과이며, 정적 문서가 장소 API의 인증 정책을
명시적으로 보장하는 것은 아니다.

```ts
type NearbyPlaceDto = {
  externalPlaceId: string
  themeId: string | null
  placeName: string
  placeImageUrl: string | null
  address: string
  latitude: number
  longitude: number
  businessHours: string | null
  phoneNumber: string | null
  rating: number
  reviewNum: number
  visitNum: number
  petPolicy: unknown | null
  createdAt: string | null
  updatedAt: string | null
}
```

공개 예시에서 일부 값만 `null`이므로 실제 nullable 여부는 통합 시 런타임 응답과
백엔드 DTO를 다시 확인한다. `petPolicy`의 구체 구조도 현재 문서 예시만으로 확정하지
않는다.

### 장소 상세 조회

```http
GET /places/{externalPlaceId}
```

- `externalPlaceId`는 한국관광공사 `contentId`다.
- 응답 필드는 `NearbyPlaceDto`와 같은 형태로 문서화되어 있다.
- `places` 단계의 장소 상세 패널에서 사용할 수 있다.

### 코스 생성

```http
POST /courses
Authorization: Bearer {access_token}
Content-Type: application/json
```

```ts
type CreateCourseRequestDto = {
  lat: number
  lng: number
  radiusMeters: number
  travelDate: string
  startLocation: string
}

type CourseDto = {
  courseId: string
  travelDate: string
  startLocation: string
  places: Array<{
    coursePlaceId: string
    externalPlaceId: string
    placeName: string
    visitOrder: number
    finalPlace: boolean
  }>
}
```

이 API는 현재 위치 주변 장소를 서버에서 검색하고 추천·최적화하여 코스를 만드는
코스 추천 API다. 프론트는 선택한 출발지 좌표와 이름, 문서 예시와 같은
`radiusMeters: 5000`, 기기 로컬 기준 현재 날짜를 전송한다. 응답은 DTO 검증과 mapper를 거쳐
방문 순서대로 표시한다. 도착지, 중간 거점 개수, 여행 시간은 공개 요청 계약에 없으므로
전송하지 않는다. AI 추천 처리에는 요청별 60초 제한 시간을 적용하며, 만료된 access token의
갱신이 성공한 경우 최초 `401`에서 처리되지 않은 코스 생성 요청을 한 번만 재전송한다.

추천할 장소가 없으면 백엔드는 `404 Not Found`와
`{"code":"NOT_FOUND","message":"주변에 반려동물 동반 가능 장소가 없습니다."}`를
반환한다. 프론트는 이 정확한 응답을 endpoint 누락 오류가 아닌 추천 결과 empty 상태로
처리한다.

### 코스 조회

```http
GET /courses/{courseId}
Authorization: Bearer {access_token}
```

- 본인 코스만 조회한다.
- 응답은 `CourseDto` 형태다.

### 내 코스 목록 조회

```http
GET /users/me/courses
Authorization: Bearer {access_token}
```

목록 항목은 `courseId`, `travelDate`, `startLocation`, `isCompleted`, `placeCount`를
포함한다.

### 코스 장소 방문 체크인

```http
PATCH /course-places/{coursePlaceId}/visit
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "lat": 37.5665,
  "lng": 126.978
}
```

- 이미 체크인한 장소는 멱등하게 `200 OK`를 반환한다.
- 현재 위치가 장소에서 500m 이상 떨어지면 `400 Bad Request`다.
- 마지막 장소 체크인 시 코스가 완료 상태가 된다.

## 화면 단계별 사용 가능 여부

| 단계 | 필요한 계약 | 현재 상태 | 처리 원칙 |
| --- | --- | --- | --- |
| `setup` | 출발지·도착지 키워드 검색 | `READY` | 서버 전용 `POST /api/tmap/pois`에서 TMAP POI 검색 |
| `options` | 최소 도보 이동 시간 산정 | `READY` | TMAP 보행자 API, H 단위 올림 |
| `options` | 중간 거점 개수·여행 시간 선택 | `READY` | 거점 1..4, 최소 H..+3H |
| `recommendation` | `POST /courses` 코스 추천 | `READY` | 문서 필드만 전송, 목표 옵션 미지원 안내 |
| `route` | 추천 장소와 방문 순서 | `READY` | 검증된 `CourseDto.places` 표시 |
| `route` | polyline, 거리, 시간 | `BLOCKED` | 공개 response 필드 없음 |
| `route` | 여행 시작 활성화 | `READY` | 유효한 비어 있지 않은 코스 응답 필요 |
| `progress` | 방문 체크인 | `READY` | 코스 생성 후 받은 `coursePlaceId` 필요 |
| `end` | 코스 완료 | `PARTIAL` | 마지막 체크인에 의해 완료되지만 상세 종료 응답 없음 |

## 백엔드 확인 필요 사항

1. `POST /courses`가 도착지, 중간 거점 개수, 여행 시간을 받을 수 있도록 확장될지
2. 추천 장소 좌표와 route geometry/polyline, 총거리, 예상 시간 응답 계약
3. 장소 API의 공개 접근을 계속 보장할지와 `petPolicy`, nullable 필드의 정확한 스키마
4. 좌표가 요청 및 서버 접근 로그에 남는 것에 대한 운영·보안 정책

## 구현 규칙

- endpoint 상수는 `lib/api/endpoints.ts`에서만 관리한다.
- 백엔드 DTO는 feature API 계층에서 런타임 검증 후 화면 모델로 매핑한다.
- 최소 도보 이동 시간과 사용자가 선택한 여행 시간은 분리해 저장한다.
- 추천 요청 조건과 추천 응답 경로, 실제 진행 중인 여행을 같은 상태로 취급하지 않는다.
- `GET /places/nearby` 결과를 `SearchableLocation`과 혼용하지 않는다.
- `externalPlaceId`와 프론트 임시 ID를 혼용하지 않는다.
- 좌표는 비영속 Zustand 메모리에만 보관하고 로그·분석 이벤트에 남기지 않는다.
- `loading`, `success`, `empty`, `error` 상태를 모두 구현한다.
- 계약이 `BLOCKED`인 단계는 mock과 실제 API 모드를 명시적으로 분리한다.

## 출발지·도착지 검색

2026-09-03 사용자 결정에 따라 위치 검색 제공자는 TMAP 장소(POI) 통합 검색으로
확정했다. 브라우저는 내부 `POST /api/tmap/pois`를 호출하며 Next.js Route Handler가
서버 전용 `T_MAP_APIKEY`로 TMAP `GET /tmap/pois`를 호출한다. 전국 정확도순 검색을
사용하고, TMAP 응답은 `SearchableLocation` UI 모델로 축소한다. 보행자 출입구 좌표를
우선 사용하고 실패 시 정문, 중심 좌표 순으로 대체한다. 세부 계약은
[`docs/location-search-api.md`](./location-search-api.md)에서 관리한다.
