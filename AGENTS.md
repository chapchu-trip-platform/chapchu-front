# AGENTS.md

## Project

This project is `chabchu`, a mobile-first pet-friendly travel web app based on a v0 design prototype.

The project started from a v0-generated design result, but the long-term goal is not limited to migration. Codex will be used continuously for frontend development, refactoring, maintenance, testing, and code review assistance.

The goal is to migrate and maintain the current v0/React-style prototype as a maintainable Next.js App Router project.

---

## Team context

This is a team project, not a solo project.

Team composition:

* 2 frontend developers
* 2 backend developers

Frontend work must be coordinated through feature branches and pull requests.

The normal integration branch is:

* `dev`

Feature work should be merged into `dev` through PR.

Do not assume direct commits to `main`, `master`, or `dev` are allowed.

---

## Core product direction

This is not a generic dashboard.

The product is a warm, mobile-first travel app for pet owners.

Main flow:

1. Splash
2. Onboarding
3. Login
4. User setup
5. Pet setup
6. Home
7. Map route planning
8. Route recommendation
9. Travel progress
10. Travel note
11. Trip completion
12. Album save
13. Optional community sharing

Preserve the current approved design tone:

* Warm Beige
* Sage Green
* Soft Orange
* Pet-friendly
* Map-first
* Travel diary style

Do not redesign the UI unless explicitly requested.

During migration or refactoring, preserve the approved visual direction and screen composition.

---

## Visual preservation rule

During migration, refactoring, or feature development, preserve:

* current approved color palette
* mobile-first layout
* bottom navigation behavior
* top bar behavior
* card radius
* spacing rhythm
* typography scale
* screen hierarchy
* map-first product experience
* travel diary tone
* pet-friendly emotional design

Do not simplify, remove, or replace screens to make implementation easier.

If a screen cannot be fully migrated or implemented immediately, keep a placeholder route or TODO section and document the limitation.

Do not convert this app into:

* an admin dashboard
* a generic map app
* a generic SNS feed
* a dark-mode-first app
* an overly childish pet app

---

## Tech stack

Use:

Use:

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- shadcn/ui where already used
- lucide-react
- axios for REST API client
- Zustand for lightweight client state management
- ESLint
- Prettier if already configured

Zustand is allowed because it is part of the approved frontend stack.

Do not introduce React Query, Redux, Jotai, Recoil, or other server/client state libraries unless explicitly requested.

Do not introduce a map SDK unless explicitly requested.

Do not introduce an auth library unless explicitly requested.

---

## Package manager rule

Use npm for this project.

The canonical lockfile is:

```txt
package-lock.json
```

Do not introduce `pnpm-lock.yaml`, `yarn.lock`, or `bun.lockb` without user approval.

When running scripts, use npm.

Examples:

* `npm run lint`
* `npm run typecheck`
* `npm run build`

---

## Architecture goals

Refactor the v0 prototype into a maintainable Next.js App Router structure.

This project should support long-term development, not just one-time migration.

Preferred folder structure:

```txt
app/
  layout.tsx
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
  common/
  layout/
  ui/

features/
  auth/
  onboarding/
  home/
  map/
  travel/
  community/
  album/
  profile/

lib/
  api/
  utils/

types/
  index.ts

data/
  mock/

docs/
  migration-plan.md
  api-policy.md
```

Route groups are recommended when they improve clarity.

Do not over-engineer routing.

Use route groups only if they reduce layout duplication or clearly separate auth and main app layouts.

Avoid putting all screens into one `app/page.tsx`.

---

## Component rules

Use Server Components by default when possible.

Use Client Components only when needed for:

* state
* event handlers
* browser APIs
* forms
* modals
* bottom sheets
* map interactions
* client-side navigation state
* temporary prototype interactions

Every Client Component must start with `"use client"`.

Keep UI components small and reusable.

Prefer feature-level components for domain-specific screens.

Prefer common components only when they are reused across multiple features.

Avoid excessive abstraction.

Do not move everything into `components/common`.

---

## API rules

Create and maintain a safe axios client.

Required files:

```txt
lib/api/client.ts
lib/api/endpoints.ts
lib/api/errors.ts
```

Axios rules:

* Use `baseURL` from `NEXT_PUBLIC_API_BASE_URL`.
* Do not hard-code production API URLs.
* Add request timeout.
* Normalize API errors.
* Do not store access tokens in `localStorage`.
* Do not store access tokens in `sessionStorage`.
* Do not expose secrets in client code.
* Create `.env.example`, not real `.env` values.
* Do not commit real `.env` files.
* Do not add global Authorization headers unless the auth strategy is explicitly defined.
* Use `withCredentials: true` only if cookie/session auth is expected.
* If `withCredentials: true` is used, add a short comment explaining that it is for cookie/session-based authentication.
* Do not log sensitive request/response payloads in production code.
* Separate endpoint constants from API client setup.
* Separate API error types from UI error messages.

API error handling should distinguish:

* network error
* timeout error
* validation error
* unauthorized error
* forbidden error
* not found error
* server error
* unknown error

---

## Environment variable rules

Allowed:

```txt
.env.example
```

Not allowed:

```txt
.env
.env.local
.env.production
.env.development
```

Do not write real secrets.

Do not invent real API keys.

Use placeholder values in `.env.example`.

Example:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

---

## Testing and validation

After medium or large implementation work, run relevant validation commands using npm.

Required checks when available:

* lint
* typecheck
* test
* build

Examples:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

If a script does not exist, check the current package setup before adding it.

Add reasonable scripts only when they fit the project.

Write minimal tests for:

* API client error normalization
* utility functions
* route/config helpers
* non-trivial data transformation logic

Do not add a new test framework without user approval.

Do not skip TypeScript errors by setting:

```ts
ignoreBuildErrors: true
```

Remove `ignoreBuildErrors` if it exists.

Do not bypass lint or build errors unless the user explicitly approves a temporary exception.

---

## Git workflow

This is a team project.

Do not work directly on:

* `main`
* `master`
* `dev`

The normal integration target is:

* `dev`

Feature work should be done on a feature branch and merged into `dev` through PR.

At the start of a medium or large development task:

1. Run `git branch --show-current`.
2. Run `git status`.
3. If the current branch is `main`, `master`, or `dev`, create a new feature branch.
4. If already on a feature branch, continue on the current branch.
5. Do not switch branches if there are uncommitted changes unless the user approves.
6. Never create a branch that is limited to migration unless the task is actually migration-only.

Branch naming convention:

```txt
feature/<short-task-name>
fix/<short-bug-name>
refactor/<short-refactor-name>
chore/<short-task-name>
design/<short-design-task>
```

Examples:

```txt
feature/next-app-router-migration
feature/travel-note-flow
feature/album-course-detail
fix/api-error-normalization
refactor/map-feature-structure
design/profile-memory-album
chore/setup-codex-agents
```

Allowed Git commands:

* `git status`
* `git diff`
* `git branch --show-current`
* `git switch -c <branch-name>`
* `git add`
* `git commit`
* `git log --oneline -5`

Not allowed without explicit user approval:

* `git push`
* `git reset --hard`
* `git clean -fd`
* deleting large folders
* changing remote origin
* force push
* rebasing shared branches
* writing real secrets
* committing real `.env` files

Never push to a remote repository.

After Codex commits, the user will review the result and push manually.

---

## Commit policy

Use Conventional Commits.

Examples:

```txt
feat: migrate v0 prototype to next app router
feat: add travel note flow
fix: normalize axios error handling
refactor: split map feature components
design: refine album detail layout
chore: add codex project rules
```

For medium or large development tasks, commit automatically after:

* implementation is complete
* lint passes
* typecheck passes, if available
* tests pass, if available
* build passes
* subagent review is complete when appropriate
* all must-fix issues are resolved
* `git status` and diff summary were generated

Do not push.

After commit, ask the user to review the committed result before pushing.

If validation fails, do not commit by default.

Instead:

1. summarize the failure
2. explain attempted fixes
3. leave the working tree uncommitted
4. ask the user whether to commit the known-broken state

---

## Pull request policy

Codex must not create or push PRs unless explicitly requested.

When asked to prepare a PR, provide:

* suggested PR title
* PR summary
* changed files summary
* testing results
* screenshots needed, if UI changed
* risks or assumptions
* checklist for reviewer

Default PR target branch:

```txt
dev
```

PRs should not target `main` unless the user explicitly says so.

---

## Subagent policy

Use subagents for medium or large tasks when appropriate.

Codex does not need to use subagents for small text-only or style-only changes.

Use subagents especially for:

* migration
* routing changes
* API client changes
* auth-related changes
* security-sensitive changes
* test/build configuration
* large refactoring
* design preservation review

Recommended subagents:

* `next-migration-reviewer`
* `api-security-reviewer`
* `test-reviewer`

Use `next-migration-reviewer` for:

* routing
* component structure
* Next.js App Router
* Server/Client Component boundary
* migration changes
* folder structure
* import path changes
* UI regression risk

Use `api-security-reviewer` for:

* axios
* REST API client
* auth
* cookies
* environment variables
* secret handling
* token storage
* CORS-related frontend assumptions
* security-sensitive changes

Use `test-reviewer` for:

* tests
* lint
* typecheck
* build
* validation scripts
* CI readiness
* regression risk

If a named subagent is unavailable, continue with main-agent review and report that the subagent was unavailable.

Wait for all available subagent review results before committing.

Fix all must-fix issues found by subagents before committing.

Subagents should not modify files unless explicitly configured to do so.

Reviewer subagents should be read-only by default.

---

## Default task cycle

For every medium or large development request, follow this cycle unless the user explicitly says otherwise.

1. Understand the requirement.
2. Inspect the relevant files.
3. Check the current git branch.
4. Create or use a feature branch according to the Git workflow.
5. Create a short implementation plan.
6. Implement the change.
7. Run relevant validation commands:

   * lint
   * typecheck, if available
   * test, if available
   * build
8. Use subagents for review when appropriate:

   * Use `next-migration-reviewer` for routing, component structure, Next.js App Router, and migration changes.
   * Use `api-security-reviewer` for API client, axios, auth, cookie, environment variable, or security-related changes.
   * Use `test-reviewer` for test, lint, typecheck, build, and validation changes.
9. If a named subagent is unavailable, continue with main-agent review and report that the subagent was unavailable.
10. Wait for all available subagent review results.
11. Fix all must-fix issues found by subagents.
12. Re-run the relevant validation commands.
13. Show `git status` and a concise diff summary.
14. Commit the work using a Conventional Commit message only if validation passes.
15. Never push to a remote repository.
16. End with a final report containing:

    * summary of changes
    * files changed
    * commands run
    * validation results
    * subagent review summary
    * remaining TODOs
    * what the user should review before pushing
    * suggested manual push command

For small text-only or styling-only changes, use a shorter cycle:

* inspect
* implement
* run only relevant checks
* summarize
* do not create unnecessary commits unless requested

---

## User approval gates

Ask the user before:

* installing new dependencies
* changing package manager
* pushing to GitHub
* deleting generated v0 files permanently
* changing visual design direction
* removing screens
* adding auth libraries
* adding map SDKs
* adding server state libraries
* modifying Git remote settings
* rebasing shared branches
* running destructive Git commands
* committing a known-broken state
* adding real environment variables
* changing backend API assumptions

---

## Frontend and backend coordination

This project has separate frontend and backend developers.

Do not assume backend API contracts unless they are provided.

When implementing API-related frontend code:

* use typed placeholders when API is not finalized
* isolate endpoint paths in `lib/api/endpoints.ts`
* keep mock data separate from API client code
* do not hard-code backend response shapes without documenting assumptions
* document API assumptions in `docs/api-policy.md` or feature-level notes
* prefer adapter/mapper functions when converting API responses to UI models

If backend API details are missing, create a reasonable temporary interface and mark it as TODO.

Do not block frontend UI work only because backend is not ready.

---

## Mock data policy

Mock data is allowed during design-to-code migration and UI development.

Store mock data under:

```txt
data/mock/
```

or:

```txt
data/mock.ts
```

Do not mix large mock data directly into page components.

Clearly separate:

* UI model types
* mock data
* API response types
* mapper functions

When real API integration begins, remove or isolate mock-only code.

---

## Documentation policy

Maintain lightweight documentation.

Recommended docs:

```txt
docs/migration-plan.md
docs/api-policy.md
docs/design-notes.md
docs/todo.md
```

Update documentation when:

* project structure changes
* API assumptions are added
* migration steps are completed
* known limitations remain
* a feature is intentionally deferred

Do not over-document trivial changes.

---

## Review expectations

Before final response, include:

* changed files summary
* what was implemented
* what was migrated or refactored
* what remains TODO
* commands run
* lint/typecheck/test/build results
* subagent review summary, if used
* risks or assumptions
* whether a commit was created
* branch name
* suggested next action for the user

---

## Safety rules

Never:

* push to remote without explicit user approval
* commit real secrets
* write real `.env` files
* remove screens without approval
* replace the approved design direction without approval
* add unnecessary libraries
* ignore TypeScript/build errors silently
* use `localStorage` for auth tokens
* run destructive Git commands without approval
* make backend API assumptions without documenting them

Prefer:

* small, reviewable commits
* feature branches
* typed API boundaries
* reusable components
* preserving existing design
* documenting assumptions
* asking for approval only at defined gates
