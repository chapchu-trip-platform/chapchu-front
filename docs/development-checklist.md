# Development Checklist

## Before Feature Work

- Confirm the current branch is not `main`, `master`, or `dev`.
- Pull or coordinate with the team before starting shared work.
- Check whether the feature needs backend API contracts.
- Preserve the approved mobile-first warm travel design.

## During Implementation

- Use npm scripts and keep `package-lock.json` as the canonical lockfile.
- Keep Server Components as the default.
- Add `"use client"` only for state, events, forms, browser APIs, modals, or navigation behavior.
- Keep mock data separate from page components.
- Do not add new dependencies without approval.
- Do not add auth, map SDK, or server-state libraries without approval.

## Testing Expectations

- Add tests for new pure utilities, data mappers, API error handling, and non-trivial state transitions.
- Prefer focused tests over broad snapshots.
- Use React Testing Library for component behavior.
- Keep Next.js mocks in `test/setup.ts` or `test/mocks/`.

## Security Checks

- Do not commit real `.env` files.
- Do not write real secrets.
- Do not store auth tokens in `localStorage` or `sessionStorage`.
- Do not add global Authorization headers until the auth strategy is agreed.
- Run dependency audit before PR.

## PR Readiness

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
npm audit
```

If a command fails, fix it before committing unless the user explicitly approves committing a known-broken state.
