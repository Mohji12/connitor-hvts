'use client';

/**
 * Visitor Registration Wizard - Tasks 9.2, 9.3, 9.4
 * State machine-based orchestrator for the visitor registration multi-step flow
 * 
 * Task 9.2: State machine with step transitions
 * Task 9.3: Phone Authentication Integration
 * - Integrates PhoneEntryStep with POST /api/public/visitors/send-otp
 * - Integrates PhoneVerificationStep with POST /api/public/visitors/verify-phone
 * - Manages PhoneData state with branchId, verification status, and visitor data
 * - Handles all spec-defined error codes (VALIDATION_FAILED, RATE_LIMIT_EXCEEDED, etc.)
 * - Pre-fills visitor data for existing visitors
 * 
 * Task 9.4: Forms Integration
 * - Wires VisitTypeSelection, DeliveryRegistrationForm, MeetingRegistrationForm
 * - Wires DeliveryDetailsStep and MeetingDetailsStep into wizard
 * - Implements form data persistence for back navigation
 * - Supports conditional routing based on visitType (MEETING/DELIVERY)
 * - Pre-fills form data when navigating back
 * - Stores separate state for delivery and meeting paths
 * 
 * Step Flow:
 * 1a. Phone Entry → 1b. Phone Verification → 2. Visit Type Selection
 * → 3. Visitor Registration (Delivery/Meeting) → 4. Visit Details (Delivery/Meeting)
 * → 5. Confirmation
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { PhoneEntryStep } from '../phone-entry-step';
import { PhoneVerificationStep, VerificationSuccessData } from '../phone-verification-step';
import { VisitTypeSelection } from '@/components/visitors/steps/VisitTypeSelection';
import { DeliveryRegistrationForm } from '@/components/visitors/steps/DeliveryRegistrationForm';
import { MeetingRegistrationForm } from '@/components/visitors/public/MeetingRegistrationForm';
import { DeliveryDetailsStep } from '@/components/visitors/steps/DeliveryDetailsStep';
import { MeetingDetailsStep } from '@/components/visitors/steps/MeetingDetailsStep';
import { ConfirmationStep } from '@/components/visitors/steps/ConfirmationStep';
import { VisitCategory, mapDeliveryPlatformToSubType } from '@/lib/constants/visit-constants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import {
  WizardStep,
  VisitType,
  type PhoneData,
  type MeetingVisitorFormData,
  type DeliveryVisitorFormData,
  type MeetingVisitDetails,
  type DeliveryVisitDetails,
  type WizardState,
  type SerializableWizardState,
  WIZARD_STORAGE_KEY,
  WIZARD_STATE_EXPIRY_MS,
  dataUrlToFile,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const STEP_ORDER = [
  WizardStep.PHONE_ENTRY,
  WizardStep.PHONE_VERIFICATION,
  WizardStep.VISIT_TYPE_SELECTION,
  WizardStep.VISITOR_REGISTRATION,
  WizardStep.VISIT_DETAILS,
  WizardStep.CONFIRMATION,
];

// Create QueryClient instance for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

function getStepNumber(step: WizardStep): number {
  return STEP_ORDER.indexOf(step) + 1;
}

function getTotalSteps(): number {
  return STEP_ORDER.length;
}

function canNavigateBack(step: WizardStep): boolean {
  return step !== WizardStep.PHONE_ENTRY && step !== WizardStep.CONFIRMATION;
}

// ============================================================================
// Session Storage Helpers (Mobile Photo Capture Bug Fix)
// ============================================================================

/**
 * Save wizard state to sessionStorage for persistence across mobile page refreshes.
 * File objects cannot be serialized to JSON, so they are excluded here;
 * base64 data URLs for files are stored separately via capture callbacks.
 */
function saveWizardState(
  state: WizardState,
  fileDataUrls: { photoDataUrl: string | null; govIdDataUrl: string | null; officeIdDataUrl: string | null }
): void {
  try {
    const serializable: SerializableWizardState = {
      currentStep: state.currentStep,
      visitType: state.visitType,
      phoneData: state.phoneData,
      visitId: state.visitId,
      apiError: null, // Don't persist transient errors
      deliveryFormData: state.deliveryFormData
        ? {
            firstName: state.deliveryFormData.firstName,
            middleName: state.deliveryFormData.middleName,
            lastName: state.deliveryFormData.lastName,
            alternatePhone: state.deliveryFormData.alternatePhone,
            alternateEmail: state.deliveryFormData.alternateEmail,
            company: state.deliveryFormData.company,
            companyWebsite: state.deliveryFormData.companyWebsite,
          }
        : null,
      deliveryDetailsData: state.deliveryDetailsData,
      meetingFormData: state.meetingFormData
        ? {
            firstName: state.meetingFormData.firstName,
            middleName: state.meetingFormData.middleName,
            lastName: state.meetingFormData.lastName,
            email: state.meetingFormData.email,
            company: state.meetingFormData.company,
            companyWebsite: state.meetingFormData.companyWebsite,
            designation: state.meetingFormData.designation,
            address: state.meetingFormData.address,
            phone: state.meetingFormData.phone,
            alternatePhone: state.meetingFormData.alternatePhone,
            alternateEmail: state.meetingFormData.alternateEmail,
            reportingManagerName: state.meetingFormData.reportingManagerName,
            reportingManagerPhone: state.meetingFormData.reportingManagerPhone,
          }
        : null,
      meetingDetailsData: state.meetingDetailsData,
      selectedHost: state.selectedHost,
      photoDataUrl: fileDataUrls.photoDataUrl,
      govIdDataUrl: fileDataUrls.govIdDataUrl,
      officeIdDataUrl: fileDataUrls.officeIdDataUrl,
      savedAt: Date.now(),
    };

    sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // sessionStorage may be full or unavailable - silently fail
    // This is a best-effort persistence mechanism
  }
}

/**
 * Load wizard state from sessionStorage.
 * Returns null if no valid state is found, or if the state has expired.
 */
function loadWizardState(): SerializableWizardState | null {
  try {
    const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SerializableWizardState;

    // Validate basic structure
    if (!parsed.currentStep || !parsed.savedAt) {
      clearWizardState();
      return null;
    }

    // Check expiry (30 minutes)
    if (Date.now() - parsed.savedAt > WIZARD_STATE_EXPIRY_MS) {
      clearWizardState();
      return null;
    }

    // Don't restore if at CONFIRMATION step (registration was complete)
    if (parsed.currentStep === WizardStep.CONFIRMATION) {
      clearWizardState();
      return null;
    }

    return parsed;
  } catch {
    // Corrupted data - clear and start fresh
    clearWizardState();
    return null;
  }
}

/** Clear wizard state from sessionStorage */
function clearWizardState(): void {
  try {
    sessionStorage.removeItem(WIZARD_STORAGE_KEY);
  } catch {
    // Ignore - sessionStorage may be unavailable
  }
}

// ============================================================================
// Loading Fallback Component
// ============================================================================

function WizardLoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading registration form...</p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Wizard Component (with useSearchParams)
// ============================================================================

function VisitorRegistrationWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get branchId from URL params or use default for testing
  const branchId = searchParams.get('branchId') || 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  
  // ============================================================================
  // Session Storage: Restore state synchronously during initialization
  // Using useState lazy initializers ensures correct behavior with React Strict Mode,
  // where useEffect-based restoration fails because refs persist across the
  // unmount/remount cycle but state is re-initialized.
  // ============================================================================

  // Track whether state was restored from sessionStorage (for toast + save guard)
  const wasRestoredRef = useRef(false);

  // File data URLs for sessionStorage persistence (stored separately from WizardState since Files aren't serializable)
  const fileDataUrlsRef = useRef<{
    photoDataUrl: string | null;
    govIdDataUrl: string | null;
    officeIdDataUrl: string | null;
  }>({ photoDataUrl: null, govIdDataUrl: null, officeIdDataUrl: null });

  // Wizard state — lazy initializer restores from sessionStorage on mount
  const [state, setState] = useState<WizardState>(() => {
    const saved = loadWizardState();
    if (!saved) {
      return {
        currentStep: WizardStep.PHONE_ENTRY,
        visitType: null,
        phoneData: null,
        visitorFormData: null,
        visitDetails: null,
        visitId: null,
        isSubmitting: false,
        apiError: null,
        deliveryFormData: null,
        deliveryDetailsData: null,
        meetingFormData: null,
        meetingDetailsData: null,
        selectedHost: null,
      };
    }

    wasRestoredRef.current = true;

    // Reconstruct File objects from base64 data URLs (synchronous)
    let restoredPhoto: File | null = null;
    let restoredGovId: File | null = null;
    let restoredOfficeId: File | null = null;

    try {
      if (saved.photoDataUrl) {
        restoredPhoto = dataUrlToFile(saved.photoDataUrl, 'photo.jpg', 'image/jpeg');
      }
      if (saved.govIdDataUrl) {
        restoredGovId = dataUrlToFile(saved.govIdDataUrl, 'gov-id.jpg', 'image/jpeg');
      }
      if (saved.officeIdDataUrl) {
        restoredOfficeId = dataUrlToFile(saved.officeIdDataUrl, 'office-id.jpg', 'image/jpeg');
      }
    } catch {
      // If file reconstruction fails, continue without files
      // User will need to re-capture photos but won't lose other form data
    }

    // Restore file data URLs ref for subsequent saves
    fileDataUrlsRef.current = {
      photoDataUrl: saved.photoDataUrl,
      govIdDataUrl: saved.govIdDataUrl,
      officeIdDataUrl: saved.officeIdDataUrl,
    };

    // Rebuild WizardState from saved data
    const restoredDeliveryFormData: DeliveryVisitorFormData | null = saved.deliveryFormData && restoredPhoto
      ? { ...saved.deliveryFormData, photo: restoredPhoto }
      : saved.deliveryFormData
        ? { ...saved.deliveryFormData, photo: undefined as unknown as File }
        : null;

    const restoredMeetingFormData: MeetingVisitorFormData | null = saved.meetingFormData
      ? {
          ...saved.meetingFormData,
          photo: restoredPhoto || (undefined as unknown as File),
          governmentIdDocument: restoredGovId || (undefined as unknown as File),
          ...(restoredOfficeId ? { officeIdDocument: restoredOfficeId } : {}),
        }
      : null;

    return {
      currentStep: saved.currentStep,
      visitType: saved.visitType,
      phoneData: saved.phoneData,
      visitorFormData: null, // This is a derived field, set via deliveryFormData/meetingFormData
      visitDetails: null,
      visitId: saved.visitId,
      isSubmitting: false,
      apiError: null,
      deliveryFormData: restoredDeliveryFormData,
      deliveryDetailsData: saved.deliveryDetailsData,
      meetingFormData: restoredMeetingFormData,
      meetingDetailsData: saved.meetingDetailsData,
      selectedHost: saved.selectedHost,
    };
  });

  // Restored File objects from sessionStorage (passed to form components as initial values)
  // Also uses lazy initializer for Strict Mode compatibility
  const [restoredFiles] = useState<{
    photo: File | null;
    govId: File | null;
    officeId: File | null;
  }>(() => {
    const saved = loadWizardState();
    if (!saved) return { photo: null, govId: null, officeId: null };

    let restoredPhoto: File | null = null;
    let restoredGovId: File | null = null;
    let restoredOfficeId: File | null = null;

    try {
      if (saved.photoDataUrl) {
        restoredPhoto = dataUrlToFile(saved.photoDataUrl, 'photo.jpg', 'image/jpeg');
      }
      if (saved.govIdDataUrl) {
        restoredGovId = dataUrlToFile(saved.govIdDataUrl, 'gov-id.jpg', 'image/jpeg');
      }
      if (saved.officeIdDataUrl) {
        restoredOfficeId = dataUrlToFile(saved.officeIdDataUrl, 'office-id.jpg', 'image/jpeg');
      }
    } catch {
      // If file reconstruction fails, continue without files
    }

    return { photo: restoredPhoto, govId: restoredGovId, officeId: restoredOfficeId };
  });

  // Cancel confirmation dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Browser history management
  const historyInitialized = useRef(false);

  // Show toast notification if state was restored (runs once on mount)
  useEffect(() => {
    if (wasRestoredRef.current) {
      toast.info('Resuming your registration...', {
        duration: 3000,
      });
      // Reset so re-renders don't re-show
      wasRestoredRef.current = false;
    }
  }, []); // Run only on mount

  // ============================================================================
  // Session Storage: Persist state on changes (Mobile Photo Capture Bug Fix)
  // ============================================================================

  // Track whether the initial render has completed (skip saving on first render)
  const isInitialRenderRef = useRef(true);

  useEffect(() => {
    // Skip saving on the very first render — the lazy initializer already loaded
    // from sessionStorage, so there's nothing new to save yet
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      return;
    }
    // Don't save when at the initial step with no data (fresh start)
    if (state.currentStep === WizardStep.PHONE_ENTRY && !state.phoneData) return;
    // Don't save CONFIRMATION state (registration complete)
    if (state.currentStep === WizardStep.CONFIRMATION) return;

    saveWizardState(state, fileDataUrlsRef.current);
  }, [state]);

  // Initialize browser history interception
  useEffect(() => {
    if (!historyInitialized.current) {
      // Push a dummy state to allow intercepting back button
      window.history.pushState({ wizardStep: state.currentStep }, '');
      historyInitialized.current = true;
    }

    const handlePopState = (event: PopStateEvent) => {
      // Intercept browser back button
      if (state.currentStep !== WizardStep.PHONE_ENTRY && state.currentStep !== WizardStep.CONFIRMATION) {
        event.preventDefault();
        // Push state back to prevent actual navigation
        window.history.pushState({ wizardStep: state.currentStep }, '');
        // Show cancel confirmation
        setShowCancelDialog(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [state.currentStep]);

  // Focus management on step transition
  useEffect(() => {
    // Scroll to top (wrap in try-catch for test environments)
    try {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      // JSDOM doesn't implement scrollTo, ignore in tests
    }
    
    // Focus step header
    setTimeout(() => {
      const stepHeader = document.querySelector('h1, h2');
      if (stepHeader instanceof HTMLElement) {
        stepHeader.focus();
      }
    }, 100);

    // Announce step change to screen readers
    const announcement = `Step ${getStepNumber(state.currentStep)} of ${getTotalSteps()}`;
    const liveRegion = document.getElementById('step-announcement');
    if (liveRegion) {
      liveRegion.textContent = announcement;
    }
  }, [state.currentStep]);

  // ============================================================================
  // Navigation Handlers
  // ============================================================================

  const transitionToStep = useCallback((newStep: WizardStep) => {
    setState((prev) => ({ ...prev, currentStep: newStep, apiError: null }));
  }, []);

  const goToPreviousStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    if (currentIndex > 0 && canNavigateBack(state.currentStep)) {
      transitionToStep(STEP_ORDER[currentIndex - 1]);
    }
  }, [state.currentStep, transitionToStep]);

  const handleCancel = useCallback(() => {
    if (state.currentStep === WizardStep.PHONE_ENTRY) {
      // Direct cancel on first step - clear any stale state
      clearWizardState();
      router.push('/visitor-registration');
    } else {
      // Show confirmation dialog on other steps
      setShowCancelDialog(true);
    }
  }, [state.currentStep, router]);

  const confirmCancel = useCallback(() => {
    setShowCancelDialog(false);
    // Clear sessionStorage on explicit cancel
    clearWizardState();
    // Reset state and redirect to landing page
    setState({
      currentStep: WizardStep.PHONE_ENTRY,
      visitType: null,
      phoneData: null,
      visitorFormData: null,
      visitDetails: null,
      visitId: null,
      isSubmitting: false,
      apiError: null,
      // Task 9.4: Reset form persistence state
      deliveryFormData: null,
      deliveryDetailsData: null,
      meetingFormData: null,
      meetingDetailsData: null,
      selectedHost: null,
    });
    router.push('/visitor-registration');
  }, [router]);

  // ============================================================================
  // Step 1a: Phone Entry
  // ============================================================================

  const handlePhoneEntrySuccess = useCallback((data: { phone: string; isNewVisitor: boolean }) => {
    // Build PhoneData according to Task 9.3 spec
    const phoneData: PhoneData = {
      phone: data.phone,
      branchId: branchId,
      isVerified: false,
      isNewVisitor: data.isNewVisitor,
      otpExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      attemptsRemaining: 3,
      // Legacy fields for backward compatibility
      countryCode: '+91',
      fullPhone: `+91${data.phone}`,
      isExistingVisitor: !data.isNewVisitor,
    };
    
    setState((prev) => ({
      ...prev,
      phoneData,
    }));
    
    transitionToStep(WizardStep.PHONE_VERIFICATION);
  }, [branchId, transitionToStep]);

  // ============================================================================
  // Step 1b: Phone Verification
  // ============================================================================

  const handlePhoneVerificationSuccess = useCallback((data: VerificationSuccessData) => {
    // Build complete PhoneData with verification results
    const phoneData: PhoneData = {
      phone: data.phone,
      branchId: branchId,
      isVerified: true,
      visitorId: data.visitorData.id,
      isNewVisitor: !data.isExistingVisitor,
      // Legacy fields for backward compatibility
      countryCode: '+91',
      fullPhone: `+91${data.phone}`,
      isExistingVisitor: data.isExistingVisitor,
      existingVisitorData: data.isExistingVisitor
        ? {
            id: data.visitorData.id,
            firstName: data.visitorData.firstName,
            middleName: data.visitorData.middleName,
            lastName: data.visitorData.lastName,
            email: data.visitorData.email,
            company: data.visitorData.company,
            designation: data.visitorData.designation,
            // address field is not returned by backend API for phone verification
            // but we include it in the type for future compatibility
            address: null,
            phoneVerified: data.visitorData.phoneVerified,
          }
        : undefined,
    };

    setState((prev) => ({
      ...prev,
      phoneData,
    }));

    // Transition to visit type selection (spec: always go to visit type selection)
    transitionToStep(WizardStep.VISIT_TYPE_SELECTION);
  }, [branchId, transitionToStep]);

  // ============================================================================
  // Step 2: Visit Type Selection
  // ============================================================================

  const handleVisitTypeSelection = useCallback((visitType: VisitCategory) => {
    const mappedType = visitType === VisitCategory.MEETING ? VisitType.MEETING : VisitType.DELIVERY;
    
    setState((prev) => ({
      ...prev,
      visitType: mappedType,
      // Reset form data when visit type changes (Task 9.4)
      deliveryFormData: mappedType === VisitType.DELIVERY ? prev.deliveryFormData : null,
      deliveryDetailsData: mappedType === VisitType.DELIVERY ? prev.deliveryDetailsData : null,
      meetingFormData: mappedType === VisitType.MEETING ? prev.meetingFormData : null,
      meetingDetailsData: mappedType === VisitType.MEETING ? prev.meetingDetailsData : null,
      selectedHost: mappedType === VisitType.MEETING ? prev.selectedHost : null,
    }));

    transitionToStep(WizardStep.VISITOR_REGISTRATION);
  }, [transitionToStep]);

  // ============================================================================
  // Step 3: Visitor Registration (Delivery)
  // ============================================================================

  const handleDeliveryRegistrationSubmit = useCallback(async (data: DeliveryVisitorFormData) => {
    setState((prev) => ({ 
      ...prev, 
      visitorFormData: data,
      deliveryFormData: data, // Task 9.4: Store for back navigation
    }));
    transitionToStep(WizardStep.VISIT_DETAILS);
  }, [transitionToStep]);

  // ============================================================================
  // Step 3: Visitor Registration (Meeting)
  // ============================================================================

  const handleMeetingRegistrationSubmit = useCallback(async (data: MeetingVisitorFormData) => {
    setState((prev) => ({ 
      ...prev, 
      visitorFormData: data,
      meetingFormData: data, // Task 9.4: Store for back navigation
    }));
    transitionToStep(WizardStep.VISIT_DETAILS);
  }, [transitionToStep]);

  // ============================================================================
  // Step 4: Visit Details (Delivery) - Task 9.5
  // ============================================================================

  const handleDeliveryDetailsSubmit = useCallback(async (data: DeliveryVisitDetails) => {
    try {
      // Get current state values before async operation
      // Access state.deliveryFormData which is the dedicated storage for delivery form data
      const visitorFormData = state.deliveryFormData;
      const phoneData = state.phoneData;

      // Validate that we have the required data
      if (!visitorFormData || !phoneData) {
        setState((prev) => ({
          ...prev,
          apiError: 'Registration data is missing. Please go back and complete the form.',
        }));
        return;
      }

      // Validate that photo exists
      if (!visitorFormData.photo) {
        setState((prev) => ({
          ...prev,
          apiError: 'Visitor photo is required. Please go back and capture a photo.',
        }));
        return;
      }

      setState((prev) => ({ 
        ...prev, 
        isSubmitting: true, 
        apiError: null,
        deliveryDetailsData: data, // Task 9.4: Store for back navigation
      }));

      // Prepare form data for multipart upload matching DeliveryRegistrationDto
      const formData = new FormData();
      
      // Base fields
      formData.append('phone', phoneData.phone);
      formData.append('branchId', branchId);
      formData.append('visitCategory', 'DELIVERY');
      formData.append('firstName', visitorFormData.firstName);
      if (visitorFormData.middleName) {
        formData.append('middleName', visitorFormData.middleName);
      }
      formData.append('lastName', visitorFormData.lastName);
      
      // Delivery-specific fields
      formData.append('deliveryPlatform', data.platform);
      if (data.recipient) {
        formData.append('deliveryRecipient', data.recipient);
      }
      if (data.orderReference) {
        formData.append('orderReference', data.orderReference);
      }
      formData.append('visitSubType', mapDeliveryPlatformToSubType(data.platform));
      
      // Photo upload - CRITICAL: Append the File object directly to FormData
      formData.append('photo', visitorFormData.photo);

      // Call API using apiClient (configured with correct backend URL)
      // CRITICAL: Remove the default Content-Type header for FormData
      // The default apiClient has 'Content-Type: application/json' which causes File objects to serialize as {}
      // We must delete it and let Axios/browser automatically set 'multipart/form-data' with the correct boundary
      const response = await apiClient.post('/api/public/visitors', formData, {
        headers: {
          'Content-Type': undefined, // Remove the default JSON content-type
        },
      });

      const result = response.data;

      // Announce success for screen readers (Delivery)
      const liveRegion = document.getElementById('step-announcement');
      if (liveRegion) {
        liveRegion.textContent = 'Visit request submitted successfully';
      }

      setState((prev) => ({
        ...prev,
        visitId: result.visitId,
        visitDetails: data,
        isSubmitting: false,
      }));

      transitionToStep(WizardStep.CONFIRMATION);
    } catch (error) {
      // Handle axios errors
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status: number; data?: { error?: string; errors?: Array<{ message: string }>; message?: string } } };
        const errorData = axiosError.response?.data;
        
        // Handle specific error codes
        if (axiosError.response?.status === 401 && errorData?.error === 'PHONE_NOT_VERIFIED') {
          // Redirect to phone verification
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            apiError: 'Phone verification required. Redirecting...',
          }));
          setTimeout(() => transitionToStep(WizardStep.PHONE_VERIFICATION), 2000);
          return;
        }
        
        if (axiosError.response?.status === 400 && errorData?.errors) {
          // Field-specific validation errors
          const errorMessage = Array.isArray(errorData.errors)
            ? errorData.errors.map((e: { message: string }) => e.message).join(', ')
            : 'Please check the form for errors and try again.';
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            apiError: errorMessage,
          }));
          return;
        }
        
        if (errorData?.message) {
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            apiError: errorData.message ?? 'Failed to submit registration',
          }));
          return;
        }
      }
      
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
      const errorMessage = isNetworkError
        ? 'Connection lost. Please check your internet and try again.'
        : error instanceof Error
        ? error.message
        : 'Something went wrong. Please try again.';
        
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        apiError: errorMessage,
      }));
    }
  }, [state.deliveryFormData, state.phoneData, branchId, transitionToStep]);

  // ============================================================================
  // Step 4: Visit Details (Meeting) - Task 9.5
  // ============================================================================

  const handleMeetingDetailsSubmit = useCallback(async (data: MeetingVisitDetails) => {
    try {
      // Get current state values before async operation
      // Access state.meetingFormData which is the dedicated storage for meeting form data
      const visitorFormData = state.meetingFormData;
      const phoneData = state.phoneData;

      // Validate that we have the required data
      if (!visitorFormData || !phoneData) {
        setState((prev) => ({
          ...prev,
          apiError: 'Registration data is missing. Please go back and complete the form.',
        }));
        return;
      }

      // Validate that required files exist
      if (!visitorFormData.photo) {
        setState((prev) => ({
          ...prev,
          apiError: 'Visitor photo is required. Please go back and capture a photo.',
        }));
        return;
      }

      if (!visitorFormData.governmentIdDocument) {
        setState((prev) => ({
          ...prev,
          apiError: 'Government ID document is required. Please go back and upload it.',
        }));
        return;
      }

      setState((prev) => ({ 
        ...prev, 
        isSubmitting: true, 
        apiError: null,
        meetingDetailsData: data, // Task 9.4: Store for back navigation
      }));

      // Prepare form data for multipart upload matching MeetingRegistrationDto
      const formData = new FormData();
      
      // Base fields
      formData.append('phone', phoneData.phone);
      formData.append('branchId', branchId);
      formData.append('visitCategory', 'MEETING');
      formData.append('firstName', visitorFormData.firstName);
      if (visitorFormData.middleName) {
        formData.append('middleName', visitorFormData.middleName);
      }
      formData.append('lastName', visitorFormData.lastName);
      
      // Meeting-specific required fields
      formData.append('email', visitorFormData.email);
      formData.append('designation', visitorFormData.designation || 'Visitor');
      formData.append('purpose', data.purpose);
      
      // Meeting-specific optional fields
      if (visitorFormData.company) {
        formData.append('company', visitorFormData.company);
      }
      if (visitorFormData.companyWebsite) {
        formData.append('companyWebsite', visitorFormData.companyWebsite);
      }
      if (visitorFormData.address) {
        formData.append('address', visitorFormData.address);
      }
      if (visitorFormData.alternatePhone) {
        formData.append('alternatePhone', visitorFormData.alternatePhone);
      }
      if (visitorFormData.alternateEmail) {
        formData.append('alternateEmail', visitorFormData.alternateEmail);
      }
      if (visitorFormData.reportingManagerName) {
        formData.append('reportingManagerName', visitorFormData.reportingManagerName);
      }
      if (visitorFormData.reportingManagerPhone) {
        formData.append('reportingManagerPhone', visitorFormData.reportingManagerPhone);
      }
      
      // Visit details
      if (data.department) {
        formData.append('department', data.department);
      }
      if (data.hostId) {
        formData.append('personToMeet', data.hostId);
      }
      // Staff details for manual entry when "Other" is selected
      if (data.staffName) {
        formData.append('staffName', data.staffName);
      }
      if (data.staffPhone) {
        formData.append('staffPhone', data.staffPhone);
      }
      if (data.visitorType) {
        formData.append('visitorType', data.visitorType);
      }
      if (data.visitorType === 'SALES_REPRESENTATIVE') {
        if (data.companyName) formData.append('companyName', data.companyName);
        if (data.companyEmail) formData.append('companyEmail', data.companyEmail);
      }
      
      // File uploads - CRITICAL: These must be included
      formData.append('photo', visitorFormData.photo);
      formData.append('governmentIdDocument', visitorFormData.governmentIdDocument);
      if (visitorFormData.officeIdDocument) {
        formData.append('officeIdDocument', visitorFormData.officeIdDocument);
      }

      // Call API using apiClient (configured with correct backend URL)
      // CRITICAL: Remove the default Content-Type header for FormData
      // The default apiClient has 'Content-Type: application/json' which causes File objects to serialize as {}
      // We must delete it and let Axios/browser automatically set 'multipart/form-data' with the correct boundary
      const response = await apiClient.post('/api/public/visitors', formData, {
        headers: {
          'Content-Type': undefined, // Remove the default JSON content-type
        },
      });

      const result = response.data;

      // Announce success for screen readers (Meeting)
      const liveRegion = document.getElementById('step-announcement');
      if (liveRegion) {
        liveRegion.textContent = 'Visit request submitted successfully';
      }

      setState((prev) => ({
        ...prev,
        visitId: result.visitId,
        visitDetails: data,
        isSubmitting: false,
      }));

      transitionToStep(WizardStep.CONFIRMATION);
    } catch (error) {
      // Handle axios errors
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status: number; data?: { error?: string; errors?: Array<{ message: string }>; message?: string } } };
        const errorData = axiosError.response?.data;
        
        // Handle specific error codes
        if (axiosError.response?.status === 401 && errorData?.error === 'PHONE_NOT_VERIFIED') {
          // Redirect to phone verification
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            apiError: 'Phone verification required. Redirecting...',
          }));
          setTimeout(() => transitionToStep(WizardStep.PHONE_VERIFICATION), 2000);
          return;
        }
        
        if (axiosError.response?.status === 400 && errorData?.errors) {
          // Field-specific validation errors
          const errorMessage = Array.isArray(errorData.errors)
            ? errorData.errors.map((e: { message: string }) => e.message).join(', ')
            : 'Please check the form for errors and try again.';
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            apiError: errorMessage,
          }));
          return;
        }
        
        if (errorData?.message) {
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            apiError: errorData.message ?? 'Failed to submit registration',
          }));
          return;
        }
      }
      
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
      const errorMessage = isNetworkError
        ? 'Connection lost. Please check your internet and try again.'
        : error instanceof Error
        ? error.message
        : 'Something went wrong. Please try again.';
        
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        apiError: errorMessage,
      }));
    }
  }, [state.meetingFormData, state.phoneData, branchId, transitionToStep]);

  // ============================================================================
  // Step 5: Confirmation - Task 9.5
  // ============================================================================

  const handleConfirmationDone = useCallback(() => {
    // Clear sessionStorage on successful completion
    clearWizardState();
    if (state.visitId) {
      // Navigate to status page as per spec
      router.push(`/visitor-registration/status/${state.visitId}`);
    } else {
      // Fallback: redirect to landing page
      router.push('/visitor-registration');
    }
  }, [state.visitId, router]);

  // ============================================================================
  // File Capture Callbacks (for sessionStorage persistence)
  // ============================================================================

  const handlePhotoCapture = useCallback((_file: File | null, dataUrl: string | null) => {
    fileDataUrlsRef.current = { ...fileDataUrlsRef.current, photoDataUrl: dataUrl };
    // Trigger a save with current state + updated file data URL
    setState((prev) => ({ ...prev })); // Force re-render to trigger save effect
  }, []);

  const handleGovIdCapture = useCallback((_file: File | null, dataUrl: string | null) => {
    fileDataUrlsRef.current = { ...fileDataUrlsRef.current, govIdDataUrl: dataUrl };
    setState((prev) => ({ ...prev }));
  }, []);

  const handleOfficeIdCapture = useCallback((_file: File | null, dataUrl: string | null) => {
    fileDataUrlsRef.current = { ...fileDataUrlsRef.current, officeIdDataUrl: dataUrl };
    setState((prev) => ({ ...prev }));
  }, []);

  // ============================================================================
  // Form Text Change Callbacks (for real-time sessionStorage persistence)
  // ============================================================================

  const handleDeliveryFormChange = useCallback((data: Partial<Omit<DeliveryVisitorFormData, 'photo'>>) => {
    setState((prev) => ({
      ...prev,
      deliveryFormData: prev.deliveryFormData
        ? { ...prev.deliveryFormData, ...data }
        : {
            firstName: '',
            lastName: '',
            ...data,
            photo: undefined as unknown as File,
          } as DeliveryVisitorFormData,
    }));
  }, []);

  const handleMeetingFormChange = useCallback((data: Partial<Omit<MeetingVisitorFormData, 'photo' | 'governmentIdDocument' | 'officeIdDocument'>>) => {
    setState((prev) => ({
      ...prev,
      meetingFormData: prev.meetingFormData
        ? { ...prev.meetingFormData, ...data }
        : {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            ...data,
            photo: undefined as unknown as File,
            governmentIdDocument: undefined as unknown as File,
          } as MeetingVisitorFormData,
    }));
  }, []);

  // ============================================================================
  // Render Step Content
  // ============================================================================

  const renderStepContent = () => {
    switch (state.currentStep) {
      case WizardStep.PHONE_ENTRY:
        return (
          <PhoneEntryStep
            branchId={branchId}
            onSuccess={handlePhoneEntrySuccess}
            onCancel={handleCancel}
            initialPhone={state.phoneData?.phone}
          />
        );

      case WizardStep.PHONE_VERIFICATION:
        return state.phoneData ? (
          <PhoneVerificationStep
            phone={state.phoneData.phone}
            branchId={branchId}
            onSuccess={handlePhoneVerificationSuccess}
            onCancel={goToPreviousStep}
          />
        ) : null;

      case WizardStep.VISIT_TYPE_SELECTION:
        return (
          <VisitTypeSelection
            visitorName={
              state.phoneData?.existingVisitorData
                ? `${state.phoneData.existingVisitorData.firstName} ${state.phoneData.existingVisitorData.lastName}`
                : undefined
            }
            isReturningVisitor={state.phoneData?.isExistingVisitor || false}
            lastVisitInfo={undefined}
            onSelect={handleVisitTypeSelection}
            onBack={goToPreviousStep}
          />
        );

      case WizardStep.VISITOR_REGISTRATION:
        if (state.visitType === VisitType.DELIVERY) {
          return state.phoneData ? (
            <DeliveryRegistrationForm
              visitorPhone={state.phoneData.fullPhone || `+91${state.phoneData.phone}`}
              onSubmit={handleDeliveryRegistrationSubmit}
              onBack={goToPreviousStep}
              isLoading={state.isSubmitting}
              initialFormData={state.deliveryFormData}
              initialPhoto={restoredFiles.photo}
              onPhotoCapture={handlePhotoCapture}
              onFormChange={handleDeliveryFormChange}
            />
          ) : null;
        } else if (state.visitType === VisitType.MEETING) {
          return state.phoneData ? (
            <MeetingRegistrationForm
              phone={state.phoneData.phone}
              branchId={branchId}
              isExistingVisitor={state.phoneData.isExistingVisitor || false}
              existingVisitorData={
                state.phoneData.existingVisitorData
                  ? {
                      firstName: state.phoneData.existingVisitorData.firstName,
                      lastName: state.phoneData.existingVisitorData.lastName,
                      email: state.phoneData.existingVisitorData.email || null,
                      company: state.phoneData.existingVisitorData.company || null,
                      designation: state.phoneData.existingVisitorData.designation || null,
                      address: state.phoneData.existingVisitorData.address || null,
                    }
                  : null
              }
              initialFormData={state.meetingFormData}
              initialPhoto={restoredFiles.photo}
              initialGovId={restoredFiles.govId}
              initialOfficeId={restoredFiles.officeId}
              onPhotoCapture={handlePhotoCapture}
              onGovIdCapture={handleGovIdCapture}
              onOfficeIdCapture={handleOfficeIdCapture}
              onSubmit={handleMeetingRegistrationSubmit}
              onBack={goToPreviousStep}
              onFormChange={handleMeetingFormChange}
            />
          ) : null;
        }
        return null;

      case WizardStep.VISIT_DETAILS:
        if (state.visitType === VisitType.DELIVERY) {
          return (
            <DeliveryDetailsStep
              onSubmit={handleDeliveryDetailsSubmit}
              onBack={goToPreviousStep}
              isLoading={state.isSubmitting}
              initialPlatform={state.deliveryDetailsData?.platform}
              initialRecipient={state.deliveryDetailsData?.recipient}
            />
          );
        } else if (state.visitType === VisitType.MEETING) {
          return (
            <MeetingDetailsStep
              onSubmit={handleMeetingDetailsSubmit}
              onBack={goToPreviousStep}
              isLoading={state.isSubmitting}
              initialDepartment={state.meetingDetailsData?.department}
              initialHost={state.selectedHost}
              initialPurpose={state.meetingDetailsData?.purpose}
              branchId={branchId}
            />
          );
        }
        return null;

      case WizardStep.CONFIRMATION:
        return state.visitId ? (
          <ConfirmationStep
            visitId={state.visitId}
            visitType={state.visitType === VisitType.MEETING ? 'MEETING' : 'DELIVERY'}
            onDone={handleConfirmationDone}
            autoRedirectDelay={null}
          />
        ) : null;

      default:
        return null;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const stepNumber = getStepNumber(state.currentStep);
  const totalSteps = getTotalSteps();
  const progressPercentage = (stepNumber / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gray-50 pb-8" data-testid="wizard-container">
      {/* Screen reader announcements */}
      <div
        id="step-announcement"
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Progress Bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-[480px] mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 whitespace-nowrap">
              Step {stepNumber} of {totalSteps}
            </span>
            <Progress value={progressPercentage} className="flex-1" />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-[480px] mx-auto px-4 py-6">
        <div
          className="animate-in fade-in duration-300"
          style={{ animationFillMode: 'backwards' }}
        >
          {renderStepContent()}
        </div>

        {/* API Error Display */}
        {state.apiError && (
          <div
            className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-sm text-red-800 font-medium mb-2">Error</p>
            <p className="text-sm text-red-700">{state.apiError}</p>
            {state.currentStep === WizardStep.VISIT_DETAILS && (
              <button
                type="button"
                onClick={() => {
                  setState((prev) => ({ ...prev, apiError: null }));
                  // Retry submission by clicking the submit button in the step
                }}
                className="mt-3 text-sm text-red-600 hover:text-red-800 underline font-medium"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={() => setState((prev) => ({ ...prev, apiError: null }))}
              className="mt-2 ml-4 text-sm text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Registration?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be lost and you&apos;ll need to start over. Are you sure you want to cancel?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Registration</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-red-600 hover:bg-red-700">
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSS for reduced motion */}
      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-in {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Page Export (with Suspense boundary and QueryClientProvider)
// ============================================================================

export default function VisitorRegistrationWizard() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<WizardLoadingFallback />}>
        <VisitorRegistrationWizardContent />
      </Suspense>
    </QueryClientProvider>
  );
}
