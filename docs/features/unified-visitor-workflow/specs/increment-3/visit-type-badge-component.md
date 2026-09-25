# VisitTypeBadge Component Specification

## 1. Overview

**Purpose**: Display the visit type (Meeting or Delivery) with consistent styling across both public and security interfaces.

**Location**: `frontend/src/components/visitors/shared/VisitTypeBadge.tsx`

**Usage Context**: Used in visitor cards, list items, and detail views to visually distinguish between Meeting and Delivery visit types. Consistent with the design system's visual language.

---

## 2. Data Models

### 2.1 Props Interface

```typescript
import { VisitCategory } from '@/lib/constants/visit-constants';

export interface VisitTypeBadgeProps {
  /**
   * The visit type to display
   */
  visitType: VisitCategory.MEETING | VisitCategory.DELIVERY;

  /**
   * Optional custom className for additional styling
   */
  className?: string;
}
```

### 2.2 Variants

```typescript
// From: frontend/src/lib/constants/visit-constants.ts
export enum VisitCategory {
  MEETING = 'MEETING',
  DELIVERY = 'DELIVERY',
}
```

---

## 3. Function Signature

```typescript
export function VisitTypeBadge({
  visitType,
  className,
}: VisitTypeBadgeProps): JSX.Element;
```

---

## 4. Logic Flow

1. **Import Dependencies**:
   - Import `Badge` component from `@/components/ui/badge`
   - Import `VisitCategory` enum from `@/lib/constants/visit-constants`
   - Import `cn` utility from `@/lib/utils`
   - Import relevant icons from `lucide-react` (Users for Meeting, Package for Delivery)

2. **Component Function**:
   - Accept `visitType` and optional `className` as props
   - Determine icon based on visit type:
     - `MEETING` → `Users` icon
     - `DELIVERY` → `Package` icon

3. **Variant Styling**:
   - Use a switch statement or lookup object to map visit type to Tailwind classes
   - Apply appropriate icon for each variant

4. **Render Badge**:
   - Return `Badge` component with `variant="outline"` (for consistent styling)
   - Apply mapped Tailwind classes for text and border colors
   - Include icon before text
   - Merge optional `className` prop using `cn` utility
   - Set semantic attributes (aria-label) for accessibility

---

## 5. Variants Mapping

| Visit Type | Text Color | Border Color | Icon | Label |
|------------|------------|---------------|------|-------|
| `MEETING` | `text-emerald-600` | `border-emerald-600` | `Users` | Meeting |
| `DELIVERY` | `text-amber-600` | `border-amber-600` | `Package` | Delivery |

**Note**: These colors match the design system's color palette from UX-DESIGN.md.

---

## 6. Styling

### 6.1 Badge Base Styles

Use the existing `Badge` component with `variant="outline"` for base styling:
- `inline-flex`
- `items-center justify-center`
- `rounded-md`
- `border`
- `px-2 py-0.5`
- `text-xs font-medium`
- `w-fit whitespace-nowrap shrink-0`

### 6.2 Additional Custom Classes

Add variant-specific classes for color:
```typescript
// Meeting variant
'border-emerald-600 text-emerald-600'

// Delivery variant
'border-amber-600 text-amber-600'
```

### 6.3 Icon Styling

```typescript
className="mr-1 h-3 w-3"
```

This ensures proper spacing between icon and text, matching the StatusBadge pattern.

---

## 7. Accessibility

### 7.1 Semantic HTML

- Use `span` element (from Badge component) with proper semantic meaning
- Add `aria-label` attribute to announce the visit type to screen readers
- Include icons with `aria-hidden="true"` (icons are decorative, text provides meaning)

### 7.2 Color Contrast

- `emerald-600` on white/light backgrounds meets WCAG AA standards
- `amber-600` on white/light backgrounds meets WCAG AA standards
- If used on dark backgrounds, ensure sufficient contrast (consider adding background color classes if needed)

### 7.3 Screen Reader Support

```typescript
<Badge
  variant="outline"
  className={cn(variantStyles, className)}
  aria-label={`Visit type: ${visitType.toLowerCase()}`}
>
  <Icon aria-hidden="true" className="mr-1 h-3 w-3" />
  {visitType === VisitCategory.MEETING ? 'Meeting' : 'Delivery'}
</Badge>
```

---

## 8. Testing

### 8.1 Component Tests (Jest + React Testing Library)

**Test Scenarios**:

1. **Render Correct Variant**:
   - Render with `visitType={VisitCategory.MEETING}` → verify "Meeting" text and emerald colors
   - Render with `visitType={VisitCategory.DELIVERY}` → verify "Delivery" text and amber colors

2. **Icon Rendering**:
   - Verify `Users` icon is rendered for Meeting type
   - Verify `Package` icon is rendered for Delivery type

3. **Styling Application**:
   - Verify `border-emerald-600` and `text-emerald-600` classes for Meeting
   - Verify `border-amber-600` and `text-amber-600` classes for Delivery

4. **Accessibility**:
   - Verify `aria-label` attribute is present and includes visit type
   - Verify icon has `aria-hidden="true"`
   - Verify element is focusable (Badge has focus-visible styles)

5. **Custom className**:
   - Verify custom className is merged correctly with base styles
   - Test that custom classes don't break variant styling

6. **Edge Cases**:
   - Test with invalid visit type (if TypeScript allows) → should handle gracefully

### 8.2 Storybook Stories

Create stories in `frontend/src/components/visitors/shared/VisitTypeBadge.stories.tsx`:

```typescript
export default {
  title: 'Visitors/Shared/VisitTypeBadge',
  component: VisitTypeBadge,
};

export const Meeting: Story = {
  args: {
    visitType: VisitCategory.MEETING,
  },
};

export const Delivery: Story = {
  args: {
    visitType: VisitCategory.DELIVERY,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <VisitTypeBadge visitType={VisitCategory.MEETING} />
      <VisitTypeBadge visitType={VisitCategory.DELIVERY} />
    </div>
  ),
};
```

---

## 9. Implementation Notes

### 9.1 File Location

**Path**: `frontend/src/components/visitors/shared/VisitTypeBadge.tsx`

### 9.2 Dependencies

```typescript
// External
import { Users, Package } from 'lucide-react';

// Internal UI Components
import { Badge } from '@/components/ui/badge';

// Internal Utilities
import { cn } from '@/lib/utils';
import { VisitCategory } from '@/lib/constants/visit-constants';
```

### 9.3 Consistency with Existing Patterns

- Follow the pattern from `StatusBadge` implementation in `SecurityVisitorLogs.tsx`
- Use `Badge` component with `variant="outline"` as base
- Apply custom color classes for variant differentiation
- Include icon with `mr-1 h-3 w-3` spacing
- Use `cn` utility for className merging

### 9.4 Usage Example

```typescript
import { VisitTypeBadge } from '@/components/visitors/shared/VisitTypeBadge';
import { VisitCategory } from '@/lib/constants/visit-constants';

// In a visitor card component
function VisitorProfileCard({ visitor }) {
  return (
    <div className="flex items-center gap-3">
      {/* ... other content ... */}
      <VisitTypeBadge visitType={visitor.visitType} />
    </div>
  );
}

// In a list item
function VisitorListItem({ visitor }) {
  return (
    <div>
      <p>{visitor.name}</p>
      <VisitTypeBadge visitType={visitor.visitType} className="mt-1" />
    </div>
  );
}

// With both badges (Status and VisitType)
function VisitorBadges({ visitor }) {
  return (
    <div className="flex gap-2">
      <VisitTypeBadge visitType={visitor.visitType} />
      <StatusBadge status={visitor.status} />
    </div>
  );
}
```

### 9.5 TypeScript Exports

```typescript
// Named export for the component
export { VisitTypeBadge };

// Named export for the props interface (useful for testing)
export type { VisitTypeBadgeProps };

// Default export (optional, depending on project convention)
export default VisitTypeBadge;
```

---

## 10. Appendix: Complete Type Definitions

```typescript
// frontend/src/components/visitors/shared/VisitTypeBadge.tsx

import * as React from 'react';
import { Users, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VisitCategory } from '@/lib/constants/visit-constants';

export interface VisitTypeBadgeProps {
  /**
   * The visit type to display
   */
  visitType: VisitCategory.MEETING | VisitCategory.DELIVERY;

  /**
   * Optional custom className for additional styling
   */
  className?: string;
}

export function VisitTypeBadge({
  visitType,
  className,
}: VisitTypeBadgeProps): JSX.Element {
  // Implementation goes here
}
```

---

## 11. References

- **UX Design**: See section 4.3 "Shared Components" in `docs/features/unified-visitor-workflow/UX-DESIGN.md`
- **Feature Architecture**: See section 6.1 "Frontend Components" in `docs/features/unified-visitor-workflow/FEATURE-ARCHITECTURE.md`
- **Base Component**: `frontend/src/components/ui/badge.tsx`
- **Similar Pattern**: StatusBadge implementation in `frontend/src/components/visitors/SecurityVisitorLogs.tsx` (inline)
- **Constants**: `frontend/src/lib/constants/visit-constants.ts`
