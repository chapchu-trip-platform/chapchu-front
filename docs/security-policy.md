# Security Policy

## Environment Files

Do not commit real `.env` files. Only `.env.example` may be committed.

The `.env.example` file should document required environment variable names with safe local defaults or placeholder values. It must not contain real secrets.

## Secrets

Do not write secret values directly in source code, tests, documentation, or configuration files. Use environment variables instead.

## Token Storage

Do not store authentication tokens in `localStorage` or `sessionStorage`. Use the team's approved authentication storage pattern instead.

## API Base URL

Axios `baseURL` values must come from environment variables, such as `NEXT_PUBLIC_API_BASE_URL`. Do not hard-code production or private API URLs in source code.

## Dependency Vulnerabilities

Do not merge PRs with high or critical dependency vulnerabilities.

Check audit results before merging:

```bash
npm audit --audit-level=high
```

This project uses npm and `package-lock.json` as the canonical lockfile.

Do not run forceful dependency repair commands such as the following without user approval:

```bash
npm audit fix --force
```
