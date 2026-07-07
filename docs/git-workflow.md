# Git Workflow

## Branch Strategy

`chabchu` uses `dev` as the integration branch. All implementation work must happen in a task branch and be merged into `dev` through a GitHub Pull Request.

```text
dev
<- PR
<- feature/fix/refactor/design/chore/*
```

Do not push directly to `dev`. Do not develop directly on `main`, `master`, or `dev`.

## Branch Roles

- `dev`: Integration branch for frontend and backend work before release.
- `main` or `master`: Stable branch for release-ready code.
- `feature/*`: New product functionality.
- `fix/*`: Bug fixes.
- `refactor/*`: Internal code improvements without behavior changes.
- `design/*`: UI, styling, layout, and visual changes.
- `chore/*`: Tooling, documentation, configuration, and maintenance.

## PR Creation Flow

1. Update local `dev`.
2. Create a task branch from `dev`.
3. Complete the work on the task branch.
4. Validate the work locally when possible.
5. Push the task branch.
6. Open a GitHub PR from the task branch into `dev`.
7. Request at least one frontend reviewer for frontend-related paths.
8. Merge only after review approval and CI success.

Reviews are performed per PR. The team does not review every commit or every push separately.

## Codex Work Flow

Codex may edit files and create commits when requested. Codex must not push branches, create PRs, change remotes, guess real GitHub usernames, or write real secrets.

When Codex starts from `main`, `master`, or `dev`, it should create a task branch such as `chore/setup-github-workflow`. When Codex is already on a task branch, it should continue on that branch.

## User Push Flow

After Codex creates a commit, the user pushes the task branch:

```bash
git push -u origin <branch-name>
```

Then the user creates the PR directly in GitHub with `dev` as the base branch.

## Reviewer Assignment

Frontend-related changes should request review from at least one frontend team member. CODEOWNERS can suggest or require frontend reviewers for configured paths after the real team GitHub usernames are confirmed, but enforcement requires GitHub branch protection or a ruleset.

## Pre-Merge Checklist

- PR base branch is `dev`.
- PR has at least one required approval.
- Frontend CI has passed.
- UI changes include screenshots or recordings.
- No real `.env` files or secrets are included.
- Dependency audit has no high or critical vulnerabilities.
- The branch is up to date enough to avoid risky conflicts.

## Conflict Handling

If conflicts occur, resolve them on the task branch. Prefer rebasing or merging the latest `dev` into the task branch according to the team's current convention. Re-run validation after conflict resolution, then push the updated task branch for the same PR.
