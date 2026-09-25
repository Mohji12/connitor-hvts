# 2. Use Prisma ORM

Date: 2025-07-01

## Status

Accepted

## Context

We need a way to interact with our PostgreSQL database from the NestJS backend. The solution needs to support:
*   Type safety (TypeScript).
*   Database migrations.
*   Complex relationship handling (One-to-Many, Many-to-Many).

Options considered:
1.  **TypeORM:** Traditional ORM, widely used in NestJS, uses decorators.
2.  **Prisma:** Modern ORM, generates a type-safe client from a schema file.
3.  **Raw SQL / Knex:** Maximum control but higher maintenance and less type safety.

## Decision

We decided to use **Prisma ORM**.

## Consequences

**Positive:**
*   **Type Safety:** Prisma generates TypeScript types based on the DB schema, significantly reducing runtime errors.
*   **Schema-First:** The `schema.prisma` file serves as a single source of truth for the data model.
*   **Migrations:** `prisma migrate` provides a robust workflow for schema evolution.
*   **Developer Experience:** Auto-completion and intuitive API query syntax.

**Negative:**
*   **Bundle Size:** The generated client can be large.
*   **Cold Starts:** Initial connection might be slightly slower in serverless environments (though less relevant for our containerized setup).

## Compliance

*   All database schema changes must be done via `schema.prisma`.
*   Do not manually alter the database tables; use `npx prisma migrate dev`.
