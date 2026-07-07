# API Policy

## Client Structure

API setup is isolated under:

```txt
lib/api/client.ts
lib/api/endpoints.ts
lib/api/errors.ts
```

`client.ts` owns axios configuration, `endpoints.ts` owns endpoint constants, and `errors.ts` owns error normalization.

## Environment Variables

The API base URL must come from:

```txt
NEXT_PUBLIC_API_BASE_URL
```

Only `.env.example` is committed. Real `.env`, `.env.local`, `.env.production`, and `.env.development` files must stay local.

## Auth And Tokens

Do not store access tokens in `localStorage` or `sessionStorage`.

No global `Authorization` header is configured until the backend auth strategy is agreed with the backend team.

`withCredentials: true` is not enabled yet. Add it only if the team confirms cookie/session-based authentication.

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

## Backend Assumptions

Endpoint paths are placeholders for frontend wiring and must be confirmed with backend developers before real integration.

When backend response shapes are finalized, add typed response models and feature-level mapper functions instead of coupling screens directly to API payloads.
