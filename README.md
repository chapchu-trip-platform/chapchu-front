# PawRoute

PawRoute is a mobile-first pet-friendly travel web app migrated from a v0 prototype into a maintainable Next.js App Router project.

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- lucide-react
- axios
- Zustand
- Vitest
- React Testing Library

## Development

Use npm for this project. The canonical lockfile is `package-lock.json`.

```bash
npm install
npm run dev
```

## Validation Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:watch
npm run test:coverage
npm run build
npm audit
```

## Environment Variables

Copy placeholder values from `.env.example` into your local-only `.env.local` file when needed. Do not commit real `.env` files.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

## TMAP Configuration

TMAP API Key is read only from a local server-side environment variable. Do not expose TMAP keys through `NEXT_PUBLIC_*` variables, client components, or `next.config` env settings.

Create `.env.local` yourself and keep it out of Git:

```env
T_MAP_APIKEY=your-tmap-api-key
```

The map screen loads the TMAP SDK through the internal `/api/tmap/sdk` endpoint so client code does not build a public SDK URL with the key.

## Google OAuth

Google login is handled by the `chapchu-api` BFF. The browser navigates to
`{NEXT_PUBLIC_API_BASE_URL}/auth/login?redirect={frontend-origin}/auth/callback`.
The redirect is built from `window.location.origin`, so localhost and deployed
frontends use the same code. Frontend code does not exchange the Google
authorization code or contain an OAuth client secret.

The BFF must validate the complete supplied callback URL (scheme, host, port,
and `/auth/callback` path) against an exact allowlist. Wildcard preview domains
must not be accepted. Both OAuth outcomes return to the single callback:

```txt
existing user: {frontend-origin}/auth/callback#access_token={JWT}
new user:      {frontend-origin}/auth/callback?registration_token={token}
```

Access tokens are kept only in non-persisted client memory. The BFF refresh
token remains in an HttpOnly cookie and is used through `/auth/refresh`.
The frontend keeps only a short-lived, one-time, non-credential transaction
marker in the initiating tab's `sessionStorage` and rejects unsolicited callback
links that do not have that marker.

New users load signup choices from `/preferences/options`, `/breeds`, and
`/activities`, then submit nickname, preferences, and optional pets together
through `POST /auth/signup`. After a successful `201 Created` response, the
frontend starts a fresh Google login to receive the first access token. This
signup flow is separate from access-token refresh.

## Project Structure

```txt
app/
  (auth)/
  (main)/
components/
  layout/
  screens/
  ui/
features/
  auth/
  home/
  map/
  travel/
  community/
  album/
  profile/
lib/
  api/
test/
  setup.ts
  utils/
```

## Testing

Vitest is configured with `jsdom`, React Testing Library, jest-dom matchers, and the `@/*` path alias.

Prefer focused tests for:

- API error normalization
- utility functions
- route/config helpers
- Zustand store state transitions
- shared layout components

E2E tests are not configured yet.
