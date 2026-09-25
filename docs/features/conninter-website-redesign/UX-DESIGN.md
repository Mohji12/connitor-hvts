# Conninter website redesign

## Goal
Port the Vite Conninter marketing design into the Next.js Amplify frontend, add a branded login portal into real auth, and restyle product chrome to the navy/blue Conninter design system.

## Routes
| Route | Purpose |
|-------|---------|
| `/` | Marketing home (Navbar, Hero, Stats, How it works, Hospitals, Pricing, Staff strip, Footer) |
| `/portal` | Login hub → real `/auth/*`, `/visitor/*`, `/vendor/register` |
| `/demo` | Interactive product tour only (not production auth) |

## Design tokens
- Primary navy `#001B71`
- Accent `#4A90E2`
- Surface `#F7F9FC`
- Fonts: Inter + JetBrains Mono
- Button variant: `brand`

## Key paths
- Marketing: `frontend/src/components/home/conninter/`
- Wordmark: `frontend/src/components/brand/ConninterWordmark.tsx`
- Auth shell: `frontend/src/components/auth/AuthPageShell.tsx`
- Visitor shell: `frontend/src/components/auth/VisitorPortalShell.tsx`
- Tokens: `frontend/src/app/globals.css`

## Out of scope
- Replacing production auth with design mock OTP dashboards
- Separate Vite app alongside Next
- Backend API changes
