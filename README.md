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

Copy placeholder values from `.env.example` into your local-only environment file when needed. Do not commit real `.env` files.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

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
docs/
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
