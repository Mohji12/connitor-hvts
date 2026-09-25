'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

// Schema as per spec
export const deliveryDetailsSchema = z.object({
  platform: z.string().min(2, 'Platform must be at least 2 characters').max(100, 'Platform must not exceed 100 characters'),
  recipient: z.string().min(2, 'Recipient must be at least 2 characters').max(100, 'Recipient must not exceed 100 characters'),
});

export type DeliveryDetailsFormData = z.infer<typeof deliveryDetailsSchema>;

export interface DeliveryDetailsStepProps {
  onSubmit: (data: DeliveryDetailsFormData) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  initialPlatform?: string;
  initialRecipient?: string;
}

export interface DeliveryDetailsStepState {
  selectedChipIndex: number | null;
  showSuccessAnimation: boolean;
  submissionError: string | null;
}

export interface PlatformChip {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }> | null;
}

export const COMMON_DELIVERY_PLATFORMS: PlatformChip[] = [
  { label: 'Zomato', value: 'Zomato', icon: null },
  { label: 'Swiggy', value: 'Swiggy', icon: null },
  { label: 'Amazon', value: 'Amazon', icon: null },
  { label: 'Dunzo', value: 'Dunzo', icon: null },
  { label: 'Uber Eats', value: 'Uber Eats', icon: null },
  { label: 'Blinkit', value: 'Blinkit', icon: null },
  { label: 'Others', value: '', icon: null },
];

export function DeliveryDetailsStep({
  onSubmit,
  onBack,
  isLoading = false,
  initialPlatform = '',
  initialRecipient = '',
}: DeliveryDetailsStepProps) {
  const [state, setState] = useState<DeliveryDetailsStepState>({
    selectedChipIndex: null,
    showSuccessAnimation: false,
    submissionError: null,
  });

  const form = useForm<DeliveryDetailsFormData>({
    resolver: zodResolver(deliveryDetailsSchema),
    mode: 'onBlur',
    defaultValues: {
      platform: initialPlatform,
      recipient: initialRecipient,
    },
  });

  // Initialize selected chip based on initial platform value
  useEffect(() => {
    if (initialPlatform) {
      const chipIndex = COMMON_DELIVERY_PLATFORMS.findIndex(
        (chip) => chip.value === initialPlatform
      );
      if (chipIndex !== -1) {
        setState((prev) => ({ ...prev, selectedChipIndex: chipIndex }));
      }
    }
  }, [initialPlatform]);

  // Auto-focus first chip on mount
  useEffect(() => {
    const firstChip = document.querySelector('[role="radio"]') as HTMLButtonElement;
    if (firstChip) {
      firstChip.focus();
    }
  }, []);

  const handleChipSelect = useCallback(
    (chip: PlatformChip, index: number) => {
      if (chip.label === 'Others') {
        // Focus platform input field
        setState((prev) => ({ ...prev, selectedChipIndex: index }));
        form.setValue('platform', '', { shouldDirty: true, shouldTouch: true });
        setTimeout(() => {
          const platformInput = document.getElementById('platform-input');
          platformInput?.focus();
        }, 0);
      } else {
        // Set platform input value to chip.value
        setState((prev) => ({ ...prev, selectedChipIndex: index }));
        form.setValue('platform', chip.value, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
        form.clearErrors('platform');
      }
    },
    [form]
  );

  const handlePlatformInputChange = useCallback(
    (value: string) => {
      form.setValue('platform', value, { shouldDirty: true, shouldTouch: true });
      
      // Check if typed value matches any chip (exact match required)
      const matchingChipIndex = COMMON_DELIVERY_PLATFORMS.findIndex(
        (chip) => chip.value === value && chip.label !== 'Others'
      );
      
      if (matchingChipIndex !== -1) {
        // Exact match found - select the matching chip
        setState((prev) => ({ ...prev, selectedChipIndex: matchingChipIndex }));
      } else {
        // No exact match - select "Others" if there's text, or null if empty
        const othersIndex = COMMON_DELIVERY_PLATFORMS.findIndex(
          (chip) => chip.label === 'Others'
        );
        setState((prev) => ({
          ...prev,
          selectedChipIndex: value ? othersIndex : null,
        }));
      }
    },
    [form]
  );

  const handleFormSubmit = async (data: DeliveryDetailsFormData) => {
    setState((prev) => ({ ...prev, submissionError: null }));
    
    try {
      // Show success animation
      setState((prev) => ({ ...prev, showSuccessAnimation: true }));
      
      // Call parent onSubmit
      await onSubmit(data);
      
      // Clear success animation after 500ms (parent will navigate)
      setTimeout(() => {
        setState((prev) => ({ ...prev, showSuccessAnimation: false }));
      }, 500);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        showSuccessAnimation: false,
        submissionError:
          error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      }));
    }
  };

  const handleBackClick = useCallback(() => {
    onBack();
  }, [onBack]);

  // Handle Escape key for back navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading && !state.showSuccessAnimation) {
        onBack();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, state.showSuccessAnimation, onBack]);

  const isDisabled = isLoading || state.showSuccessAnimation;

  return (
    <div className="w-full max-w-[480px] mx-auto space-y-6 p-4" data-testid="delivery-details-step">
      {/* Step Indicator */}
      <div className="text-center">
        <p className="text-sm text-gray-500">Step 4 of 6 • Delivery</p>
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Delivery Details</h2>
        <p className="text-gray-600">Tell us about your delivery</p>
      </div>

      {/* Success Animation */}
      {state.showSuccessAnimation && (
        <div
          className="flex flex-col items-center justify-center py-12"
          role="status"
          aria-live="polite"
          aria-label="Success checkmark"
        >
          <CheckCircle2 className="h-16 w-16 text-green-600 animate-in zoom-in duration-300" />
          <p className="mt-4 text-lg font-medium text-green-600">Details Saved!</p>
        </div>
      )}

      {/* Form */}
      {!state.showSuccessAnimation && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-6"
            role="form"
            aria-label="Delivery details form"
          >
            {/* Platform Chips */}
            <div className="space-y-3">
              <FormLabel>Platform / Company *</FormLabel>
              <div
                role="group"
                aria-label="Platform selection"
                className="flex flex-wrap gap-2"
              >
                {COMMON_DELIVERY_PLATFORMS.map((chip, index) => (
                  <button
                    key={chip.label}
                    type="button"
                    role="radio"
                    aria-checked={state.selectedChipIndex === index}
                    aria-label={`${chip.label} platform`}
                    onClick={() => handleChipSelect(chip, index)}
                    disabled={isDisabled}
                    className={`
                      min-h-[40px] min-w-[80px] px-4 rounded-full text-sm font-medium
                      transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      ${
                        state.selectedChipIndex === index
                          ? 'border-2 border-amber-500 bg-amber-500 text-white'
                          : 'border-2 border-gray-300 bg-white text-gray-700 hover:border-amber-400'
                      }
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Input Field */}
            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="platform-input">
                    {state.selectedChipIndex ===
                    COMMON_DELIVERY_PLATFORMS.findIndex((c) => c.label === 'Others')
                      ? 'Platform Name *'
                      : 'Or enter platform name'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      id="platform-input"
                      placeholder="e.g., Local courier, India Post"
                      disabled={isDisabled}
                      className={`h-12 ${
                        form.formState.errors.platform ? 'border-red-500' : 'focus:border-amber-500'
                      }`}
                      aria-required="true"
                      aria-describedby="platform-error"
                      onChange={(e) => {
                        field.onChange(e);
                        handlePlatformInputChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage id="platform-error" />
                </FormItem>
              )}
            />

            {/* Recipient Input Field */}
            <FormField
              control={form.control}
              name="recipient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="recipient-input">Recipient Name or Department *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      id="recipient-input"
                      placeholder="e.g., Dr. Smith, Pharmacy, Reception"
                      disabled={isDisabled}
                      className={`h-12 ${
                        form.formState.errors.recipient ? 'border-red-500' : 'focus:border-amber-500'
                      }`}
                      aria-required="true"
                      aria-describedby="recipient-error"
                    />
                  </FormControl>
                  <FormMessage id="recipient-error" />
                </FormItem>
              )}
            />

            {/* Submission Error */}
            {state.submissionError && (
              <div
                className="text-sm text-red-600 text-center"
                role="alert"
                aria-live="assertive"
              >
                {state.submissionError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBackClick}
                disabled={isDisabled}
                className="text-gray-600"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <Button
                type="submit"
                disabled={isDisabled || form.formState.isSubmitting}
                className="bg-amber-500 hover:bg-amber-600 text-white min-h-[48px] px-6"
              >
                {isDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}

export default DeliveryDetailsStep;
