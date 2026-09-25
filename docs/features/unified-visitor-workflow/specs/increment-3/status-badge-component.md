# StatusBadge Component Specification

## 1. Overview

A reusable badge component that displays visitor status with color-coded variants. Used across both public visitor interface and security dashboard to provide visual status indicators.

**File Path:** `frontend/src/components/visitors/shared/StatusBadge.tsx`

**Purpose:**
- Display visitor status in a consistent, color-coded format
- Reusable across public and security interfaces
- Accessible with proper semantic HTML and contrast

## 2. Data Models

### TypeScript Interfaces

```typescript
// Status variant enum for type safety
export type StatusBadgeVariant = 'pending' | 'approved' | 'rejected' | 'checked-in' | 'checked-out';

// Component props interface
interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  children?: React.ReactNode; // Optional custom label
  className?: string; // Optional additional Tailwind classes
}

// Status color configuration type (internal mapping)
type StatusColorConfig = {
  background: string;
  foreground: string;
  border?: string;
};
```

### Variant-to-Color Mapping

```typescript
const statusVariantMap: Record<StatusBadgeVariant, StatusColorConfig> = {
  pending: {
    background: 'bg-blue-100 dark:bg-blue-900/20',
    foreground: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  approved: {
    background: 'bg-emerald-100 dark:bg-emerald-900/20',
    foreground: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  rejected: {
    background: 'bg-red-100 dark:bg-red-900/20',
    foreground: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  'checked-in': {
    background: 'bg-purple-100 dark:bg-purple-900/20',
    foreground: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  'checked-out': {
    background: 'bg-gray-100 dark:bg-gray-800/20',
    foreground: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
  },
};
```

## 3. Function Signatures

```typescript
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function StatusBadge({ variant, children, className }: StatusBadgeProps): JSX.Element;
```

## 4. Logic Flow

### Rendering Process

1. **Validate Input**: Accept variant prop (type-validated via TypeScript enum)
2. **Lookup Styles**: Retrieve color configuration from `statusVariantMap` based on variant
3. **Compose Classes**: Combine base Badge styles with variant-specific colors and optional `className`
4. **Render Badge**: Return Badge component with composed classes and children content
5. **Accessibility**: Ensure Badge uses semantic `<span>` element (inherited from base Badge)

### Class Composition Strategy

- Start with base Badge styles from `@/components/ui/badge`
- Apply variant-specific background color (light mode)
- Apply variant-specific foreground color (text)
- Apply variant-specific border color (for outline variants)
- Include dark mode variants (`dark:` prefix)
- Merge any additional classes from `className` prop using `cn()` utility
- Ensure contrast ratios meet WCAG AA standards for all color combinations

## 5. Code Snippets

### Component Structure

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusBadgeVariant = 'pending' | 'approved' | 'rejected' | 'checked-in' | 'checked-out';

const statusVariantMap = {
  pending: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
  rejected: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
  'checked-in': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
  'checked-out': 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/20 dark:text-gray-300 dark:border-gray-700',
};

const statusLabels: Record<StatusBadgeVariant, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  'checked-in': 'Checked In',
  'checked-out': 'Checked Out',
};

interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  children?: React.ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  const variantClasses = statusVariantMap[variant];
  const defaultLabel = statusLabels[variant];

  return (
    <Badge className={cn(variantClasses, className)} variant="outline">
      {children || defaultLabel}
    </Badge>
  );
}
```

## 6. Testing

### Component Tests (Jest/React Testing Library)

**Test Scenarios:**

1. **Variant Rendering**:
   - Verify `pending` variant renders with blue colors
   - Verify `approved` variant renders with emerald colors
   - Verify `rejected` variant renders with red colors
   - Verify `checked-in` variant renders with purple colors
   - Verify `checked-out` variant renders with gray colors

2. **Custom Labels**:
   - Verify badge displays custom text when `children` prop is provided
   - Verify badge displays default label when `children` prop is omitted

3. **Class Merging**:
   - Verify `className` prop correctly merges with variant classes
   - Verify variant classes are not overridden by `className` unless intentional

4. **Dark Mode Support**:
   - Verify dark mode classes are present in rendered output
   - Verify contrast ratios are maintained in both light and dark modes

5. **Accessibility**:
   - Verify badge renders as semantic `<span>` element
   - Verify text content is readable (contrast check)
   - Verify no keyboard traps (badge is non-interactive)

### Storybook Stories

**Story Variants:**

1. **All Variants**: Display all 5 status badges side-by-side for visual comparison
2. **With Custom Labels**: Show badges with custom text
3. **With Additional Classes**: Show badges with extra styling (e.g., larger size, custom margins)
4. **Dark Mode**: Render stories in dark mode theme
5. **Compact**: Small badge variant for dense lists
6. **Default Labels**: Show default text for each variant

## 7. Accessibility

### Contrast Requirements

- Ensure all color combinations meet WCAG AA contrast ratio (4.5:1 for normal text)
- Test all variants in both light and dark modes
- Verify text readability against background colors

### Semantic HTML

- Inherits semantic `<span>` element from base Badge component
- Badge uses `data-slot="badge"` attribute for potential testing hooks
- No interactive elements (keyboard focus not required)

### Screen Reader Support

- Badge content is announced naturally as part of parent context
- Default labels use Title Case for clarity (e.g., "Pending" vs "pending")
- No additional ARIA attributes needed for decorative status indicators

## 8. Implementation Notes

### Dependencies

- `@/components/ui/badge`: Base Badge component from shadcn/ui
- `@/lib/utils`: `cn()` utility for class name merging

### Design System Consistency

- Colors align with UX Design spec:
  - `pending` (blue) → `bg-blue-100`, `text-blue-700`
  - `approved` (emerald) → `bg-emerald-100`, `text-emerald-700`
  - `rejected` (red) → `bg-red-100`, `text-red-700`
  - `checked-in` (purple) → `bg-purple-100`, `text-purple-700`
  - `checked-out` (gray) → `bg-gray-100`, `text-gray-700`

### Usage Examples

```typescript
// Basic usage with default label
<StatusBadge variant="pending" />
// Renders: <Badge class="...blue...">Pending</Badge>

// Custom label
<StatusBadge variant="approved">Visit Confirmed</StatusBadge>

// With additional classes
<StatusBadge variant="checked-in" className="text-xs" />

// In a list
<StatusBadge variant={visit.status} />
```

### Future Extensions

- Consider adding icon support (e.g., checkmark for approved)
- Consider adding animated status changes (fade transitions)
- Consider adding size variants (sm, md, lg) if needed
