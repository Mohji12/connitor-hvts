# Technical Specification: Confirmation Page (Step 5 - Pending)

> **Task ID:** 5.3
> **Increment:** 5 - Public Registration UI (Visit Details & Status)
> **Status:** Spec
> **Created:** 2026-02-06
> **Dependencies:** Task 5.1 (Delivery Details Step), Task 5.2 (Meeting Details Step)

---

## 1. Overview

Fifth step in the public visitor registration wizard. Displays a success confirmation after visitor submits their visit details (Step 4). Shows animated checkmark, success message, and explains that the visitor will receive their Gate Pass via WhatsApp once approved by security staff. Provides "Done" action to close the flow and "Contact Security" for assistance.

### Key Features
- Large animated green checkmark icon on mount
- "Request Submitted!" heading
- WhatsApp delivery explanation text
- "Done" primary button to close/complete flow
- "Need help? Contact Security" secondary action
- Step indicator: "Step 5 of 6"
- Single-column, centered layout (max-width 480px)
- Neutral/success theming (emerald green)
- No form inputs (informational only)
- Optional auto-redirect to status check page (configurable delay)

---

## 2. File Path

```
frontend/src/components/visitors/steps/ConfirmationStep.tsx
```

---

## 3. Data Models

### 3.1 Component Props

```typescript
export interface ConfirmationStepProps {
  visitId: string;
  visitType: 'MEETING' | 'DELIVERY';
  onDone: () => void;
  onContactSecurity?: () => void;
  autoRedirectDelay?: number | null; // null = no auto-redirect, number = milliseconds
}

// Note: void is the correct return type for callback functions that do not return values.
// This includes event handlers and user action callbacks like onDone and onContactSecurity.
```

### 3.2 Component State

```typescript
export interface ConfirmationStepState {
  animationComplete: boolean;
  autoRedirectTimer: NodeJS.Timeout | null;
}
```

### 3.3 Animation Timing Constants

```typescript
export const ANIMATION_TIMING = {
  CHECKMARK_FADE_IN: 300, // ms
  CHECKMARK_SCALE: 400, // ms
  CHECKMARK_DRAW: 600, // ms
  TEXT_FADE_IN: 500, // ms
  TOTAL_ANIMATION_DURATION: 1200, // ms
} as const;

export const DEFAULT_AUTO_REDIRECT_DELAY = 5000; // ms (5 seconds)
```

### 3.4 Callback Types

```typescript
export type DoneHandler = () => void;
export type ContactSecurityHandler = () => void;
```

---

## 4. Component Structure

```typescript
export function ConfirmationStep(props: ConfirmationStepProps): JSX.Element
```

**Child Components:**
- **SuccessCheckmark**: Animated checkmark SVG component
- **StepIndicator**: Displays "Step 5 of 6"
- **SuccessMessage**: "Request Submitted!" heading
- **WhatsAppExplanation**: WhatsApp delivery text
- **DoneButton**: Primary action button
- **ContactSecurityLink**: Secondary action link

---

## 5. Logic Flow

### 5.1 Initialization

```typescript
// Extract visitId, visitType, onDone, onContactSecurity, autoRedirectDelay from props
// Initialize state: animationComplete = false, autoRedirectTimer = null
// Set up auto-redirect timer if autoRedirectDelay provided
```

### 5.2 Animation Sequence

```typescript
function triggerSuccessAnimation(): void {
  // Stage 1 (0ms): Fade in checkmark container (opacity 0→1, duration 300ms)
  // Stage 2 (300ms): Scale checkmark from 0.5x to 1x (duration 400ms)
  // Stage 3 (700ms): Draw checkmark path with stroke animation (duration 600ms)
  // Stage 4 (500ms): Fade in success text and buttons (staggered, duration 500ms)
  // Set animationComplete = true after all animations complete
}
```

### 5.3 Auto-Redirect Logic

```typescript
function startAutoRedirect(): void {
  if (props.autoRedirectDelay && props.autoRedirectDelay > 0) {
    const timer = setTimeout(() => {
      props.onDone();
    }, props.autoRedirectDelay);
    setAutoRedirectTimer(timer);
  }
}

function cancelAutoRedirect(): void {
  if (autoRedirectTimer) {
    clearTimeout(autoRedirectTimer);
    setAutoRedirectTimer(null);
  }
}
```

### 5.4 Done Handler

```typescript
function handleDone(): void {
  // Cancel auto-redirect timer if running
  // Call props.onDone()
}
```

### 5.5 Contact Security Handler

```typescript
function handleContactSecurity(): void {
  // Cancel auto-redirect timer if running
  // Call props.onContactSecurity() if provided, or open security contact modal
}
```

### 5.6 Cleanup

```typescript
useEffect(() => {
  // Trigger animation on mount
  triggerSuccessAnimation();

  // Start auto-redirect if configured
  startAutoRedirect();

  return () => {
    // Clear auto-redirect timer on unmount
    cancelAutoRedirect();
  };
}, []);
```

---

## 6. Styling Requirements

### 6.1 Layout & Typography
- Container: Centered, max-width 480px, single column, vertical flex layout
- Step indicator: "Step 5 of 6" (small gray text, top left)
- Main spacing: 24px vertical gaps between sections
- Content padding: 32px top/bottom, 24px left/right

### 6.2 Success Checkmark Animation
- Size: 80px x 80px (large, prominent)
- Color: Emerald green (`#10b981`, `bg-emerald-500`)
- Container: Rounded circle background, centered
- Animation: Multi-stage (fade in, scale, stroke draw)

### 6.3 Success Message & WhatsApp Explanation
- Heading: "Request Submitted!" (bold, large, `text-2xl`, emerald green)
- WhatsApp text: "You'll receive your Gate Pass via WhatsApp" with "your Check-In OTP once approved" (neutral gray)
- Alignment: Center, fade in after checkmark (staggered 500ms)

### 6.4 Action Buttons

**Done Button (Primary):**
- Full width, emerald green background, white text
- Min height 48px, rounded-lg
- Focus: 2px blue ring, Hover: darker green, Active: scale 0.98

**Contact Security Link (Secondary):**
- Text link, no background, gray color
- Hover: darker gray with underline
- Min height 44px, 12px vertical padding

### 6.5 Responsive Behavior
- Mobile (< 768px): Full-width buttons, 32px padding
- Tablet/Desktop (≥ 768px): Button max-width 300px, centered
- Checkmark size: Scales to 100px on desktop

---

## 7. Accessibility

### 7.1 ARIA Attributes
```tsx
<div role="alert" aria-live="polite" aria-atomic="true">
  <div aria-label="Success checkmark animation">{/* Animated checkmark */}</div>
  <h1 role="status" aria-label="Request submitted confirmation">Request Submitted!</h1>
  <p aria-describedby="whatsapp-instruction">You'll receive your Gate Pass via WhatsApp...</p>
</div>

<button type="button" onClick={handleDone} aria-label="Complete registration and close">Done</button>
<button type="button" onClick={handleContactSecurity} aria-label="Contact security for help">Need help? Contact Security</button>
```

### 7.2 Keyboard Navigation

| Interaction | Key Sequence | Expected Behavior |
|-------------|--------------|-------------------|
| Focus First Element | Tab | Focus moves to Done button (after animation) |
| Activate Done | Enter / Space (on Done button) | Calls onDone callback |
| Navigate to Contact Security | Tab (from Done button) | Focus moves to Contact Security link |
| Activate Contact Security | Enter / Space (on Contact Security link) | Calls onContactSecurity callback |
| Dismiss (Optional) | Escape | Optional: Calls onDone callback |
| Cancel Auto-Redirect | Any User Interaction (Click, Key) | Cancels auto-redirect timer |

### 7.3 Screen Reader & Focus Management
- `role="alert"` announces content changes
- `aria-live="polite"` for polite announcement
- `role="status"` on heading for semantic meaning
- Descriptive `aria-label` on all interactive elements
- Initial focus: Done button after animation completes (optional)
- Touch targets: Done button min 48px, Contact Security link min 44px

### 7.4 Color Contrast (WCAG AA)
- Success text (emerald-600): ≥ 4.5:1 contrast on white
- Explanation text (gray-600): ≥ 4.5:1 contrast on white
- Done button (emerald-600): ≥ 4.5:1 for text on background

---

## 8. Testing

### 8.1 Component Tests

**File:** `frontend/src/components/visitors/steps/ConfirmationStep.test.tsx`

**Test Categories:**
1. **Rendering:** Checkmark, heading, explanation text, buttons, step indicator
2. **Animation:** Trigger on mount, sequence stages complete, animationComplete state
3. **Auto-Redirect:** Timer starts, cancels on unmount, calls onDone after delay
4. **Done Handler:** Calls onDone, cancels auto-redirect
5. **Contact Security Handler:** Calls onContactSecurity, cancels auto-redirect
6. **Props Validation:** Required props, optional props handling
7. **Keyboard:** Tab order, Enter/Space activation, Escape key
8. **Accessibility:** ARIA attributes, screen reader announcements, focus management
9. **Responsive:** Mobile vs desktop rendering, button sizing
10. **Edge Cases:** Null autoRedirectDelay, zero delay, multiple clicks

### 8.2 E2E Tests

**File:** `frontend/e2e/visitor-registration/confirmation-step.spec.ts`

**Test Scenarios:**
1. **Complete Flow:** Navigate from Step 4 to Step 5, verify confirmation displays
2. **Animation:** Verify checkmark animation completes, text fades in
3. **Done Action:** Click Done, verify flow closes or navigates
4. **Contact Security:** Click Contact Security, verify modal or action triggered
5. **Auto-Redirect:** Verify automatic navigation after delay (if configured)
6. **Auto-Redirect Cancel:** Click Done during auto-redirect delay, verify timer cancels
7. **Accessibility:** Tab order, Enter/Space activation, screen reader announcements
8. **Responsive:** Test on mobile (375px), tablet (768px), desktop (1024px)
9. **Visit Types:** Verify correct display for Meeting vs Delivery
10. **Error Recovery:** Handle edge cases (null props, invalid delays)

---

## 9. Error Handling

### 9.1 Props Validation
1. **Missing visitId:** Display generic success (visit ID not used for display)
2. **Invalid visitType:** Default to Meeting type for display consistency
3. **Null onDone:** Provide no-op fallback, log warning
4. **Null onContactSecurity:** Provide no-op fallback, hide secondary button

### 9.2 Auto-Redirect Edge Cases
5. **Negative autoRedirectDelay:** Treat as zero (immediate) or disable
6. **Zero autoRedirectDelay:** Immediate redirect (may not be desired behavior)
7. **Very Large Delay:** Cap at reasonable maximum (e.g., 60 seconds)
8. **Auto-Redirect Race Condition:** Cancel timer on any user interaction

### 9.3 Lifecycle Edge Cases
9. **Unmount During Animation:** Cancel all timers, cleanup properly
10. **Multiple Clicks:** Debounce Done button (200ms) to prevent duplicate callbacks
11. **Animation Failure:** Fallback to static checkmark (no animation)

### 9.4 Display Edge Cases
12. **Visit ID Not Found:** Display success anyway (submitted successfully)
13. **Visit Type Missing:** Default display, don't error
14. **Security Contact Missing:** Hide secondary button or provide default behavior
15. **Reduced Motion Preference:** Honor `prefers-reduced-motion` media query, disable animations
16. **Low Power Mode:** Respect OS settings, skip or simplify animations

### 9.5 Error Display
- No inline errors (no form inputs)
- Console warnings for missing optional callbacks
- Graceful degradation for animation failures (fallback to static display)

---

## 10. Implementation Notes

### 10.1 Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "lucide-react": "^0.367.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "framer-motion": "^11.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.2.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/user-event": "^14.5.0"
  }
}
```

### 10.2 Animation Implementation
**Use CSS keyframes for checkmark animation** (recommended for simplicity and performance). Upgrade to Framer Motion if complex orchestration needed.

```css
@media (prefers-reduced-motion: reduce) {
  .checkmark-animation {
    animation: none !important;
    opacity: 1 !important;
  }
}
```

### 10.3 Example Usage

```tsx
'use client';
import { ConfirmationStep } from '@/components/visitors/steps/ConfirmationStep';

<ConfirmationStep
  visitId={visitId}
  visitType={visitType}
  onDone={() => window.location.href = '/landing'}
  onContactSecurity={() => setShowContactModal(true)}
  autoRedirectDelay={null} // Set to 5000 to enable auto-redirect
/>
```

### 10.4 Best Practices
- Use semantic HTML (`<h1>`, `<button>`, `<div role="alert">`)
- Provide descriptive ARIA labels
- Use CSS transforms for animations (GPU-accelerated)
- Cleanup timers in useEffect return
- Use useCallback for event handlers

### 10.5 Integration Patterns
- **Parent-Child:** Parent passes callbacks (onDone, onContactSecurity)
- **State Management:** Minimal local state (animationComplete, timer)
- **Navigation:** Callback-based, parent handles step/flow state
- **Data Flow:** One-way (props in, callbacks out)

---

## 11. Acceptance Criteria

Task 5.3 is complete when:

1. ✅ Renders step indicator "Step 5 of 6"
2. ✅ Renders large animated green checkmark (80px minimum)
3. ✅ Checkmark animation triggers on mount with multi-stage sequence
4. ✅ Displays "Request Submitted!" heading (emerald green, bold)
5. ✅ Displays WhatsApp delivery explanation text
6. ✅ Renders "Done" primary button (full width, emerald background)
7. ✅ Renders "Need help? Contact Security" secondary action/link
8. ✅ Done button calls onDone callback when clicked
9. ✅ Contact Security link calls onContactSecurity callback when clicked
10. ✅ Auto-redirect triggers after configured delay (if provided)
11. ✅ Auto-redirect timer cancels on user interaction or unmount
12. ✅ Layout is centered, max-width 480px, vertical flex
13. ✅ Mobile-optimized with touch targets ≥ 44px (48px buttons)
14. ✅ Neutral/success theming (emerald green, gray text)
15. ✅ All ARIA attributes present (role="alert", aria-live, aria-label)
16. ✅ Keyboard navigation works (Tab, Enter/Space, Escape optional)
17. ✅ Screen reader announces success message
18. ✅ No TypeScript errors or console warnings
19. ✅ All component tests pass (rendering, animation, callbacks)
20. ✅ All E2E tests pass (navigation, actions, auto-redirect)
21. ✅ Responsive on all devices (mobile 375px to desktop 1024px+)
22. ✅ Honors `prefers-reduced-motion` media query
23. ✅ Animation timing constants defined and documented
24. ✅ Handles edge cases (null props, invalid delays, unmount)

---

## 12. Related Tasks

- **Task 5.1:** Delivery details step (Step 4 - Delivery) - provides data
- **Task 5.2:** Meeting details step (Step 4 - Meeting) - provides data
- **Task 5.4:** Status check page with polling (Step 6 - Pending/Approved)
- **Task 5.5:** Gate Pass page (Step 6 - Approved) - destination after approval
- **Task 3.1-3.5:** Shared UI components (for consistency)
- **Task 9.1-9.6:** Edge cases and error handling (for integration)

---

**End of Specification**
