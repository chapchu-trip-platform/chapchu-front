# Pull Request Guide

## Creating a PR

1. Push your task branch to GitHub.
2. Open a new Pull Request on GitHub.
3. Set the base branch to `dev`.
4. Set the compare branch to your task branch, such as `feature/login-page` or `chore/setup-github-workflow`.
5. Fill out the PR template.
6. Request the appropriate reviewers.

## PR Title

Use a short conventional title:

```text
type: summary
```

Examples:

- `feature: add login form`
- `fix: handle expired session`
- `design: update home layout`
- `refactor: simplify api client`
- `chore: setup github workflow`

## PR Body

Use the PR template sections:

- Summary
- Changes
- Screenshots
- Validation
- Security Checklist
- Review Points
- Notes

For UI changes, attach screenshots or recordings. If screenshots are not applicable, write `N/A`.

## Reviewer Rules

Frontend-related PRs must request at least one frontend reviewer.

Reviews are performed at the PR level. The team does not require review for every commit or every push.

Do not add `.github/CODEOWNERS` until the real frontend team GitHub usernames are confirmed.

## Required GitHub Settings

CODEOWNERS alone does not force review requirements. A repository admin must configure branch protection or a ruleset for `dev` in GitHub Settings.

Configure the following for `dev`:

- Create branch protection or a ruleset for `dev`.
- Enable `Require pull request before merging`.
- Set `Require approvals` to `1`.
- Enable `Require status checks to pass`.
- Add required status check: `Frontend CI`.
- Enable `Block force pushes`.
- Enable `Restrict deletions`.

After real CODEOWNERS are added, enable `Require review from Code Owners`.
