# 위치 검색 API 계약

## 상태

- 문서 상태: `IMPLEMENTED`
- 확정일: 2026-09-03
- 검색 제공자: TMAP 장소(POI) 통합 검색
- 브라우저 endpoint: `POST /api/tmap/pois`
- 서버 어댑터: `app/api/tmap/pois/route.ts`
- 프론트 호출부: `features/location/api/location-search-api.ts`

Chapchu 공개 백엔드는 출발지·도착지 키워드 검색 endpoint를 제공하지 않는다. 사용자
결정에 따라 Next.js Route Handler가 TMAP 장소 검색을 서버에서 호출한다. 브라우저는
TMAP을 직접 호출하거나 `T_MAP_APIKEY`를 전달받지 않는다.

TMAP 기준 계약:
<https://tmap-skopenapi.readme.io/reference/%EC%9E%A5%EC%86%8C%ED%86%B5%ED%95%A9%EA%B2%80%EC%83%89>

## 브라우저 → Next.js 서버

```http
POST /api/tmap/pois
Content-Type: application/json
Accept: application/json
```

```json
{
  "query": "서울역",
  "limit": 10
}
```

| 필드 | 타입 | 필수 | 규칙 |
| --- | --- | --- | --- |
| `query` | string | 필수 | 앞뒤 공백 제거 후 2~100자 |
| `limit` | integer | 선택 | 기본 10, 최소 1, 최대 20 |

검색어가 URL·프록시 접근 로그에 남는 범위를 줄이기 위해 브라우저의 내부 요청은 GET
쿼리가 아니라 POST JSON 본문을 사용한다. 이 요청은 조회 전용이며 서버 상태를 변경하지
않는다.

현재 위치 좌표는 장소 검색 요청에 포함하지 않는다. TMAP의 거리순 검색은 중심 좌표와
1~33km 반경을 함께 요구하므로, 자동 적용하면 사용자가 다른 지역의 출발지·도착지를
검색할 수 없게 된다. 전국 검색과 정확도순을 사용하고 지역 구분은 검색어로 처리한다.

## Next.js 서버 → TMAP

```http
GET https://apis.openapi.sk.com/tmap/pois
appKey: {T_MAP_APIKEY}
Accept: application/json
```

서버가 전송하는 확정 파라미터:

| 파라미터 | 값 |
| --- | --- |
| `version` | `1` |
| `format` | `json` |
| `searchKeyword` | 검증된 검색어 |
| `searchType` | `all` |
| `searchtypCd` | `A` (정확도순) |
| `radius` | `0` (전국) |
| `page` | `1` |
| `count` | 검증된 limit |
| `multiPoint` | `Y` |
| `poiGroupYn` | `N` |
| `reqCoordType` | `WGS84GEO` |
| `resCoordType` | `WGS84GEO` |

TMAP의 `204 No Content`는 정상적인 검색 결과 없음으로 해석하여 `{ "items": [] }`를
반환한다.

## Next.js 서버 → 브라우저

```json
{
  "items": [
    {
      "id": "tmap-poi-219821",
      "name": "서울역",
      "address": "서울 용산구 한강대로 405",
      "latitude": 37.55326112,
      "longitude": 126.96913336
    }
  ]
}
```

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `items` | array | 필수 | 검색 결과. 결과가 없으면 빈 배열 |
| `items[].id` | string | 필수 | `tmap-poi-`가 붙은 TMAP POI ID |
| `items[].name` | string | 필수 | 장소명 |
| `items[].address` | string | 필수 | 도로명 주소 우선, 행정 주소 fallback |
| `items[].latitude` | number | 필수 | WGS84 위도 |
| `items[].longitude` | number | 필수 | WGS84 경도 |

보행 경로의 출발지·도착지로 사용하므로 좌표는 `pnsLat/pnsLon` 보행자 출입구를 먼저
사용한다. 값이 없거나 올바르지 않으면 `frontLat/frontLon`, 그다음
`noorLat/noorLon` 중심 좌표를 사용한다. 유효한 좌표나 ID, 이름이 없는 POI는 결과에서
제외한다.

## 오류 계약

| HTTP 상태 | 상황 | 프론트엔드 처리 |
| --- | --- | --- |
| `400` | 검색어 또는 limit 검증 실패 | 검색 실패 표시 |
| `429` | TMAP 호출 제한 초과 | 검색 실패 및 재시도 표시 |
| `502` | TMAP 장애 또는 올바르지 않은 응답 | 검색 실패 및 재시도 표시 |
| `503` | 서버의 `T_MAP_APIKEY` 미설정 | 검색 실패 및 재시도 표시 |

TMAP 오류 본문, 내부 URL, API 키는 클라이언트 응답에 포함하지 않는다. 각 요청은 8초
제한 시간을 가지며 입력 변경이나 화면 해제 시 브라우저 요청과 upstream 요청을
취소한다. 실패 시 로컬 목업을 성공 데이터처럼 대신 표시하지 않는다.

## 보안 및 개인정보

- `T_MAP_APIKEY`는 서버 환경 변수에서만 읽는다.
- `NEXT_PUBLIC_T_MAP_APIKEY`를 만들지 않는다.
- 검색어나 응답, API 키를 console, diagnostics, analytics에 기록하지 않는다.
- 검색 기록과 선택 좌표는 localStorage 또는 sessionStorage에 저장하지 않는다.
- production 검색 실패를 로컬 mock 데이터로 대체하지 않는다.
