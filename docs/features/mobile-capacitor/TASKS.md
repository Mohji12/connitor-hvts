# Mobile app (Capacitor remote WebView)

## What it is

The `mobile/` folder is a **Capacitor shell**: local particle splash + 3-slide onboarding (`www/`), then the live Conninter site in a full-screen WebView.

- **Launch:** `www/index.html` (splash) → `www/onboarding.html` (first run) → `https://www.conninter.com/app/`
- **API:** `https://api.conninter.com` (same as browser)
- **App ID:** `com.conninter.hvts`
- **Display name:** Conninter
- **Phone Back:** WebView `goBack()` through slides and site history; on the root page the app is sent to the background (not killed). Hardware Forward (when present) calls `goForward()`.

## Prerequisites

- Node.js 20+
- **Android:** Android Studio, JDK 17, SDK
- **iOS:** macOS, Xcode, CocoaPods (`pod install` in `ios/App`), Apple Developer account for device/TestFlight

## Setup

```bash
cd mobile
npm ci
npx cap sync
```

## Environment

| Variable | Purpose |
|----------|---------|
| `CAPACITOR_SERVER_URL` | Origin for the live app after onboarding (writes `www/js/config.js`). Default: `https://www.conninter.com` |

Example (PowerShell):

```powershell
$env:CAPACITOR_SERVER_URL = "https://your-preview.vercel.app"
npm run write-config
npx cap sync
```

## Commands

| Script | Action |
|--------|--------|
| `npm run write-config` | Write `www/js/config.js` from `CAPACITOR_SERVER_URL` |
| `npm run cap:sync` | Write config, then copy `www/` into `android/` and `ios/` |
| `npm run open:android` | Open Android Studio |
| `npm run open:ios` | Open Xcode (macOS only) |
| `npm run assets` | Regenerate icons/splash from `mobile/assets/icon.png` and `splash.png` |

## Native permissions

Configured for security QR scan and video meetings:

- **Android:** `INTERNET`, `CAMERA`, `RECORD_AUDIO`
- **iOS:** `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `NSPhotoLibraryUsageDescription`

Users still approve camera/mic when the web app prompts (same as mobile browser).

## Automated smoke (CI / dev machine)

- `https://www.conninter.com/` and `https://api.conninter.com/` return HTTP 200 (remote WebView + API reachable).
- After `npx cap sync`, `android/app/src/main/assets/capacitor.config.json` has **no** `server.url` (local `www/` splash first). `www/js/config.js` `appHome` points at production (or your `CAPACITOR_SERVER_URL`) `/app/`.
- **Android `assembleDebug`** requires `ANDROID_HOME` or `android/local.properties` with `sdk.dir` (install Android Studio SDK). **iOS** requires macOS, Xcode, and `pod install` in `ios/App`.

## QA checklist (device)

- [ ] App opens splash → onboarding (first launch) → `/app/` persona chooser
- [ ] Phone Back walks onboarding slides / site history; root backgrounds the app
- [ ] Staff login at `/staff/login/` → dashboard; session survives app restart
- [ ] Security login at `/security/login/` → QR scanner requests camera
- [ ] Visitor pass at `/visitor-pass/` loads sign-in / create account
- [ ] Network traffic goes to `api.conninter.com`, not `127.0.0.1`
- [ ] Repeat on **Android** physical device or emulator
- [ ] Repeat on **iOS** simulator or iPhone (build on Mac)

## Store release (outline)

- **Android:** signed AAB from Android Studio → Google Play Console
- **iOS:** Archive in Xcode → TestFlight / App Store Connect

Do not commit release keystores or provisioning profiles.

## Regenerating native projects

If `android/` or `ios/` are removed:

```bash
cd mobile
npx cap add android
npx cap add ios
# Re-apply permission edits in AndroidManifest.xml and Info.plist if templates reset
npm run assets
npx cap sync
```
