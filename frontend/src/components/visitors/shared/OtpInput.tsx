'use client';

import * as React from 'react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';

export interface OtpInputProps {
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

export function OtpInput({
  length = 6,
  value,
  onChange,
  error,
  disabled = false,
  hasError = false,
  ariaLabel = 'One-time password',
  className,
  onComplete,
}: OtpInputProps): React.ReactNode {
  const maxLength = Math.min(Math.max(length, 4), 8); // Clamp between 4 and 8
  const inputRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const [focusIndex, setFocusIndex] = React.useState(0);

  const handleChange = (newValue: string) => {
    // Filter to only digits
    const digitsOnly = newValue.replace(/\D/g, '').slice(0, maxLength);
    onChange(digitsOnly);

    // Auto-focus next box if digit was entered
    const prevLength = value.length;
    const newLength = digitsOnly.length;
    if (newLength > prevLength && newLength < maxLength) {
      setFocusIndex(newLength);
    }

    // Trigger completion callback if all digits are filled
    if (digitsOnly.length === maxLength && onComplete) {
      onComplete(digitsOnly);
    }
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    // Backspace: Clear current box and move to previous if empty
    if (event.key === 'Backspace') {
      const currentValue = value[index] || '';
      if (!currentValue && index > 0) {
        setFocusIndex(index - 1);
      }
    }
    // Arrow Left: Move focus to previous box
    else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      setFocusIndex(index - 1);
    }
    // Arrow Right: Move focus to next box
    else if (event.key === 'ArrowRight' && index < maxLength - 1) {
      event.preventDefault();
      setFocusIndex(index + 1);
    }
    // Enter: Trigger onComplete when full
    else if (
      event.key === 'Enter' &&
      value.length === maxLength &&
      onComplete
    ) {
      event.preventDefault();
      onComplete(value);
    }
  };

  const handleFocus = (index: number) => {
    setFocusIndex(index);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text');
    const digitsOnly = pastedText.replace(/\D/g, '').slice(0, maxLength);
    onChange(digitsOnly);

    // Focus first empty box or last box if complete
    const firstEmptyIndex = digitsOnly.length;
    if (firstEmptyIndex < maxLength) {
      setFocusIndex(firstEmptyIndex);
    } else {
      setFocusIndex(maxLength - 1);
    }

    // Trigger completion callback if all digits are filled
    if (digitsOnly.length === maxLength && onComplete) {
      onComplete(digitsOnly);
    }
  };

  const getBoxClassName = (index: number): string => {
    const baseClasses = 'h-12 w-10 text-2xl font-semibold';
    const errorClasses = hasError ? 'border-destructive' : '';
    const focusClasses = index === focusIndex ? 'ring-2 ring-ring z-10' : '';
    return cn(baseClasses, errorClasses, focusClasses);
  };

  // Generate slots dynamically based on length
  const slots = Array.from({ length: maxLength }, (_, i) => i);

  // Update refs array
  React.useEffect(() => {
    inputRefs.current = slots.map(() => null);
  }, [maxLength, slots]);

  // Auto-focus first empty box on mount if no value
  React.useEffect(() => {
    if (!value && !disabled) {
      setFocusIndex(0);
    }
  }, [value, disabled]);

  // Focus management - auto-focus the tracked slot
  React.useEffect(() => {
    if (inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex]?.focus();
    }
  }, [focusIndex]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <InputOTP
        value={value}
        onChange={handleChange}
        maxLength={maxLength}
        disabled={disabled}
        containerClassName={cn(
          'gap-2',
          hasError && 'has-[:focus-visible]:border-destructive',
        )}
      >
        <InputOTPGroup role="group" aria-label={ariaLabel}>
          {slots.map((index) => (
            <InputOTPSlot
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              index={index}
              className={getBoxClassName(index)}
              aria-label={`Digit ${index + 1} of ${maxLength}`}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onFocus={() => handleFocus(index)}
              onPaste={(e) => handlePaste(e)}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>

      {error && (
        <p
          id="otp-error-message"
          className="text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
