'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

// =================================================================
// Type Definitions
// =================================================================

export interface ConfirmationStepProps {
  visitId: string;
  visitType: 'MEETING' | 'DELIVERY';
  onDone: () => void;
  onContactSecurity?: () => void;
  autoRedirectDelay?: number | null; // null = no auto-redirect, number = milliseconds
}

export interface ConfirmationStepState {
  animationComplete: boolean;
}

export const ANIMATION_TIMING = {
  CHECKMARK_FADE_IN: 300, // ms
  CHECKMARK_SCALE: 400, // ms
  CHECKMARK_DRAW: 600, // ms
  TEXT_FADE_IN: 500, // ms
  TOTAL_ANIMATION_DURATION: 1200, // ms
} as const;

export const DEFAULT_AUTO_REDIRECT_DELAY = 5000; // ms (5 seconds)

export type DoneHandler = () => void;
export type ContactSecurityHandler = () => void;

// =================================================================
// Main Component
// =================================================================

export function ConfirmationStep({
  // visitId prop not used in display but required by spec for parent tracking
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  visitId,
  // visitType prop not used in display but required by spec for parent tracking
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  visitType,
  onDone,
  onContactSecurity,
  autoRedirectDelay = null,
}: ConfirmationStepProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [state, setState] = useState<ConfirmationStepState>({
    animationComplete: false,
  });

  // Use refs to store timers for proper cleanup
  const autoRedirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cancel auto-redirect timer
  const cancelAutoRedirect = useCallback(() => {
    if (autoRedirectTimerRef.current) {
      clearTimeout(autoRedirectTimerRef.current);
      autoRedirectTimerRef.current = null;
    }
  }, []);

  // Start auto-redirect timer
  const startAutoRedirect = useCallback(() => {
    if (autoRedirectDelay && autoRedirectDelay > 0) {
      autoRedirectTimerRef.current = setTimeout(() => {
        onDone();
      }, autoRedirectDelay);
    }
  }, [autoRedirectDelay, onDone]);

  // Trigger animation on mount
  useEffect(() => {
    // Mark animation as complete after duration
    animationTimerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, animationComplete: true }));
    }, ANIMATION_TIMING.TOTAL_ANIMATION_DURATION);

    // Start auto-redirect if configured
    startAutoRedirect();

    // Cleanup timers on unmount
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
      cancelAutoRedirect();
    };
  }, [startAutoRedirect, cancelAutoRedirect]);

  // Handle Done button click
  const handleDone = useCallback(() => {
    cancelAutoRedirect();
    onDone();
  }, [cancelAutoRedirect, onDone]);

  // Handle Contact Security click
  const handleContactSecurity = useCallback(() => {
    cancelAutoRedirect();
    if (onContactSecurity) {
      onContactSecurity();
    } else {
      // Fallback: log warning if no handler provided
      console.warn('ConfirmationStep: No onContactSecurity handler provided');
    }
  }, [cancelAutoRedirect, onContactSecurity]);

  // Handle Escape key to call onDone
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDone();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDone]);

  // Cancel auto-redirect on any user interaction
  const handleUserInteraction = useCallback(() => {
    cancelAutoRedirect();
  }, [cancelAutoRedirect]);

  return (
    <div
      className="w-full max-w-[480px] mx-auto space-y-6 p-4"
      data-testid="confirmation-step"
      onClick={handleUserInteraction}
      onKeyDown={handleUserInteraction}
      role="presentation"
    >
      {/* Step Indicator */}
      <div className="text-center">
        <p className="text-sm text-gray-500">Step 5 of 6</p>
      </div>

      {/* Success Content */}
      <div
        role="alert"
        aria-live="polite"
        aria-atomic="true"
        className="flex flex-col items-center justify-center py-8 space-y-6"
      >
        {/* Animated Checkmark */}
        <div
          aria-label="Success checkmark animation"
          className="checkmark-container"
        >
          <CheckCircle2
            className="h-20 w-20 md:h-24 md:w-24 text-emerald-500 checkmark-icon"
            data-testid="success-checkmark"
          />
        </div>

        {/* Success Message */}
        <div className="text-center space-y-4 content-fade-in">
          <h1
            role="status"
            aria-label="Request submitted confirmation"
            className="text-2xl md:text-3xl font-bold text-emerald-600"
          >
            Request Submitted!
          </h1>

          {/* WhatsApp Explanation */}
          <div
            id="whatsapp-instruction"
            aria-describedby="whatsapp-instruction"
            className="space-y-2"
          >
            <p className="text-gray-600 text-base">
              You&apos;ll receive your <span className="font-medium">Gate Pass via WhatsApp</span>
            </p>
            <p className="text-gray-600 text-base">
              with your Check-In OTP once approved by security staff.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-3 content-fade-in">
          {/* Done Button (Primary) */}
          <Button
            type="button"
            onClick={handleDone}
            aria-label="Complete registration and close"
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white min-h-[48px] px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Done
          </Button>

          {/* Contact Security Link (Secondary) */}
          {onContactSecurity && (
            <button
              type="button"
              onClick={handleContactSecurity}
              aria-label="Contact security for help"
              className="w-full text-gray-600 hover:text-gray-900 hover:underline min-h-[44px] py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
            >
              Need help? Contact Security
            </button>
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.75);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .checkmark-container {
          animation: fadeInScale ${ANIMATION_TIMING.CHECKMARK_FADE_IN + ANIMATION_TIMING.CHECKMARK_SCALE}ms ease-out;
        }

        .checkmark-icon {
          animation: fadeInScale ${ANIMATION_TIMING.CHECKMARK_SCALE}ms ease-out;
        }

        .content-fade-in {
          animation: fadeInUp ${ANIMATION_TIMING.TEXT_FADE_IN}ms ease-out ${ANIMATION_TIMING.CHECKMARK_FADE_IN}ms backwards;
        }

        /* Respect user's motion preferences */
        @media (prefers-reduced-motion: reduce) {
          .checkmark-container,
          .checkmark-icon,
          .content-fade-in {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }

        /* Active state scale effect */
        .active\\:scale-98:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
}

export default ConfirmationStep;
