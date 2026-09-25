# Technical Specification: Navigation & Sidebar (F-006)

## 1. Overview
Provides role-based navigation for the application. Ensures users only see links relevant to their permissions.

## 2. Configuration
The sidebar is driven by a static configuration mapping Roles to Menu Items.

### 2.1 Menu Structure
- **Super Admin:** Dashboard, Chains, Branches, Users, Reports.
- **Chain Admin:** Dashboard, Branches, Users, Reports.
- **Branch Admin:** Dashboard, Staff, Visitors, Reports.
- **Security:** Dashboard, Register Visitor, Active Log.
- **Staff:** Dashboard, My Visitors.

## 3. Implementation
- **Component:** `Sidebar.tsx`
- **Logic:**
    1. `useAuth()` hook retrieves current `user.role`.
    2. Component looks up `sidebarConfig[role]`.
    3. Renders list of links.
    4. Highlights active route using `usePathname()`.

## 4. Security
- **Frontend:** Hides links.
- **Backend:** API Guards prevent access even if link is guessed.
