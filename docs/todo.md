# TODO

## Priority 1

- Stabilize login -> user setup -> pet setup -> home navigation.
- Stabilize home -> map -> origin/destination setup -> recommended route flow.
- Add selected waypoint state for recommended route stops.
- Add travel note draft saving tied to selected waypoints.
- Persist trip completion into album save flow.

## Priority 2

- Split `components/screens` into feature-owned components once routes are stable.
- Replace the setup placeholder flow with separate user setup and pet setup steps.
- Add album detail and course detail routes or modals.
- Stabilize community post creation/detail/comment flow.
- Complete profile sub-screens.
- Add empty, API error, and permission-denied states where each feature needs them.

## API Integration

- Confirm endpoint paths with backend developers.
- Add API response types and mapper functions per feature.
- Decide auth strategy before adding credentials or authorization headers.
- Replace mock data gradually after contracts are stable.
- Prepare Korean Tourism Content Lab API integration after route planning models are agreed.
- Prepare weather API integration after the weather UI model is finalized.

## Validation

- Add tests for `normalizeApiError`.
- Add tests for route helper logic if navigation rules become more complex.
- Add state transition tests for travel and pet stores after a test framework is approved.
- Add visual regression or screenshot checklist after the team approves a test tool.
