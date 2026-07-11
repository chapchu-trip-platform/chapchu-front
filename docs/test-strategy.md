# Test Strategy

## Why Vitest

Vitest fits this Next.js and TypeScript project because it is fast, works well with Vite-compatible tooling, supports jsdom, and integrates cleanly with React Testing Library.

## Testing Library Standard

Use React Testing Library for component behavior tests. Prefer user-visible queries over implementation details.

Good targets:

- visible text
- accessible roles and names
- form values
- enabled or disabled states
- navigation callbacks when mocked

Avoid testing private component state directly.

## Priority Test Areas

1. API error normalization in `lib/api/errors.ts`
2. Utility functions in `lib/`
3. Zustand state transitions in `features/*/stores`
4. Route/config helpers when navigation rules become more complex
5. Shared layout components such as top bar and bottom navigation

## Unit vs Component Tests

Use unit tests for pure logic, error mappers, utility functions, and store actions.

Use component tests when the behavior depends on rendered UI, user interaction, form input, or accessible state.

## Next.js Mocks

The current setup includes lightweight mocks for:

- `next/image`
- `next/navigation`
- `window.matchMedia`
- `ResizeObserver`
- `IntersectionObserver`

Keep these mocks focused on test behavior. Do not use localStorage or sessionStorage mocks to introduce auth token storage patterns.

## E2E Tests

E2E tests are out of scope for the current setup. Consider Playwright later after the main flows and backend contracts are stable.
