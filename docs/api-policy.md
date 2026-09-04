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
- route recommendation request/response shape
- travel note draft save API
- album save API
- community comment-list/read-state/public companion-detail contracts (see below)

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
- Current bookmark state comes from `GET /users/me/bookmarks`; editable/deletable
  post IDs come from `GET /users/me/posts`. The backend still enforces ownership.
  Failed ownership/bookmark reads never imply permission or a negative bookmark state.
- Post recommendation and bookmark mutations use POST/DELETE subresources. The API
  has no recommended-by-me flag. Successful post recommendation writes are retained
  per post in session memory, so returning from the list preserves the cancel action.
  New sessions/reloads have unknown state and expose an explicit cancellation action
  next to the reaction buttons. Counts are refreshed from the server after successful
  recommendation changes; no guessed increment is applied.
- Report UI supports only the documented `SPAM` example with optional detail. Other
  reason values require a published enum. Success appears only after the server response.
- Comments use POST with `{ parentCommentId, content }` and DELETE by comment ID.
  The docs expose neither a comment collection GET nor comments in post details.
  Therefore the UI labels its limitation and displays only comments successfully created
  during the current detail view. Replies use IDs from successful creation responses.
  Delete locally visible replies before their parent; backend subtree deletion semantics
  remain unspecified. Comments do not survive closing/reloading the detail view in the UI.
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

- No global review feed, comment list, comment recommendation, bookmark count,
  recommended-by-me flag or author user ID is documented.
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
  state they may be omitted or null. These requirements must be confirmed before
  enabling registration. Photo attachment and review creation still need their real
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
