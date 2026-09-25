# Workflow & Git Standards

This document defines how we collaborate, manage code versions, and ensure quality through our Git workflow.

## 1. Branching Strategy

We follow a **Feature Branch Workflow**.

- **`main`**: The production-ready code. Protected branch.
- **`develop`** (Optional): Integration branch for the next release.
- **Feature Branches:** Created off `main` (or `develop`).
    - Naming: `feat/<ticket-id>-<short-description>` or `fix/<ticket-id>-<short-description>`
    - Example: `feat/auth-login-page`, `fix/user-crash-bug`

## 2. Commit Messages

We follow **Conventional Commits** to automate changelogs and versioning.

**Format:** `<type>(<scope>): <description>`

- **Types:**
    - `feat`: A new feature.
    - `fix`: A bug fix.
    - `docs`: Documentation only changes.
    - `style`: Changes that do not affect the meaning of the code (white-space, formatting).
    - `refactor`: A code change that neither fixes a bug nor adds a feature.
    - `test`: Adding missing tests or correcting existing tests.
    - `chore`: Changes to the build process or auxiliary tools.

**Examples:**
- `feat(auth): implement JWT strategy`
- `fix(visitor): resolve QR code generation error`
- `docs(readme): update installation instructions`

## 3. Pull Request (PR) Process

1.  **Create PR:** Open a PR from your feature branch to `main` (or `develop`).
2.  **Title:** Must follow Conventional Commits (e.g., `feat: add user dashboard`).
3.  **Description:**
    - Link the Jira/Linear ticket.
    - Explain **what** changed and **why**.
    - Provide **"How to Test"** instructions.
    - Include screenshots/videos for UI changes.
4.  **CI Checks:**
    - Linting must pass.
    - Build must succeed.
    - All tests must pass.
5.  **Review:**
    - At least **1 approval** from a Code Reviewer or Tech Lead is required.
    - Address all comments.
6.  **Merge:** Squash and Merge is preferred to keep the history clean.

## 4. Versioning

We use **Semantic Versioning** (SemVer): `MAJOR.MINOR.PATCH`

- **MAJOR:** Incompatible API changes.
- **MINOR:** Backwards-compatible functionality.
- **PATCH:** Backwards-compatible bug fixes.

## 5. Hotfixes

For critical bugs in production:
1.  Create a `hotfix/...` branch from `main`.
2.  Fix the bug.
3.  Merge into `main` AND `develop`.
4.  Tag a new PATCH version.
