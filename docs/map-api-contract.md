# 지도 페이지 백엔드 API 계약

## 문서 상태

- 상태: `VERIFIED WITH BLOCKERS`
- 확인일: 2026-09-15
- 기준 문서: <https://api.chapchu.site/docs/index.html>
- 프론트엔드 Base URL: `NEXT_PUBLIC_API_BASE_URL`

이 문서는 공개 백엔드 API 문서에서 확인된 사실과 지도 페이지 목표 흐름 사이의 차이를
관리한다. 공개 문서에 없는 endpoint, 요청 필드, 응답 필드는 구현 편의를 위해 추정하지
않는다.

## 목표 화면 흐름

```text
setup: 출발지·도착지 선택
  → options: 반려동물 선택
  → places: 입력한 도착 지역 기준 최종 도착지 후보 5곳 조회 및 한 곳 선택
  → route: 선택 확정 즉시 서버가 생성한 코스 확인 및 여행 시작
  → progress: 여행 진행
  → end: 여행 종료
```

2026-09-15에 확인한 최신 흐름에서는 먼저 `POST /recommended-places`로 최종 도착지
후보를 보여주고, 사용자가 후보 중 정확히 한 곳을 선택한다. 처음 검색한 도착지는
후보 탐색의 중심 좌표로만 사용한다. 선택을 확정하면 `POST /courses`의 단수형
`destination` 필드에 선택한 추천 장소 전체 객체를 보내며, 서버가 중간 스탑을
큐레이션하고 코스를 생성한다.

- 반려동물
- 출발지
- 대략적인 도착 지역
- 추천 후보 중 선택한 최종 도착지 한 곳

여행 시작 버튼은 추천 API가 성공하여 유효한 추천 경로를 받은 뒤에만 활성화한다.
API 실패 또는 빈 응답을 기존 mock 추천 경로로 대체하지 않는다.

`intermediateStopCount`는 요청 계약에서 제거됐다. 중간 스탑의 개수와 구성은
서버가 판단하며 프론트에서 별도 개수를 전송하지 않는다.

## 추천 장소 선택

- 도착 지역 좌표를 기준으로 반경 5km, `limit=5`로 요청한다.
- 반려동물·날씨·선호 활동이 반영된 순서를 그대로 보여준다.
- 사용자는 최종 도착지 후보 중 정확히 한 곳을 선택한다.
- 다른 후보를 누르면 기존 선택이 새 후보로 교체된다.
- 선택 전에는 코스 생성 버튼을 비활성화한다.

## 자동 추천 요청 목표 JSON

다음은 제품 입력 모델이며 `POST /courses` 요청으로 변환한다.

```ts
type PlaceRecommendationCriteria = {
  petId: string
  lat: number
  lng: number
  radiusMeters: 5000
  limit: 5
}
```

다음은 지도 화면에서 사용하는 경로 모델이다. `POST /courses` 응답의 방문 순서와 좌표를
기준으로 같은 출처의 TMAP 보행자 길찾기를 추가 호출해 거리, 예상 시간, 경로선을 만든다.

```ts
type MapRoute = {
  totalDistanceMeters: number
  totalTimeSeconds: number
  path: Array<{
    lat: number
    lng: number
  }>
}
```

현재 연결에서는 추천 장소 목록을 런타임 검증한 뒤 선택 화면으로 이동한다.
선택한 최종 도착지를 서버에 보내고, 반환된 코스의 방문 순서를 그대로 표시한 뒤
여행 시작 버튼을 활성화한다. 장소 이미지·좌표·정책은 응답 모델에 보존하며,
거리·시간·polyline은 Chapchu 코스 응답에 추정해 넣지 않고 TMAP 길찾기 응답만 사용한다.

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
  petId: string
  travelDate: string
  startLocation: string
  startLat: number
  startLng: number
  destination: RecommendedPlaceDto
  temperature?: number
  humidity?: number
  weatherStatus?: string
}

type CourseDto = {
  courseId: string
  travelDate: string
  startLocation: string
  endLocation: string
  places: Array<{
    coursePlaceId: string
    externalPlaceId: string
    placeName: string
    placeImageUrl: string | null
    latitude: number
    longitude: number
    visitOrder: number
    finalPlace: boolean
    reason: string | null
    petPolicy: unknown | null
  }>
}
```

프론트는 `GET /pets`에서 선택한 본인 반려동물 ID, 출발지, 선택한 최종 도착지
전체 객체(`destination`), 기기 로컬 기준 현재 날짜를 전송한다. 최종 도착지를
선택하기 전에는 요청하지 않는다. 추천 장소 요청 직전 탐색 지역 기준
날씨를 조회해 성공한 값만 선택 필드로 포함하며, 날씨 조회 실패는 장소 추천과 코스
생성을 막지 않는다. AI 추천 처리에는 요청별 60초 제한 시간을 적용하며,
만료된 access token의 갱신이 성공한 경우 최초 `401`에서 처리되지 않은 요청을 한 번만
재전송한다.

응답의 `places`는 서버가 큐레이션한 중간 스탑과 선택한 고정 최종 도착지로 구성된다.

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

### 코스 완료

```http
POST /courses/{courseId}/complete
Authorization: Bearer {access_token}
```

- 본인 코스만 완료 처리할 수 있다.
- 이미 완료된 코스에 다시 호출해도 `200 OK`를 반환한다.
- 여행 중도 종료 확정 시 이 endpoint가 성공한 후 홈으로 이동한다.

## 화면 단계별 사용 가능 여부

| 단계 | 필요한 계약 | 현재 상태 | 처리 원칙 |
| --- | --- | --- | --- |
| `setup` | 출발지·도착지 키워드 검색 | `READY` | 서버 전용 `POST /api/tmap/pois`에서 TMAP POI 검색 |
| `options` | 반려동물 선택 | `READY` | `GET /pets` |
| `places` | `POST /recommended-places` | `READY` | 도착 지역 반경 5km 최종 도착지 후보 최대 5곳, 한 곳 선택 |
| `route` | `POST /courses` 코스 생성·저장 | `READY` | 선택한 최종 도착지 전체 객체를 `destination`으로 전송 |
| `route` | 추천 장소와 방문 순서 | `READY` | 검증된 `CourseDto.places` 표시 |
| `route` | 장소 좌표 | `READY` | 검증된 `CourseDto.places[].latitude/longitude` 보존 |
| `route` | polyline, 거리, 시간 | `READY` | 서버 코스 방문 순서로 `POST /api/tmap/routes/pedestrian` 호출 |
| `route` | 여행 시작 활성화 | `READY` | 유효한 비어 있지 않은 코스 응답 필요 |
| `progress` | 방문 체크인 | `READY` | 코스 생성 후 받은 `coursePlaceId` 필요 |
| `end` | 코스 완료 | `READY` | 마지막 체크인 또는 `POST /courses/{courseId}/complete` |

## 백엔드 확인 필요 사항

1. `petPolicy`와 nullable 필드의 정확한 스키마
2. 좌표가 요청 및 서버 접근 로그에 남는 것에 대한 운영·보안 정책

## 구현 규칙

- endpoint 상수는 `lib/api/endpoints.ts`에서만 관리한다.
- 백엔드 DTO는 feature API 계층에서 런타임 검증 후 화면 모델로 매핑한다.
- 탐색 지역, 최종 도착지 후보, 선택한 최종 도착지, 서버 생성 코스를 같은 상태로 취급하지 않는다.
- `GET /places/nearby` 결과를 `SearchableLocation`과 혼용하지 않는다.
- `externalPlaceId`와 프론트 임시 ID를 혼용하지 않는다.
- 좌표는 비영속 Zustand 메모리에만 보관하고 로그·분석 이벤트에 남기지 않는다.
- `loading`, `success`, `empty`, `error` 상태를 모두 구현한다.
- 추천 장소 응답은 빈 목록을 별도 empty 상태로 표시한다.

## 출발지·도착지 검색

2026-09-03 사용자 결정에 따라 위치 검색 제공자는 TMAP 장소(POI) 통합 검색으로
확정했다. 브라우저는 내부 `POST /api/tmap/pois`를 호출하며 Next.js Route Handler가
서버 전용 `T_MAP_APIKEY`로 TMAP `GET /tmap/pois`를 호출한다. 전국 정확도순 검색을
사용하고, TMAP 응답은 `SearchableLocation` UI 모델로 축소한다. 보행자 출입구 좌표를
우선 사용하고 실패 시 정문, 중심 좌표 순으로 대체한다. 세부 계약은
[`docs/location-search-api.md`](./location-search-api.md)에서 관리한다.

장소 순서 확정 이후에는 `POST /courses`가 반환한 방문 순서를 유지해 TMAP 보행자
길찾기를 호출한다. 중간 장소는 `passList`에 순서대로 넣고, 마지막 장소를 도착지로
사용한다. 브라우저에는 API 키나 TMAP 원본 응답 대신 총거리, 총시간, WGS84 경로 좌표만
반환하며 같은 경로선을 여행 진행 지도에서도 유지한다.
