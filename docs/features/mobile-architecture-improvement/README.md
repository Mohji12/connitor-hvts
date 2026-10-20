# Mobile architecture improvement

Evolve Conninter from a WebView-only APK into a reliable hybrid app: live Next.js for online work, plus a dedicated offline gate-verification path later.

This increment (Phase 01–02) writes the spec, audits the current shell, and hardens session / navigation / API reliability. Offline signed manifests, encrypted SQLite, and native scan verification are specified here and **not implemented yet**.

## Decisions

| Decision | Choice |
| --- | --- |
| Primary mobile shell | Capacitor `mobile/` (`com.conninter.hvts`) |
| Product UI | Shared Next.js 15 (`frontend/`) at `https://www.conninter.com` |
| Authorization authority | FastAPI `python_backend/` at `https://api.conninter.com` |
| Database | Existing MySQL (migrations: `python_backend/scripts/migrate_*.py`, not Alembic) |
| Expo `mobile-expo/` | Frozen until the Capacitor shell is stable |
| Cached QR image (`visitorPassCache` / `deliveryPassCache`) | Display-only. Never proof of authorization |

## Non-goals

- Do not rebuild dashboards in React Native.
- Do not upgrade Capacitor, Android Gradle Plugin, or Gradle as part of this work.
- Do not treat a cached QR as a valid gate decision.
- Do not ship offline acceptance until Phases 03–06 and a security/ops review.

## Folder

| File | Purpose |
| --- | --- |
| [FEATURE-ARCHITECTURE.md](FEATURE-ARCHITECTURE.md) | Target architecture, contracts, security |
| [CURRENT-BASELINE.md](CURRENT-BASELINE.md) | Phase 01 repository audit |
| [TASKS.md](TASKS.md) | Phases 01–06 |
| [specs/](specs/) | Increment specs (01–02 implemented; 03–06 stubs) |
