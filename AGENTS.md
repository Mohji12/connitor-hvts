# Agent Guidelines for Hospital Visitor Tracking System

This document provides essential instructions for AI agents working on this codebase. Follow these guidelines strictly to maintain consistency and stability.

## 1. Project Structure & Environment

This is a monorepo containing:

- **backend/**: NestJS application (API, Database, Logic)
- **frontend/**: Next.js application (UI, Client-side logic)

### Platform

- **Node.js**: Ensure compatibility with Node.js LTS (v20+ recommended).
- **Package Manager**: Use `npm`. Do not use `yarn` or `pnpm`.

---

## 2. Operational Commands

### Backend (`/backend`)

**Build & Run:**

- Build: `npm run build` (Outputs to `dist/`)
- Start (Dev): `npm run start:dev` (Watch mode)
- Start (Prod): `npm run start:prod`

**Testing:**

- **Run All Unit Tests:** `npm run test`
- **Run Single Unit Test:** `npx jest path/to/file.spec.ts` (e.g., `npx jest src/auth/auth.service.spec.ts`)
- **Run E2E Tests:** `npm run test:e2e`
- **Watch Tests:** `npm run test:watch`

**Linting & Formatting:**

- **Lint:** `npm run lint` (Fixes issues automatically)
- **Format:** `npm run format` (Runs Prettier)

**Database (Prisma):**

- **Seed DB:** `npm run prisma:seed`
- **Generate QR Codes:** `npm run generate:qrcodes`
- **Reset QR Codes:** `npm run qr:reset`

### Frontend (`/frontend`)

**Build & Run:**

- Start (Dev): `npm run dev` (Runs on localhost:3000)
- Build: `npm run build`
- Start (Prod): `npm run start`

**Linting:**

- **Lint:** `npm run lint`

---

## 3. Code Style & Conventions

### General TypeScript (Both Ends)

- **Strictness:** `strictNullChecks` is enabled. Handle `null` and `undefined` explicitly.
- **Async/Await:** Prefer `async/await` over raw Promises/callbacks.
- **Types:** Use explicit return types for functions, especially public API methods (Controllers/Services).
- **Imports:** Use absolute paths or recognized aliases where configured. Avoid deep relative paths (e.g., `../../../../`) if aliases like `@/components` are available.

### Backend (NestJS)

- **Architecture:** Follow strict NestJS modular architecture (`Module` -> `Controller` -> `Service`).
- **Dependency Injection:** Use constructor injection with `private readonly`.
- **DTOs:**
  - Use classes with `class-validator` decorators for validation.
  - Use `class-transformer` for transformations.
  - Suffix files with `.dto.ts`.
- **Entities:** Use Prisma schema as the source of truth for database entities.
- **Error Handling:** Use `HttpException` or standard NestJS exceptions (e.g., `NotFoundException`, `BadRequestException`). Do not throw generic Errors.
- **ESLint Rules:** Note that many "unsafe" TypeScript rules are currently turned `off` in `eslint.config.mjs` (e.g., `no-explicit-any`, `no-unsafe-assignment`). While you should aim for type safety, do not strictly refactor existing `any` usage unless necessary for the task.
- **Testing:**
  - Keep logic in Services to make unit testing easier.
  - Mock repositories and external services in `.spec.ts` files.

### Frontend (Next.js & React)

- **Framework:** Next.js 15 (App Router). Use `src/app` directory structure.
- **Components:**
  - Use Functional Components with TypeScript interfaces for Props.
  - Place reusable components in `src/components`.
  - Use `lucide-react` for icons.
- **Styling:**
  - **Tailwind CSS:** Use utility classes for styling.
  - **Shadcn/Radix UI:** Use existing UI components (in `src/components/ui` or similar) rather than building from scratch.
  - **Responsiveness:** Mobile-first approach using Tailwind breakpoints (`md:`, `lg:`).
- **State Management:**
  - Use `React.useState` and `React.useReducer` for local state.
  - Use `React Context` for global UI state if needed.
  - Use `TanStack Query` (React Query) for server state/data fetching.
- **Forms:** Use `react-hook-form` combined with `zod` schemas for validation.
- **Client vs Server Components:**
  - default to Server Components.
  - Add `'use client'` directive at the top of files only when using hooks or interactivity.

---

## 4. Workflow for Agents

1.  **Context First:** Before editing, strictly read the relevant files using `ls` and `read` tools. Do not guess file paths.
2.  **Verify Environment:** Check `package.json` scripts if you are unsure how to run a specific task.
3.  **Incremental Changes:** Make small, testable changes.
4.  **Test Your Work:**
    - If you modify backend logic, run the specific test file: `npx jest path/to/spec.ts`.
    - If no test exists, consider creating a basic `.spec.ts` file for verification.
5.  **No "Magic" Fixes:** Do not blindly suppress lint errors unless strictly necessary. Fix the underlying issue.
6.  **Safety:**
    - Never hardcode secrets/credentials. Use `.env` variables.
    - Do not delete database migration files or schema definitions without understanding the impact.

## 5. Specific File Patterns

- **Backend Tests:** `*.spec.ts` (Unit), `*.e2e-spec.ts` (End-to-End).
- **Frontend Pages:** `page.tsx` (Routes), `layout.tsx` (Layouts).
- **Frontend Components:** PascalCase filenames (e.g., `Button.tsx`).
- **Prisma Schema:** `backend/prisma/schema.prisma`.

## 6. Git Commit Messages

- Use the imperative mood (e.g., "Add feature", "Fix bug").
- Format: `type(scope): description`.
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
  - Example: `feat(auth): implement JWT strategy`.

---

# Agent Protocol & Project Constitution

> **The Prime Directive:** This project is managed by an AI-Human team. The state of reality is maintained in `docs/PROJECT_STATE.md`. **You must Read it before you Act.**

---

## 1. The Core Loop (Universal Workflow)

Regardless of your specific agent role, follow this cycle for every task:

1.  **Sync (Discovery):**
    - Read `docs/PROJECT_STATE.md` to understand the active phase, tech stack, and current tasks.
    - _If missing:_ Create it immediately by scanning the codebase (see Templates below).

2.  **Plan (Strategy):**
    - For **Small Tasks:** Create a checklist in your internal thought process or the Todo tool.
    - For **Complex Features:** Create a structured plan in `docs/specs/[feature-name].md`.
    - **Rule:** Never start coding without a clear, approved plan.

3.  **Execute (Implementation):**
    - Write code that matches the existing patterns (mimic style, libraries, and conventions).
    - **Strictness:** Do not introduce new dependencies/frameworks without explicit user approval.

4.  **Verify (Quality):**
    - Run existing tests.
    - Write new tests for new logic.
    - Verify linting/types pass.

5.  **Record (Documentation):**
    - Update `docs/PROJECT_STATE.md` (mark tasks complete, add notes).
    - _Crucial:_ If you learned something tricky (e.g., "Run DB with docker-compose up"), record it in the State file.

---

## 2. Directory Structure (Adaptive)

We use a **Progressive Documentation** strategy. Start small, expand as needed.

```text
project-root/
│
├── docs/
│   ├── PROJECT_STATE.md          # 🟢 THE BRAIN (Mandatory). Tracks Status, Stack, & Todo.
│   │
│   ├── knowledge/                # 📚 KNOWLEDGE BASE. Project-wide docs (Planning Workflow).
│   │   ├── PRD.md                # Project-wide Product Requirements Document
│   │   ├── ESTIMATE.md           # Project-wide implementation plan
│   │   ├── architecture/         # Project-wide architecture decisions
│   │   │   ├── ARCHITECTURE.md   # Main architecture document
│   │   │   └── *.mmd             # Mermaid diagrams
│   │   └── guides/               # How-to guides, ADRs
│   │
│   ├── features/                 # 🚀 FEATURE FOLDERS (Execution Workflow). One folder per feature.
│   │   └── <feature-name>/       # kebab-case feature identifier
│   │       ├── UX-DESIGN.md            # Feature UX spec (conditional; approved before architecture)
│   │       ├── FEATURE-ARCHITECTURE.md  # Feature-specific architecture updates
│   │       ├── TASKS.md          # Task breakdown
│   │       ├── QA-REPORT.md      # QA verification results
│   │       └── specs/            # Detailed technical specifications
│   │           └── increment-<n>/        # Specs grouped by increment
│   │               └── <task>.md         # One spec per task
│   │
│   ├── reviews/                  # 📝 CODE REVIEWS. PR/branch review reports.
│   │   └── REVIEW-REPORT-<id>.md
│   │
│   └── investigations/           # 🔍 DEBUGGING. Bug investigations & triage.
│       └── <issue>/
│           ├── TRIAGE.md
│           ├── REPRODUCTION.md
│           └── INVESTIGATION.md
│
└── ... (Project Code)
```

### Feature Folder Convention (Execution Workflow)

When starting work on a new feature (via the Orchestrator):

1.  **Derive Feature Name:** Convert the feature request to `kebab-case` (e.g., "User Authentication" → `user-auth`)
2.  **Create Folder:** `mkdir -p docs/features/<feature-name>/specs/`
3.  **Pass Path:** All agents working on this feature receive the folder path and write their outputs there

**Example:** For a feature called "payment-integration":

- UX design goes to `docs/features/payment-integration/UX-DESIGN.md` (if user-facing)
- Feature architecture goes to `docs/features/payment-integration/FEATURE-ARCHITECTURE.md`
- Tasks go to `docs/features/payment-integration/TASKS.md`
- Specs go to `docs/features/payment-integration/specs/increment-1/stripe-webhook.md`

---

## 3. Operational Modes (Roles)

Agents may switch between these modes dynamically:

- **Planner Mode:** High-level thinking. Updates `PROJECT_STATE.md`, writes Specs.
- **Builder Mode:** Low-level coding. Reads Specs, writes Code/Tests.
- **Reviewer Mode:** Safety check. Verifies Code vs Spec, runs security checks.

---

## 4. Templates

### A. The State File (`docs/PROJECT_STATE.md`)

_The living dashboard. Keep it concise._

```markdown
# 🟢 Project State

> **Mission:** [One sentence goal]
> **Phase:** [MVP / Scaling / Maintenance]

## 1. The Stack

- **Core:** [Language/Framework]
- **Key Libs:** [Important packages]

## 2. Active Tasks

| Task        | Status         | Owner        | Notes            |
| :---------- | :------------- | :----------- | :--------------- |
| [Feature A] | 🏗 In Progress | [Agent/User] | [Blockers/Links] |
| [Feature B] | ⏳ Pending     | -            | -                |

## 3. Knowledge / Constraints

- [Rule: e.g. "Use absolute imports"]
- [Command: e.g. "npm run dev:mock"]
```
