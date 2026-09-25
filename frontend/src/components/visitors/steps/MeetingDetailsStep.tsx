'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import { Departments } from '@/lib/schema/schema';
import apiClient from '@/lib/api';
import { VISITOR_KINDS } from '@/lib/constants/visit-constants';

// =================================================================
// Type Definitions
// =================================================================

export type Department = (typeof Departments)[number];

export interface StaffMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: Department | null;
}

export interface DepartmentStaffResponse {
  staff: StaffMember[];
}

// Form schema supporting both dropdown and manual entry modes
export const meetingDetailsSchema = z
  .object({
    department: z.string().min(1, 'Department is required'),
    hostSelectionMode: z.enum(['dropdown', 'manual']),
    // Dropdown mode fields
    hostId: z.string().optional(),
    // Manual mode fields
    staffName: z
      .string()
      .min(2, 'Staff Name must be at least 2 characters')
      .max(100, 'Staff Name must not exceed 100 characters')
      .optional(),
    staffPhone: z
      .string()
      .regex(/^\d{10}$/, 'Please enter a valid 10-digit phone number')
      .optional(),
    // Common field
    purpose: z
      .string()
      .min(5, 'Purpose must be at least 5 characters')
      .max(500, 'Purpose must not exceed 500 characters'),
    visitorType: z.enum(['GENERAL', 'SALES_REPRESENTATIVE', 'VENDOR']),
    companyName: z.string().optional(),
    companyEmail: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.hostSelectionMode === 'dropdown') {
        return data.hostId !== undefined && data.hostId !== '';
      }
      return true;
    },
    {
      message: 'Please select a host',
      path: ['hostId'],
    },
  )
  .refine(
    (data) => {
      if (data.hostSelectionMode === 'manual') {
        return (
          data.staffName !== undefined &&
          data.staffName !== '' &&
          data.staffPhone !== undefined &&
          data.staffPhone !== ''
        );
      }
      return true;
    },
    {
      message: 'Please enter staff name and phone number',
      path: ['staffName'],
    },
  )
  .superRefine((data, ctx) => {
    if (data.visitorType !== 'SALES_REPRESENTATIVE') return;
    if (!data.companyName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Company name is required for Sales Representative',
        path: ['companyName'],
      });
    }
    if (!data.companyEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.companyEmail)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A valid company email is required for Sales Representative',
        path: ['companyEmail'],
      });
    }
  });

export type MeetingDetailsFormData = z.infer<typeof meetingDetailsSchema>;

export interface MeetingDetailsStepProps {
  onSubmit: (data: MeetingDetailsFormData) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  initialDepartment?: string;
  initialHost?: StaffMember | null;
  initialPurpose?: string;
  branchId: string;
}

export interface MeetingDetailsStepState {
  selectedDepartment: string | null;
  selectedHost: StaffMember | null;
  showSuccessAnimation: boolean;
  submissionError: string | null;
  departmentStaffList: StaffMember[] | null;
  isLoadingDepartmentStaff: boolean;
  hostSelectionMode: 'dropdown' | 'manual';
  manualHostData: { name: string; phone: string };
}

// =================================================================
// Helper Functions
// =================================================================

/**
 * Format department enum value to human-readable label
 * e.g., "GENERAL_MEDICINE" -> "General Medicine"
 */
function formatDepartmentLabel(department: string): string {
  return department
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

// =================================================================
// Department Staff Hook
// =================================================================

function useDepartmentStaff(branchId: string, department: string | null) {
  return useQuery<DepartmentStaffResponse>({
    queryKey: ['department-staff', branchId, department],
    queryFn: async () => {
      const response = await apiClient.get<DepartmentStaffResponse>(
        `/api/users/staff/by-department/${branchId}/${department}`,
      );
      return response.data;
    },
    enabled: !!department,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =================================================================
// Main Component
// =================================================================

export function MeetingDetailsStep({
  onSubmit,
  onBack,
  isLoading = false,
  initialDepartment = '',
  initialHost = null,
  initialPurpose = '',
  branchId,
}: MeetingDetailsStepProps) {
  const [state, setState] = useState<MeetingDetailsStepState>({
    selectedDepartment: initialDepartment || null,
    selectedHost: initialHost,
    showSuccessAnimation: false,
    submissionError: null,
    departmentStaffList: null,
    isLoadingDepartmentStaff: false,
    hostSelectionMode: 'dropdown',
    manualHostData: { name: '', phone: '' },
  });

  const staffNameInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<MeetingDetailsFormData>({
    resolver: zodResolver(meetingDetailsSchema),
    mode: 'onBlur',
    defaultValues: {
      department: initialDepartment || '',
      hostSelectionMode: 'dropdown',
      hostId: initialHost?.id || '',
      staffName: '',
      staffPhone: '',
      purpose: initialPurpose || '',
      visitorType: 'GENERAL',
      companyName: '',
      companyEmail: '',
    },
  });

  // Watch the hostSelectionMode from form
  const hostSelectionMode = form.watch('hostSelectionMode');
  const selectedDepartment = form.watch('department');

  // Fetch department staff when department is selected
  const {
    data: departmentStaffData,
    isLoading: isLoadingDepartmentStaff,
    error: departmentStaffError,
  } = useDepartmentStaff(branchId, selectedDepartment || null);

  // Update department staff list when data arrives
  useEffect(() => {
    if (departmentStaffData) {
      setState((prev) => ({
        ...prev,
        departmentStaffList: departmentStaffData.staff,
        isLoadingDepartmentStaff: false,
      }));
    }
  }, [departmentStaffData]);

  // Update loading state for department staff
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isLoadingDepartmentStaff,
    }));
  }, [isLoadingDepartmentStaff]);

  // Auto-focus department on mount
  useEffect(() => {
    const departmentTrigger = document.querySelector(
      '[role="combobox"]',
    ) as HTMLButtonElement;
    if (departmentTrigger) {
      departmentTrigger.focus();
    }
  }, []);

  // Handle Escape key for back navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isLoading && !state.showSuccessAnimation) {
          // Navigate back
          onBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, state.showSuccessAnimation, onBack]);

  // Handle department change
  const handleDepartmentChange = useCallback(
    (department: string) => {
      setState((prev) => ({
        ...prev,
        selectedDepartment: department,
        // Switch back to dropdown mode and clear manual data
        hostSelectionMode: 'dropdown',
        manualHostData: { name: '', phone: '' },
        // Clear host selection if department changes
        selectedHost:
          prev.selectedDepartment !== department ? null : prev.selectedHost,
        departmentStaffList: null, // Clear staff list to trigger refetch
      }));

      form.setValue('department', department, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      // Reset to dropdown mode
      form.setValue('hostSelectionMode', 'dropdown', { shouldDirty: true });

      // Clear host if department changed
      if (state.selectedDepartment !== department && state.selectedHost) {
        form.setValue('hostId', '', { shouldDirty: true });
      }

      // Clear manual entry data
      form.setValue('staffName', '', { shouldDirty: true });
      form.setValue('staffPhone', '', { shouldDirty: true });

      form.clearErrors('department');
    },
    [form, state.selectedDepartment, state.selectedHost],
  );

  // Handle host selection from dropdown
  const handleHostSelect = useCallback(
    (staffMember: StaffMember) => {
      setState((prev) => ({
        ...prev,
        selectedHost: staffMember,
        hostSelectionMode: 'dropdown',
        manualHostData: { name: '', phone: '' },
      }));

      form.setValue('hostSelectionMode', 'dropdown', { shouldDirty: true });
      form.setValue('hostId', staffMember.id, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      // Clear manual entry data
      form.setValue('staffName', '', { shouldDirty: true });
      form.setValue('staffPhone', '', { shouldDirty: true });
      form.clearErrors('hostId');
      form.clearErrors('staffName');
    },
    [form],
  );

  // Handle "Other" option selection - switch to manual mode
  const handleOtherOptionSelect = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedHost: null,
      hostSelectionMode: 'manual',
      manualHostData: { name: '', phone: '' },
    }));

    form.setValue('hostSelectionMode', 'manual', { shouldDirty: true });
    form.setValue('hostId', '', { shouldDirty: true });
    form.setValue('staffName', '', { shouldDirty: true });
    form.setValue('staffPhone', '', { shouldDirty: true });
    form.clearErrors('hostId');

    // Focus staff name input after mode switch
    setTimeout(() => {
      staffNameInputRef.current?.focus();
    }, 0);
  }, [form]);

  // Handle manual host input changes
  const handleManualHostNameChange = useCallback(
    (name: string) => {
      setState((prev) => ({
        ...prev,
        manualHostData: { ...prev.manualHostData, name },
      }));
      form.setValue('staffName', name, { shouldDirty: true });
      form.clearErrors('staffName');
    },
    [form],
  );

  const handleManualHostPhoneChange = useCallback(
    (phone: string) => {
      // Only allow digits
      const digitsOnly = phone.replace(/\D/g, '').slice(0, 10);
      setState((prev) => ({
        ...prev,
        manualHostData: { ...prev.manualHostData, phone: digitsOnly },
      }));
      form.setValue('staffPhone', digitsOnly, { shouldDirty: true });
      form.clearErrors('staffPhone');
    },
    [form],
  );

  // Handle switch back to dropdown mode
  const handleSwitchToDropdownMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hostSelectionMode: 'dropdown',
      manualHostData: { name: '', phone: '' },
      selectedHost: null,
    }));

    form.setValue('hostSelectionMode', 'dropdown', { shouldDirty: true });
    form.setValue('hostId', '', { shouldDirty: true });
    form.setValue('staffName', '', { shouldDirty: true });
    form.setValue('staffPhone', '', { shouldDirty: true });
    form.clearErrors('staffName');
    form.clearErrors('staffPhone');
  }, [form]);

  // Handle form submission
  const handleFormSubmit = async (data: MeetingDetailsFormData) => {
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
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
      }));
    }
  };

  // Handle back button
  const handleBackClick = useCallback(() => {
    onBack();
  }, [onBack]);

  const isDisabled = isLoading || state.showSuccessAnimation;

  // Combine department staff list for display
  const displayStaffList = state.departmentStaffList || [];

  return (
    <div
      className="w-full max-w-[480px] mx-auto space-y-6 p-4"
      data-testid="meeting-details-step"
    >
      {/* Step Indicator */}
      <div className="text-center">
        <p className="text-sm text-gray-500">Step 4 of 6 - Meeting</p>
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Meeting Details</h2>
        <p className="text-gray-600">Who are you visiting?</p>
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
          <p className="mt-4 text-lg font-medium text-green-600">
            Details Saved!
          </p>
        </div>
      )}

      {/* Form */}
      {!state.showSuccessAnimation && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-6"
            role="form"
            aria-label="Meeting details form"
          >
            {/* Department Select */}
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="department-select">
                    Department *
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={handleDepartmentChange}
                    disabled={isDisabled}
                  >
                    <FormControl>
                      <SelectTrigger
                        id="department-select"
                        className={`h-12 ${
                          form.formState.errors.department
                            ? 'border-red-500'
                            : 'focus:border-emerald-500 focus:ring-emerald-500'
                        }`}
                        aria-required="true"
                        aria-invalid={!!form.formState.errors.department}
                        aria-describedby="department-error"
                      >
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {formatDepartmentLabel(dept)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage id="department-error" />
                </FormItem>
              )}
            />

            {/* Mode Indicator Badge */}
            {selectedDepartment && (
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                  role="status"
                  aria-live="polite"
                >
                  {hostSelectionMode === 'dropdown'
                    ? 'Dropdown Selection'
                    : 'Manual Entry'}
                </span>
                {hostSelectionMode === 'manual' && (
                  <button
                    type="button"
                    onClick={handleSwitchToDropdownMode}
                    className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline"
                    aria-label="Return to staff selection dropdown"
                  >
                    - Select from dropdown instead
                  </button>
                )}
              </div>
            )}

            {/* Department Staff List Dropdown */}
            {hostSelectionMode === 'dropdown' && selectedDepartment && (
              <FormField
                control={form.control}
                name="hostId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="department-staff-select">
                      Or select from department staff *
                    </FormLabel>
                    <Select
                      value={field.value || ''}
                      onValueChange={(value) => {
                        if (value === 'other') {
                          handleOtherOptionSelect();
                        } else {
                          // Find the staff member in the list
                          const staffMember = displayStaffList.find(
                            (s) => s.id === value,
                          );
                          if (staffMember) {
                            handleHostSelect(staffMember);
                          }
                        }
                      }}
                      disabled={isDisabled || state.isLoadingDepartmentStaff}
                    >
                      <FormControl>
                        <SelectTrigger
                          id="department-staff-select"
                          className={`h-12 ${
                            form.formState.errors.hostId
                              ? 'border-red-500'
                              : 'focus:border-emerald-500 focus:ring-emerald-500'
                          }`}
                          aria-required="true"
                          aria-invalid={!!form.formState.errors.hostId}
                          aria-describedby="department-staff-error"
                        >
                          {state.isLoadingDepartmentStaff ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading staff...
                            </span>
                          ) : (
                            <SelectValue placeholder="Select staff from department" />
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departmentStaffError ? (
                          <>
                            <div className="p-3 text-center text-sm text-red-600">
                              Unable to load staff list. Please try again or use
                              {"'"}Other{"'"} to enter manually.
                            </div>
                            <div className="border-t my-1" />
                            <SelectItem
                              value="other"
                              className="text-gray-500 italic font-medium"
                            >
                              <span className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4" />
                                Other (enter manually)
                              </span>
                            </SelectItem>
                          </>
                        ) : displayStaffList.length === 0 ? (
                          <>
                            <div className="p-3 text-center text-sm text-gray-500">
                              No staff found in this department. Please use
                              {"'"}Other{"'"} to enter manually.
                            </div>
                            <div className="border-t my-1" />
                            <SelectItem
                              value="other"
                              className="text-gray-500 italic font-medium"
                            >
                              <span className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4" />
                                Other (enter manually)
                              </span>
                            </SelectItem>
                          </>
                        ) : (
                          <>
                            {displayStaffList
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((staff) => (
                                <SelectItem key={staff.id} value={staff.id}>
                                  {staff.name}
                                </SelectItem>
                              ))}
                            {/* "Other" option as the LAST item */}
                            <div className="border-t my-1" />
                            <SelectItem
                              value="other"
                              className="text-gray-500 italic font-medium"
                            >
                              <span className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4" />
                                Other (enter manually)
                              </span>
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage id="department-staff-error" />
                  </FormItem>
                )}
              />
            )}

            {/* Manual Entry Form */}
            {hostSelectionMode === 'manual' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Enter staff details manually</span>
                </div>

                {/* Staff Name Input */}
                <FormField
                  control={form.control}
                  name="staffName"
                  render={() => (
                    <FormItem>
                      <FormLabel htmlFor="staff-name-input">
                        Staff Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          ref={staffNameInputRef}
                          id="staff-name-input"
                          type="text"
                          value={state.manualHostData.name}
                          onChange={(e) =>
                            handleManualHostNameChange(e.target.value)
                          }
                          placeholder="Enter staff member name"
                          disabled={isDisabled}
                          className={`h-12 ${
                            form.formState.errors.staffName
                              ? 'border-red-500'
                              : 'focus:border-emerald-500 focus:ring-emerald-500'
                          }`}
                          aria-required="true"
                          aria-invalid={!!form.formState.errors.staffName}
                          aria-describedby="staff-name-error"
                          maxLength={100}
                        />
                      </FormControl>
                      <FormMessage id="staff-name-error" />
                    </FormItem>
                  )}
                />

                {/* Staff Phone Input */}
                <FormField
                  control={form.control}
                  name="staffPhone"
                  render={() => (
                    <FormItem>
                      <FormLabel htmlFor="staff-phone-input">
                        Phone Number *
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="staff-phone-input"
                          type="tel"
                          value={state.manualHostData.phone}
                          onChange={(e) =>
                            handleManualHostPhoneChange(e.target.value)
                          }
                          placeholder="Enter 10-digit phone number"
                          disabled={isDisabled}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className={`h-12 ${
                            form.formState.errors.staffPhone
                              ? 'border-red-500'
                              : 'focus:border-emerald-500 focus:ring-emerald-500'
                          }`}
                          aria-required="true"
                          aria-invalid={!!form.formState.errors.staffPhone}
                          aria-describedby="staff-phone-error"
                          maxLength={10}
                        />
                      </FormControl>
                      <FormMessage id="staff-phone-error" />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Visitor kind — sales rep requires company fields */}
            <FormField
              control={form.control}
              name="visitorType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="visitor-type">Visitor type *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value !== 'SALES_REPRESENTATIVE') {
                        form.setValue('companyName', '');
                        form.setValue('companyEmail', '');
                      }
                    }}
                    disabled={isDisabled}
                  >
                    <FormControl>
                      <SelectTrigger id="visitor-type" className="h-12">
                        <SelectValue placeholder="Select visitor type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VISITOR_KINDS.map((kind) => (
                        <SelectItem key={kind.value} value={kind.value}>
                          {kind.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch('visitorType') === 'SALES_REPRESENTATIVE' && (
              <div className="grid gap-4 sm:grid-cols-2 rounded-lg border p-3">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company name *</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isDisabled} placeholder="Acme Pharma" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="companyEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company email *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          disabled={isDisabled}
                          placeholder="ops@company.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Purpose of Visit Textarea */}
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="purpose-input">
                    Purpose of Visit *
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      id="purpose-input"
                      placeholder="e.g., Consultation, Follow-up"
                      disabled={isDisabled}
                      rows={4}
                      className={`resize-none ${
                        form.formState.errors.purpose
                          ? 'border-red-500'
                          : 'focus:border-emerald-500 focus:ring-emerald-500'
                      }`}
                      aria-required="true"
                      aria-invalid={!!form.formState.errors.purpose}
                      aria-describedby="purpose-error"
                      maxLength={500}
                    />
                  </FormControl>
                  <div className="flex justify-between items-center">
                    <FormMessage id="purpose-error" />
                    <span className="text-xs text-gray-500">
                      {field.value?.length || 0}/500
                    </span>
                  </div>
                </FormItem>
              )}
            />

            {/* Submission Error */}
            {state.submissionError && (
              <div
                className="text-sm text-red-600 text-center p-3 bg-red-50 rounded-md"
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px] px-6"
              >
                {isDisabled && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Continue
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}

export default MeetingDetailsStep;
