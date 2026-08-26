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
- community post/comment API

## Home And Location API Status

The Chapchu API documentation updated on 2026-08-25 publishes:

- public integrated signup `POST /auth/signup`, requiring
  `user.locationConsent` as a boolean
- authenticated `GET /home`, returning `nickname` and `petNames`
- authenticated `GET /posts?sort=popular`, returning recommendation-sorted post summaries
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
start a fresh one-shot foreground request when their route is entered. The browser or
operating system may still show its own device-permission prompt. The resulting latitude,
longitude, accuracy, and capture time are held only in the non-persisted Zustand store
and are reset on logout; they are not written to browser storage or the Chapchu backend.
Home passes the precise position only to the in-browser TMAP component.
Weather converts it in the browser to a KMA 5 km grid and sends only `nx` and `ny` to the
internal weather Route Handler. If the position is unavailable, weather falls back to
the existing Suseong-gu representative point. Dynamic grid weather omits UV until a
trustworthy coordinate-to-area-code mapping is available.

The Home TMAP receives the browser's original JavaScript latitude and longitude without
decimal rounding, requests a fresh high-accuracy fix (`maximumAge: 0`), and exposes the
reported `accuracyMeters` separately from coordinate precision. More decimal digits do
not compensate for GPS, Wi-Fi, or cell-location error. Browser Geolocation coordinates
are passed directly to TMAP's WGS84 `LatLng` without a second coordinate conversion. The compact Home map is read-only,
uses a temporary profile-photo pin, and updates its center/marker without rebuilding the
TMAP instance when a newer coordinate reaches Zustand.

Home now reads `petNames` from `GET /home` and shows the first name plus the remaining
count. Its three HOT cards come from `GET /posts?sort=popular`. Because that list contract
only includes a `photoId`, not a displayable image URL, the frontend uses local fallback
images and does not invent author, comment, or bookmark values.

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
