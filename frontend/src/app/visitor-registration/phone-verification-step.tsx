'use client';

/**
 * PhoneVerificationStep - Step 1b of visitor registration
 * Verifies visitor's phone number via 6-digit OTP sent via SMS
 * Task 4.2 - Phone Verification Step
 */

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api';

// UI Components
import { OtpInput } from '@/components/visitors/shared/OtpInput';
import { Button } from '@/components/ui/button';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface PhoneVerificationStepProps {
  /** 10-digit phone number from Step 1a */
  phone: string;
  /** Required UUID for verify-phone API */
  branchId: string;
  /** Callback triggered on successful verification */
  onSuccess: (data: VerificationSuccessData) => void;
  /** Optional callback for navigation back to phone entry */
  onCancel?: () => void;
}

export interface VerificationSuccessData {
  visitorData: VisitorData;
  isExistingVisitor: boolean;
  phone: string;
}

export interface VisitorData {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phone: string;
  email: string | null;
  company: string | null;
  designation: string | null;
  phoneVerified: boolean;
}

export interface VerifyPhoneRequest {
  phone: string;
  otp: string;
  branchId: string;
}

export interface VerifyPhoneResponse {
  verified: true;
  isExistingVisitor: boolean;
  visitorData: VisitorData;
}

export interface SendOtpRequest {
  phone: string;
  branchId: string;
}

export interface SendOtpResponse {
  success: true;
  message: string;
  isNewVisitor: boolean;
  testOtp?: string; // TEST_MODE only
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

export enum PhoneVerificationError {
  OTP_LOCKED = 'OTP_LOCKED',
  SMS_SEND_FAILED = 'SMS_SEND_FAILED',
  OTP_EXPIRED = 'OTP_EXPIRED',
  INVALID_OTP = 'INVALID_OTP',
  VISITOR_NOT_FOUND = 'VISITOR_NOT_FOUND',
  PHONE_NOT_VERIFIED = 'PHONE_NOT_VERIFIED',
}

// ============================================================================
// Validation Schema
// ============================================================================

const otpSchema = z.object({
  otp: z
    .string()
    .min(6, 'Please enter all 6 digits')
    .max(6, 'OTP must be exactly 6 digits')
    .regex(/^[0-9]{6}$/, 'OTP must contain only digits'),
});

export type OtpFormData = z.infer<typeof otpSchema>;

// ============================================================================
// API Functions
// ============================================================================

async function verifyPhone(
  data: VerifyPhoneRequest
): Promise<VerifyPhoneResponse> {
  const response = await apiClient.post<VerifyPhoneResponse>(
    '/api/public/visitors/verify-phone',
    data
  );
  return response.data;
}

async function resendOtp(data: SendOtpRequest): Promise<SendOtpResponse> {
  const response = await apiClient.post<SendOtpResponse>(
    '/api/public/visitors/send-otp',
    data
  );
  return response.data;
}

// ============================================================================
// Error Handling Utility
// ============================================================================

/**
 * Error messages as per Task 9.3 specification
 */
const errorMessages: Record<PhoneVerificationError, string> = {
  INVALID_OTP: 'Invalid code. Please check and try again.',
  OTP_EXPIRED: 'Code expired. Please request a new code.',
  OTP_LOCKED: 'Too many failed attempts. Please try again after 15 minutes.',
  SMS_SEND_FAILED: 'Unable to send SMS. Please try again or contact security.',
  VISITOR_NOT_FOUND: 'Visitor not found. Please complete verification again.',
  PHONE_NOT_VERIFIED: 'Phone not verified. Please try again.',
};

interface ErrorDetails {
  message: string;
  attemptsRemaining?: number;
}

/**
 * Maps API errors to user-friendly messages with attempts remaining
 */
function getErrorDetails(error: unknown): ErrorDetails {
  // Check if error has a response property (Axios error structure)
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null
  ) {
    const response = error.response as {
      status?: number;
      data?: ApiErrorResponse & { attemptsRemaining?: number };
    };

    // Bad request errors (400)
    if (response.status === 400 && response.data) {
      const errorCode = response.data.error as PhoneVerificationError;
      const message = response.data.message;
      const attemptsRemaining = response.data.attemptsRemaining;

      // Handle INVALID_OTP with attempts remaining
      if (errorCode === PhoneVerificationError.INVALID_OTP) {
        // Extract attempts from response data or message
        let attempts = attemptsRemaining;
        
        if (attempts === undefined) {
          // Fallback: extract from message if present
          const messageStr = Array.isArray(message) ? message[0] : message;
          const attemptsMatch = messageStr.match(/(\d+)\s+attempts?\s+remaining/i);
          attempts = attemptsMatch ? parseInt(attemptsMatch[1], 10) : undefined;
        }

        return {
          message: errorMessages.INVALID_OTP,
          attemptsRemaining: attempts,
        };
      }

      // Other known error codes
      if (errorCode in errorMessages) {
        return { message: errorMessages[errorCode] };
      }
      
      // Return actual error message if no mapped error
      const messageStr = Array.isArray(message) ? message[0] : message;
      return { message: messageStr };
    }

    // Not found (404)
    if (response.status === 404) {
      return { message: errorMessages.VISITOR_NOT_FOUND };
    }

    // Rate limiting (429)
    if (response.status === 429) {
      return { message: 'Too many requests. Please try again later.' };
    }
  }

  // Network error (Error instance without response)
  if (error instanceof Error) {
    return {
      message: 'Connection lost. Please check your internet and try again.',
    };
  }

  // Generic fallback
  return { message: 'Something went wrong. Please try again.' };
}

// ============================================================================
// Helper Functions
// ============================================================================

function maskPhone(phone: string): string {
  // Format: +91 XXX**XXXX (mask middle 4 digits)
  if (phone.length !== 10) return phone;
  return `+91 ${phone.slice(0, 3)}**${phone.slice(7)}`;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PhoneVerificationStep - Renders 6-digit OTP input with countdown timer.
 * Validates OTP via verify-phone API, handles errors and success states.
 */
export function PhoneVerificationStep({
  phone,
  branchId,
  onSuccess,
  onCancel,
}: PhoneVerificationStepProps): React.ReactElement {
  // State
  const [otp, setOtp] = React.useState('');
  const [countdown, setCountdown] = React.useState(60);
  const [canResend, setCanResend] = React.useState(false);
  const [error, setError] = React.useState<ErrorDetails | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);

  // TanStack Query mutation for OTP verification
  const verifyOtpMutation = useMutation({
    mutationFn: verifyPhone,
    onSuccess: (data) => {
      setError(null);
      setIsSuccess(true);

      // Clear test OTP from localStorage after successful verification
      // This prevents OTP from being auto-filled when navigating back
      if (typeof window !== 'undefined') {
        localStorage.removeItem('test_otp');
      }

      // Wait 1 second for animation, then trigger callback
      setTimeout(() => {
        onSuccess({
          visitorData: data.visitorData,
          isExistingVisitor: data.isExistingVisitor,
          phone,
        });
      }, 1000);
    },
    onError: (err) => {
      const errorDetails = getErrorDetails(err);
      setError(errorDetails);
      setOtp(''); // Clear OTP on error
    },
    throwOnError: false,
  });

  // TanStack Query mutation for resending OTP
  const resendOtpMutation = useMutation({
    mutationFn: resendOtp,
    onSuccess: (data) => {
      setError(null);
      setCountdown(60);
      setCanResend(false);
      setOtp('');

      // Store test OTP in localStorage if provided (TEST_MODE)
      if (data.testOtp) {
        localStorage.setItem('test_otp', data.testOtp);
      }
    },
    onError: (err) => {
      const errorDetails = getErrorDetails(err);
      setError(errorDetails);
    },
    throwOnError: false,
  });

  // Countdown timer effect
  React.useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [countdown, canResend]);

  // Handle OTP change
  const handleOtpChange = React.useCallback((value: string) => {
    setOtp(value);
    setError(null); // Clear error when user types
  }, []);

  // Handle manual OTP verification (triggered by button click)
  const handleVerifyOtp = React.useCallback(
    async (): Promise<void> => {
      // Validate OTP format
      const validation = otpSchema.safeParse({ otp });
      if (!validation.success) {
        setError({ message: validation.error.errors[0].message });
        return;
      }

      // Submit verification
      try {
        await verifyOtpMutation.mutateAsync({
          phone,
          otp,
          branchId,
        });
      } catch {
        // Error already handled by mutation's onError
      }
    },
    [otp, phone, branchId, verifyOtpMutation]
  );

  // Handle resend OTP
  const handleResendOtp = React.useCallback(async (): Promise<void> => {
    if (!canResend || resendOtpMutation.isPending) return;

    try {
      await resendOtpMutation.mutateAsync({
        phone,
        branchId,
      });
    } catch {
      // Error already handled by mutation's onError
    }
  }, [canResend, phone, branchId, resendOtpMutation]);

  // Handle change phone number
  const handleChangePhone = React.useCallback((): void => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Keyboard event handler for Escape
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && onCancel) {
        onCancel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  const isVerifying = verifyOtpMutation.isPending;

  // Build error message with attempts
  const errorMessage = error
    ? error.attemptsRemaining !== undefined
      ? `${error.message} ${error.attemptsRemaining} attempts remaining.`
      : error.message
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8" data-testid="phone-verification-step">
      <div
        className="w-full max-w-[480px] space-y-6"
        role="group"
        aria-label="Phone verification"
      >
        {/* Step Indicator */}
        <div
          className="text-center text-sm text-gray-500"
          aria-label="Registration progress: Step 1 of 6"
        >
          Step 1 of 6
        </div>

        {/* Success Animation */}
        {isSuccess && (
          <div
            className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-300"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              className="h-16 w-16 text-green-600"
              aria-label="Verification successful"
            />
            <p className="text-lg font-semibold text-green-600">
              Phone verified successfully!
            </p>
          </div>
        )}

        {/* Main Content (hidden when success) */}
        {!isSuccess && (
          <>
            {/* Header */}
            <div className="text-center">
              <h1 id="otp-heading" className="text-2xl font-bold text-gray-900">
                Verify Your Phone Number
              </h1>
              <p
                className="mt-2 text-sm text-gray-600"
                id="phone-masked"
                aria-describedby="phone-masked"
              >
                We&apos;ve sent a 6-digit code to {maskPhone(phone)} via SMS
              </p>
            </div>

            {/* OTP Input */}
            <div className="space-y-2">
              <OtpInput
                value={otp}
                onChange={handleOtpChange}
                disabled={isVerifying}
                hasError={!!error}
                error={errorMessage || undefined}
                ariaLabel="Enter verification code"
                className="justify-center"
              />
            </div>

            {/* Verify Button */}
            <div className="flex justify-center">
              <Button
                type="button"
                onClick={handleVerifyOtp}
                disabled={otp.length !== 6 || isVerifying}
                className="w-full max-w-xs"
                size="lg"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </Button>
            </div>

            {/* Countdown / Resend */}
            <div className="text-center">
              <div aria-live="polite" aria-atomic="true">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendOtpMutation.isPending}
                    className={cn(
                      'text-sm underline transition-colors duration-200',
                      resendOtpMutation.isPending
                        ? 'cursor-not-allowed text-gray-400'
                        : 'cursor-pointer text-primary hover:text-primary/80'
                    )}
                  >
                    {resendOtpMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      "Didn't receive? Resend"
                    )}
                  </button>
                ) : (
                  <span className="text-sm text-gray-500">
                    Resend in {countdown}s
                  </span>
                )}
              </div>
            </div>

            {/* Change Phone Number Link */}
            {onCancel && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleChangePhone}
                  disabled={isVerifying}
                  className="text-sm text-gray-500 underline hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Change phone number
                </button>
              </div>
            )}
          </>
        )}

        {/* Loading Announcement for Screen Readers */}
        {isVerifying && (
          <div className="sr-only" aria-live="polite">
            Verifying OTP, please wait...
          </div>
        )}
      </div>
    </div>
  );
}
