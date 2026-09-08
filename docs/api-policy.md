# API Policy

## Client Structure

API setup is isolated under:

```txt
lib/api/client.ts
lib/api/endpoints.ts
lib/api/errors.ts
```

`client.ts` owns axios configuration, `endpoints.ts` owns endpoint constants, and `errors.ts` owns error normalization.

The axios client currently uses:

- `baseURL` from `NEXT_PUBLIC_API_BASE_URL`
- `timeout: 10_000`
- `allowAbsoluteUrls: false`
- per-request content types
- response error normalization through `normalizeApiError`

## Environment Variables

The API base URL must come from:

```txt
NEXT_PUBLIC_API_BASE_URL
```

Only `.env.example` is committed. Real `.env`, `.env.local`, `.env.production`, and `.env.development` files must stay local.

## Auth And Tokens

Do not store access tokens in `localStorage` or `sessionStorage`.

Google OAuth is delegated to the `chapchu-api` BFF:

- browser login starts at `GET /auth/login?redirect={frontend-origin}/auth/callback`
- existing users return to `/auth/callback#access_token={JWT}`
- new users return to `/auth/callback?registration_token={token}`
- the callback scrubs either credential from the address before routing to `/home` or `/setup`
- a short-lived, one-time, non-credential transaction marker in the initiating tab's
  `sessionStorage` is required and consumed before either callback result is accepted
- signup choices use unauthenticated `GET /preferences/options`, `GET /breeds`,
  and `GET /activities`; database IDs must never be hard-coded
- nickname availability uses unauthenticated
  `GET /users/nickname/availability?nickname={nickname}` and the current input
  must have an `available: true` result before the setup flow can continue
- integrated registration uses one unauthenticated `POST /auth/signup` request with
  `registrationToken`, user preferences, and pets
- although the backend contract accepts optional preferences and pets, the current
  frontend product policy requires one or more selections for theme, region, and
  transport plus at least one complete pet with an activity before submission
- successful signup returns `201 Created` with `userId`, `nickname`, `email`, and
  ordered `petIds`, then the frontend starts a fresh `/auth/login` navigation
- refresh uses `POST /auth/refresh`
- logout uses `POST /auth/logout`
- logout clears the in-memory access token, registration token, and setup state
  before awaiting the BFF response; the BFF response removes the HttpOnly refresh cookie

The access token is stored only in the non-persisted auth store and attached to
protected API calls as `Authorization: Bearer {access_token}`.

`withCredentials: true` is limited to refresh/logout requests because the BFF
stores the refresh token in an HttpOnly cookie. General protected API calls use
the Bearer access token and do not enable credentialed cookies.

Protected `GET`/`HEAD`/`OPTIONS` calls are replayed once after a successful access-token
refresh. Mutation requests are not replayed by default. A feature may explicitly opt in only
when a `401 Unauthorized` guarantees that the mutation was not applied; `POST /courses` uses
this opt-in so a restored session can complete the original recommendation request.

## Error Normalization

API errors are normalized into these types:

- `network`
- `timeout`
- `validation`
- `unauthorized`
- `forbidden`
- `not-found`
- `server`
- `unknown`

UI copy should stay separate from normalized API error types so screens can choose context-appropriate messages.

## Development Diagnostics

During local development, `/dev/diagnostics` shows sanitized auth-store changes and
Axios request/response events from other app tabs through an in-memory
`BroadcastChannel`. It keeps at most 200 events and does not persist them.

The route returns not found in production. Access tokens, registration tokens,
Authorization headers, cookies, passwords, and similarly sensitive fields are
redacted before events are displayed or written to the development console.

## Backend Assumptions

OAuth endpoint paths and response fields follow the published chapchu API docs.
Other service endpoint paths remain placeholders until their feature integration.

Integrated signup is transactional. For retryable failures, the registration token
is retained in memory so the same form can retry within its 10-minute TTL. A `401`
means the token is expired or invalid, so the frontend clears it and starts a fresh
Google login. A successful signup also clears it and starts a fresh login to obtain
the first access token. Access-token refresh is not part of this pre-authentication
signup request and remains isolated in the session API client.

When backend response shapes are finalized, add typed response models and feature-level mapper functions instead of coupling screens directly to API payloads.

Backend coordination still needs to confirm:

- exact localhost, production, and optional preview callback URL allowlists, including
  scheme, host, port, and `/auth/callback` path; wildcard preview domains are not allowed
- the response for a missing or disallowed `redirect`
- credentialed CORS origins
- temporary OAuth redirect cookie `Secure`, `HttpOnly`, `SameSite`, and expiry settings
- refresh cookie `Secure`, `SameSite`, domain, and path settings
- registration token expiry and one-time-use behavior
- production log redaction for the token-bearing `/auth/callback?registration_token=...` request;
  client-side URL cleanup cannot remove it from upstream access logs
- route geometry/polyline, total-distance, and estimated-time response fields
- travel note draft save API
- album save API
- community read-state/public companion-detail contracts (see below)

## Home And Location API Status

The Chapchu API documentation updated on 2026-08-25 publishes:

- public integrated signup `POST /auth/signup`, requiring
  `user.locationConsent` as a boolean
- authenticated `GET /home`, returning `nickname` and `petNames`
- authenticated `GET /posts?sort=popular&size=3`, returning a cursor page shaped as
  `{ posts, nextCursor }`
- authenticated `GET /places/nearby`, accepting `lat`, `lng`, and optional
  `radiusMeters` query parameters

The signup UI presents location collection/use and third-party provision as separate,
required acknowledgements. The current backend contract can only receive one boolean, so
the frontend sends `locationConsent: true` only after both acknowledgements are checked.
Signup does not request the operating-system location permission or collect coordinates.

Successful integrated signup is treated as proof that the required service-location
consent was completed; the frontend signup adapter rejects any request whose
`locationConsent` is not `true`. The published documentation still does not define APIs
for later withdrawal, temporary suspension, or consent-history evidence. Browser or
operating-system permission remains a separate device-level control.

Location acquisition is isolated under `features/location`. Home and Map automatically
start a bounded foreground quality-sampling window when their route is entered. The web
provider watches fresh high-accuracy samples for at most 12 seconds, accepts immediately
at 100 m or better, otherwise keeps the best sample, and rejects the result when the best
reported accuracy remains worse than 1 km. This short quality window is not continuous
trip tracking. The browser or operating system may still show its own device-permission prompt. The resulting latitude,
longitude, accuracy, and capture time are held only in the non-persisted Zustand store
and are reset on logout; they are not written to browser storage or the Chapchu backend.
Home keeps the precise position in non-persistent device memory and passes it to the
in-browser TMAP component. TMAP may receive or infer the displayed map center/area while
serving map tiles, so this use must be reflected in the location/privacy notice.
Weather does not wait for the final map-quality result. The first fresh sample reported
within 5 km accuracy is converted in the browser to a KMA 5 km grid and only `nx` and `ny`
are sent to the internal weather Route Handler. The final position replaces the temporary
weather position, but weather is requested again only when its KMA grid changes. If no
weather-usable sample arrives, weather falls back to the existing Suseong-gu representative
point after the location attempt ends. Dynamic grid weather omits UV until a trustworthy
coordinate-to-area-code mapping is available.

The Home TMAP receives the browser's original JavaScript latitude and longitude without
decimal rounding, requests fresh high-accuracy fixes (`maximumAge: 0`), and exposes the
reported `accuracyMeters` separately from coordinate precision. More decimal digits do
not compensate for GPS, Wi-Fi, or cell-location error. Browser Geolocation coordinates
are passed directly to TMAP's WGS84 `LatLng` without a second coordinate conversion. The compact Home map is read-only,
uses a temporary profile-photo pin, and updates its center/marker without rebuilding the
TMAP instance when a newer coordinate reaches Zustand. The bounded browser position watch
is aborted immediately when Home/Map unmounts or the location store is reset; transient
`unavailable`/`timeout` callbacks do not stop the quality window before a better sample can arrive.

Home now reads `petNames` from `GET /home` and shows the first name plus the remaining
count. Its three HOT cards come from `GET /posts?sort=popular&size=3`; the frontend validates
the current `{ posts, nextCursor }` cursor-page contract before mapping the cards. Although the
contract now includes `photoUrl`, the current Home card keeps local fallback images until the
remote-image host policy and failure handling are finalized. Public post `nickname` and
`commentCount` values are validated, mapped, and displayed on each HOT card.

Before production location rollout, backend coordination still needs to provide:

- location-consent withdrawal, temporary suspension, and status contracts for account settings
- separate consent evidence for collection/use and third-party provision, including policy
  version and agreed/withdrawn timestamps; a single boolean is not sufficient audit evidence
- a decision on replacing the coordinate-bearing nearby-place query with a `POST`
  Home context endpoint so precise coordinates do not enter URL, proxy, CDN, or access logs
- production-wide redaction for coordinates in application logs, APM, analytics, and errors
- the retention policy for consent evidence while keeping raw coordinates out of the user DB

Before production release, legal and operations owners must finalize the service operator's
legal name, address, contact channel, withdrawal procedure, exact external recipients, and
recipient-specific retention periods. The UI copy is an implementation draft based on the
current service design and is not a substitute for approved location-service terms or legal
review.

If the current `GET /places/nearby` contract is used temporarily, it must only run after
explicit service consent and device permission, and the request coordinates must be reduced
to the minimum precision needed for Home. The client diagnostics redact location fields and
coordinate query parameters before any future integration.

## Community And Reviews (2026-09-03)

Source: https://api.chapchu.site/docs/index.html, published 2026-08-30.

Implementation plan: replace the board's runtime mock feed with typed authenticated
requests, connect documented detail actions, expose documented review collections,
then validate requests, stale-response handling, error recovery and mobile layout.
The original prototype remains available only in development demo mode and Storybook;
its fixture data lives under `data/mock/community.ts`.

- HOT uses `GET /posts?sort=popular&size=20`; 자유게시판 uses `sort=latest`.
  The API has no category field/filter: these are two orderings of the same feed.
  Return shape is `{ posts, nextCursor }`. Forward the cursor unchanged and stop at null.
  Details use `GET /posts/{postId}` independently of the loaded list or Home card IDs.
- Detail recommendation/bookmark state comes from the server's `recommended` and
  `bookmarked` booleans. Editable/deletable post IDs still come from `GET /users/me/posts`.
  The backend enforces ownership; reaction flags do not imply ownership.
- Post recommendation and bookmark mutations use POST/DELETE subresources. The API
  now returns personal state on reads, including after reload or list navigation.
  Recommendation memory retains in-flight locks and successful writes during navigation;
  a read can replace it only if no write changed the captured state in the meantime.
  The separate unknown-state cancellation button is removed. Recommendation counts
  are refreshed from the server after successful changes; no guessed increment is applied.
- Report UI supports only the documented `SPAM` example with optional detail. Other
  reason values require a published enum. Success appears only after the server response.
- Comments use GET/POST at the post's comment collection, PATCH with `{ content }`
  and DELETE by comment ID. The September 4 contract adds collection reads and edits.
  The array includes nickname and commentOrder, but no author ID or ownership flag.
  The UI displays server authors and the reply tree and reloads on re-entry. Deleted
  parents remain with `deleted: true`, `nickname: null` and a fixed deleted-message label;
  their action buttons are hidden and children retain parent IDs/ordering. Counts come
  from Post.commentCount after writes, not the array length which includes deleted rows.
  It never infers ownership from nicknames.
  Edit/delete controls explain that only the author's own comments can be changed;
  the server enforces this, and a 404 can mean either a missing comment or no permission.
  Successful deletion reloads the server tree without guessing descendant semantics.
- 여행 리뷰 explicitly displays 내가 작성한 여행 리뷰 from `GET /users/me/reviews`.
  Selecting one opens public `GET /places/{placeId}/reviews` via `publicApiClient`.
  All mutations and own collections use `apiClient`. Review text is `contents`, not
  post/comment `content`; rating is 1–5 and weather is nullable SUNNY/CLOUDY/RAINY/SNOWY.
  Delete controls are shown only for IDs returned by the authenticated own collection.
- Errors preserve input drafts; pending mutations cannot be double-submitted. The
  existing client intentionally does not replay writes after a 401 refresh. Users must
  explicitly retry. Read requests are cancelled on view changes and state is discarded
  on session-epoch changes. No access token or community response is persisted.
- Remote photos accept credential-free HTTPS URLs and render directly in the browser
  without a referrer or server-side fetch. At the user's request, free-board cards,
  details, and editor previews use the existing local `post-cover.png` on absence/failure,
  visibly labeled as a temporary photo. It is never submitted as a photo ID. If that
  local asset also fails, the neutral icon fallback remains available.

Remaining integration boundaries:

- No global review feed, comment recommendation, bookmark count or author user ID is documented.
- Companion/course sections have been removed from the free board and its details.
  Only reviews carry these sections. Public pet details are not documented and course
  detail is owner-only, so review sections show unavailable states instead of reading
  another user's private resources or displaying raw IDs.
- The `/community/write` screen supports title/body editing, preview, and memory-only
  drafts retained across client navigation. Reload/logout clears drafts, with an explicit
  UI notice and a browser reload warning. A global auth subscription also clears drafts
  if the editor is unmounted during logout. This is not server-side draft storage.
- Typed post/review create adapters remain ready, but actual text-only post submission
  is disabled: the published contract still lists petId/photoId/courseId and does not
  state they may be omitted or null. A live all-null request returned 400 because courseId
  must not be null. Individual petId/photoId null support remains unverified. Title input
  is now limited to 100 characters; overlong existing drafts are retained with guidance.
  Photo attachment and review creation still need their real
  selection flows. Do not submit prototype IDs. Review update is not documented.
- Production write verification needs a designated test account/data set. Automated
  tests exercise mutation requests and responses locally without publishing content,
  recommendations, reports, or deletions to the shared live service.

Validation on 2026-09-03:

- Updated from clean, current `dev` and created `feature/community-api`.
- Existing local dev server responded successfully. Published API docs loaded.
  Unauthenticated post request returned the expected 401; the browser's existing
  authenticated session successfully loaded Home and live popular/latest post lists,
  a real post detail, bookmark state and ownership-based action visibility. Home HOT
  links opened the matching detail. My reviews returned an empty collection and showed
  the corresponding empty state; place-review rendering was covered by local tests.
- Home TMAP tiles rendered. Weather and SDK server routes returned 200. Default-region
  UV was available; dynamic-grid UV remains intentionally unavailable as documented above.
- `npm run lint`, `npm run typecheck`, `npm run test` (38 files / 250 tests), and
  `npm run build` passed. The community-specific run contains 47 passing tests.
- Canonical API/security, Next.js/design and test reviewers completed read-only reviews.
  Findings about reply hierarchy, fixed composer placement, offscreen action panels
  and post-logout follow-up requests were fixed and covered by regression tests.
- Live checks were read-only. Mutation success/failure, duplicate submission prevention,
  draft retention and deletion confirmation were exercised against local test doubles.

## My Page API Status

The previously completed My Page integration is restored alongside the community work.
Shared post, bookmark, and review endpoint constants are reused; the existing community
features and authentication client are preserved.

My Page uses authenticated API calls for the summary, pets, written posts, bookmarks,
wishlist, reviews, nickname changes, and account withdrawal. Breed, activity, and nickname
availability lookups remain public according to the published onboarding contract.

The profile API adapter validates response shapes before updating UI state. My Page summary
and pets load in parallel, while collection sub-screens load on demand. Wishlist entries are
returned as place IDs, so the frontend preserves those authoritative IDs for removal and
hydrates display fields through place-detail requests with bounded concurrency. This fan-out
should still be replaced by an aggregated or embedded-place backend response if wishlist
size grows or pagination is introduced.

The current contracts do not provide travel-distance, visited-place, stamp, memorial-album,
profile-photo, or pet-photo data suitable for the existing design. The UI keeps those visual
positions without presenting fabricated API values. The trip-photo API is not reused because
it requires a course-place association.

Stamp and memorial-album sub-screens retain their menu entries, back navigation, and
unavailable-feature notices until their contracts are available. The former sample stamp
and memorial-album collections and their unused model types have been removed. Remaining
`data/mock/profile.ts` fixtures are test-only: they preserve multi-item and pet-overflow
regression coverage without being imported by runtime screens or API modules.

Account withdrawal sends the documented `accountStatus: WITHDRAWN` update. The UI does not
claim that this hard-deletes all related data because deletion, retention, and restoration
semantics are not defined in the published contract. After a successful withdrawal update,
the frontend also calls the cookie-session logout route and clears all in-memory auth and pet
state before returning to login. Backend coordination must confirm that withdrawal atomically
revokes every refresh session, not only the current browser cookie, and should define a recent
reauthentication requirement for this sensitive action.

Protected mutation requests are not automatically replayed after a token refresh because
replaying a POST, PATCH, or DELETE can duplicate a non-idempotent operation. If a token expires
during a My Page mutation, the UI reports the failure and requires an explicit user retry.
The backend should make DELETE operations idempotent and provide idempotency support for any
future non-idempotent mutation that needs transparent retry.

### My Page reliability follow-up

The nickname update response can contain a null nickname. The client confirms the saved
value with a summary read and reports an error if it cannot confirm it, without replaying
the update. Late profile results cannot update pet state after the screen unmounts or the
session changes; nickname follow-ups and queued wishlist reads stop when no longer current.

Pending list removals are serialized. Profile dialogs isolate background navigation until
their exit completes, and opening deletion cancels a pending editor/options load to avoid
overlapping dialogs. Regression tests cover nullable responses, delayed operations, dialog
isolation, and list-removal success/failure. These changes are maintained on the My Page
feature branch using its existing endpoint constants, independently of community changes.

Collection limits remain a follow-up: responses over 200 entries are rejected, and a failed
wishlist detail request fails the list load. Pagination and partial-detail support require
further coordination. Live checks remain read-only; mutations use local test doubles.

My Page branch validation (2026-09-03): lint, typecheck, all 260 tests across 37 files, and
the production build passed. The authenticated profile screen loaded successfully after
the branch transfer. API/security, UI, and test reviews found no remaining blocking issues.

### Community integration with latest dev (2026-09-04)

Pulled `dev` with fast-forward only to `e4c2e67` and integrated it into
`feature/community-api`. The profile adapter follows the current dev implementation;
community and profile reuse the same user collection and bookmark endpoint constants.
Written-post and bookmark titles in My Page now open their community detail with an
encoded post ID. The settings keyboard loop includes these links.

The published community/review documentation loaded successfully and retained its
2026-08-30 update timestamp. Existing contract limitations listed above remain in place.
The local server, default-region weather/UV route, and TMAP SDK route responded
successfully; Home map tiles rendered. An unauthenticated backend request returned 401,
confirming reachability only. The existing authenticated browser session loaded a Home
HOT post's matching detail and My Page successfully. Live checks were read-only.

Validation: lint, typecheck, all 309 tests across 40 files, and production build passed.
Regression coverage includes failed post edits and reports with explicit retry, profile
detail links, encoded IDs, keyboard navigation, and asynchronous dialog cleanup.
Canonical API/security, Next.js/UI, and test reviews completed with no remaining blockers.

### Free-board screen update (2026-09-04)

The detail action row now uses the existing bookmark API in place of sharing; the
duplicate header bookmark control has been removed. Companion/course information is
reserved for reviews in both runtime and demo screens. The existing local photo is an
explicit temporary fallback on free-board cards/details and editor previews.

The new editor supports writing, preview, and memory-only drafts. Publishing remains
unavailable pending the text-only creation contract described above. No unconfirmed
request shape or fabricated ID was sent. The free tab is preserved when entering a
detail from the editor's return page and navigating back.

Preflight: dev was already current, Home and API docs responded successfully, the backend
returned 401 to the unauthenticated reachability check, default-region weather/UV was
available, and Home TMAP tiles rendered. Browser checks confirmed the editor, preview,
draft restoration after navigation, temporary photos, and the revised detail layout.
Browser-created verification text was cleared; no live posts/comments/bookmarks were changed.

Validation: `npm run lint`, `npm run typecheck`, `npm run test` (41 files / 319 tests),
and `npm run build` passed. Canonical API/security, Next.js/UI, and test reviews completed.
Findings about free-tab navigation and outdated demo expectations were resolved and
covered by regression tests. Existing comment-query and photo-upload limitations remain.

### Recommendation re-entry and bookmark cancellation (2026-09-04)

The recommendation re-entry regression was reproduced in a test before the fix:
recommend a post, return to the list, reopen it, then attempt cancellation. The old
component reset its own recommendation state to unknown, making the main button send
POST again. Confirmed recommendation writes now live in a per-post, memory-only store.
The store records success before refreshing counts, retains same-session results after
the detail unmounts, and holds a pending lock across navigation. Epoch and store-generation
checks discard old responses, including their lock cleanup, after logout/session changes.
It cannot determine changes from another device/tab or recover state after reload;
a recommended-by-me response field is still needed for authoritative hydration.

Cancellation errors identify the operation and appear beside the reaction buttons.
Panel actions keep their separate feedback above the post. Unknown recommendation state
exposes explicit cancellation without opening a menu. HTTP 404/409/500 is not treated as
success, and mutation requests are not automatically replayed. The bookmark collection
remains the source of initial bookmark state; the active button visibly says 북마크 취소.

Backend issue remains open: authenticated bookmark cancellation returned HTTP 500.
Reproduction observed on sample post `00000000-0000-4000-8000-000000000703`:

1. The active bookmark was visible on the detail.
2. `DELETE /posts/{postId}/bookmarks` was sent with the documented path and method.
3. The response was `500 Internal Server Error`; the server timestamp was
   `2026-09-04T05:23:47.485+00:00`. No more specific error code was provided.
4. Reopening the detail triggered `GET /users/me/bookmarks`, which returned 200 and
   still included the same post. Therefore this was not merely stale button styling.

Backend follow-up: inspect the server exception at that timestamp and the bookmark
lookup/deletion transaction for the authenticated user and post. The precise server
root cause is not available in this frontend repository. Verify POST → collection read
→ DELETE 204 → collection absence, and document repeat-cancellation semantics.
Do not change a failed deletion to a successful local toggle as a workaround.

An explicit recommendation cancellation on the same sample returned 404 with
`code: NOT_FOUND` and a message indicating no recommendation record. That request had
no prior confirmed recommendation, so it does not establish a broken recommendation
DELETE handler. Successful recommendation → re-entry → cancellation and delayed-response
cases were tested locally with controlled responses. No live recommendation/bookmark
creation was used to manufacture data while cancellation reliability was uncertain.

Validation: `npm run lint`, `npm run typecheck`, `npm run test` (42 files / 330 tests),
and `npm run build` passed. API/security, Next.js/UI, and test reviewers found no
remaining must-fix frontend issues. An existing profile focus-restoration test now
waits for the asynchronous restoration as well as dialog removal. The browser also
confirmed that a failed live bookmark cancellation preserves the active bookmark,
shows the contextual server-error message, and re-enables an explicit retry.

### Comment reads/edits and bookmark error diagnostics (2026-09-04)

Source: https://api.chapchu.site/docs/index.html, checked again after the comment API
documentation update. GET `/posts/{postId}/comments` returns a 200 array ordered by
commentOrder; PATCH `/comments/{commentId}` accepts required content and returns a
200 comment object. The docs explicitly return 404 for edits to another user's comment.
List, create and update responses now validate nickname, and collection/update adapters
validate the requested resource IDs. Duplicate collection IDs are rejected.

Read loading/errors, retry, empty lists, persisted replies and inline edits are connected.
List loading/failure blocks mutations so a late initial read cannot overwrite a write.
Failed edits preserve both the displayed original and editor draft; writes are never
automatically replayed. A new edit clears the previous operation's feedback.
An author ID or isMine flag is still needed to hide edit/delete controls authoritatively.

Authenticated browser verification loaded eight existing comments and nested replies on
sample post ending 711, and an empty array on sample post ending 703. The editor opened
with the saved content and focused input. No live comment was created, edited or deleted;
successful/failed mutations are verified with controlled test responses.

The bookmark cancellation on sample post ending 703 was reproduced again. Response body:
status 500, error `Internal Server Error`, timestamp `2026-09-04T09:11:07.453+00:00`.
The request used the documented DELETE method and path. No detailed exception, code or
stack was returned; frontend evidence cannot identify a database or transaction cause.
Backend owners should correlate this server timestamp and request path with exception
logs, then verify deletion and subsequent absence from the user's bookmark collection.

The UI now includes HTTP status in reaction server-error messages. In development,
bookmark cancellation errors also produce `[community] Bookmark cancellation failed`
in the browser console, with fixed method/path template, validated status, observedAt,
and a fixed known message. Arbitrary messages, IDs, headers, bodies and original errors
are never passed to this log; it is disabled in production. The existing development
diagnostics page remains available for sanitized network response inspection.

Post publication remains disabled because the current create documentation still lists
petId/photoId/courseId without saying omission or null is accepted. This is an unresolved
contract boundary, not a confirmed rejection of text-only requests. No fabricated IDs
or prototype photo reference are sent to bypass it.

Validation: `npm run lint`, `npm run typecheck`, `npm run test` (43 files / 341 tests)
and `npm run build` passed. Canonical API/security, Next.js/UI and test reviews completed
without outstanding must-fix findings. Added coverage includes real-list count updates,
re-entry, reply trees, failed reads, 404 edit/delete failures, edit draft preservation,
duplicate submissions, stale reads, server-tree reloads and development-only safe logging.

### Updated contract preflight and live scenario verification (2026-09-04, evening)

This section supersedes earlier missing-personal-state, hard-delete and bookmark-500
observations above for the scenarios tested here. Source: current public API docs.

Order: existing community tests first (79 passed); refreshed API documentation; explicit
nullable request before functional testing; two failing new-contract tests reproduced
the old parser's rejection of deleted/null-author rows and missing reaction validation;
implementation and regression tests; live user-authorized functional scenarios.

The temporary development-only probe used the existing authenticated apiClient and sent:
`{ title: "[API 검증] nullable 20260904", content: "사용자 요청에 따른 임시 API 검증 게시글입니다. 검증 후 삭제합니다.", petId: null, photoId: null, courseId: null }`.
The response was HTTP 400, `courseId: 널이어서는 안됩니다`. No post was created.
This establishes rejection of the all-null combination, not separate rejection of every
ID field. No fabricated or another author's IDs were substituted. The probe was removed.

Live functional checks used existing sample post ending 707, starting with both personal
reaction flags false and zero comments:

- Bookmark POST 201 (22:56:01 KST), DELETE 204 (22:56:24). False again after reload.
- Recommendation POST 201 (22:57:19), actual back-to-list navigation and card re-entry
  showed the cancel state; DELETE 204 (22:59:21). Count 187 → 188 → 187 and false on reload.
- Parent and child creation each returned 201; parent DELETE returned 204 (23:01:34).
  GET preserved the parent placeholder and live nested child, also after reload.
  Server commentCount changed 0 → 1 → 2 → 1; deleted rows were not counted.
- Test child was also deleted after verification. Soft-deleted placeholders remain
  under the API's documented semantics; test body/author text is hidden. Existing
  comments and other users' reaction state were not edited.

Post editing now updates only title/content locally so an old edit response cannot
overwrite a concurrently refreshed comment count or reaction state. Comment count
callbacks carry absolute server totals rather than deltas against captured old counts.
API and UI inputs enforce the new 100-character title limit without truncating drafts.

Final validation: `npm run lint`, `npm run typecheck`, `npm run test` (44 files / 350 tests),
`npm run build` and `git diff --check` passed. API/security, Next.js/UI and test reviewers
completed their checks. The count-race finding was fixed and covered for either response
order. Temporary probe files are absent from the final build and working changes.

### Community action feedback (2026-09-05)

- Completed recommendation, bookmark, report, post/comment edit and comment write/delete
  requests show a shared message-and-Close modal. Draft saves use the same presentation.
- Existing mutation success/failure semantics and partial refresh warnings are preserved;
  no endpoint, request shape or authentication contract changes were made.
- Query failures retain inline retry controls; input validation remains next to its field.
- Each community screen owns one modal queue. Close, Escape or a press on the dimmed
  backdrop acknowledges each result. Focus returns to the action button, or the community
  screen's first available control when the action removed its button. Navigation/session
  changes clear feedback.
- Automated tests cover dismissal, keyboard focus, repeated/concurrent notices and the
  existing reaction/comment/report failure and retry paths. Reports are tested with mocks.
- Browser verification confirmed bookmark save/cancel and recommendation/list/re-entry/
  cancellation notices, Close/Escape and focus restoration. Test reactions were restored.
- Validation passed: lint, typecheck, production build, and 45 test files / 352 tests.

### Text-only free-board publication (2026-09-06)

- The refreshed `POST /posts` documentation explicitly makes `petId`, `photoId` and
  `courseId` optional and permits body-only publication. Missing references are returned
  as `null`; a missing photo also produces a null photo URL.
- The free-board UI requires a nonblank title and content as a product rule even though
  the backend describes both text fields as optional. Title and content are temporarily
  limited to 100 characters in the frontend.
- Publication sends `{ petId: "", photoId: "", courseId: "", title, content }` under
  the current frontend contract. The published backend contract explicitly guarantees
  omitted optional references; deployed handling of empty strings still needs a live check.
- A successful response clears the memory-only draft and returns to the free-board list.
  A failed request preserves both inputs for an explicit retry, and pending requests
  block in-app navigation and disable publication to prevent duplicate writes. The API
  receives an `AbortSignal`; session changes and unmounts abort the client request and
  late responses cannot clear the draft or navigate. A POST already accepted by the
  backend still requires server-side idempotency to guarantee de-duplication.
- Development demo sessions may draft and preview but cannot call the authenticated
  publication API.
