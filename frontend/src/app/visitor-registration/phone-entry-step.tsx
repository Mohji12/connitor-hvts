'use client';

/**
 * PhoneEntryStep - Step 1a of visitor registration
 * Captures visitor's mobile phone number and initiates SMS OTP verification
 * Task 4.1 - Phone Entry Step
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api';

// UI Components
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface PhoneEntryStepProps {
  /** Required UUID for send-otp API */
  branchId: string;
  /** Callback triggered on successful OTP send */
  onSuccess: (data: { phone: string; isNewVisitor: boolean }) => void;
  /** Optional callback for cancel action */
  onCancel?: () => void;
  /** Optional initial phone number to prefill */
  initialPhone?: string;
}

export interface PhoneEntryFormState {
  phone: string;
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

export interface SendOtpErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  code?: 'VALIDATION_FAILED' | 'RATE_LIMIT_EXCEEDED' | 'SMS_SEND_FAILED' | 'OTP_LOCKED';
  retryAfter?: number;  // Seconds until retry allowed (for rate limit)
}

export enum PhoneEntryErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  OTP_LOCKED = 'OTP_LOCKED',
  RATE_LIMITED = 'RATE_LIMITED',
}

// ============================================================================
// Validation Schema
// ============================================================================

const phoneEntrySchema = z.object({
  phone: z
    .string({
      required_error: 'Phone number is required',
    })
    .min(1, 'Phone number is required')
    .refine((val) => /^[0-9]{10}$/.test(val), {
      message: 'Phone must be exactly 10 digits',
    }),
});

export type PhoneEntryFormData = z.infer<typeof phoneEntrySchema>;

// ============================================================================
// API Function
// ============================================================================

async function sendOtp(data: SendOtpRequest): Promise<SendOtpResponse> {
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
 * Maps API errors to user-friendly messages according to Task 9.3 spec
 */
function getErrorMessage(error: unknown): string {
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
      data?: SendOtpErrorResponse;
    };

    // Rate limiting (429)
    if (response.status === 429) {
      const retryAfter = response.data?.retryAfter;
      if (retryAfter) {
        const minutes = Math.ceil(retryAfter / 60);
        return `Too many attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
      }
      return 'Too many requests. Please try again later.';
    }

    // Bad request errors (400)
    if (response.status === 400 && response.data?.message) {
      const message = response.data.message;
      const messageStr = Array.isArray(message) ? message[0] : message;

      // Spec-defined error codes
      if (messageStr.includes('OTP_LOCKED') || response.data.code === 'OTP_LOCKED') {
        return 'Too many failed attempts. Please try again in 15 minutes.';
      }
      if (messageStr.includes('SMS_SEND_FAILED') || response.data.code === 'SMS_SEND_FAILED') {
        return 'Unable to send SMS. Please try again or contact security.';
      }
      if (response.data.code === 'VALIDATION_FAILED') {
        return 'Please enter a valid 10-digit phone number.';
      }
      if (response.data.code === 'RATE_LIMIT_EXCEEDED') {
        const retryAfter = response.data.retryAfter;
        if (retryAfter) {
          const minutes = Math.ceil(retryAfter / 60);
          return `Too many attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
        }
        return 'Too many requests. Please try again later.';
      }
      
      // Return the actual error message from API
      return messageStr;
    }
  }

  // Network error (Error instance without response, or any other error)
  if (error instanceof Error) {
    return 'Connection lost. Please check your internet and try again.';
  }

  // Generic fallback
  return 'Something went wrong. Please try again.';
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PhoneEntryStep - Renders phone input form with country code prefix.
 * Validates phone, calls send-otp API, handles loading and errors.
 */
export function PhoneEntryStep({
  branchId,
  onSuccess,
  onCancel,
  initialPhone,
}: PhoneEntryStepProps): React.ReactElement {
  const [apiError, setApiError] = React.useState<string | null>(null);

  // Initialize form with react-hook-form and zod validation
  const form = useForm<PhoneEntryFormData>({
    resolver: zodResolver(phoneEntrySchema),
    mode: 'onTouched', // Validate after field is touched (blur or change)
    reValidateMode: 'onChange',
    defaultValues: {
      phone: initialPhone ?? '',
    },
  });

  // TanStack Query mutation for sending OTP
  const sendOtpMutation = useMutation({
    mutationFn: sendOtp,
    onSuccess: (data) => {
      setApiError(null);

      // Store test OTP in localStorage if provided (TEST_MODE)
      if (data.testOtp) {
        localStorage.setItem('test_otp', data.testOtp);
      }

      // Trigger success callback
      onSuccess({
        phone: form.getValues('phone'),
        isNewVisitor: data.isNewVisitor,
      });
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error);
      setApiError(errorMessage);
    },
    // Ensure errors don't propagate outside the mutation
    throwOnError: false,
  });

  // Form submission handler
  const onSubmit = React.useCallback(
    async (data: PhoneEntryFormData): Promise<void> => {
      setApiError(null);
      try {
        await sendOtpMutation.mutateAsync({
          phone: data.phone,
          branchId,
        });
      } catch {
        // Error is already handled by mutation's onError
        // This catch prevents unhandled promise rejection in tests
      }
    },
    [branchId, sendOtpMutation]
  );

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

  const isLoading = sendOtpMutation.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8" data-testid="phone-entry-step">
      <div className="w-full max-w-md space-y-6">
        {/* Step Indicator */}
        <div
          className="text-center text-sm text-gray-500"
          aria-label="Registration progress: Step 1 of 6"
        >
          Step 1 of 6
        </div>

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Enter Your Mobile Number
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            We&apos;ll send you a verification code to get started
          </p>
        </div>

        {/* Error Message */}
        {apiError && (
          <div
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600"
            role="alert"
            aria-live="assertive"
          >
            {apiError}
          </div>
        )}

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="phone"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel htmlFor="phone-input">Phone Number</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      {/* Country Code Prefix */}
                      <div className="flex h-12 items-center rounded-md border border-gray-300 bg-gray-100 px-3 text-sm font-medium text-gray-700">
                        +91
                      </div>

                      {/* Phone Input */}
                      <Input
                        {...field}
                        id="phone-input"
                        type="tel"
                        inputMode="numeric"
                        placeholder="9876543210"
                        maxLength={10}
                        disabled={isLoading}
                        aria-label="Mobile phone number"
                        aria-describedby={
                          fieldState.error ? 'phone-error' : 'phone-hint'
                        }
                        aria-invalid={!!fieldState.error}
                        required
                        className={cn(
                          'h-12 flex-1',
                          fieldState.error &&
                            'border-red-500 ring-red-500 focus-visible:ring-red-500'
                        )}
                      />
                    </div>
                  </FormControl>

                  {/* Hint Text */}
                  {!fieldState.error && (
                    <p
                      id="phone-hint"
                      className="text-xs text-gray-500"
                      aria-live="polite"
                    >
                      Enter your 10-digit mobile number
                    </p>
                  )}

                  {/* Error Message */}
                  {fieldState.error && (
                    <FormMessage id="phone-error" role="alert" />
                  )}
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full transition-colors duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send OTP'
                )}
              </Button>

              {/* Cancel Button (Optional) */}
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={onCancel}
                  className="h-12 w-full transition-colors duration-200"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>

        {/* Loading Announcement for Screen Readers */}
        {isLoading && (
          <div className="sr-only" aria-live="polite">
            Sending OTP, please wait...
          </div>
        )}
      </div>
    </div>
  );
}
