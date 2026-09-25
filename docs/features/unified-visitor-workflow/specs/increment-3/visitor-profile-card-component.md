# VisitorProfileCard Component Specification

## 1. Overview

A reusable card component that displays visitor information in two variants: compact (for lists) and full (for modals/details). Used across public visitor interface and security dashboard to provide consistent visitor information display.

**File Path:** `frontend/src/components/visitors/shared/VisitorProfileCard.tsx`

**Purpose:**
- Display visitor profile summary in a consistent format
- Support both compact (list item) and full (card) layouts
- Integrate with existing UI components (Avatar, Card, Badge)
- Provide optional action buttons slot for flexibility

## 2. Data Models

### TypeScript Interfaces

```typescript
// Visit type enum (from VisitCategory constants)
import { VisitCategory } from '@/lib/constants/visit-constants';

// Component props interface
interface VisitorProfileCardProps {
  // Visitor data (matching VisitorSummarySchema)
  visitor: {
    id: string;
    visitorName: string;
    visitorPhone: string;
    visitorEmail?: string | null;
    visitorPhoto?: string | null;
    visitType?: VisitCategory.MEETING | VisitCategory.DELIVERY;
    status: 'PENDING' | 'REQUEST_SENT' | 'APPROVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'REJECTED';
    personToMeet?: string;
    purpose?: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
  };

  // Layout variant
  compact?: boolean;

  // Optional action buttons slot
  actions?: React.ReactNode;

  // Additional styling
  className?: string;

  // Click handler (for interactive cards)
  onClick?: () => void;
}
```

## 3. Function Signatures

```typescript
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { VisitTypeBadge } from './VisitTypeBadge';

export function VisitorProfileCard({
  visitor,
  compact = false,
  actions,
  className,
  onClick
}: VisitorProfileCardProps): JSX.Element;
```

## 4. Logic Flow

### Rendering Process

1. **Determine Layout**: Check `compact` prop to select layout variant
2. **Generate Initials**: Extract initials from `visitorName` for avatar fallback
3. **Render Avatar**:
   - If `visitorPhoto` exists, display image
   - If image fails to load or doesn't exist, display initials
4. **Display Badges**: Render StatusBadge and VisitTypeBadge based on visitor data
5. **Apply Layout**:
   - **Compact**: Horizontal layout, minimal details
   - **Full**: Vertical layout with expanded details
6. **Render Actions**: Display action buttons if `actions` prop provided
7. **Handle Interactivity**: Attach `onClick` handler if provided
8. **Apply Styling**: Combine base styles with optional `className`

### Initials Generation

- Split `visitorName` by spaces
- Take first character of each part
- Limit to 2 characters maximum
- Convert to uppercase
- Default to "U" (Unknown) if name is empty

### Layout Variants

#### Compact Layout (`compact={true}`)
- Horizontal row layout
- Avatar on left (small, 40px)
- Name and phone on right
- Badges inline with name
- Actions on far right
- Background: transparent or light gray

#### Full Layout (`compact={false}`)
- Card-based layout
- Avatar centered or top-left (medium, 64px)
- Name, phone, email stacked vertically
- Badges below name
- Person to meet, purpose as separate fields
- Actions in footer area
- Card with border and subtle shadow

## 5. Code Snippets

### Component Structure

```typescript
'use client';

import React from 'react';
import { User, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { VisitTypeBadge } from './VisitTypeBadge';
import { VisitCategory } from '@/lib/constants/visit-constants';

interface VisitorProfileCardProps {
  visitor: {
    id: string;
    visitorName: string;
    visitorPhone: string;
    visitorEmail?: string | null;
    visitorPhoto?: string | null;
    visitType?: VisitCategory.MEETING | VisitCategory.DELIVERY;
    status: 'PENDING' | 'REQUEST_SENT' | 'APPROVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'REJECTED';
    personToMeet?: string;
    purpose?: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
  };
  compact?: boolean;
  actions?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function VisitorProfileCard({
  visitor,
  compact = false,
  actions,
  className,
  onClick,
}: VisitorProfileCardProps) {
  const [imgError, setImgError] = React.useState(false);
  const [imgLoading, setImgLoading] = React.useState(true);

  const initials = visitor.visitorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={visitor.visitorPhoto || ''}
            alt={visitor.visitorName}
            className="object-cover"
            onError={() => setImgError(true)}
          />
          <AvatarFallback className="bg-primary/10 text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm truncate">{visitor.visitorName}</p>
            {visitor.visitType && <VisitTypeBadge visitType={visitor.visitType} />}
          </div>
          <p className="text-xs text-muted-foreground truncate">{visitor.visitorPhone}</p>
          {visitor.personToMeet && (
            <p className="text-xs text-muted-foreground truncate">
              Meeting {visitor.personToMeet}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <StatusBadge variant={getStatusVariant(visitor.status)} />
          {actions && <div className="ml-2">{actions}</div>}
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'p-4 hover:shadow-md transition-shadow',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex gap-4">
        <Avatar className="h-16 w-16 flex-shrink-0">
          <AvatarImage
            src={visitor.visitorPhoto || ''}
            alt={visitor.visitorName}
            className="object-cover"
            onError={() => setImgError(true)}
          />
          <AvatarFallback className="bg-primary/10 text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-base">{visitor.visitorName}</h3>
              {visitor.visitType && <VisitTypeBadge visitType={visitor.visitType} />}
              <StatusBadge variant={getStatusVariant(visitor.status)} />
            </div>

          <p className="text-sm text-muted-foreground mb-1">{visitor.visitorPhone}</p>
          {visitor.visitorEmail && (
            <p className="text-sm text-muted-foreground mb-1 truncate">{visitor.visitorEmail}</p>
          )}

          {visitor.personToMeet && (
            <p className="text-sm mb-1">
              <span className="text-muted-foreground">Meeting:</span> {visitor.personToMeet}
            </p>
          )}

          {visitor.purpose && (
            <p className="text-sm mb-1">
              <span className="text-muted-foreground">Purpose:</span> {visitor.purpose}
            </p>
          )}
        </div>
      </div>

      {actions && <div className="mt-4 pt-4 border-t">{actions}</div>}
    </Card>
  );
}

function getStatusVariant(status: string): 'pending' | 'approved' | 'rejected' | 'checked-in' | 'checked-out' {
  switch (status) {
    case 'PENDING':
    case 'REQUEST_SENT':
      return 'pending';
    case 'APPROVED':
      return 'approved';
    case 'REJECTED':
      return 'rejected';
    case 'CHECKED_IN':
      return 'checked-in';
    case 'CHECKED_OUT':
      return 'checked-out';
    default:
      return 'pending';
  }
}
```

## 6. Testing

### Component Tests (Jest/React Testing Library)

**Test Scenarios:**

1. **Compact Layout Rendering**:
   - Verify visitor name and phone display correctly
   - Verify avatar shows image when available
   - Verify avatar shows initials when image fails
   - Verify badges display inline with name
   - Verify actions display on far right

2. **Full Layout Rendering**:
   - Verify card structure with proper sections
   - Verify visitor name, phone, email display stacked
   - Verify badges display below name
   - Verify person to meet and purpose display as separate fields
   - Verify actions display in footer area

3. **Avatar Fallback**:
   - Verify initials are generated correctly from name
   - Verify initials limited to 2 characters
   - Verify default "U" when name is empty
   - Verify image error handling triggers fallback
   - Verify loading state shows spinner

4. **Badge Integration**:
   - Verify StatusBadge displays with correct variant
   - Verify VisitTypeBadge displays when visit type provided
   - Verify both badges display together

5. **Interactivity**:
   - Verify onClick handler is called when card clicked
   - Verify cursor changes to pointer when onClick provided
   - Verify hover states applied correctly

6. **Responsive Behavior**:
   - Verify compact layout on mobile screens
   - Verify full layout on desktop screens
   - Verify text truncation on small screens

7. **Action Buttons**:
   - Verify actions slot renders correctly
   - Verify actions aligned properly (compact: right, full: footer)
   - Verify actions work independently of card click

### Storybook Stories

**Story Variants:**

1. **Compact Layout**: Show compact card with minimal visitor data
2. **Full Layout**: Show full card with complete visitor details
3. **With Photo**: Show card with visitor photo
4. **Without Photo**: Show card with initials fallback
5. **Meeting Type**: Show card with meeting visit type badge
6. **Delivery Type**: Show card with delivery visit type badge
7. **All Statuses**: Show cards for each status variant (pending, approved, rejected, checked-in, checked-out)
8. **With Actions**: Show cards with action buttons (Check Out, Approve, etc.)
9. **Interactive**: Show clickable card with onClick handler
10. **Responsive**: Show card in different viewport sizes

## 7. Accessibility

### Keyboard Navigation

- When `onClick` provided, ensure card is keyboard focusable
- Support Enter and Space key to trigger onClick
- Ensure proper focus indication (visible outline)

### Semantic HTML

- Use semantic elements (`div` with proper ARIA roles if needed)
- Avatar uses semantic structure from base component
- Card uses semantic structure from base component

### Screen Reader Support

- Announce visitor name and status as combined context
- Use `aria-label` on clickable cards if not descriptive enough
- Ensure status badges are announced correctly
- Provide text alternatives for visitor photo (via alt attribute)

### Contrast Requirements

- Ensure all text meets WCAG AA contrast ratio (4.5:1)
- Verify color combinations in both light and dark modes
- Ensure hover states maintain sufficient contrast

## 8. Implementation Notes

### Dependencies

- `@/components/ui/avatar`: Avatar component from shadcn/ui
- `@/components/ui/card`: Card component from shadcn/ui
- `@/components/ui/badge`: Base Badge component from shadcn/ui
- `@/components/visitors/shared/StatusBadge`: StatusBadge component (Task 3.2)
- `@/components/visitors/shared/VisitTypeBadge`: VisitTypeBadge component (Task 3.3)
- `@/lib/utils`: `cn()` utility for class name merging
- `lucide-react`: Icons for fallback states (User, Loader2)

### Design System Consistency

Follow patterns from `SecurityVisitorLogs.tsx`:
- Avatar sizing: compact (40px), full (64px)
- Badge variants: match StatusBadge and VisitTypeBadge specifications
- Typography: consistent with existing visitor displays
- Spacing: consistent with existing card components

### Usage Examples

```typescript
// Compact usage in list
<VisitorProfileCard
  visitor={visitor}
  compact
  actions={<Button size="sm">Check Out</Button>}
  onClick={() => handleViewDetails(visitor.id)}
/>

// Full usage in modal
<VisitorProfileCard
  visitor={visitor}
  actions={
    <div className="flex gap-2">
      <Button variant="outline">Reject</Button>
      <Button>Approve</Button>
    </div>
  }
/>

// Without actions
<VisitorProfileCard
  visitor={visitor}
  compact
/>

// With custom styling
<VisitorProfileCard
  visitor={visitor}
  compact
  className="border-l-4 border-l-emerald-500"
/>
```

### Responsive Behavior

- Mobile (< 768px): Use compact layout by default
- Tablet (768px - 1024px): Compact for lists, full for modals
- Desktop (> 1024px): Full layout preferred for visibility
- Text truncation: Use `truncate` class on long text in compact mode

### Performance Considerations

- Lazy load visitor photos with proper error boundaries
- Use `useState` for image loading/error tracking
- Avoid unnecessary re-renders by memoizing derived data

## 9. Integration Points

### Used In

- `SecurityVisitorLogs.tsx`: Replace inline card rendering
- Public confirmation page: Display visitor summary
- Visitor details modal: Show full visitor information
- Approval/Reject dialogs: Display visitor context

### Related Components

- `StatusBadge`: Displays visitor status
- `VisitTypeBadge`: Displays visit type
- `OtpInput`: Used for visitor verification (separate component)
- `GatePassView`: Used for approved visitor display (separate component)

## 10. Future Extensions

- Consider adding expand/collapse for compact cards
- Consider adding quick actions menu (dropdown)
- Consider adding timestamp display (check-in/out times)
- Consider adding visitor location/directions (future feature)
- Consider adding visitor history view (future feature)
