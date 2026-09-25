# 1. Monorepo Structure

Date: 2025-07-01

## Status

Accepted

## Context

We are building a Hospital Visitor Tracking System that consists of a backend API and a frontend web application. We need to decide how to organize the codebase to maximize developer productivity, code sharing, and deployment ease.

The options were:
1.  **Polyrepo:** Separate repositories for backend and frontend.
2.  **Monorepo:** A single repository containing both backend and frontend.

## Decision

We decided to use a **Monorepo** structure.

The directory structure is:
```
/
  backend/   # NestJS
  frontend/  # Next.js
  docs/      # Documentation
  nginx/     # Reverse proxy config
```

## Consequences

**Positive:**
*   **Unified Context:** Easier to understand the full system stack in one place.
*   **Atomic Commits:** Features spanning frontend and backend can be committed together.
*   **Simplified CI/CD:** A single pipeline can handle build and test for the entire application.
*   **Documentation:** Centralized documentation in `docs/` is easier to maintain.

**Negative:**
*   **Build Times:** CI pipelines might take longer if not optimized to only build changed paths.
*   **Tooling:** Requires running commands in specific subdirectories (e.g., `cd backend && npm run start`).

## Compliance

*   All agents must be aware of the root directory context.
*   Scripts in `package.json` (if any at root) should orchestrate sub-projects.
