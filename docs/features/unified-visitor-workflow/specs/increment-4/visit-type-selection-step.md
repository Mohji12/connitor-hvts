# Technical Specification: Visit Type Selection Step (Step 2)

> **Task ID:** 4.3
> **Increment:** 4 - Public Registration UI (Phone Auth Flow)
> **Status:** Approved
> **Created:** 2026-01-27
> **Approved:** 2026-01-27
> **Dependencies:** Task 4.2 (phone verification step)

---

## 1. Overview

Second step in the public visitor registration wizard. Visitors select between two visit types: "Meeting" (person-to-person visits) or "Delivery" (package/courier deliveries). This selection determines which registration form is shown in the subsequent step (Step 3).

### Key Features
- Two large, touch-friendly cards for visit type selection
- Teal/Emerald theming for "Meeting" (User icon)
- Amber/Orange theming for "Delivery" (Package icon)
- Visual selected state with border color change
- Back button navigation to Step 1b (phone verification)
- Step indicator showing progress
- Single-column, centered layout optimized for mobile

---

## 2. File Path

```
frontend/src/app/visitor-registration/visit-type-selection-step.tsx
```

---

## 3. Data Models

### 3.1 Component Props

```typescript
export interface VisitTypeSelectionStepProps {
  onSuccess: (data: VisitTypeSelectionData) => void;
  onBack: () => void;
  visitorPhone?: string;
}

export interface VisitTypeSelectionData {
  visitType: VisitType;
}
```

### 3.2 Component State

```typescript
export interface VisitTypeSelectionState {
  selectedVisitType: VisitType | null;
}
```

### 3.3 Enums & Types

```typescript
export enum VisitType {
  MEETING = 'MEETING',
  DELIVERY = 'DELIVERY',
}

export type VisitTypeOption = 'MEETING' | 'DELIVERY';

export interface VisitTypeCardConfig {
  type: VisitType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  colorTheme: 'teal' | 'amber';
}
```

### 3.4 Navigation Callback Types

```typescript
export type NavigationHandler = () => void;
export type SelectionHandler = (data: VisitTypeSelectionData) => void;
```

---

## 4. Component Structure

```typescript
export function VisitTypeSelectionStep(props: VisitTypeSelectionStepProps): JSX.Element
```

**Child Components:**
- **VisitTypeCard**: Reusable card component for visit type options
- **BackButton**: Ghost-style button for navigation
- **StepIndicator**: Displays current step in workflow

---

## 5. Logic Flow

### 5.1 Initialization

```typescript
// Extract onSuccess, onBack, visitorPhone from props
// Initialize selectedVisitType state to null
// Set up visit type card configurations (Meeting, Delivery)
```

### 5.2 Visit Type Selection

```typescript
function handleVisitTypeSelect(visitType: VisitType): void {
  // Update selectedVisitType state
  // Trigger onSuccess callback after short delay (200-300ms for visual feedback)
}

function handleContinue(): void {
  if (selectedVisitType) {
    props.onSuccess({ visitType: selectedVisitType });
  }
}
```

### 5.3 Back Navigation

```typescript
function handleBack(): void {
  props.onBack();
}
```

---

## 6. Styling Requirements

### 6.1 Layout & Typography
- Container: Centered, max-width 480px, single column
- Step indicator: "Step 2 of 6" (small gray text)
- Header: "What brings you here today?"
- Sub-header: Optional phone number display (if visitorPhone provided)
- Typography: Clean sans-serif (Inter/Geist)

### 6.2 Visit Type Cards
- Card layout: Large, touch-friendly (minimum 120px height)
- Spacing: Vertical gap 16-24px between cards
- Border radius: `rounded-lg` (8-12px)
- Border: Light gray default (`border-gray-200`)
- Shadow: Subtle shadow-sm for depth

### 6.3 Card Theming

**Meeting Card (Teal/Emerald):**
- Icon: User icon (`User` or `UserCircle`)
- Default: `text-emerald-600`, `bg-emerald-50`, `border-gray-200`
- Selected: `border-emerald-500` (2px), `bg-emerald-100`, `ring-2 ring-emerald-500`
- Hover: `border-emerald-300`, `bg-emerald-50`

**Delivery Card (Amber/Orange):**
- Icon: Package icon (`Package`)
- Default: `text-amber-600`, `bg-amber-50`, `border-gray-200`
- Selected: `border-amber-500` (2px), `bg-amber-100`, `ring-2 ring-amber-500`
- Hover: `border-amber-300`, `bg-amber-50`

### 6.4 Interactive States
- All cards: `cursor-pointer`
- Touch targets: Minimum 44x44px for mobile
- Transitions: 200ms ease-in-out
- Active state: Scale down to 0.98 on press
- Focus: 2px blue ring (`ring-2 ring-blue-500`)

---

## 7. Accessibility

### 7.1 ARIA Attributes

```tsx
<div role="radiogroup" aria-label="Visit type selection">
  <button
    role="radio"
    aria-checked={selectedVisitType === VisitType.MEETING}
    aria-label="Meeting visit type"
    aria-describedby="meeting-desc"
  >
    <User aria-hidden="true" />
    <span>Meeting</span>
    <p id="meeting-desc" className="sr-only">Visit a person or department</p>
  </button>
</div>
```

### 7.2 Keyboard Navigation
- **Tab**: Focus flows through cards (Meeting → Delivery → Back)
- **Arrow Keys**: Up/Down navigate between cards (radiogroup pattern)
- **Enter/Space**: Selects focused card
- **Escape**: Triggers onBack callback
- **Focus**: Auto-focus first card on mount

### 7.3 Screen Reader Support
- `role="radiogroup"` conveys single-selection behavior
- `aria-checked` indicates current selection
- `aria-describedby` links cards to descriptions
- `aria-hidden="true"` on decorative icons

---

## 8. Testing

### 8.1 Component Tests

**File:** `frontend/src/app/visitor-registration/visit-type-selection-step.test.tsx`

**Test Categories:**
1. Rendering: Step indicator, header, both cards, back button
2. Selection: Clicking card updates state and triggers callback
3. Navigation: Back button calls onBack, onSuccess with correct data
4. Visual Feedback: Border/background/icon color changes
5. Keyboard Navigation: Tab order, Enter/Space selection, Escape back, arrow keys
6. Accessibility: ARIA attributes, screen reader support, focus management

```typescript
it('should select meeting card and call onSuccess', () => {
  const onSuccess = jest.fn();
  render(<VisitTypeSelectionStep onSuccess={onSuccess} onBack={() => {}} />);

  const meetingCard = screen.getByLabelText(/meeting visit type/i);
  fireEvent.click(meetingCard);

  expect(onSuccess).toHaveBeenCalledWith({ visitType: VisitType.MEETING });
  expect(meetingCard).toHaveAttribute('aria-checked', 'true');
});
```

### 8.2 Storybook Stories

**File:** `frontend/src/app/visitor-registration/visit-type-selection-step.stories.tsx`

Required Stories:
- Default (no selection)
- Meeting Selected
- Delivery Selected
- With Visitor Phone
- Mobile View (375px)
- Desktop View (1024px)

### 8.3 E2E Tests

**File:** `frontend/e2e/visitor-registration/visit-type-selection.spec.ts`

Required Scenarios:
1. Complete Selection Flow: Select Meeting, verify navigation to Step 3
2. Delivery Selection Flow: Select Delivery, verify navigation to Step 3
3. Back Navigation: Click back button, verify return to Step 1b
4. Keyboard Navigation: Tab/Arrow keys to navigate, Enter to select
5. Change Selection: Select Meeting, then Delivery, verify state updates

---

## 9. Example Usage

```tsx
'use client';
import { VisitTypeSelectionStep, VisitType } from '@/app/visitor-registration/visit-type-selection-step';
import { useState } from 'react';

export default function RegistrationWizard() {
  const [step, setStep] = useState(2);
  const [visitType, setVisitType] = useState<VisitType | null>(null);

  const handleVisitTypeSuccess = (data: { visitType: VisitType }) => {
    setVisitType(data.visitType);
    setStep(3); // Navigate to appropriate form
  };

  const handleBack = () => {
    setStep(1); // Return to phone verification
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      {step === 2 && (
        <VisitTypeSelectionStep
          onSuccess={handleVisitTypeSuccess}
          onBack={handleBack}
          visitorPhone="+91 999****999"
        />
      )}
      {step === 3 && visitType === VisitType.MEETING && (
        <MeetingRegistrationForm visitType={visitType} />
      )}
      {step === 3 && visitType === VisitType.DELIVERY && (
        <DeliveryRegistrationForm visitType={visitType} />
      )}
    </div>
  );
}
```

---

## 10. Edge Cases

### Critical Cases
1. **No Selection**: Continue button disabled or validation required
2. **Rapid Card Clicks**: Debounce or prevent duplicate callbacks (useCallback, useRef)
3. **Unmount During Callback**: Cancel pending navigation/state updates
4. **Visitor Phone Missing**: Gracefully handle missing prop, don't display sub-header

---

## 11. Implementation Notes

### 11.1 Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "lucide-react": "^0.367.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  }
}
```

### 11.2 Integration Patterns
- **Parent-Child**: Parent passes onSuccess/onBack callbacks
- **State Management**: Component manages local selectedVisitType state
- **Navigation**: Callback-based navigation (parent handles step state)
- **Form State**: Visit type persisted to parent state for subsequent steps

### 11.3 Performance Best Practices
- Use useCallback for event handlers (handleVisitTypeSelect, handleBack)
- Use lucide-react icons (lightweight, tree-shakeable)
- Consider React.memo if component re-renders frequently
- Use clsx/tailwind-merge for dynamic class merging
- Strict TypeScript types for all props and state

---

## 12. Acceptance Criteria

Task 4.3 is complete when:

1. ✅ Renders two large touch-friendly cards: "Meeting" and "Delivery"
2. ✅ Meeting card displays User icon with Teal/Emerald theming
3. ✅ Delivery card displays Package icon with Amber/Orange theming
4. ✅ Cards show selected state with border color change and background darken
5. ✅ Step indicator displays "Step 2 of 6"
6. ✅ Header displays "What brings you here today?"
7. ✅ Back button (ghost style) navigates to Step 1b (phone verification)
8. ✅ Clicking a card triggers onSuccess callback with visitType data
9. ✅ Layout is centered, max-width 480px, single column
10. ✅ Mobile-optimized with touch targets ≥ 44px
11. ✅ All ARIA attributes present (role="radiogroup", aria-checked, etc.)
12. ✅ Keyboard navigation works (Tab, Enter/Space, Escape, Arrow keys)
13. ✅ Screen reader announces selection state and descriptions
14. ✅ No TypeScript errors or console warnings
15. ✅ All component tests pass (rendering, selection, navigation, accessibility)
16. ✅ All Storybook stories render correctly
17. ✅ All E2E tests pass (selection flow, back navigation, keyboard tests)
18. ✅ Responsive on all devices (mobile 375px to desktop 1024px+)

---

## 13. Related Tasks

- **Task 4.1:** Create phone entry step (Step 1a)
- **Task 4.2:** Create phone verification step (Step 1b)
- **Task 4.4:** Create Delivery registration form (Step 3 - Delivery)
- **Task 4.5:** Create Meeting registration form (Step 3 - Meeting)
- **Task 3.3:** Create VisitTypeBadge component (for consistency)

---

**End of Specification**
