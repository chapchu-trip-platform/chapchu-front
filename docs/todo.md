# TODO

## Migration

- Split `components/screens` into feature-owned components once routes are stable.
- Replace the setup placeholder flow with separate user setup and pet setup steps.
- Add a route or modal for album course detail.
- Add explicit travel note save flow tied to selected waypoints.
- Decide whether map recommendation, progress, and completion should become `/map/route`, `/map/progress`, and `/map/end` subroutes.
- Reconnect route planning error screens once real location, weather, and recommendation failures are wired.

## API Integration

- Confirm endpoint paths with backend developers.
- Add API response types and mapper functions per feature.
- Decide auth strategy before adding credentials or authorization headers.
- Replace mock data gradually after contracts are stable.

## Validation

- Add tests for `normalizeApiError`.
- Add tests for route helper logic if navigation rules become more complex.
- Add state transition tests for travel and pet stores after a test framework is approved.
- Resolve existing lint warnings for unused imports and unused local prototype state.
