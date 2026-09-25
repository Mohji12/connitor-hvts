# Technical Specification: OtpInput Component

## Overview

Create a reusable 6-digit OTP input component for phone verification (Step 1b) and security check-in OTP verification. The component manages 6 individual input boxes with automatic focus management, paste support, and keyboard navigation.

## File Path

```
frontend/src/components/visitors/shared/OtpInput.tsx
```

## Data Models

### Props Interface

```typescript
interface OtpInputProps {
  /** Number of OTP digits (default: 6) */
  length?: number;
  /** Current OTP value (controlled component) */
  value: string;
  /** Callback when OTP changes */
  onChange: (value: string) => void;
  /** Error state message */
  error?: string;
  /** Whether the component is in loading state */
  disabled?: boolean;
  /** Whether to show error styling */
  hasError?: boolean;
  /** Accessibility label for the entire OTP group */
  ariaLabel?: string;
  /** Custom class name for the container */
  className?: string;
  /** Callback when all digits are filled */
  onComplete?: (otp: string) => void;
}
```

### Internal State Type

```typescript
interface OtpInputState {
  focusIndex: number;
}
```

## Component Structure

### Function Signatures

```typescript
export function OtpInput({
  length = 6,
  value,
  onChange,
  error,
  disabled = false,
  hasError = false,
  ariaLabel = "One-time password",
  className,
  onComplete,
}: OtpInputProps): JSX.Element;

function handleChange(index: number, digit: string): void;

function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>): void;

function handlePaste(event: React.ClipboardEvent<HTMLInputElement>): void;

function handleFocus(index: number): void;

function getBoxClassName(index: number): string;
```

## Logic Flow

### Initialization

- Create an array of refs for each input box (one per digit)
- Initialize focus state to first empty box or first box
- Parse the initial `value` prop and distribute digits across inputs

### Input Handling (handleChange)

- Validate that the input is a single digit (0-9)
- If valid, update the value at the specified index
- Call `onChange` with the complete OTP string
- If a digit was entered and there are more empty boxes, auto-focus the next box
- If this was the last digit and `onComplete` callback exists, invoke it

### Keyboard Navigation (handleKeyDown)

- **Backspace**:
  - If current box has a value, clear it and keep focus on current box
  - If current box is empty, move focus to previous box (if exists)
- **Arrow Left**: Move focus to previous box (if exists)
- **Arrow Right**: Move focus to next box (if exists)
- **Tab**: Allow default tab behavior (move to next focusable element)
- **Enter**: If `onComplete` exists and OTP is complete, invoke callback

### Paste Handling (handlePaste)

- Get pasted text from clipboard
- Filter to extract only digits (0-9)
- Take the first `length` digits from the filtered text
- Distribute digits sequentially across input boxes
- Call `onChange` with the complete pasted OTP string
- If all boxes are filled after paste and `onComplete` exists, invoke it
- Focus the first empty box or the last box if complete

### Focus Management

- When a box receives focus via click or keyboard navigation, update internal focus state
- Track which box is currently focused for styling
- When component mounts, if no value exists, focus the first box

### Error State

- When `hasError` is true, apply error styling (red border) to all input boxes
- Display `error` message text below the OTP group
- When `disabled` is true, disable all input boxes and remove focus

## Styling

### Container

- Use `flex` layout with `gap-2` or `gap-3` between boxes
- Horizontal alignment: `items-center`
- Apply custom `className` if provided

### Individual Input Box

```typescript
const baseClassName = "border-input bg-background relative flex h-12 w-10 items-center justify-center border text-center text-2xl font-semibold shadow-sm transition-all outline-none";

const focusClassName = "ring-ring/50 focus-visible:ring-[3px] ring-2 ring-ring z-10";

const errorClassName = "aria-invalid:border-destructive aria-invalid:ring-destructive/20";

const disabledClassName = "disabled:cursor-not-allowed disabled:opacity-50";
```

- Height: `h-12` (48px) for mobile touch targets
- Width: `w-10` (40px) per digit
- Font size: `text-2xl` for large, readable digits
- Font weight: `font-semibold` for visibility
- Text alignment: `text-center`
- Border: Default gray, red on error, ring on focus
- Rounded corners: `rounded-md`
- Transition: Smooth focus and error state transitions
- Disabled state: Reduced opacity

### Error Message

- Display below the OTP group
- Use `text-destructive` (red) color
- Font size: `text-sm`
- Show only when `error` prop is provided

## Accessibility

### ARIA Attributes

- **Container**: `role="group"` with `aria-label={ariaLabel}`
- **Each Input**:
  - `aria-label`: "Digit {index + 1} of OTP"
  - `aria-invalid`: Boolean indicating error state
  - `aria-describedby`: Reference to error message element when present
- **Error Message**: `role="alert"` and `id="otp-error-message"`

### Keyboard Navigation

- Logical tab order through the 6 boxes
- Arrow keys support left/right navigation
- Backspace handles backspace and focus movement
- Enter triggers completion callback

### Screen Reader Support

- Each box announces its position (e.g., "Digit 1 of 6")
- Error messages are announced via `aria-live` region
- Completion state is announced when `onComplete` is called

### Focus Management

- Visual indicator for focused box (ring/border)
- Focus is never trapped; users can tab in and out
- Focus is restored to appropriate box on re-render

## Testing

### Component Tests (Jest + React Testing Library)

1. **Initial Render**:
   - Renders correct number of input boxes
   - Applies initial value from prop
   - Has correct ARIA attributes

2. **Input Handling**:
   - Typing a digit populates the box
   - Typing a digit focuses the next box automatically
   - Only digits (0-9) are accepted
   - Non-digit input is ignored
   - `onChange` is called with updated value

3. **Keyboard Navigation**:
   - Arrow left moves focus to previous box
   - Arrow right moves focus to next box
   - Backspace on filled box clears it and keeps focus
   - Backspace on empty box moves to previous box and clears it
   - Enter triggers `onComplete` when full

4. **Paste Functionality**:
   - Pasting a 6-digit string populates all boxes
   - Pasting a shorter string fills available boxes
   - Pasting non-digit characters filters them out
   - Pasting triggers `onChange` with complete value
   - Pasting triggers `onComplete` if all boxes filled

5. **Error State**:
   - When `hasError` is true, boxes show red border
   - Error message displays when `error` prop is provided
   - ARIA invalid attribute is set correctly

6. **Disabled State**:
   - When `disabled` is true, all boxes are disabled
   - Disabled boxes have reduced opacity
   - No user interaction possible when disabled

7. **Auto-focus**:
   - First empty box receives focus on mount if no value
   - Focus moves appropriately on input

8. **Completion Callback**:
   - `onComplete` is called when last digit is entered
   - `onComplete` receives the complete OTP string
   - `onComplete` is called when paste completes the OTP

### Storybook Stories

1. **Default State**:
   - Empty OTP input
   - No error, not disabled

2. **Pre-filled Value**:
   - OTP with partial value (e.g., "123_")
   - OTP with complete value (e.g., "123456")

3. **Error State**:
   - Show red borders
   - Display error message "Invalid OTP"

4. **Disabled State**:
   - Show disabled styling
   - No interaction possible

5. **Loading State**:
   - Show disabled state while loading
   - Example usage with spinner indicator

6. **Custom Length**:
   - Show 4-digit variant (if `length` prop is customizable)

7. **Completion Handler**:
   - Show alert when OTP is completed
   - Demonstrate `onComplete` callback

8. **Accessibility**:
   - Keyboard navigation demo
   - Screen reader announcements

## Implementation Notes

### Dependencies

- React hooks: `useRef`, `useState`, `useEffect`, `useCallback`
- `cn` utility from `@/lib/utils` for class merging
- No external icons needed for this component

### Integration with Existing Components

- **REQUIREMENT**: Extend existing `@/components/ui/input-otp` component from `frontend/src/components/ui/input-otp.tsx`
- The existing Shadcn component uses the `input-otp` package and provides the base OTP input functionality
- **Customization needed**:
  - Add error styling and error message display
  - Add disabled state handling
  - Add custom ARIA labels for accessibility
  - Implement paste handling (if not already supported by base component)
  - Add `onComplete` callback support
- Follow the patterns from `FileUploadField.tsx` for functional component structure, TypeScript interfaces, and Tailwind CSS
- The base `InputOTP` component handles the complex focus management and input logic

### Design Patterns

- Controlled component pattern (value controlled by parent)
- Refs for DOM access (focus management)
- Memoization for performance (useCallback for event handlers)
- Compound component pattern could be considered for advanced use cases

### Browser Compatibility

- Clipboard API for paste handling (modern browsers)
- Fallback needed for older browsers (optional)
- Ensure keyboard navigation works without mouse

### Performance Considerations

- Use `useCallback` for event handlers to prevent unnecessary re-renders
- Memoize the array of refs to prevent recreation on renders
- Avoid inline function definitions in JSX

## Example Usage

```typescript
import { OtpInput } from '@/components/visitors/shared/OtpInput';

function PhoneVerificationStep() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleComplete = async (completeOtp: string) => {
    setIsVerifying(true);
    try {
      await verifyPhoneOtp(completeOtp);
      // Proceed to next step
    } catch (err) {
      setError('Invalid OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div>
      <OtpInput
        value={otp}
        onChange={setOtp}
        onComplete={handleComplete}
        error={error}
        hasError={!!error}
        disabled={isVerifying}
        ariaLabel="Phone verification code"
      />
    </div>
  );
}
```

## Edge Cases

1. **Empty paste**: If user pastes empty string, no change occurs
2. **Paste with invalid characters**: Only digits are extracted, rest ignored
3. **Paste longer than length**: Only first `length` digits are used
4. **Rapid typing**: Component should handle rapid input without losing focus
5. **Component unmounts while focused**: Cleanup refs to prevent memory leaks
6. **Value prop changes externally**: Component should update to reflect new prop value
7. **Multiple OtpInput instances**: Each should maintain independent state and refs
8. **Mobile keyboard**: Ensure mobile numeric keyboard shows up (input type="tel" or pattern="[0-9]*")

## Security Considerations

- OTP values should be masked visually if displayed elsewhere (not applicable to this component as it's input-only)
- Component does not store or persist OTP values
- No sensitive data logging in development
- Consider autocomplete="one-time-code" for browser OTP autofill support
