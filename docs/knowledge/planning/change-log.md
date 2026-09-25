# 📅 Change Log

## [2026-01-06]
- **F-007 Architecture Simplification:** Removed GCP Storage dependency for WhatsApp media delivery.
  - Gate pass images now uploaded directly to Meta's Media API (upload-first approach).
  - Cancelled TASK-007 (`uploadGatePassImage()` in GcpStorageService).
  - Added TASK-012 (Import `MessagingModule` in `NotificationsModule`).
  - Total implementation reduced: ~5.5 hours (vs. previous estimate with GCP integration).

## [2024-12-30]
- **Documentation Restructure:** Migrated legacy `docs/backend` and `docs/frontend` into `docs/04-features`.
- **Feature Definition:** Formalized features F-001 to F-006 with dedicated Tech Specs.
- **Architecture Update:** Adopted "Meeting vs. Delivery" split for Visitor Workflow (ADR-003).
- **Planning:** Initialized `roadmap.md` and `active-sprint.md`.

## [2024-12-18]
- **Project Init:** Monorepo setup with NestJS and Next.js.
- **ADR-001:** Monorepo structure accepted.
- **ADR-002:** Prisma ORM accepted.
