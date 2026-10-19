# Conninter mobile-expo

Native Expo Router shell for Conninter (splash → onboarding → Welcome → WebView / attendant QR).

**Expo SDK 57** — use **Expo Go** that supports SDK 57 (not SDK 58).

This is separate from the Capacitor WebView app in `../mobile/`.

## Run (Expo Go)

```bash
cd mobile-expo
npm install
npx expo start --clear
```

Scan the QR with Expo Go (SDK 57). Optional staging site:

```bash
# Windows PowerShell
$env:EXPO_PUBLIC_WEB_URL="https://staging.example.com"; npx expo start --clear
```

## Flows

1. **Splash** — white background; many brand-colored particles fly in from random directions, merge into the Conninter logo, logo holds center then moves to the top (~3s).
2. **Onboarding** — 3 image slides (visitor, delivery, attendant). In **Expo Go / `__DEV__`**, slides show on every reload. Release builds skip after Skip/Continue once.
3. **Welcome** — Hospital staff, Visitor, Family/attendant, Distributor (+ security link). **Continue as …** resumes the last persona (and last WebView URL when saved).
4. **Visitor / Delivery / Staff / Security** — embedded WebView (`/app-web`) with slim chrome, pull-to-refresh, Retry on load errors, and Back → Welcome. Last URL is remembered per persona. Staff JWT is dual-written to `localStorage` via a WebView bridge so login survives leaving the WebView (Expo Go).
5. **Attendant** — camera QR (+ torch). Invalid QR message + optional **branch code** entry. Success opens apply form in WebView; Close returns to Welcome via `replace` (no screen stack pile-up).

**Tip:** Use Expo Go on a phone — not `npm run web` — for the real app experience.

## Android preview build (EAS)

```bash
cd mobile-expo
npm install -g eas-cli   # once
eas login
eas build:configure      # once per Expo account project
npm run build:preview:android
```

Install the APK from the EAS dashboard on a device. Requires an Expo account; first run may ask to create/link the project.

## Brand

- Navy `#001B71`
- Accent `#4A90E2`
- Canvas `#F7F9FC`
