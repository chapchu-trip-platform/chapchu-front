# Home 화면 개발 전 조사 및 구현 계획

- 작성일: 2026-08-19
- 대상 브랜치: `feature/main-screen`
- 대상 화면: `/`, `/home`
- API 기준: [Chapchu API 문서](https://api.chapchu.site/docs/index.html) (문서 표기 최종 갱신 2026-08-25)
- 이번 문서 범위: 초기 설계와 이후 구현 상태 및 남은 API 요청사항 정리.

## 1. 확정 요구사항

1. `/` 진입 시 유효한 로그인 세션이면 `/home`, 비로그인 상태이면 `/login`으로 이동한다.
2. Home 화면에서는 알림 버튼과 알림 상태를 제외한다.
3. Home은 현재 위치, 날씨, 반려견 개인화, 주변 추천 장소, 인기 게시글을 단계적으로 실제 데이터와 연결한다.
4. 회원가입 성공 사용자는 필수 서비스 위치동의를 완료한 것으로 보고, Home/Map 진입 시 기기 위치 권한과 현재 위치를 자동 확인한다.
5. 위치를 거부하거나 가져올 수 없어도 Home의 나머지 기능을 사용할 수 있어야 한다.
6. 기상청 API 키와 위치 데이터는 브라우저 번들, 로그, 영구 저장소에 불필요하게 노출하지 않는다.

## 2. 현재 구현 진단

### 2.1 루트와 인증

- `app/page.tsx`는 항상 `SplashRoute`를 표시하므로 요구사항과 다르다.
- `/home`은 `(main)` 그룹의 `MainAppShell`에서 세션 복원을 수행한다.
- access token은 Zustand 메모리에만 보관하고, 새로고침 시 `POST /auth/refresh`와 HttpOnly refresh cookie로 복원한다.
- refresh cookie는 API 도메인에 있으므로 현재 구조에서 Next.js middleware나 루트 Server Component가 직접 로그인 여부를 판정할 수 없다.
- 현재 `MainAppShell`은 401뿐 아니라 네트워크 오류, timeout, 5xx도 모두 `/login`으로 보낸다. 이는 “비로그인”과 “서버 장애로 판정 불가”를 혼동한다.

### 2.2 Home 화면

- 지도와 날씨는 Home 진입 시 자동으로 현재 위치와 연결되며, 위치를 사용할 수 없으면 수성구 대표 지점을 사용한다.
- 반려견 이름은 `GET /home`, HOT 카드 3개는 `GET /posts?sort=popular&size=3`의 `{ posts, nextCursor }` 결과를 사용한다.
- 주변 장소는 실제 위치 API 연동 전이므로 화면에 예시 데이터임을 명시한다.
- Home 상단 알림은 제외했고, 각 데이터 영역에 독립적인 로딩·오류·빈 상태가 있다.
- 기존 TMAP SDK 로더와 지도 컴포넌트를 재사용하며 Home 지도에서만 줌 컨트롤을 숨긴다.

## 3. 루트 인증 라우팅 설계

### 3.1 권장 흐름

```text
사용자 / 진입
  ├─ 메모리 상태 authenticated → replace('/home')
  ├─ 개발 demo 상태            → replace('/home')
  ├─ 상태 unauthenticated       → replace('/login')
  └─ 상태 idle
       └─ POST /auth/refresh
            ├─ 성공             → access token 메모리 저장 → replace('/home')
            ├─ 401              → 세션 정리 → replace('/login')
            └─ network/timeout/5xx → 판정 불가 안내 + 재시도
```

### 3.2 구현 방침

- `app/page.tsx`는 Server Component로 유지하고, 세션 판정 전용 Client Component만 렌더링한다.
- 예시 파일: `features/auth/components/session-landing-route.tsx`.
- `router.push`가 아닌 `router.replace`를 사용해 뒤로 가기로 판정 화면에 다시 들어오지 않게 한다.
- `MainAppShell`과 루트가 같은 복원 로직을 복제하지 않도록 공용 session restore hook/helper를 만든다.
- 401만 명시적 비로그인으로 처리한다. 일시 장애는 로그인 화면으로 보내지 않고 재시도 UI를 표시한다.
- 인증 완료 전에는 개인화 Home API를 호출하거나 개인 데이터를 RSC payload에 포함하지 않는다.
- 기존 Splash/Onboarding 화면은 삭제하지 않는다. 루트에서 분리하더라도 `/splash` 또는 명시적 온보딩 진입 경로로 보존한다.
- middleware는 사용하지 않는다. 현재 cross-origin HttpOnly cookie 계약에서는 신뢰할 수 있는 판정이 불가능하다.

## 4. Home UI와 현재 API 대응표

| 화면 구성요소 | 현재 API | 사용 가능 여부 | 정리 |
|---|---|---:|---|
| 사용자/반려견 인사 | `GET /home` | 부분 가능 | 응답은 `nickname`, `petNames`뿐이다. 대표 반려견 ID와 사진 URL은 없다. |
| 현재 위치 지도 | 브라우저 Geolocation + 기존 TMAP | 부분 가능 | 좌표 표시는 가능하다. 지도 marker와 실제 주소 표시에 추가 작업이 필요하다. |
| 현재 주소 문구 | 없음 | 불가 | reverse geocoding API가 필요하다. 준비 전에는 “현재 위치 주변”으로 표시한다. |
| 주변 추천 장소 | `GET /places/nearby?lat&lng&radiusMeters` | 부분 가능 | 장소명, 이미지, 주소, 좌표, 평점, 리뷰 수, 반려동물 정책을 받을 수 있다. 거리, 테마명, 정렬 기준은 없다. |
| 날씨 카드 | 없음 | 불가 | 기상청 adapter 또는 Chapchu 날씨 API가 필요하다. |
| 여행 시작 CTA | `GET /home` | 부분 가능 | 반려견 이름은 가능하지만 대표 반려견 사진은 불가하다. |
| HOT 게시글 | `GET /posts?sort=popular&size=3` | 부분 가능 | 응답은 `{ posts, nextCursor }`이고 ID, 제목, 본문, 조회 수, 추천 수, 작성자, 댓글 수, 대표 이미지 URL을 포함한다. Home에는 작성자 닉네임과 댓글 수도 표시하며, 원격 이미지 정책이 확정되기 전까지 이미지는 로컬 대체 자산을 사용한다. |
| 알림 | 제외 | 제외 | Home의 `NotificationButton`과 관련 props를 제거한다. 다른 화면의 공용 알림 UI는 건드리지 않는다. |

### 4.1 프론트 계약 불일치

- `lib/api/endpoints.ts`에는 문서의 `GET /home`, `GET /places/nearby`, `GET /posts` 경로를 분리해 둔다.
- Home HOT 목록은 문서의 실제 `/posts?sort=popular&size=3` 페이지 계약을 사용한다.
- API 응답 타입과 Home UI 모델을 분리하고 mapper에서 변환해야 문서 변경의 영향이 화면까지 번지지 않는다.

## 5. 백엔드/API 요청문

### Home 화면 API 보완 요청

Home 실제 데이터 연동을 위해 아래 계약의 확인 또는 보완이 필요합니다.

1. `GET /home`
   - 대표 반려견을 특정할 수 있도록 `primaryPet` 또는 선택 기준이 필요합니다.
   - 권장 필드: `id`, `name`, `profileImageUrl`.
   - 대표 반려견이 없을 때 `null` 계약도 필요합니다.

2. `GET /places/nearby`
   - 거리순 정렬 보장 여부와 최대 반경/최대 결과 수를 명시해 주세요.
   - 권장 추가 필드: `distanceMeters`, `themeName` 또는 표시 가능한 `tags`.
   - `rating`이 소수 평점을 지원하는지 확인이 필요합니다. 현재 예시는 정수입니다.
   - `petPolicy: null`일 때 “반려동물 동반 가능” 배지를 표시해도 되는지 확인이 필요합니다.
   - `lat`, `lng` query가 access log에 그대로 남지 않도록 좌표 redaction 정책이 필요합니다.

3. 현재 주소 표시
   - 제안 API: `GET /locations/reverse-geocode?lat={lat}&lng={lng}`.
   - 최소 응답: `displayAddress`, `regionCode`.
   - API 준비 전 Home은 정확한 주소 대신 “현재 위치 주변”을 표시할 수 있습니다.

4. `GET /posts?sort=popular&size=3`
   - Home 카드용 `limit` 또는 pagination 계약이 필요합니다.
   - 인기 기준이 단순 추천 수인지, 최근 기간·조회·댓글을 포함한 hot score인지 정의가 필요합니다.
   - 권장 추가 필드: `author.nickname`, `coverImageUrl`, `commentCount`, `bookmarkCount`.
   - `photoUrl`의 허용 호스트와 만료·실패 시 처리 방식을 확정해야 합니다.

5. 날씨
   - 제안 API: `GET /weather/current?lat={lat}&lng={lng}`.
   - 권장 응답: `observedAt`, `temperatureC`, `conditionCode`, `humidityPercent`, `windSpeedMps`, `uvIndex?`, `regionName?`.
   - 기상청 API 키는 서버에서만 보관하고 10~30분 캐시를 적용해 주세요.
   - API가 준비되지 않으면 프론트 Next Route Handler를 임시 adapter로 사용할 수 있습니다.

6. 인증 계약
   - `POST /auth/refresh`는 401과 일시 장애(5xx/timeout)를 명확히 구분해야 합니다.
   - `SameSite=None; Secure` cookie를 쓰는 refresh/logout은 exact Origin 검증 또는 CSRF 방어를 확인해야 합니다.
   - OAuth callback의 `registration_token` query 전달은 접근 로그에 남을 수 있으므로 fragment 또는 일회용 code 교환 방식 검토가 필요합니다.

## 6. 위치 데이터 사용 설계

### 6.1 초기 원칙

- 회원가입 성공 사용자는 `locationConsent: true`가 보장되므로 Home/Map 진입 시 제한된 위치 품질 측정을 자동 호출한다.
- 브라우저 또는 운영체제의 기기 위치 권한은 서비스 동의와 별개이며, 아직 결정되지 않았다면 시스템 권한창이 표시될 수 있다.
- 초기 Home/Map 설정 단계는 `watchPosition()`을 최대 12초만 사용해 여러 측정값 중 가장 작은 `accuracy`를 선택한다. 100m 이내면 즉시 종료하고, 최선 결과도 1km를 초과하면 TMAP의 현재 위치로 확정하지 않는다. 일시적인 측위 실패는 이 품질 측정 창을 즉시 끝내지 않으며, 화면 이탈·로그아웃·store 초기화 시 진행 중인 감시를 즉시 해제한다.
- 날씨는 지도용 최종 좌표를 기다리지 않는다. 동일한 위치 감시에서 처음 수신한 5km 이내 좌표를 임시 날씨 좌표로 사용하고, 최종 정밀 좌표의 기상청 격자가 달라질 때만 한 번 더 요청한다. 사용 가능한 좌표가 전혀 없을 때만 위치 시도 종료 후 수성구 기본 격자로 요청한다.
- 이 12초 품질 측정은 여행 진행의 지속 추적과 다르다. 여행 진행용 실시간 추적은 별도 수명주기와 배터리 정책으로 분리한다.
- 현재 위치 오차를 줄이기 위해 `enableHighAccuracy: true`, `maximumAge: 0`으로 새 좌표를 요청한다. 좌표 소수점 자릿수와 실제 GPS 정확도는 별개이며 응답의 `accuracy` 값을 함께 판단한다.
- 위치는 로그인 세션 동안 feature store의 기기 메모리에만 보관하고 localStorage/sessionStorage에 저장하지 않으며, 로그아웃 또는 세션 종료 시 삭제한다.
- 서버 전송 전 좌표를 소수점 3자리 수준으로 낮추는 방안을 우선 검토한다. 약 100m 단위로 주변 검색에는 충분하며 과도한 정밀도를 줄일 수 있다.
- 위치 원본, 좌표, 정확도는 console, 진단 로그, 분석 이벤트, 오류 리포트에 기록하지 않는다.
- 날씨 요청은 가능하면 기상청 5km 격자 좌표만 전달한다.

브라우저 Geolocation은 사용자 명시 권한과 secure context가 필요하다. 운영 웹은 HTTPS가 필수이며, 권한 상태는 `granted`, `prompt`, `denied`로 나눠 처리한다. W3C는 목적 범위 내 최소 사용, 필요 종료 후 폐기, 보관·제공·삭제 정책의 명확한 고지를 권고한다. 참고: [W3C Geolocation](https://www.w3.org/TR/geolocation/), [MDN getCurrentPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition).

### 6.2 기기 권한 거부 안내 문구 초안

권한 거부:

> 위치 권한이 꺼져 있어요. 기기 설정에서 허용하거나 지역을 직접 선택해 주세요.

- 주 행동: `설정 방법 보기`
- 보조 행동: `지역 직접 선택`

위치 확인 실패/timeout:

> 현재 위치를 확인하지 못했어요. 잠시 후 다시 시도하거나 지역을 직접 선택할 수 있어요.

- 주 행동: `다시 시도`
- 보조 행동: `지역 직접 선택`

### 6.3 앱 포장 시 고려

- 포장 기술은 아직 확정하지 않고 web adapter 인터페이스를 먼저 만든다.
- iOS는 foreground 위치 사용 목적 문구와 WebView 권한 위임 처리가 필요하다.
- Android는 coarse/fine foreground runtime permission과 WebView 권한 위임 처리가 필요하다.
- 초기 범위에서는 background location을 요청하지 않는다.
- 실기기에서 iOS/Android 권한 허용, 한 번만 허용, 거부, 설정에서 변경, 앱 재실행을 각각 검증한다.
- 운영 전 위치기반서비스 신고, 이용약관, 동의·파기·제3자 제공 정책을 법무/개인정보 담당자와 확인한다. 개인위치정보는 동의 또는 법적 근거 없이 고지 범위를 넘어 이용·제공하면 안 된다. 참고: [국가법령정보센터 위치정보법 제21조](https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029559623).

## 7. 기상청 Open API 조사

### 7.1 1차 권장 API

[기상청 단기예보 조회서비스](https://www.data.go.kr/en/data/15084084/openapi.do)의 `VilageFcstInfoService_2.0`을 1차 후보로 사용한다.

- `getUltraSrtNcst`: 현재 기온, 습도, 풍속 등 초단기 실황.
- `getUltraSrtFcst`: 가까운 시각의 하늘 상태와 강수 형태 보완.
- `getVilageFcst`: 시간대별 단기예보가 필요해질 때 확장.
- 위·경도를 기상청 `nx`, `ny` 격자로 변환해야 한다.
- 발표시각 선택은 `Asia/Seoul` 기준으로 처리하고 자정 직후 전일 자료 fallback이 필요하다.
- HTTP 200이어도 응답 `resultCode`가 실패일 수 있으므로 body 오류를 별도로 처리한다.

현재 Home 카드의 온도, 상태, 습도, 풍속은 위 API로 구성할 수 있다. `UV`는 단기예보와 별도다.

### 7.2 UV 지수

[기상청 생활기상지수 조회서비스(4.0)](https://www.data.go.kr/data/15085288/openapi.do)의 `LivingWthrIdxServiceV5/getUVIdxV5`가 별도 후보이다.

- UV는 별도 호출, 지역 코드 변환, 별도 캐시가 필요하다.
- Home 1차 개발에서는 UV를 optional로 두거나 숨기고, 온도·상태·습도·풍속부터 안정화한다.
- UV를 반드시 유지하려면 백엔드 normalized weather API가 두 기상청 응답을 합쳐 주는 편이 낫다.

### 7.3 키와 호출 위치

- 실제 키는 `NEXT_PUBLIC_*`로 만들지 않는다.
- 서버 전용 placeholder 예시: `KMA_SERVICE_KEY=replace-with-your-kma-service-key`.
- 권장 우선순위:
  1. Chapchu 백엔드 `/weather/current`에서 호출·캐시.
  2. 백엔드 일정이 늦으면 Next Route Handler에서 임시 호출·캐시.
  3. 브라우저가 기상청 API를 직접 호출하는 방식은 키 노출과 CORS 때문에 사용하지 않는다.

기상청 APIHub는 인증키 발급이 필요하며 일반회원 기준 호출량 정책이 있다. 운영 전에 활용신청과 운영 트래픽 승인을 확인한다. 참고: [기상청 APIHub 이용안내](https://apihub.kma.go.kr/apiInfo.do).

### 7.4 첨부 2026년 가이드 확인 결과와 임시 구현 기준

- 단기예보 가이드의 `getUltraSrtNcst`는 매시각 정시 자료를 10분 이후 호출하며 `T1H`, `REH`, `WSD`, `RN1`, `PTY`를 제공한다.
- `getUltraSrtFcst`는 매시각 30분 자료를 45분 이후 호출하며 `SKY`, `PTY`를 포함한다. Home은 가장 가까운 예보시각의 하늘 상태를 실황에 보완한다.
- 생활기상지수 가이드의 `getUVIdxV5`는 `areaNo`, `time(YYYYMMDDHH)`를 사용하고 3시간 단위 예측값 `h0`, `h3` 등을 제공한다.
- 첨부 행정구역표에서 대구광역시 수성구 대표값은 행정구역코드 `2726000000`, 단기예보 격자 `X=89`, `Y=90`, 대표 위도 약 `35.8552`, 경도 약 `128.6329`이다.
- 백엔드 날씨 API가 준비되기 전에는 `GET /api/weather/current` Next Route Handler가 위 세 응답을 합친다. 브라우저에는 정규화된 온도, 상태, 습도, 풍속, 강수량, UV만 전달한다.
- 고정 수성구 결과는 서버 프로세스에서 10분간 공동 캐시하고 진행 중인 동일 요청을 합친다. 성공 응답에는 CDN용 10분 캐시도 적용해 공개 Route Handler 호출이 기상청 할당량을 과도하게 소모하지 않게 한다.
- 실제 인증키는 `KMA_SERVICE_KEY` 서버 전용 환경 변수에서만 읽는다. `NEXT_PUBLIC_*`, 소스, 문서, 로그, 응답, Git에는 키를 넣지 않는다.
- 위치 확인 전이나 권한 거부 시에는 수성구 대표값을 사용한다. 회원가입의 필수 서비스 동의를 전제로 Home/Map 진입 때마다 기기 권한과 현재 위치를 자동 갱신한다.
- 원본 위·경도는 비영속 Zustand 메모리와 브라우저의 TMAP 표시에 사용한다. 지도 중심과 마커 표시 과정에서 TMAP 서비스가 지도 영역 또는 좌표를 수신·추론할 수 있으므로 개인정보 처리방침과 제3자 제공 고지에 반영한다. 날씨 Route Handler에는 위·경도 대신 변환된 기상청 격자 `nx`, `ny`만 전달하며, 동적 격자에서는 행정구역코드 변환이 준비될 때까지 UV를 표시하지 않는다.

## 8. 단계별 개발 계획

### 단계 1 — 인증 진입과 Home 알림 제외

- 공용 session restore 로직을 만들고 루트 session landing route를 구현한다.
- 성공, 401, 일시 장애, 개발 demo를 분기한다.
- 기존 Splash 화면은 별도 경로로 보존한다.
- Home 상단 알림 버튼과 관련 props/import를 제거한다.
- 범위: 라우팅과 정적 UI만 변경하고 Home mock 데이터는 유지한다.

### 단계 2 — Home 개인화 및 API 경계

- `GET /home`, `GET /places/nearby`, `GET /posts?sort=popular` endpoint 상수를 실제 문서와 맞춘다.
- `features/home/api`, API DTO, UI model, mapper를 분리한다.
- `GET /home`으로 닉네임과 반려견 이름을 연결한다.
- 섹션별 loading/error/empty 상태를 추가해 하나의 실패가 Home 전체를 막지 않게 한다.

### 단계 3 — 위치 권한과 주변 장소

- Geolocation/Permissions API를 감싼 테스트 가능한 adapter를 구현한다.
- 필수 회원가입 동의를 전제로 Home/Map 진입 시 기기 권한과 현재 위치를 자동 요청한다.
- 위치 거부/미지원/timeout/직접 지역 선택 fallback을 구현한다.
- 좌표를 메모리에만 보관하고 `/places/nearby`를 호출한다.
- 기존 TMAP 컴포넌트에 실제 center/marker 표시 기능을 확장한다.
- Home TMAP은 직접 드래그·확대·축소를 막고 임시 프로필 사진 핀으로 현재 위치만 추적한다. 좌표 갱신 시 지도 객체를 재생성하지 않고 center와 marker만 이동한다.
- reverse geocoding 전에는 “현재 위치 주변”을 사용한다.

### 단계 4 — 날씨

- 기상청 키 발급과 호출 주체(백엔드 또는 Next adapter)를 확정한다.
- 위·경도→격자, KST 발표시각, 응답 mapper를 순수 함수로 구현한다.
- 온도·상태·습도·풍속을 먼저 연결하고 UV는 optional 2차 범위로 둔다.
- 10~30분 캐시와 오류 fallback을 추가한다.

### 단계 5 — HOT 게시글과 API 보완

- 백엔드가 author/image/comment/bookmark 필드를 제공한 뒤 실제 카드에 연결한다.
- API 준비 전에는 mock을 API 데이터처럼 오해하게 두지 않고 “준비 중” 또는 독립 mock 표시를 명확히 한다.
- 인기 기준과 pagination/limit 계약을 확정한다.

### 단계 6 — 앱 포장 준비

- web geolocation adapter와 native bridge 경계를 확정한다.
- iOS/Android 권한 문구와 foreground 권한만 적용한다.
- 위치정보 관련 이용약관·개인정보 처리방침·신고 필요성을 검토한다.
- 실기기 권한 및 네트워크 장애 시나리오를 검증한다.

## 9. 테스트 및 완료 기준

### 필수 자동 테스트

- 루트: authenticated, unauthenticated, idle-refresh 성공, 401, network/timeout/5xx, demo.
- 보호 레이아웃: 기존 세션 복원 테스트 유지, 공용 로직 회귀 확인.
- Home: 알림 버튼 없음, 섹션별 loading/success/error/empty, 일부 실패 시 나머지 유지.
- 위치: 미지원, prompt/granted/denied, 정상 좌표, 오류 코드 1/2/3, timeout, 중복 요청 방지.
- 날씨: 격자 변환, KST 발표시각, 자정 fallback, category mapping, body 오류, 누락 값.
- API mapper: DTO와 UI model 변환, optional/null 필드.

### 수동 검증

- cookie 없는 `/` cold load → `/login`.
- 유효 refresh cookie가 있는 `/` cold load → `/home`.
- API 일시 장애 → 로그인 화면이 아닌 재시도 안내.
- 위치 허용/거부/설정 변경/재시도/지역 직접 선택.
- 모바일 viewport와 iOS/Android 실기기 권한 흐름.

### 최종 검증 명령

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## 10. 구현 전 결정이 필요한 항목

1. 루트에서 분리되는 Splash의 유지 경로를 `/splash`로 할지.
2. 직접 지역 선택 UI를 1차 위치 개발에 포함할지, 임시 기본 지역 fallback으로 시작할지.
3. 기상청 호출을 Chapchu 백엔드가 담당할지, Next Route Handler가 임시 담당할지.
4. Home에서 UV를 1차 범위에 포함할지.
5. 대표 반려견 선정 규칙과 대표 이미지 API 계약.
6. HOT 게시글 점수 기준과 필요한 응답 필드 제공 일정.

## 11. 보안 및 운영 선행 확인

- localhost → `https://api.chapchu.site`의 credential 요청에 exact CORS origin과 cookie 설정이 맞는지 확인한다.
- refresh/logout의 CSRF 방어 또는 exact Origin 검증을 확인한다.
- OAuth `state`/OIDC `nonce`, redirect allowlist, callback token 전달 방식을 백엔드와 확인한다.
- Home API와 장소 API가 Bearer 인증을 실제로 강제하는지 확인한다.
- 위치 좌표가 proxy/CDN/application access log에 남지 않도록 redaction 정책을 확인한다.
- 기상청 키는 서버 전용 환경 변수로만 주입하고 저장소에 실제 값을 기록하지 않는다.
