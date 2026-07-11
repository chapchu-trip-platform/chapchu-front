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

Do not expose TMAP keys through `NEXT_PUBLIC_*` variables or client components. If TMAP integration is added later, keep the real key in a local-only server-side environment variable and coordinate the backend/API proxy strategy before exposing map requests to the browser.

Recommended placeholder name for local planning:

```env
TMAP_API_KEY=replace-with-local-only-value
```

Keep `.env.local` on your machine only. It is ignored by Git.

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
