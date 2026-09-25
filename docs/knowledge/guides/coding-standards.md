# Coding Standards

This document serves as the "North Star" for code quality in the Hospital Visitor Tracking System. All code must adhere to these standards to ensure maintainability, scalability, and consistency.

## 1. General Principles

- **Strict TypeScript:** No `any`. If you must use a dynamic type, use `unknown` and narrow it safely.
- **DRY (Don't Repeat Yourself):** Extract common logic into utilities or shared services.
- **KISS (Keep It Simple, Stupid):** Avoid over-engineering. Write code that is easy to read and debug.
- **No Magic Numbers:** Use named constants or enums for all hardcoded values.
- **Comments:** Comment *why*, not *what*. Code should be self-documenting.

### Naming Conventions

| Type | Convention | Example |
| :--- | :--- | :--- |
| **Classes / Components** | PascalCase | `AuthService`, `UserProfile.tsx` |
| **Interfaces / Types** | PascalCase | `User`, `LoginResponse` |
| **Variables / Functions** | camelCase | `isLoggedIn`, `fetchUserData()` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT` |
| **Files (Backend)** | kebab-case | `auth.service.ts`, `user.controller.ts` |
| **Files (Frontend)** | PascalCase (Components) | `Button.tsx`, `Sidebar.tsx` |
| **Booleans** | Prefix with verb | `isActive`, `hasPermission`, `shouldRetry` |

---

## 2. Backend (NestJS)

### Architecture
We follow a strict **Module-Controller-Service** architecture.

1.  **Module (`*.module.ts`):** Registers providers and imports other modules.
2.  **Controller (`*.controller.ts`):** Handles HTTP requests, validation, and serialization. **No business logic here.**
3.  **Service (`*.service.ts`):** Contains all business logic and database interactions.

### Rules
- **Explicit Return Types:** All public methods (Controllers & Services) **must** have explicit return types.
    ```typescript
    // ✅ Good
    async findAll(): Promise<User[]> { ... }

    // ❌ Bad
    async findAll() { ... }
    ```
- **DTOs (Data Transfer Objects):**
    - All input payloads must be defined as DTO classes.
    - Use `class-validator` for validation decorators.
    - Use `class-transformer` if transformation is needed.
    - **Never** use raw interfaces for input validation.
- **Configuration:**
    - Use `@nestjs/config`. Never access `process.env` directly in services.
- **Error Handling:**
    - Throw specific NestJS exceptions (`NotFoundException`, `BadRequestException`).
    - **Never** throw generic `Error` objects.
    - Create custom exceptions in `src/common/exceptions` if standard ones don't fit.
- **Database (Prisma):**
    - **Migrations:** Always use `npx prisma migrate dev` for schema changes. Never edit the DB manually.
    - **Soft Deletes:** Prefer `isActive: false` or `deletedAt` over physical deletion for critical data.

---

## 3. Frontend (Next.js)

### Architecture
- **Framework:** Next.js 15 (App Router).
- **Server Components:** Default to Server Components. Add `'use client'` only when interactivity (hooks, event listeners) is required.
- **Folder Structure:**
    - `src/app`: Routes and pages.
    - `src/components`: Reusable UI components.
    - `src/lib`: Utilities, API clients, Zod schemas.
    - `src/hooks`: Custom React hooks.

### UI & Styling
- **Component Library:** Use **ShadCN UI** for base components.
- **Styling:** **Tailwind CSS**.
    - Avoid arbitrary values (e.g., `w-[123px]`). Use theme tokens (e.g., `w-32`).
    - Use `clsx` or `cn()` utility for conditional class merging.
- **Icons:** Use `lucide-react`.

### State Management
1.  **URL State:** (Search params) for filters, pagination, sorting. Shareable and bookmarkable.
2.  **Server State:** (React Query / TanStack Query) for API data.
3.  **Global Store:** (Context API) Only for truly global UI state (e.g., Sidebar open/close, Theme).
4.  **Local State:** (`useState`, `useReducer`) for form inputs and toggles.

### Forms
- Use **React Hook Form**.
- Use **Zod** for schema validation.
- Define schemas in `src/lib/schemas` or alongside the component if specific.

---

## 4. API & Communication

- **REST:** Use standard HTTP methods (GET, POST, PUT, PATCH, DELETE).
- **Status Codes:**
    - `200 OK`: Success.
    - `201 Created`: Resource created.
    - `400 Bad Request`: Validation error.
    - `401 Unauthorized`: Not logged in.
    - `403 Forbidden`: Logged in but no permission.
    - `404 Not Found`: Resource doesn't exist.
    - `500 Internal Server Error`: Server crashed.
