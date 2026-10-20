# Increment 4 — Native offline gate module (stub)

**Status:** Done. Bundled `mobile/www/offline-gate.html` plus AES-GCM vault (Preferences/localStorage). SQLCipher can replace the vault later without changing the verify API.

## Intent

A locally bundled scanner and encrypted SQLite so verification still works in airplane mode after a valid manifest was synced. `www.conninter.com` cannot be the only entry point.

## Planned work

- Local HTML/TS gate screen inside `mobile/www/` or a Capacitor local route (no secrets in assets).
- Encrypted SQLite (plugin must actually encrypt; key in Android Keystore / iOS Keychain).
- `GateScanner` / local verifier: signature, gate scope, expiry, manifest age, local duplicates.
- Atomic local `gate_event` insert + redemption.
- Visible offline status; cached QR images remain display-only.

## Done when

Airplane-mode scan of a valid, unexpired cached pass succeeds; forged / expired / wrong-gate / revoked-before-sync fails.
