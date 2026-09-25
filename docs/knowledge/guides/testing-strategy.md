# Testing Strategy

This document outlines the testing philosophy and requirements for the project. Our goal is to **test behavior, not implementation details**.

## 1. Philosophy

- **Confidence:** Tests should give us confidence to deploy.
- **Resilience:** Refactoring implementation details should not break tests if the behavior remains the same.
- **Speed:** Unit tests must be fast. E2E tests can be slower but should be focused on critical paths.

---

## 2. Backend Testing (NestJS)

### Unit Tests (`*.spec.ts`)
- **Scope:** Individual Services and pure functions.
- **Requirement:** All Services **must** have unit tests.
- **Mocking:**
    - **Mock everything external** to the unit (Prisma, other Services, ConfigService).
    - Use `jest.spyOn` or custom mock factories.
    - **Never** hit the real database in unit tests.
- **Coverage Goal:** 80% branch coverage for business logic.

**Example:**
```typescript
it('should throw NotFoundException if user does not exist', async () => {
  jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
  await expect(service.findOne('123')).rejects.toThrow(NotFoundException);
});
```

### End-to-End (E2E) Tests (`*.e2e-spec.ts`)
- **Scope:** Full application flow (Controller -> Service -> Database).
- **Tools:** `supertest` + Jest.
- **Database:** Use a **dedicated test database** (Docker container) that is reset between runs.
- **Critical Paths:**
    - Authentication (Login, Refresh Token).
    - Visitor Check-in flow.
    - User creation (RBAC enforcement).

---

## 3. Frontend Testing (Next.js)

### Unit / Component Tests
- **Tools:** Jest + React Testing Library.
- **Focus:** User interactions.
    - "User clicks button -> Handler is called".
    - "User types invalid email -> Error message appears".
- **Mocking:** Mock API calls (MSW or Jest mocks) and Next.js navigation (`useRouter`).

### End-to-End (E2E) Tests
- **Tools:** Playwright (Recommended) or Cypress.
- **Scope:** Critical user journeys that span multiple pages.
    - "User logs in, navigates to Dashboard, and creates a Visitor Pass."
- **Environment:** Run against a staging environment or a local build with a seeded database.

---

## 4. Coverage Requirements

| Type | Target Coverage | Focus Area |
| :--- | :--- | :--- |
| **Unit (Backend)** | > 80% | Business logic, edge cases, error handling. |
| **Unit (Frontend)** | > 60% | Shared components, complex hooks, form validation. |
| **E2E** | Critical Paths | Auth, Core Business Flows (Visitor Tracking). |

## 5. Continuous Integration (CI)

- **Pull Requests:** All unit tests must pass before merging.
- **Nightly/Release:** Full E2E suite runs on a staging environment.
