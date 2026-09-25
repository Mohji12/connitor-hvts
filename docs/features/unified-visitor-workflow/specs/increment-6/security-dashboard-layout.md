# Security Dashboard Layout

**Task ID:** 6.1
**Increment:** 6
**Status:** Spec
**File Path:** `frontend/src/app/security/dashboard/page.tsx`

## 1. Component Overview

Create a mobile-first responsive dashboard layout for security personnel to manage visitor check-ins and logs. Features fixed bottom navigation on mobile with a split-pane layout on tablet/desktop.

## 2. Data Models

### 2.1 Component Props

```typescript
interface SecurityDashboardProps {
  branchId: string;
}
```

### 2.2 Internal State

```typescript
interface DashboardState {
  activeTab: 'check-in' | 'logs';
  isMobile: boolean;
  isLive: boolean;
  isMenuOpen: boolean;
}

interface TabConfig {
  id: 'check-in' | 'logs';
  label: string;
  icon: LucideIcon;
  ariaLabel: string;
}

interface HeaderConfig {
  title: string;
  showHamburger: boolean;
  showLiveIndicator: boolean;
}
```

### 2.3 Navigation Item

```typescript
interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
}

interface MenuItem {
  id: string;
  label: string;
  action: () => void;
  icon?: LucideIcon;
}
```

## 3. Component Structure

### 3.1 Main Component

```typescript
function SecurityDashboard(props: SecurityDashboardProps): JSX.Element
```

**Responsibilities:**
- Manage responsive layout state (mobile/desktop)
- Handle tab switching (Check-In / Logs)
- Provide header with menu and live indicator
- Render appropriate layout variant

### 3.2 Sub-Components

#### Header

```typescript
interface DashboardHeaderProps {
  title: string;
  showHamburger: boolean;
  showLiveIndicator: boolean;
  onMenuClick: () => void;
  liveStatus?: boolean;
}

function DashboardHeader(props: DashboardHeaderProps): JSX.Element
```

**Responsibilities:**
- Display page title
- Render hamburger menu button with `aria-expanded` state
- Show "Live" indicator with animated dot
- Handle menu click events

#### Bottom Navigation (Mobile Only)

```typescript
interface BottomNavigationProps {
  activeTab: 'check-in' | 'logs';
  onTabChange: (tab: 'check-in' | 'logs') => void;
  tabs: TabConfig[];
}

function BottomNavigation(props: BottomNavigationProps): JSX.Element
```

**Responsibilities:**
- Render fixed bottom navigation bar
- Display two tabs: Check-In and Logs
- Highlight active tab with visual indicator
- Handle tab selection
- Provide accessible navigation with `role="navigation"`

#### Sidebar Navigation (Desktop Only)

```typescript
interface SidebarNavigationProps {
  items: NavigationItem[];
  activeItem?: string;
  onItemClick: (item: NavigationItem) => void;
}

function SidebarNavigation(props: SidebarNavigationProps): JSX.Element
```

**Responsibilities:**
- Render left sidebar navigation
- Display navigation items with icons
- Highlight active route
- Handle item selection

#### Mobile Menu

```typescript
interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItem[];
}

function MobileMenu(props: MobileMenuProps): JSX.Element
```

**Responsibilities:**
- Render slide-in menu overlay
- Display menu items with icons
- Handle close action
- Focus trap when open
- Close on escape key

#### Live Indicator

```typescript
interface LiveIndicatorProps {
  isLive: boolean;
  label?: string;
}

function LiveIndicator(props: LiveIndicatorProps): JSX.Element
```

**Responsibilities:**
- Display green dot with pulsing animation when live
- Show "Live" text label
- Use high contrast colors (WCAG AA)
- Update animation on `isLive` state change

## 4. Layout Specifications

### 4.1 Mobile Layout (< 768px)

```
┌─────────────────────────────────┐
│ [☰] Security Dashboard  [● Live] │ ← Header (fixed top)
├─────────────────────────────────┤
│                                 │
│   Check-In Content OR           │ ← Main Content
│   Logs Content                  │   (scrollable)
│                                 │
│                                 │
├─────────────────────────────────┤
│ [✓ Check-In]  [≣ Logs]         │ ← Bottom Navigation (fixed bottom)
└─────────────────────────────────┘
```

**Layout Rules:**
- Header: Fixed position at top, height 64px
- Main Content: Scrollable area, padding bottom 80px (for bottom nav)
- Bottom Navigation: Fixed position at bottom, height 64px, z-index 50
- Menu Overlay: Fixed position, z-index 100, backdrop blur

### 4.2 Tablet/Desktop Layout (≥ 768px)

```
┌─────────────────────────────────────────────────┐
│ Sidebar │  Quick Check-In    Visitor Logs      │
│         │  (Left Pane)       (Right Pane)      │
│         │  Always visible    Data table        │
└─────────────────────────────────────────────────┘
```

**Layout Rules:**
- Sidebar: Fixed width 250px, full height
- Main Content: Flex container, split into two equal panes
- Left Pane: Quick Check-In panel with Phone/OTP inputs
- Right Pane: Visitor logs with sortable data table
- No bottom navigation on desktop

## 5. Behavior & Logic

### 5.1 Tab Switching

```typescript
function handleTabChange(tab: 'check-in' | 'logs'): void {
  activeTab = tab;
  focusOnTabContent(tab);
}
```

**Logic:**
- Update `activeTab` state
- Scroll to top of content area
- Move focus to first focusable element in new tab content
- Update URL query param `?tab=check-in|logs` (optional)
- Announce tab change to screen readers

### 5.2 Mobile Menu Toggle

```typescript
function handleMenuToggle(): void {
  isMenuOpen = !isMenuOpen;
  if (isMenuOpen) {
    trapFocusInMenu();
  }
}
```

**Logic:**
- Toggle `isMenuOpen` state
- Enable/disable body scroll when menu is open
- Trap focus within menu when open
- Focus menu button when closed

### 5.3 Live Status

```typescript
function updateLiveStatus(): void {
  // Poll or subscribe to real-time status
  isLive = checkSystemHealth();
}
```

**Logic:**
- Poll backend for live status (e.g., every 30 seconds)
- Update indicator when status changes
- Animate pulse when live
- Display "Offline" when connection lost

### 5.4 Responsive Layout Detection

```typescript
function handleResize(): void {
  isMobile = window.innerWidth < 768;
}
```

**Logic:**
- Detect viewport width on mount
- Update `isMobile` state on resize
- Debounce resize events (300ms)
- Persist layout state across tab changes

## 6. Accessibility Requirements

### 6.1 Keyboard Navigation

- Logical tab order: Header → Main Content → Bottom Nav (mobile)
- All interactive elements must be keyboard accessible
- Tab navigation between Check-In and Logs content
- Escape key closes mobile menu

### 6.2 ARIA Attributes

**Header:**
- `role="banner"` on header
- `aria-label="Security Dashboard"` on hamburger button
- `aria-expanded="{true|false}"` on hamburger button
- `aria-live="polite"` on live indicator

**Bottom Navigation:**
- `role="navigation"` with `aria-label="Dashboard navigation"`
- `aria-selected="{true|false}"` on active tab
- `aria-controls="{tab-content-id}"` on tabs

**Mobile Menu:**
- `role="dialog"` with `aria-modal="true"`
- `aria-labelledby="{menu-title}"`
- Focus trap within menu

### 6.3 Screen Reader Announcements

- "Navigated to Check-In tab" on tab switch
- "System is live" / "System is offline" on status change
- "Menu opened" / "Menu closed" on menu toggle

### 6.4 Focus Management

- Focus first focusable element in new tab content
- Return focus to tab button after menu closes
- No focus trap on modal-less interactions
- Visual focus indicator visible (2px minimum)

### 6.5 Color Contrast

- Live indicator: Green dot on white background (WCAG AA 4.5:1)
- Active tab: High contrast border/background
- Text: Slate-600 or darker on light backgrounds

## 7. Visual Language

### 7.1 Color Palette

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Header Background | White | `bg-white` |
| Header Border | Gray-200 | `border-gray-200` |
| Bottom Nav Background | White | `bg-white` |
| Bottom Nav Border | Gray-200 | `border-gray-200` |
| Active Tab Text | Emerald-600 | `text-emerald-600` |
| Inactive Tab Text | Gray-500 | `text-gray-500` |
| Active Tab Indicator | Emerald-600 | `bg-emerald-600` |
| Live Indicator (On) | Green-500 | `bg-green-500` |
| Live Indicator (Off) | Gray-400 | `bg-gray-400` |
| Menu Overlay Backdrop | Black/20% | `bg-black/20 backdrop-blur-sm` |

### 7.2 Typography

| Element | Size | Weight | Class |
|---------|------|--------|-------|
| Header Title | Text-lg | Semibold | `text-lg font-semibold text-gray-900` |
| Tab Label | Text-sm | Medium | `text-sm font-medium` |
| Live Label | Text-xs | Medium | `text-xs font-medium text-gray-600` |
| Menu Item | Text-base | Normal | `text-base text-gray-700` |

### 7.3 Spacing & Borders

| Element | Properties |
|---------|------------|
| Header | Height 64px, border-b |
| Bottom Nav | Height 64px, border-t |
| Tab Padding | Horizontal 16px, Vertical 12px |
| Border Radius | `rounded-lg` (8px) |
| Card Shadows | `shadow-sm` |
| Border Width | 1px (`border`) |

## 8. Component States

### 8.1 Tab States

| State | Visual Indicators |
|-------|-------------------|
| Active (Check-In) | Emerald-600 text + bottom border |
| Active (Logs) | Emerald-600 text + bottom border |
| Inactive | Gray-500 text, no border |
| Hover | Gray-700 text (desktop only) |
| Focus | Focus ring (2px) |

### 8.2 Live Indicator States

| State | Animation | Color |
|-------|-----------|-------|
| Live | Pulsing dot | Green-500 |
| Offline | Static dot | Gray-400 |
| Connecting | Spinning icon | Amber-500 |

### 8.3 Menu States

| State | Visual |
|-------|--------|
| Closed | Hidden, no backdrop |
| Opening | Slide-in animation from right |
| Open | Visible overlay + menu panel |
| Closing | Slide-out animation to right |

## 9. Test Cases

### 9.1 Rendering Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| Render with valid branchId | Displays dashboard with header and content |
| Render on mobile (< 768px) | Shows bottom navigation, hides sidebar |
| Render on desktop (≥ 768px) | Shows sidebar, hides bottom navigation |
| Render with default state | Check-In tab is active |
| Render with live=true | Shows pulsing green dot |
| Render with live=false | Shows static gray dot |

### 9.2 Navigation Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| Click Check-In tab | Switches to Check-In content, updates active tab |
| Click Logs tab | Switches to Logs content, updates active tab |
| Click hamburger button | Opens mobile menu overlay |
| Click menu backdrop | Closes mobile menu |
| Click menu item | Triggers item action, closes menu |
| Press Escape on open menu | Closes menu |

### 9.3 Responsive Behavior Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| Resize from mobile to desktop | Bottom nav hides, sidebar appears |
| Resize from desktop to mobile | Sidebar hides, bottom nav appears |
| Preserve active tab on resize | Active tab remains selected |

### 9.4 Accessibility Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| Tab through navigation | Logical tab order, all elements reachable |
| Enter on tab button | Activates tab, switches content |
| Enter on hamburger | Toggles menu |
| Escape on menu | Closes menu, returns focus |
| Screen reader announces tab | "Check-In tab, selected" |
| Screen reader announces live | "System is live" |
| Focus trap in menu | Tab cycles within menu elements |
| Focus moves to content on tab switch | Focus lands on first focusable element |

### 9.5 Keyboard Navigation Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| Arrow keys on bottom nav | Not implemented (tabs act as buttons) |
| Arrow keys on sidebar | Navigate between menu items (desktop) |
| Enter on menu item | Activates menu item action |

## 10. Dependencies

### 10.1 External Libraries

- `lucide-react`: Icons (`ClipboardCheck`, `List`, `Menu`, `X`)
- `clsx` / `classnames`: Conditional className merging

### 10.2 Internal Dependencies

- Shared components (from Increment 3):
  - `StatusBadge`: Used in content areas
  - `VisitorProfileCard`: Used in Logs tab (future task)

### 10.3 API Dependencies

- `GET /api/branches/:id/status`: Check branch/system live status (optional)

## 11. File Structure

```
frontend/src/app/security/dashboard/
├── page.tsx                    # Main dashboard component
└── components/
    ├── DashboardHeader.tsx     # Header with menu and live indicator
    ├── BottomNavigation.tsx    # Bottom nav (mobile)
    ├── SidebarNavigation.tsx   # Sidebar (desktop)
    ├── MobileMenu.tsx          # Slide-in menu
    ├── LiveIndicator.tsx       # Live status dot
    └── CheckInTab.tsx          # Check-In content (placeholder)
    └── LogsTab.tsx             # Logs content (placeholder)
```

## 12. Pseudo-Code

```typescript
// Main Dashboard Component
function SecurityDashboard({ branchId }: SecurityDashboardProps) {
  // State
  const [activeTab, setActiveTab] = useState<'check-in' | 'logs'>('check-in');
  const [isMobile, setIsMobile] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Effects
  useEffect(() => {
    handleResize();
    window.addEventListener('resize', debounce(handleResize, 300));
    updateLiveStatus(); // Poll for status
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handlers
  function handleTabChange(tab: 'check-in' | 'logs') {
    setActiveTab(tab);
    // Move focus to tab content
  }

  function handleMenuToggle() {
    setIsMenuOpen(prev => !prev);
  }

  // Layout Selection
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen">
        <DashboardHeader
          title="Security Dashboard"
          showHamburger={true}
          showLiveIndicator={true}
          onMenuClick={handleMenuToggle}
          liveStatus={isLive}
        />

        <main className="flex-1 overflow-y-auto pb-20">
          {activeTab === 'check-in' ? <CheckInTab /> : <LogsTab />}
        </main>

        <BottomNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabs={[...]}
        />

        {isMenuOpen && (
          <MobileMenu
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            items={[...]}
          />
        )}
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="flex h-screen">
      <SidebarNavigation items={[...]} />

      <main className="flex-1 grid grid-cols-2 gap-4 p-4">
        <div className="border rounded-lg p-4">
          <h2>Quick Check-In</h2>
          {/* Check-In content always visible */}
        </div>
        <div className="border rounded-lg p-4">
          <h2>Visitor Logs</h2>
          {/* Logs content always visible */}
        </div>
      </main>
    </div>
  );
}
```
