# Mobile app-style UX

Phones (any browser below `lg`, 1024px) and the Capacitor app get an app shell. Desktop layouts are unchanged.

## How the switch works

- **Markup:** `lg:hidden` (phone only), `hidden lg:block` / `max-lg:hidden` (desktop only), `max-lg:*` for phone-only tweaks.
- **Logic:** `useIsAppShell()` from `@/hooks/use-mobile` is true inside Capacitor or below `lg`. Use it only when the component tree must differ, for example a bottom sheet instead of an inline card.
- **Shared parts** (`frontend/src/components/mobile/`): `AppTopBar`, `BottomTabBar`, `MoreSheet`, `MobileListCard`, `StatusChip`, `EmptyState` / `ListSkeleton`, `ResponsiveDialog` (a bottom sheet on phones, a dialog on desktop), `MOBILE_SHEET_DIALOG_CLASS` (docks an existing `DialogContent` to the bottom), `StickyActionBar` (pass `aboveTabBar` inside the staff shell), `SegmentedControl`, `ScanVerdict`.
- **Navigation config:** `frontend/src/lib/mobile-nav-config.ts`. Each role has 3–4 bottom tabs plus a More sheet. Page titles come from the same file.

## Launch (Capacitor)

The app opens `https://www.conninter.com/app/`:

- A saved staff token goes straight to that role's dashboard.
- A saved visitor token goes to `/visitor/dashboard`.
- Otherwise the launch screen offers four choices (Visitor, Family / attendant, Hospital staff, Distributor). The last one used is listed first.

`/app` must be deployed before you rebuild and install the app.

## Bottom tabs by role

| Role | Tabs | More sheet |
| :-- | :-- | :-- |
| Super admin | Home, Hospitals, Users, Delivery | Branches, departments, sub-departments, appointments, delivery slots, vendors, settings |
| Hospital admin | Home, Appointments, Passes (AMS), Delivery | Visitors, visitor passes, visit slots, departments, users, AMS tools, delivery slots, vendors, settings |
| Chain admin | Home, Branches, Users | Settings |
| Branch admin | Home, Visitors, Passes, Users | Visit slots, settings |
| Department admin | Home, Appointments, Users | Sub-departments, settings |
| Sub-department admin | Home, Appointments, Staff | Settings |
| Security / supervisor | Scan, Today, Deliveries, Logs | On-spot visitor QR, visitor passes, all appointments, settings |
| Staff (doctor) | Home, Appointments (My visitors), Profile | — |
| Ward admin | Home (AMS), Allot, Inside, Search | Remaining AMS tools, settings |
| Receiving | Receiving | Settings |
| Purchase | Deliveries | Settings |
| Distributor | Deliveries, Book, Wallet, Fleet | Settings |
| Product admin | Logs | — |
| Visitor (`VisitorPortalShell appTabs`) | Home, Book, Wallet, Profile | — |

## Screen patterns

- **Security Scan:** a segmented control switches between Visitor, Delivery and Attendant scans. The camera has a torch button. After a scan, a large Allow / Deny / Warn card (`ScanVerdict`) appears above full-width action buttons.
- **Lists:** below `lg`, tables become `MobileListCard` lists. This covers appointments, AMS, deliveries, visitor passes, users, visitor logs, today's appointments and deliveries, and distributor deliveries.
- **Row actions and forms:** these open as bottom sheets. Examples: hold a delivery, verify a visitor, doctor approve/reject, AMS pass actions, the receiving workspace, assigning a walk-in pass, and adding a fleet driver or vehicle.
- **Wizards:** "Step x of y" with a progress bar, and the primary button in a `StickyActionBar`. This applies to visitor booking, the attendant pass and distributor delivery booking.
- **Visitor gate pass:** `/visitor/pass?id=` shows a full-screen QR. It is cached in `localStorage` (`visitorPassCache`) so it still opens offline. The cache is cleared on sign-out.
- **KPIs:** two-column grids on phones.

## QA checklist

- [x] `npx tsc --noEmit -p .`, ESLint on changed files, and `npm run build` (static export) all pass.
- [x] At 360px no public page scrolls horizontally: `/`, `/app`, `/visitor-pass`, `/attendant-pass/apply`, the staff, delivery, security and visitor logins, `/book-appointment` and `/auth/forgot-password`. The header on the sign-in pages was clipped at 360px and has been fixed.
- [x] The desktop sign-in header is unchanged at 1440px.
- [ ] Signed-in screens at 360 and 412px for each role. These need the Python API and test accounts.
- [ ] Android app: the session survives a restart, the camera and torch work on Scan, and the offline pass opens in airplane mode.
- [ ] Desktop regression at 1440px on signed-in dashboards.
