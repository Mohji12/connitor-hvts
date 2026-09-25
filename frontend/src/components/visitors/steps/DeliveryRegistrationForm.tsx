'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
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
import { ArrowLeft, Loader2, Camera, X } from 'lucide-react';

// Schema as per spec
// Custom File validation that works in both browser and test environments
const fileSchema = z.custom<File>(
  (val) => {
    // Check if it's a File instance or has File-like properties (for JSDOM)
    if (val instanceof File) return true;
    if (val && typeof val === 'object') {
      const hasFileProps = 'name' in val && 'size' in val && 'type' in val;
      return hasFileProps;
    }
    return false;
  },
  { message: 'Photo is required' }
);

export const deliveryRegistrationSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50, 'First name must not exceed 50 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name must not exceed 50 characters'),
  photo: fileSchema
    .refine((f) => f.size <= 5 * 1024 * 1024, 'Max file size is 5MB')
    .refine((f) => ['image/jpeg', 'image/png', 'image/jpg'].includes(f.type), 'Only JPEG/PNG formats are allowed'),
});

export type DeliveryFormData = z.infer<typeof deliveryRegistrationSchema>;

export interface DeliveryRegistrationFormProps {
  visitorPhone: string;
  onSubmit: (data: DeliveryFormData) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  /** Initial form data for back navigation (Task 9.4) */
  initialFormData?: Partial<Omit<DeliveryFormData, 'photo'>> | null;
  /** Initial photo File restored from sessionStorage (mobile refresh persistence) */
  initialPhoto?: File | null;
  /** Callback when photo is captured/changed, provides both File and base64 data URL for sessionStorage persistence */
  onPhotoCapture?: (file: File | null, dataUrl: string | null) => void;
  /** Callback when form text fields change, for real-time sessionStorage persistence */
  onFormChange?: (data: Partial<Omit<DeliveryFormData, 'photo'>>) => void;
}

export interface DeliveryFormState {
  photoFile: File | null;
  photoPreview: string | null;
}

export function DeliveryRegistrationForm({
  visitorPhone,
  onSubmit,
  onBack,
  isLoading = false,
  initialFormData,
  initialPhoto,
  onPhotoCapture,
  onFormChange,
}: DeliveryRegistrationFormProps) {
  const [photoState, setPhotoState] = useState<DeliveryFormState>({
    photoFile: null,
    photoPreview: null,
  });

  const form = useForm<DeliveryFormData>({
    resolver: zodResolver(deliveryRegistrationSchema),
    mode: 'onBlur', // Validate on blur for better UX
    defaultValues: {
      firstName: initialFormData?.firstName || '',
      lastName: initialFormData?.lastName || '',
      photo: undefined as unknown as File, // Will be set via custom photo handler
    },
  });

  // Watch form changes and notify parent (debounced) for sessionStorage persistence
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!onFormChange) return;

    const subscription = form.watch((value) => {
      // Extract only text fields (exclude photo)
      const textFields: Partial<Omit<DeliveryFormData, 'photo'>> = {
        firstName: value.firstName,
        lastName: value.lastName,
      };

      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce the callback to balance responsiveness with performance
      debounceTimerRef.current = setTimeout(() => {
        onFormChange(textFields);
      }, 300);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [form, onFormChange]);

  // Cleanup preview URL on unmount or when photo changes
  useEffect(() => {
    return () => {
      if (photoState.photoPreview) {
        URL.revokeObjectURL(photoState.photoPreview);
      }
    };
  }, [photoState.photoPreview]);

  // Restore initial photo from sessionStorage (mobile refresh persistence)
  useEffect(() => {
    if (initialPhoto && !photoState.photoFile) {
      const previewUrl = URL.createObjectURL(initialPhoto);
      setPhotoState({
        photoFile: initialPhoto,
        photoPreview: previewUrl,
      });
      form.setValue('photo', initialPhoto, {
        shouldDirty: true,
        shouldTouch: true,
      });
      form.clearErrors('photo');
    }
    // Only run on mount with initialPhoto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhoto]);

  const handlePhotoChange = useCallback(
    (file: File | null) => {
      // Revoke previous preview URL to prevent memory leaks
      if (photoState.photoPreview) {
        URL.revokeObjectURL(photoState.photoPreview);
      }

      if (file) {
        // Validate file size and type for immediate feedback
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

        if (file.size > maxSize) {
          form.setError('photo', { message: 'Max file size is 5MB' });
          return;
        }

        if (!allowedTypes.includes(file.type)) {
          form.setError('photo', { message: 'Only JPEG/PNG formats are allowed' });
          return;
        }

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setPhotoState({
          photoFile: file,
          photoPreview: previewUrl,
        });
        // Set value and mark as touched/dirty
        form.setValue('photo', file, { 
          shouldDirty: true,
          shouldTouch: true,
        });
        form.clearErrors('photo');

        // Notify parent with base64 data URL for sessionStorage persistence
        if (onPhotoCapture) {
          const reader = new FileReader();
          reader.onload = () => {
            onPhotoCapture(file, reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      } else {
        // Clear photo
        setPhotoState({
          photoFile: null,
          photoPreview: null,
        });
        // Type assertion needed because we're clearing the field (will be validated on submit)
        form.setValue('photo', undefined as unknown as File, { 
          shouldDirty: true, 
          shouldTouch: true,
        });

        // Notify parent that photo was removed
        if (onPhotoCapture) {
          onPhotoCapture(null, null);
        }
      }
    },
    [form, photoState.photoPreview, onPhotoCapture]
  );

  const handleFormSubmit = async (data: DeliveryFormData) => {
    // React Hook Form already prevents rapid submissions via isSubmitting state
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleBackClick = useCallback(() => {
    onBack();
  }, [onBack]);

  return (
    <div className="w-full max-w-[480px] mx-auto space-y-6 p-4" data-testid="delivery-registration-form">
      {/* Step Indicator */}
      <div className="text-center">
        <p className="text-sm text-gray-500">Step 3 of 6 • Delivery</p>
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Quick Info</h2>
        <p className="text-gray-600">Fast-track registration for delivery visitors</p>
      </div>

      {/* Form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="space-y-4"
          role="form"
          aria-label="Delivery visitor registration"
        >
          {/* First Name */}
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="firstName">First Name *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="firstName"
                    placeholder="Enter first name"
                    disabled={isLoading}
                    className="h-12"
                    aria-required="true"
                    aria-describedby="firstName-error"
                    autoFocus
                  />
                </FormControl>
                <FormMessage id="firstName-error" />
              </FormItem>
            )}
          />

          {/* Last Name */}
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="lastName">Last Name *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="lastName"
                    placeholder="Enter last name"
                    disabled={isLoading}
                    className="h-12"
                    aria-required="true"
                    aria-describedby="lastName-error"
                  />
                </FormControl>
                <FormMessage id="lastName-error" />
              </FormItem>
            )}
          />

          {/* Phone (Read-only) */}
          <FormItem>
            <FormLabel htmlFor="phone">Phone Number</FormLabel>
            <Input
              id="phone"
              value={visitorPhone}
              disabled
              readOnly
              className="h-12 bg-gray-50 text-gray-600 cursor-not-allowed"
              aria-readonly="true"
            />
          </FormItem>

          {/* Photo Capture */}
          <FormField
            control={form.control}
            name="photo"
            render={() => (
              <FormItem>
                <FormLabel htmlFor="photo-input">Visitor Photo *</FormLabel>
                <div className="space-y-3">
                  {photoState.photoPreview ? (
                    // Photo Preview
                    <div className="relative">
                      <div className="border-2 border-amber-200 rounded-lg overflow-hidden">
                        <Image
                          src={photoState.photoPreview}
                          alt="Visitor photo preview"
                          width={480}
                          height={320}
                          className="w-full h-48 object-cover"
                          unoptimized // For blob URLs
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handlePhotoChange(null)}
                        className="absolute top-2 right-2"
                        disabled={isLoading}
                        aria-label="Remove photo"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    // Photo Capture Button
                    <div className="border-2 border-dashed border-amber-300 rounded-lg p-6 text-center bg-amber-50">
                      <Camera className="mx-auto h-12 w-12 text-amber-600 mb-3" />
                      <p className="text-sm text-gray-600 mb-4">
                        Capture visitor photo for identification
                      </p>
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        capture="user"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handlePhotoChange(file);
                          }
                        }}
                        className="hidden"
                        id="photo-input"
                        disabled={isLoading}
                        aria-label="Capture visitor photo"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('photo-input')?.click()}
                        disabled={isLoading}
                        className="border-amber-400 text-amber-700 hover:bg-amber-100 min-h-[60px]"
                      >
                        <Camera className="mr-2 h-5 w-5" />
                        Capture Photo
                      </Button>
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBackClick}
              disabled={isLoading}
              className="text-gray-600"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              type="submit"
              disabled={isLoading || form.formState.isSubmitting}
              className="bg-amber-500 hover:bg-amber-600 text-white min-h-[48px] px-6"
            >
              {(isLoading || form.formState.isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default DeliveryRegistrationForm;
