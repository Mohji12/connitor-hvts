# GatePassView Component Specification

## Overview

The `GatePassView` component displays a visitor's approved gate pass containing visitor photo, name, host information, and a prominent Check-In OTP. It supports four states: loading, success, error, and expired. The component is used in both the public visitor status page and the security dashboard details modal.

**File Path:** `frontend/src/components/visitors/shared/GatePassView.tsx`

---

## Data Models

### TypeScript Interfaces

```typescript
import { VisitCategory } from '@/lib/constants/visit-constants';

interface VisitorData {
  id: string;
  visitorName: string;  // Aligned with VisitorSummary schema
  visitorPhone: string;
  visitorPhoto?: string;  // Aligned with VisitorSummary schema
  visitType: VisitCategory.MEETING | VisitCategory.DELIVERY;  // Using VisitCategory enum
  visitDate: Date;
  visitTime: string;
  purpose?: string;
  host?: {
    name: string;
    department: string;
  };
  deliveryInfo?: {
    platform?: string;
    recipient: string;
  };
}

interface GatePassViewProps {
  visitor: VisitorData;
  otp: string;
  validityTimestamp: Date;
  loading?: boolean;
  error?: string | null;
  expired?: boolean;
  showQRCode?: boolean;
  className?: string;
}

interface GatePassState {
  type: 'loading' | 'success' | 'error' | 'expired';
}
```

---

## Component Structure

### Function Signature

```typescript
export function GatePassView({
  visitor,
  otp,
  validityTimestamp,
  loading = false,
  error = null,
  expired = false,
  showQRCode = false,
  className,
}: GatePassViewProps): JSX.Element;
```

---

## Logic Flow

### State Determination

The component determines its display state based on the following priority order:

1. **Loading State**: When `loading` prop is `true`, display skeleton loaders regardless of other props
2. **Error State**: When `error` prop has a non-null value, display error message
3. **Expired State**: When `expired` prop is `true` or `validityTimestamp` is in the past, display expired message
4. **Success State**: When none of the above conditions are met, display the full gate pass

### Loading State

- Display a skeleton loader matching the gate pass layout
- Use skeleton blocks for visitor photo, name, host info, and OTP area
- Maintain card structure and dimensions for smooth transition to success state

### Success State

- Display card header with "Gate Pass" title and "Approved" badge (green/emerald variant)
- Show visitor section:
  - Large avatar/photo (128px diameter)
  - Full visitor name (from visitorName field) in bold
- Display visit details:
  - Visit date and time in localized format
  - Purpose of visit (if available)
  - Visit type badge (Teal/Emerald for Meeting, Amber/Orange for Delivery)
- Conditionally show host information for Meeting visits:
  - Host name
  - Department
- Display OTP section:
  - Header: "SHOW TO SECURITY:" in uppercase
  - 6-digit OTP in large, high-contrast font (monospace recommended)
  - Letter-spacing for readability
- Display validity section:
  - "Valid until:" label
  - Formatted validity timestamp
- Conditionally display QR code placeholder (when `showQRCode` is `true`)

### Error State

- Display error card with minimal styling
- Show error icon and error message from `error` prop
- Provide retry action (optional, via callback if needed)

### Expired State

- Display expired gate pass with degraded styling (muted colors)
- Show expired message prominently
- Display the original visitor information for reference
- Show that OTP is no longer valid
- Provide "Contact Security" action (optional)

---

## Styling

### Typography and Spacing

- **OTP Display**: 48px-64px font size, monospace font family, letter-spacing of 0.25em
- **Visitor Name**: 24px font weight bold
- **Section Headers**: 14px uppercase tracking-wide text-muted-foreground
- **Card Padding**: 24px on all sides
- **Section Spacing**: 16px vertical spacing between major sections

### Color Scheme

- **Approved Badge**: Emerald/Teal background (`bg-emerald-500`) with white text
- **Meeting Badge**: Teal text (`text-emerald-600`) on light background
- **Delivery Badge**: Amber/Orange text (`text-amber-600`) on light background
- **OTP Display**: High contrast dark text (`text-gray-900`) on light background
- **Expired State**: Muted grays (`text-gray-500`, `border-gray-200`)
- **Error State**: Red accent (`text-red-600`)

### Layout

- Mobile-first design, max-width 480px for public view
- Centered layout with consistent horizontal padding
- Responsive avatar size: 128px on mobile, 144px on tablet/desktop
- Flexbox or Grid for section alignment
- Vertical stacking of all information blocks

---

## Accessibility

### High Contrast OTP

- OTP text must meet WCAG AA contrast ratio (minimum 4.5:1)
- Use monospace font for character clarity
- Consider adding letter-spacing for digit separation
- Ensure background color provides sufficient contrast

### Screen Reader Support

- Add `aria-live="polite"` to error and expired state containers
- Include `aria-label` for OTP display (e.g., "Check-in one time password: 847291")
- Use semantic HTML elements for structure
- Provide `alt` text for visitor image
- Include `role="status"` for the approved badge

### Keyboard Navigation

- Ensure all interactive elements are focusable
- Maintain logical tab order
- Provide visible focus indicators

---

## Testing

### Component Unit Tests

Test the following scenarios:

1. **Loading State**:
   - Verify skeleton loader is displayed when `loading=true`
   - Verify skeleton structure matches expected layout
   - Confirm visitor data is not rendered in loading state

2. **Success State - Meeting Visit**:
   - Verify visitor photo displays correctly
   - Confirm visitor name is shown (from visitorName field)
   - Verify host information is displayed (name and department)
   - Check OTP is rendered in large, monospace font
   - Validate visit date and time formatting
   - Confirm "Approved" badge is green/emerald

3. **Success State - Delivery Visit**:
   - Verify host information is NOT displayed
   - Confirm delivery information shows platform and recipient
   - Validate delivery badge uses amber/orange colors

4. **Error State**:
   - Verify error message displays when `error` prop is provided
   - Confirm error takes priority over expired state
   - Check error icon is displayed

5. **Expired State**:
   - Verify expired message displays when `expired=true`
   - Confirm styling is muted/degraded
   - Check that visitor information is still visible
   - Validate expired state is triggered when validityTimestamp is in the past

6. **Edge Cases**:
   - Handle missing visitor photo (show initials or default avatar)
   - Handle missing purpose field (omit section)
   - Handle invalid validity timestamp
   - Verify QR code placeholder displays only when `showQRCode=true`

### Storybook Stories

Create the following stories:

1. **Default (Success - Meeting)**: Full gate pass with meeting visit
2. **Delivery Visit**: Gate pass for delivery without host info
3. **Loading**: Skeleton loader state
4. **Error**: Error state with message
5. **Expired**: Expired gate pass with muted styling
6. **With QR Code**: Success state including QR code placeholder
7. **No Photo**: Success state with missing visitor photo

### Visual Regression Tests

- Capture screenshots for all state variants
- Test across mobile and tablet breakpoints
- Verify OTP display contrast meets accessibility standards
- Ensure consistent styling with design system

---

## Implementation Notes

### Existing UI Components

- Use `Card`, `CardHeader`, `CardTitle`, `CardContent` from `@/components/ui/card`
- Use `Avatar`, `AvatarImage`, `AvatarFallback` from `@/components/ui/avatar`
- Use `Badge` from `@/components/ui/badge` with appropriate variants
- Use existing `cn` utility for className merging from `@/lib/utils`

### Date Formatting

- Use browser's `Intl.DateTimeFormat` or similar for localized date/time display
- Consider time zone handling for validity timestamp
- Format example: "Valid until: 12:30 PM"

### Avatar Fallback

- When `visitor.photoUrl` is missing or fails to load, display initials
- Generate initials from first letter of first and last name
- Use `AvatarFallback` component for this behavior

### QR Code (Future Enhancement)

- Current implementation: Display placeholder box when `showQRCode=true`
- Future: Integrate QR code generation library when needed for record keeping
- QR code should contain visit UUID or similar identifier

### Responsive Design

- Use Tailwind CSS breakpoints: `md:` for tablet, `lg:` for desktop
- Mobile-first approach with default styles for small screens
- Adjust avatar size and spacing at breakpoints

### State Priority Logic

```typescript
// State determination order:
// 1. Loading (highest priority)
// 2. Error
// 3. Expired
// 4. Success (default)
```

---

## Example Usage

### Success State (Meeting Visit)

```typescript
<GatePassView
  visitor={{
    id: "123e4567-e89b-12d3-a456-426614174000",
    visitorName: "John Doe",
    visitorPhone: "+91 99999 99999",
    visitorPhoto: "https://storage.example.com/photos/john-doe.jpg",
    visitType: VisitCategory.MEETING,
    visitDate: new Date("2026-01-26"),
    visitTime: "10:00 AM",
    purpose: "Consultation",
    host: {
      name: "Dr. Smith",
      department: "Cardiology"
    }
  }}
  otp="847291"
  validityTimestamp={new Date("2026-01-26T14:00:00")}
/>
```

### Success State (Delivery Visit)

```typescript
<GatePassView
  visitor={{
    id: "456e7890-e89b-12d3-a456-426614174001",
    visitorName: "Jane Roe",
    visitorPhone: "+91 88888 88888",
    visitType: VisitCategory.DELIVERY,
    visitDate: new Date("2026-01-26"),
    visitTime: "11:30 AM",
    deliveryInfo: {
      platform: "Zomato",
      recipient: "Nursing Station"
    }
  }}
  otp="123456"
  validityTimestamp={new Date("2026-01-26T15:00:00")}
/>
```

### Loading State

```typescript
<GatePassView
  visitor={placeholderVisitorData}
  otp=""
  validityTimestamp={new Date()}
  loading={true}
/>
```

### Error State

```typescript
<GatePassView
  visitor={placeholderVisitorData}
  otp=""
  validityTimestamp={new Date()}
  error="Unable to load gate pass. Please try again."
/>
```

### Expired State

```typescript
<GatePassView
  visitor={visitorData}
  otp="847291"
  validityTimestamp={new Date("2026-01-26T10:00:00")}
  expired={true}
/>
```
