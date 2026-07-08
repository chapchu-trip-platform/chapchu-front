# Migration Plan

## Existing v0 Structure

The approved v0 result started as a single client-driven prototype centered in `app/page.tsx`.

- Screen state was managed with local React state.
- Map flow, onboarding, auth, home, community, album, and profile screens were switched in one component.
- Reusable visual screens lived under `components/screens`.
- Mock data lived in `data/mock.ts`.

## Next.js App Router Structure

The first migration pass splits the prototype into route-addressable screens while preserving the current visual design.

```txt
app/
  page.tsx
  (auth)/
    onboarding/
    login/
    setup/
  (main)/
    home/
    map/
    community/
    album/
    my/

components/
  layout/
  ui/
  common/

features/
  auth/
  onboarding/
  home/
  map/
  travel/
  community/
  album/
  profile/
```

## Migration Scope

Completed in this pass:

- Added route pages for `/`, `/onboarding`, `/login`, `/setup`, `/home`, `/map`, `/community`, `/album`, and `/my`.
- Preserved the existing mobile shell, top bar, bottom navigation, card styling, spacing, and warm travel diary tone.
- Moved layout entry points to `components/layout` and kept compatibility re-exports for existing imports.
- Added minimal Zustand stores for travel flow and pet selection state.
- Added axios API client boundaries under `lib/api`.

## Remaining Work

- Split large `components/screens/*` files into feature-level components over time.
- Add dedicated user setup and pet setup screens instead of reusing the current setup prototype screen.
- Add route-level loading and error states when backend contracts are available.
- Split the internal `/map` step state into subroutes or document recovery behavior before deep-linking is required.
- Reconnect the approved error-state UX to route-level or map-flow error boundaries before backend integration.
- Add tests for API error normalization and non-trivial state transitions after a test framework is approved.
