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
import { ArrowLeft, Loader2, Camera, X, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  { message: 'File is required' }
);

// Validation schema as per spec
export const meetingRegistrationSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .trim(),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters')
    .trim(),
  email: z.string().email('Please enter a valid email address').trim(),
  company: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().min(10, 'Invalid phone number').max(15, 'Invalid phone number'),
  photo: fileSchema
    .refine((f) => f.size <= 5 * 1024 * 1024, 'Max file size is 5MB')
    .refine(
      (f) => ['image/jpeg', 'image/png', 'image/jpg'].includes(f.type),
      'Only JPEG/PNG formats are allowed'
    ),
  governmentIdDocument: fileSchema
    .refine((f) => f.size <= 5 * 1024 * 1024, 'Max file size is 5MB')
    .refine(
      (f) =>
        ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(f.type),
      'Please upload a valid document (JPG, PNG, PDF)'
    ),
  officeIdDocument: fileSchema
    .refine((f) => f.size <= 5 * 1024 * 1024, 'Max file size is 5MB')
    .refine(
      (f) =>
        ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(f.type),
      'Please upload a valid document (JPG, PNG, PDF)'
    )
    .optional(),
});

export type MeetingFormData = z.infer<typeof meetingRegistrationSchema>;

/** Visitor data returned from phone verification (existing visitor) */
export interface ExistingVisitorData {
  firstName: string;
  lastName: string;
  email?: string | null;
  company?: string | null;
  designation?: string | null;
  address?: string | null;
  // Note: Photo, governmentIdDocument, officeIdDocument NOT included
}

export interface MeetingRegistrationFormProps {
  /** Verified phone number (from Step 1b) */
  phone: string;
  /** Branch ID for registration context */
  branchId: string;
  /** Whether this is an existing visitor (for auto-fill) */
  isExistingVisitor: boolean;
  /** Pre-filled visitor data (if existing) */
  existingVisitorData?: ExistingVisitorData | null;
  /** Initial form data for back navigation (Task 9.4) */
  initialFormData?: Partial<Omit<MeetingFormData, 'photo' | 'governmentIdDocument' | 'officeIdDocument'>> | null;
  /** Initial photo File restored from sessionStorage (mobile refresh persistence) */
  initialPhoto?: File | null;
  /** Initial government ID File restored from sessionStorage (mobile refresh persistence) */
  initialGovId?: File | null;
  /** Initial office ID File restored from sessionStorage (mobile refresh persistence) */
  initialOfficeId?: File | null;
  /** Callback when photo is captured/changed, provides both File and base64 data URL for sessionStorage persistence */
  onPhotoCapture?: (file: File | null, dataUrl: string | null) => void;
  /** Callback when government ID is captured/changed */
  onGovIdCapture?: (file: File | null, dataUrl: string | null) => void;
  /** Callback when office ID is captured/changed */
  onOfficeIdCapture?: (file: File | null, dataUrl: string | null) => void;
  /** Callback on form submission with valid data */
  onSubmit: (data: MeetingFormData) => Promise<void>;
  /** Callback on back navigation */
  onBack: () => void;
  /** Loading state for submission */
  isLoading?: boolean;
  /** Callback when form text fields change, for real-time sessionStorage persistence */
  onFormChange?: (data: Partial<Omit<MeetingFormData, 'photo' | 'governmentIdDocument' | 'officeIdDocument'>>) => void;
}

interface FileState {
  file: File | null;
  preview: string | null;
}

export function MeetingRegistrationForm({
  phone,
  branchId, // eslint-disable-line @typescript-eslint/no-unused-vars -- For future API integration context
  isExistingVisitor,
  existingVisitorData,
  initialFormData,
  initialPhoto,
  initialGovId,
  initialOfficeId,
  onPhotoCapture,
  onGovIdCapture,
  onOfficeIdCapture,
  onSubmit,
  onBack,
  isLoading = false,
  onFormChange,
}: MeetingRegistrationFormProps) {
  const [photoState, setPhotoState] = useState<FileState>({
    file: null,
    preview: null,
  });

  const [govIdState, setGovIdState] = useState<FileState>({
    file: null,
    preview: null,
  });

  const [officeIdState, setOfficeIdState] = useState<FileState>({
    file: null,
    preview: null,
  });

  const form = useForm<MeetingFormData>({
    resolver: zodResolver(meetingRegistrationSchema),
    mode: 'onBlur', // Validate on blur for better UX
    defaultValues: {
      // Priority: initialFormData (back navigation) > existingVisitorData (pre-fill) > empty
      firstName: initialFormData?.firstName || (isExistingVisitor && existingVisitorData ? existingVisitorData.firstName : ''),
      lastName: initialFormData?.lastName || (isExistingVisitor && existingVisitorData ? existingVisitorData.lastName : ''),
      email: initialFormData?.email || (isExistingVisitor && existingVisitorData ? existingVisitorData.email || '' : ''),
      company: initialFormData?.company || (isExistingVisitor && existingVisitorData ? existingVisitorData.company || '' : ''),
      designation: initialFormData?.designation || (isExistingVisitor && existingVisitorData ? existingVisitorData.designation || '' : ''),
      address: initialFormData?.address || (isExistingVisitor && existingVisitorData ? existingVisitorData.address || '' : ''),
      phone: phone,
      photo: undefined as unknown as File,
      governmentIdDocument: undefined as unknown as File,
      officeIdDocument: undefined,
    },
  });

  // Watch form changes and notify parent (debounced) for sessionStorage persistence
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!onFormChange) return;

    const subscription = form.watch((value) => {
      // Extract only text fields (exclude file fields)
      const textFields: Partial<Omit<MeetingFormData, 'photo' | 'governmentIdDocument' | 'officeIdDocument'>> = {
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email,
        company: value.company,
        designation: value.designation,
        address: value.address,
        phone: value.phone,
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

  // Cleanup preview URLs on unmount or when files change
  useEffect(() => {
    return () => {
      if (photoState.preview) {
        URL.revokeObjectURL(photoState.preview);
      }
      if (govIdState.preview) {
        URL.revokeObjectURL(govIdState.preview);
      }
      if (officeIdState.preview) {
        URL.revokeObjectURL(officeIdState.preview);
      }
    };
  }, [photoState.preview, govIdState.preview, officeIdState.preview]);

  // Restore initial files from sessionStorage (mobile refresh persistence)
  useEffect(() => {
    if (initialPhoto && !photoState.file) {
      const previewUrl = URL.createObjectURL(initialPhoto);
      setPhotoState({ file: initialPhoto, preview: previewUrl });
      form.setValue('photo', initialPhoto, { shouldDirty: true, shouldTouch: true });
      form.clearErrors('photo');
    }
    if (initialGovId && !govIdState.file) {
      const previewUrl = URL.createObjectURL(initialGovId);
      setGovIdState({ file: initialGovId, preview: previewUrl });
      form.setValue('governmentIdDocument', initialGovId, { shouldDirty: true, shouldTouch: true });
      form.clearErrors('governmentIdDocument');
    }
    if (initialOfficeId && !officeIdState.file) {
      const previewUrl = URL.createObjectURL(initialOfficeId);
      setOfficeIdState({ file: initialOfficeId, preview: previewUrl });
      form.setValue('officeIdDocument', initialOfficeId, { shouldDirty: true, shouldTouch: true });
      form.clearErrors('officeIdDocument');
    }
    // Only run on mount with initial files
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhoto, initialGovId, initialOfficeId]);

  const handleFileChange = useCallback(
    (
      file: File | null,
      fieldName: 'photo' | 'governmentIdDocument' | 'officeIdDocument',
      allowedTypes: string[],
      setState: React.Dispatch<React.SetStateAction<FileState>>,
      onCapture?: (file: File | null, dataUrl: string | null) => void
    ) => {
      // Get current state
      const currentState =
        fieldName === 'photo'
          ? photoState
          : fieldName === 'governmentIdDocument'
            ? govIdState
            : officeIdState;

      // Revoke previous preview URL to prevent memory leaks
      if (currentState.preview) {
        URL.revokeObjectURL(currentState.preview);
      }

      if (file) {
        // Validate file size and type for immediate feedback
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (file.size > maxSize) {
          form.setError(fieldName, { message: 'Max file size is 5MB' });
          return;
        }

        if (!allowedTypes.includes(file.type)) {
          const message =
            fieldName === 'photo'
              ? 'Only JPEG/PNG formats are allowed'
              : 'Please upload a valid document (JPG, PNG, PDF)';
          form.setError(fieldName, { message });
          return;
        }

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setState({
          file: file,
          preview: previewUrl,
        });

        // Set value and mark as touched/dirty
        form.setValue(fieldName, file, {
          shouldDirty: true,
          shouldTouch: true,
        });
        form.clearErrors(fieldName);

        // Notify parent with base64 data URL for sessionStorage persistence
        if (onCapture) {
          const reader = new FileReader();
          reader.onload = () => {
            onCapture(file, reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      } else {
        // Clear file
        setState({
          file: null,
          preview: null,
        });
        // Type assertion needed because we're clearing the field (will be validated on submit)
        form.setValue(fieldName, undefined as unknown as File, {
          shouldDirty: true,
          shouldTouch: true,
        });

        // Notify parent that file was removed
        if (onCapture) {
          onCapture(null, null);
        }
      }
    },
    [form, photoState, govIdState, officeIdState]
  );

  const handlePhotoChange = useCallback(
    (file: File | null) => {
      handleFileChange(file, 'photo', ['image/jpeg', 'image/png', 'image/jpg'], setPhotoState, onPhotoCapture);
    },
    [handleFileChange, onPhotoCapture]
  );

  const handleGovIdChange = useCallback(
    (file: File | null) => {
      handleFileChange(
        file,
        'governmentIdDocument',
        ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
        setGovIdState,
        onGovIdCapture
      );
    },
    [handleFileChange, onGovIdCapture]
  );

  const handleOfficeIdChange = useCallback(
    (file: File | null) => {
      handleFileChange(
        file,
        'officeIdDocument',
        ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
        setOfficeIdState,
        onOfficeIdCapture
      );
    },
    [handleFileChange, onOfficeIdCapture]
  );

  const handleFormSubmit = async (data: MeetingFormData) => {
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
    <div className="w-full max-w-[480px] mx-auto space-y-6 p-4" data-testid="meeting-registration-form">
      {/* Step Indicator */}
      <div className="text-center">
        <p className="text-sm text-gray-500" aria-live="polite" aria-label="Step 3 of 6, Meeting">
          Step 3 of 6 • Meeting
        </p>
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <h2 id="form-heading" className="text-2xl font-bold text-gray-900">
          Your Details
        </h2>
        <p className="text-gray-600">Please provide your information for the visit</p>
      </div>

      {/* Auto-fill Banner */}
      {isExistingVisitor && existingVisitorData && (
        <Alert className="bg-emerald-50 border-emerald-200" role="status">
          <AlertDescription className="text-emerald-800">
            We found your details. Please verify and update if needed.
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="space-y-4"
          role="form"
          aria-labelledby="form-heading"
        >
          {/* First Name & Last Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </FormLabel>
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

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </FormLabel>
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
          </div>

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    disabled={isLoading}
                    className="h-12"
                    aria-required="true"
                    aria-describedby="email-error"
                  />
                </FormControl>
                <FormMessage id="email-error" />
              </FormItem>
            )}
          />

          {/* Company */}
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="company">Company</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="company"
                    placeholder="Enter company name (optional)"
                    disabled={isLoading}
                    className="h-12"
                    aria-describedby="company-error"
                  />
                </FormControl>
                <FormMessage id="company-error" />
              </FormItem>
            )}
          />

          {/* Designation */}
          <FormField
            control={form.control}
            name="designation"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="designation">Designation</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="designation"
                    placeholder="Enter designation (optional)"
                    disabled={isLoading}
                    className="h-12"
                    aria-describedby="designation-error"
                  />
                </FormControl>
                <FormMessage id="designation-error" />
              </FormItem>
            )}
          />

          {/* Address */}
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="address">Address</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="address"
                    placeholder="Enter address (optional)"
                    disabled={isLoading}
                    className="h-12"
                    aria-describedby="address-error"
                  />
                </FormControl>
                <FormMessage id="address-error" />
              </FormItem>
            )}
          />

          {/* Phone (Read-only) */}
          <FormItem>
            <FormLabel htmlFor="phone">Phone Number</FormLabel>
            <Input
              id="phone"
              value={phone}
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
                <FormLabel htmlFor="photo-input">
                  Visitor Photo <span className="text-red-500">*</span>
                </FormLabel>
                <div className="space-y-3">
                  {photoState.preview ? (
                    // Photo Preview
                    <div className="relative">
                      <div className="border-2 border-emerald-200 rounded-lg overflow-hidden">
                        <Image
                          src={photoState.preview}
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
                    <div className="border-2 border-dashed border-emerald-300 rounded-lg p-6 text-center bg-emerald-50">
                      <Camera className="mx-auto h-12 w-12 text-emerald-600 mb-3" />
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
                        className="border-emerald-400 text-emerald-700 hover:bg-emerald-100 min-h-[60px]"
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

          {/* Government ID Document */}
          <FormField
            control={form.control}
            name="governmentIdDocument"
            render={() => (
              <FormItem>
                <FormLabel htmlFor="gov-id-input">
                  Government ID <span className="text-red-500">*</span>
                </FormLabel>
                <div className="space-y-3">
                  {govIdState.preview ? (
                    // Document Preview
                    <div className="relative">
                      <div className="border-2 border-emerald-200 rounded-lg overflow-hidden bg-gray-50 p-4">
                        {govIdState.file?.type === 'application/pdf' ? (
                          <div className="flex items-center gap-3">
                            <Upload className="h-8 w-8 text-emerald-600" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {govIdState.file?.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {govIdState.file && (govIdState.file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                        ) : (
                          <Image
                            src={govIdState.preview}
                            alt="Government ID preview"
                            width={480}
                            height={240}
                            className="w-full h-32 object-contain"
                            unoptimized // For blob URLs
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleGovIdChange(null)}
                        className="absolute top-2 right-2"
                        disabled={isLoading}
                        aria-label="Remove government ID"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    // Document Upload Button
                    <div className="border-2 border-dashed border-emerald-300 rounded-lg p-6 text-center bg-emerald-50">
                      <Upload className="mx-auto h-10 w-10 text-emerald-600 mb-3" />
                      <p className="text-sm text-gray-600 mb-4">
                        Upload or capture government ID (JPG, PNG, PDF)
                      </p>
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleGovIdChange(file);
                          }
                        }}
                        className="hidden"
                        id="gov-id-input"
                        disabled={isLoading}
                        aria-label="Upload government ID document"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('gov-id-input')?.click()}
                        disabled={isLoading}
                        className="border-emerald-400 text-emerald-700 hover:bg-emerald-100"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Document
                      </Button>
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Office ID Document (Optional) */}
          <FormField
            control={form.control}
            name="officeIdDocument"
            render={() => (
              <FormItem>
                <FormLabel htmlFor="office-id-input">Office ID (Optional)</FormLabel>
                <div className="space-y-3">
                  {officeIdState.preview ? (
                    // Document Preview
                    <div className="relative">
                      <div className="border-2 border-emerald-200 rounded-lg overflow-hidden bg-gray-50 p-4">
                        {officeIdState.file?.type === 'application/pdf' ? (
                          <div className="flex items-center gap-3">
                            <Upload className="h-8 w-8 text-emerald-600" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {officeIdState.file?.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {officeIdState.file && (officeIdState.file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                        ) : (
                          <Image
                            src={officeIdState.preview}
                            alt="Office ID preview"
                            width={480}
                            height={240}
                            className="w-full h-32 object-contain"
                            unoptimized // For blob URLs
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleOfficeIdChange(null)}
                        className="absolute top-2 right-2"
                        disabled={isLoading}
                        aria-label="Remove office ID"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    // Document Upload Button
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                      <Upload className="mx-auto h-10 w-10 text-gray-500 mb-3" />
                      <p className="text-sm text-gray-600 mb-4">
                        Upload or capture office ID (JPG, PNG, PDF)
                      </p>
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleOfficeIdChange(file);
                          }
                        }}
                        className="hidden"
                        id="office-id-input"
                        disabled={isLoading}
                        aria-label="Upload office ID document"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('office-id-input')?.click()}
                        disabled={isLoading}
                        className="border-gray-400 text-gray-700 hover:bg-gray-100"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Document
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px] px-6 focus:ring-2 focus:ring-emerald-500"
            >
              {(isLoading || form.formState.isSubmitting) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Continue
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default MeetingRegistrationForm;
