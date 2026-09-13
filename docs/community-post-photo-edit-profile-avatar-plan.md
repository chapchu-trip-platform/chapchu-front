# 커뮤니티 게시글 사진 수정 및 작성자 프로필 사진 적용 계획

작성일: 2026-09-13

기준 브랜치: `dev` (`e39557d`)

계획 작성 브랜치: `feature/post-photo-edit-profile-avatar`

## 1. 목표

1. 게시글 수정 화면에서 기존 사진을 유지·삭제·재정렬하고 새 사진을 추가할 수 있게 한다.
2. 게시글 목록과 상세에서 서버가 제공하는 작성자 프로필 사진을 표시한다.
3. 프로필 사진이 없거나 URL이 유효하지 않거나 이미지 로드가 실패하면 로컬 기본 프로필 이미지로 대체한다.
4. 기존 모바일 우선 레이아웃, 사진 10장 제한, 미리보기, 실패 후 재시도 경험을 유지한다.

## 2. 2026-09-13 API 문서에서 확인한 계약

### 게시글 수정

`PATCH /posts/{postId}`의 `photos`는 첨부 목록 전체를 교체한다.

- `photos` 생략 또는 `null`: 기존 사진을 변경하지 않는다.
- `photos: []`: 게시글에서 모든 사진을 분리한다.
- `photos: [...]`: 전송한 순서대로 전체 교체하며 첫 번째 사진이 대표 사진이 된다.
- 삭제는 `post_photos` 연결만 해제한다. 사진 레코드와 S3 객체를 물리 삭제하지 않는다.
- 수정 응답은 갱신된 게시글 상세 객체다.

문서의 수정 요청 표에는 `photos` 배열 원소의 필드가 따로 기재되어 있지 않다. 아래 계획은 게시글 작성과 동일한 `{ photoKey, takenAt? }` 형식을 사용하고, 상세 응답의 기존 `photos[].photoKey`를 재전송할 수 있다는 전제를 둔다. 구현 착수 전에 백엔드와 이 한 가지를 확인해야 한다.

### 게시글과 작성자 사진 조회

- 목록 응답: `posts[].authorProfilePhotoUrl`, `posts[].thumbnail.downloadUrl`
- 상세/수정 응답: `authorProfilePhotoUrl`, `photos[].downloadUrl`
- `authorProfilePhotoUrl`은 프로필 사진이 없으면 `null`이다.
- URL은 10분짜리 presigned URL이며 프런트는 별도 `GET /photos/{photoId}` 없이 바로 표시한다.

## 3. 현재 코드와의 차이

| 영역 | 현재 상태 | 필요한 변경 |
| --- | --- | --- |
| 수정 요청 | `updatePost`가 제목과 내용만 허용 | 선택적인 `photos` 전체 교체 입력 추가 |
| 수정 화면 | 기존 사진은 읽기 전용, 새 사진 선택 불가 | 기존/신규 사진을 하나의 편집 목록으로 관리 |
| 변경 감지 | 제목·내용만 비교 | 삭제·추가·순서 변경도 저장 활성 조건에 포함 |
| 사진 응답 모델 | `PostPhoto`에 `downloadUrl`이 없음 | 상세 사진 URL을 안전하게 파싱하고 직접 사용 |
| 목록 대표 사진 | `thumbnail.photoId`로 별도 사진 조회 | `thumbnail.downloadUrl`을 직접 사용 |
| 작성자 프로필 | 타입과 파서가 필드를 보존하지 않음 | 목록·상세 모델에 nullable URL 추가 |
| 작성자 UI | 목록은 텍스트만, 상세는 닉네임 첫 글자 원형 | 서버 사진 또는 기본 프로필 표시 |

## 4. 권장 설계

### 4.1 응답 모델과 안전한 URL 처리

`Post`와 `PostSummary`에 `authorProfilePhotoUrl: string | null`을 추가한다. `PostPhoto`에는 `downloadUrl: string | null`을 추가하고, 목록의 `thumbnail.downloadUrl`을 `PostSummary.photoUrl`로 매핑한다. 수정 전용 `UpdatePostInput`을 분리해 `photos?: PostPhotoInput[] | null`의 세 상태를 타입 수준에서도 보존한다.

모든 원격 이미지 URL은 기존 `safePhotoUrl`을 통과시킨다. HTTPS가 아니거나 사용자 정보가 포함되거나 파싱할 수 없는 URL은 `null`로 낮춰 게시글 전체를 깨뜨리지 않고 해당 이미지만 fallback 처리한다. presigned URL과 원본 `photoKey`는 로그에 남기지 않는다.

커뮤니티 목록·상세·수정 미리보기는 응답의 URL을 바로 사용한다. 이 경로에서는 더 이상 별도 사진 조회 요청을 만들지 않는다. URL 만료 후 재진입·목록 재조회 시 새로운 presigned URL을 받는다.

### 4.2 수정 화면의 사진 상태

화면 상태를 기존 사진과 새 사진을 함께 담는 순서 있는 목록으로 관리한다.

```ts
type EditablePostPhoto =
  | {
      kind: 'existing'
      photoId: string
      photoKey: string
      downloadUrl: string | null
    }
  | {
      kind: 'new'
      file: File
      previewUrl: string
      uploadedPhoto: { photoKey: string; fileName: string } | null
      uploadStatus: 'idle' | 'uploading' | 'success'
    }
```

- 초기 순서는 상세 응답의 `photos[]` 순서를 그대로 사용한다.
- 기존 사진 중 재전송할 수 있는 `photoKey`가 하나라도 없으면 사진 편집을 비활성화하고 제목·내용 수정만 허용한다. URL이나 `photoId`에서 키를 추측하지 않는다.
- 첫 번째 항목에 대표 사진 배지를 표시한다.
- 기존 사진과 신규 사진 모두 삭제할 수 있게 한다.
- 추가 후 전체 10장 제한과 기존 250MB 파일 제한을 적용한다. 용량 계산은 새 로컬 파일에만 적용한다.
- 재정렬 UI를 이번 범위에 포함한다. 모바일에서 접근 가능한 위/아래 이동 버튼을 기본으로 하고, 드래그 전용 조작은 피한다.
- 새 사진의 object URL은 삭제·성공·언마운트 때 해제한다.

### 4.3 수정 요청 생성 규칙

사진 배열이 초기 상태와 완전히 같으면 `photos`를 생략하여 제목·내용만 수정한다.

사진이 삭제·추가·재정렬되면 다음 순서로 처리한다.

1. 아직 업로드되지 않은 신규 사진만 기존 `uploadPhotoFiles(..., 'POST')` 흐름으로 업로드한다.
2. 현재 화면 순서를 유지하면서 기존 사진의 `photoKey`와 신규 업로드 결과의 `photoKey`를 합친다.
3. `PATCH` 한 번에 전체 `photos` 목록을 전달한다.
4. 사진이 하나도 남지 않으면 반드시 `photos: []`를 전달한다.

예상 요청 형태는 다음과 같다.

```json
{
  "title": "수정 제목",
  "content": "수정 내용",
  "photos": [
    { "photoKey": "post/user/existing.jpg" },
    { "photoKey": "post/user/new.jpg" }
  ]
}
```

`null`은 UI에서 명시적으로 보낼 필요가 없다. 사진 미변경은 필드 생략, 전체 삭제는 빈 배열로 구분하면 의도가 더 선명하다.

### 4.4 실패와 재시도

- 업로드 실패: `PATCH`를 호출하지 않고 편집 상태를 보존한다.
- 일부 업로드 성공 후 실패: 성공한 업로드 결과를 해당 신규 사진 상태에 보관해 재시도 시 중복 업로드하지 않는다.
- 업로드 완료 후 `PATCH` 실패: 업로드된 `photoKey`와 편집 순서를 유지해 동일 요청을 재시도한다.
- timeout·network 오류처럼 서버 반영 여부가 불명확하면 상세 API를 한 번 재조회해 목표 사진 순서와 일치하는지 확인한 뒤 성공 또는 재시도로 분기한다.
- 이 경우 연결되지 않은 S3 객체가 남을 수 있으므로 서버의 미참조 사진 정리 정책은 별도 백엔드 과제로 기록한다.
- 백엔드는 기존·신규 키의 소유권, 중복, 최대 10장과 전체 교체의 원자성을 검증해야 한다. 동시 수정 덮어쓰기는 버전 또는 ETag 계약이 생기기 전까지 알려진 위험으로 둔다.
- 화면 이탈·세션 변경 시 진행 중인 업로드와 수정 요청을 중단한다.
- 수정 성공 시 응답을 파싱한 뒤 기존 상세 화면으로 돌아간다.

### 4.5 작성자 프로필 사진 표시

공통 `PhotoImage`에 `src={authorProfilePhotoUrl}`과 `fallbackSrc="/images/default-profile.svg"`를 전달해 다음 세 경우를 동일하게 처리한다.

1. 값이 `null`인 경우
2. URL이 안전성 검사에서 거부된 경우
3. presigned URL 만료 등으로 이미지 로드가 실패한 경우

적용 위치는 커뮤니티 게시글 목록 카드의 작성자 행과 게시글 상세 작성자 행이다. 상세의 닉네임 첫 글자 원형을 사진 원형으로 교체하고, 목록에는 작은 원형 사진을 추가하되 기존 카드 높이·정보 계층·모바일 간격은 유지한다. 대체 텍스트는 `"{nickname} 프로필 사진"`, 기본 이미지는 `"기본 프로필"`로 제공한다.

홈의 최근 게시글 계약에는 현재 작성자 프로필 필드가 없으므로 이번 범위에서 임의로 추가하지 않는다.

## 5. 구현 단계와 예상 파일

### PR 1 — 작성자 프로필 사진

권장 브랜치: `feature/community-author-avatar`

1. `features/community/types/community.ts`: 목록·상세 모델 필드 추가
2. `features/community/lib/community-model.ts`: nullable URL 검증·매핑
3. `features/community/components/post-list.tsx`: 목록 작성자 사진 표시
4. `features/community/components/post-detail.tsx`: 상세 작성자 사진 표시
5. 관련 fixture, 파서·목록·상세 컴포넌트 테스트 수정

### PR 2 — 게시글 사진 수정

권장 브랜치: `feature/post-photo-edit`

1. `PostPhoto`와 목록 thumbnail 파서를 `downloadUrl` 직접 사용 방식으로 갱신
2. `UpdatePostInput`을 분리하고 `updatePost`에 선택적 `photos` 추가
3. 수정 화면을 순서 있는 기존/신규 사진 편집 상태로 전환
4. 사진 추가·삭제·재정렬·대표 사진 표시·미리보기 구현
5. 업로드 후 전체 목록을 구성해 단일 `PATCH` 수행
6. 커뮤니티 경로의 불필요한 `GET /photos/{photoId}` 의존 제거
7. `docs/api-policy.md`의 “사진 수정 API 미제공” 설명을 실제 계약과 구현 상태로 갱신
8. API·파서·에디터 테스트 보강

두 브랜치는 모두 최신 `dev`에서 시작한다. 독립성이 높은 작성자 프로필 PR을 먼저 병합하고, 사진 수정 브랜치는 최신 `dev`를 다시 반영한 뒤 충돌을 해결하는 순서를 권장한다.

## 6. 테스트 계획

### API와 파서

- `authorProfilePhotoUrl`: 정상 HTTPS, `null`, 비 HTTPS, 잘못된 URL
- 목록 `thumbnail.downloadUrl` 및 상세 `photos[].downloadUrl` 직접 매핑
- 기존 사진에 재사용 가능한 `photoKey`가 없으면 사진 편집 차단
- 사진 미변경 요청에서 `photos` 필드가 없음
- 일부 삭제·신규 추가·재정렬 시 현재 순서 전체가 전송됨
- 전체 삭제 시 `photos: []` 전송
- 제목 100자 제한과 응답 파싱 유지

### 수정 화면

- 기존 사진 순서와 대표 사진 표시
- 기존 사진 삭제, 신규 사진 추가, 10장 제한
- 첫 사진 삭제·재정렬 후 대표 사진 배지 이동
- 사진만 변경해도 저장 버튼 활성화 및 이탈 경고
- 업로드 실패 시 수정 API 미호출 및 상태 유지
- `PATCH` 실패 후 재시도 시 성공 업로드를 재사용
- 반영 여부가 불명확한 실패 후 상세 재조회로 성공 여부 판정
- 취소·언마운트·성공 시 object URL 정리
- 타인 게시글 직접 수정 URL 차단 유지

### 프로필 사진 UI

- 목록과 상세에서 정상 URL 표시
- `null`이면 기본 프로필 표시
- 원격 이미지 로드 실패 시 기본 프로필로 전환
- 닉네임과 대체 텍스트 접근성 유지

직접 관련 Vitest와 변경 파일 ESLint를 먼저 실행한다. 공유 타입 변경이 있으므로 `npm run typecheck`, 클라이언트 경계와 사진 요청 흐름 변경이 있으므로 `npm run build`까지 실행한다.

## 7. 완료 기준

- 사용자가 게시글 수정에서 사진을 추가·삭제·재정렬할 수 있다.
- 사진을 건드리지 않은 수정은 기존 첨부를 그대로 유지한다.
- 모든 사진을 삭제하면 게시글은 사진 없는 상태로 저장된다.
- 첫 번째 사진이 목록과 상세의 대표 사진으로 일관되게 노출된다.
- 타인 게시글의 작성자 프로필 사진이 목록과 상세에 표시된다.
- 프로필 URL이 없거나 실패해도 로컬 기본 프로필이 깨짐 없이 표시된다.
- presigned URL이나 `photoKey`가 로그에 노출되지 않는다.
- 관련 테스트, ESLint, typecheck, build가 통과한다.

## 8. 구현 전 확인 사항

백엔드에 다음 한 가지를 확정 요청한다.

> `PATCH /posts/{postId}`의 `photos[]` 원소가 게시글 작성과 동일한 `{ photoKey, takenAt? }`인지, 상세 응답에서 받은 기존 `photoKey`와 새 업로드의 `photoKey`를 같은 배열에 섞어 재전송해도 되는지 확인한다.

추가로 백엔드 운영 항목으로 미참조 업로드의 보관 기한/정리 정책과 동시 수정 충돌 제어(version 또는 ETag) 지원 여부를 확인한다. 이는 1차 UI 구현의 차단 조건은 아니지만, 운영 전 합의가 필요하다.

나머지 핵심 동작(전체 교체, 빈 배열 전체 분리, 배열 순서가 대표 사진, 물리 파일 미삭제, `authorProfilePhotoUrl` null 가능)은 2026-09-13 실시간 API 문서에서 확인했다.
