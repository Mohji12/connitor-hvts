'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Phone, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import apiClient from '@/lib/api';
import { cn } from '@/lib/utils';
import { VisitCategory } from '@/lib/constants/visit-constants';
import { GatePassView } from '@/components/visitors/shared/GatePassView';
import type { GatePassVisitorData } from '@/components/visitors/shared/GatePassView';
import type {
  GatePassPageProps,
  VisitStatusApiResponse,
  VisitStatusWithGatePass,
  VisitStatusCheckedIn,
  VisitStatusCheckedOut,
  GatePassState,
  ErrorDisplayConfig,
} from './types';
import { VisitStatus } from './types';

// UUID v4 validation regex
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Helper to check if a status requires redirect to status check page
const NON_GATE_PASS_STATUSES = ['REQUEST_SENT', 'PENDING', 'REJECTED'] as const;

function isValidUUID(uuid: string): boolean {
  return UUID_V4_REGEX.test(uuid);
}

function isGatePassExpired(validUntil: string): boolean {
  const expiryDate = new Date(validUntil);
  const now = new Date();
  return expiryDate < now;
}

function getErrorConfig(errorCode?: string, errorMessage?: string | null): ErrorDisplayConfig {
  // Network error
  if (!errorCode && !errorMessage) {
    return {
      icon: 'alert',
      title: 'Connection Lost',
      message: 'Connection lost. Check your internet connection and try again.',
      showRetry: true,
      showContactSecurity: true,
    };
  }

  switch (errorCode) {
    case 'INVALID_VISIT_ID':
    case '400':
      return {
        icon: 'invalid',
        title: 'Invalid Visit ID',
        message: 'Invalid visit ID format. Please check the link and try again.',
        showRetry: false,
        showContactSecurity: true,
      };
    case 'VISIT_NOT_FOUND':
    case '404':
      return {
        icon: 'not-found',
        title: 'Visit Not Found',
        message: 'Visit not found. The visit ID may be incorrect or has been removed.',
        showRetry: false,
        showContactSecurity: true,
      };
    case '410':
      return {
        icon: 'alert',
        title: 'Visit Expired',
        message: 'This visit request has expired. Please submit a new request.',
        showRetry: false,
        showContactSecurity: true,
      };
    case 'NETWORK_ERROR':
      return {
        icon: 'alert',
        title: 'Connection Lost',
        message: 'Connection lost. Check your internet connection and try again.',
        showRetry: true,
        showContactSecurity: true,
      };
    case '500':
    default:
      return {
        icon: 'alert',
        title: 'Unable to Load Gate Pass',
        message: errorMessage || 'An error occurred while loading your gate pass.',
        showRetry: true,
        showContactSecurity: true,
      };
  }
}

function transformToGatePassData(
  response: VisitStatusWithGatePass | VisitStatusCheckedIn
): {
  visitor: GatePassVisitorData;
  otp: string;
  validityTimestamp: Date;
  branchPhone?: string;
  qrCodeDataUrl?: string | null;
} {
  const isMeeting = response.visitCategory === 'MEETING';
  // Use type guard to safely access approvedAt (only exists on APPROVED visits)
  const visitDate = new Date('approvedAt' in response ? response.approvedAt : response.submittedAt);

  // Parse visit date and time
  const visitTime = visitDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const visitor: GatePassVisitorData = {
    id: response.visitor.id,
    visitorName: response.visitor.fullName,
    visitorPhone: response.visitor.phone,
    visitorPhoto: response.visitor.photoUrl,
    visitType: isMeeting ? VisitCategory.MEETING : VisitCategory.DELIVERY,
    visitDate: visitDate,
    visitTime: visitTime,
    purpose: response.meetingDetails?.purpose,
  };

  // Add host info for meeting visits
  if (isMeeting && response.meetingDetails) {
    visitor.host = {
      name: response.meetingDetails.staffName || 'Not specified',
      department: response.meetingDetails.department || 'General',
    };
  }

  // Add delivery info for delivery visits
  if (!isMeeting && response.deliveryDetails) {
    visitor.deliveryInfo = {
      platform: response.deliveryDetails.platform,
      recipient: response.deliveryDetails.recipient || 'Nursing Station',
    };
  }

  // Use type guard to safely access branch.phone (only exists on VisitStatusWithGatePass)
  const branchPhone = response.branch && 'phone' in response.branch 
    ? response.branch.phone 
    : undefined;

  return {
    visitor,
    otp: response.gatePass.checkInOtp,
    validityTimestamp: new Date(response.gatePass.validUntil),
    branchPhone,
    qrCodeDataUrl: response.gatePass.checkInQrCode ?? response.gatePass.gatePassUrl ?? null,
  };
}

export default function GatePassPage({ params }: GatePassPageProps): React.ReactElement {
  const router = useRouter();
  
  // Unwrap async params (Next.js 15 pattern)
  const [visitId, setVisitId] = useState<string>('');
  const [isParamsLoaded, setIsParamsLoaded] = useState(false);

  useEffect(() => {
    params.then((resolvedParams) => {
      setVisitId(resolvedParams.visitId);
      setIsParamsLoaded(true);
    });
  }, [params]);

  // State
  const [state, setState] = useState<GatePassState>({
    pageState: 'loading',
    visitor: null,
    otp: '',
    validityTimestamp: null,
    error: null,
    errorCode: undefined,
    isRetryable: false,
    branchPhone: undefined,
    visitStatus: null,
  });

  // Refs for focus management
  const contentRef = useRef<HTMLDivElement>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const errorMessageRef = useRef<HTMLDivElement>(null);

  // Fetch gate pass data
  const fetchGatePassData = useCallback(async () => {
    try {
      const response = await apiClient.get<VisitStatusApiResponse>(
        `/api/public/visits/${visitId}/status`
      );

      if (response.data.success && response.data.data) {
        const visitData = response.data.data;

        // Check if this is a status that should redirect to status check page
        if (NON_GATE_PASS_STATUSES.includes(visitData.status as typeof NON_GATE_PASS_STATUSES[number])) {
          router.push(`/visitor-registration/status/${visitId}`);
          return;
        }

        // Handle APPROVED status
        if (visitData.status === VisitStatus.APPROVED) {
          const approvedData = visitData as VisitStatusWithGatePass;
          const isExpired = isGatePassExpired(approvedData.gatePass.validUntil);
          const transformed = transformToGatePassData(approvedData);

          setState({
            pageState: isExpired ? 'expired' : 'success',
            visitor: transformed.visitor,
            otp: transformed.otp,
            validityTimestamp: transformed.validityTimestamp,
            error: null,
            errorCode: undefined,
            isRetryable: false,
            branchPhone: transformed.branchPhone,
            visitStatus: VisitStatus.APPROVED,
            qrCodeDataUrl: transformed.qrCodeDataUrl,
          });
          return;
        }

        // Handle CHECKED_IN status
        if (visitData.status === VisitStatus.CHECKED_IN) {
          const checkedInData = visitData as VisitStatusCheckedIn;
          const isExpired = isGatePassExpired(checkedInData.gatePass.validUntil);
          const transformed = transformToGatePassData(checkedInData);

          setState({
            pageState: isExpired ? 'expired' : 'success',
            visitor: transformed.visitor,
            otp: transformed.otp,
            validityTimestamp: transformed.validityTimestamp,
            error: null,
            errorCode: undefined,
            isRetryable: false,
            branchPhone: transformed.branchPhone,
            visitStatus: VisitStatus.CHECKED_IN,
            qrCodeDataUrl: transformed.qrCodeDataUrl,
          });
          return;
        }

        // Handle CHECKED_OUT status
        if (visitData.status === VisitStatus.CHECKED_OUT) {
          const checkedOutData = visitData as VisitStatusCheckedOut;
          
          // For checked out visits, show historical record without OTP
          setState({
            pageState: 'expired',
            visitor: {
              id: checkedOutData.visitor.id,
              visitorName: checkedOutData.visitor.fullName,
              visitorPhone: checkedOutData.visitor.phone,
              visitorPhoto: checkedOutData.visitor.photoUrl,
              visitType: checkedOutData.visitCategory === 'MEETING' ? VisitCategory.MEETING : VisitCategory.DELIVERY,
              visitDate: new Date(checkedOutData.submittedAt),
              visitTime: new Date(checkedOutData.submittedAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              }),
              purpose: checkedOutData.meetingDetails?.purpose,
              host: checkedOutData.meetingDetails ? {
                name: checkedOutData.meetingDetails.staffName || 'Not specified',
                department: checkedOutData.meetingDetails.department || 'General',
              } : undefined,
              deliveryInfo: checkedOutData.deliveryDetails ? {
                platform: checkedOutData.deliveryDetails.platform,
                recipient: checkedOutData.deliveryDetails.recipient || 'Nursing Station',
              } : undefined,
            },
            otp: '',
            validityTimestamp: null,
            error: null,
            errorCode: undefined,
            isRetryable: false,
            visitStatus: VisitStatus.CHECKED_OUT,
          });
          return;
        }

        // Handle REJECTED status - redirect to status check
        if (visitData.status === VisitStatus.REJECTED) {
          router.push(`/visitor-registration/status/${visitId}`);
          return;
        }
      }
    } catch (error: unknown) {
      // Handle HTTP errors
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status: number; data?: { message?: string; code?: string } } };
        const status = axiosError.response?.status;
        const message = axiosError.response?.data?.message;
        const code = axiosError.response?.data?.code;

        if (status === 400) {
          setState((prev) => ({
            ...prev,
            pageState: 'error',
            error: message || 'Invalid visit ID format.',
            errorCode: code || 'INVALID_VISIT_ID',
            isRetryable: false,
          }));
        } else if (status === 404) {
          setState((prev) => ({
            ...prev,
            pageState: 'error',
            error: message || 'Visit not found.',
            errorCode: code || 'VISIT_NOT_FOUND',
            isRetryable: false,
          }));
        } else if (status === 410) {
          setState((prev) => ({
            ...prev,
            pageState: 'error',
            error: 'This visit request has expired.',
            errorCode: '410',
            isRetryable: false,
          }));
        } else if (status === 500) {
          setState((prev) => ({
            ...prev,
            pageState: 'error',
            error: message || 'Server error. Please try again.',
            errorCode: '500',
            isRetryable: true,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            pageState: 'error',
            error: message || 'Unable to load gate pass. Please try again.',
            errorCode: 'UNKNOWN_ERROR',
            isRetryable: true,
          }));
        }
      } else {
        // Network or unknown error
        setState((prev) => ({
          ...prev,
          pageState: 'error',
          error: 'Connection lost. Check your internet connection and try again.',
          errorCode: 'NETWORK_ERROR',
          isRetryable: true,
        }));
      }
    }
  }, [visitId, router]);

  // Initial load effect
  useEffect(() => {
    if (!isParamsLoaded || !visitId) return;

    // Validate UUID
    if (!isValidUUID(visitId)) {
      setState((prev) => ({
        ...prev,
        pageState: 'error',
        error: 'Invalid visit ID format. Please check the link.',
        errorCode: 'INVALID_VISIT_ID',
        isRetryable: false,
      }));
      return;
    }

    fetchGatePassData();
  }, [isParamsLoaded, visitId, fetchGatePassData]);

  // Focus management on state changes
  useEffect(() => {
    if (state.pageState === 'error' && retryButtonRef.current) {
      retryButtonRef.current.focus();
    } else if (state.pageState === 'success' && contentRef.current) {
      contentRef.current.focus();
    }
  }, [state.pageState]);

  // Event handlers
  const handleRetry = useCallback((): void => {
    setState({
      pageState: 'loading',
      visitor: null,
      otp: '',
      validityTimestamp: null,
      error: null,
      errorCode: undefined,
      isRetryable: false,
      branchPhone: undefined,
      visitStatus: null,
    });
    fetchGatePassData();
  }, [fetchGatePassData]);

  const handleContactSecurity = useCallback((): void => {
    const phone = state.branchPhone || '+91-XXXXXXXXXX';
    const email = 'security@hospital.com';
    
    // Create and show contact options modal
    const choice = window.confirm(
      `Contact Security:\n\nPhone: ${phone}\nEmail: ${email}\n\nClick OK to call, Cancel to email.`
    );
    
    if (choice) {
      window.location.href = `tel:${phone.replace(/[^\d+]/g, '')}`;
    } else {
      window.location.href = `mailto:${email}?subject=Gate Pass Assistance - Visit ID: ${visitId}`;
    }
  }, [state.branchPhone, visitId]);

  // Render helpers
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center space-y-6 py-12" role="status" aria-live="polite">
      <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" aria-label="Loading gate pass" data-testid="loading-spinner" />
      <p className="text-gray-600">Loading your gate pass...</p>
    </div>
  );

  const renderErrorState = () => {
    const errorConfig = getErrorConfig(state.errorCode, state.error);
    const ErrorIcon = errorConfig.icon === 'alert' ? AlertCircle : AlertCircle;

    return (
      <Card className="max-w-md mx-auto border-destructive">
        <CardContent className="pt-6" role="alert" aria-live="assertive" ref={errorMessageRef}>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ErrorIcon className="h-8 w-8 text-destructive" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">{errorConfig.title}</h3>
              <p className="text-sm text-muted-foreground">{errorConfig.message}</p>
            </div>
            
            {/* Action Buttons */}
            <div className="w-full space-y-3 pt-4">
              {errorConfig.showRetry && (
                <Button
                  ref={retryButtonRef}
                  onClick={handleRetry}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white min-h-[48px] px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Retry loading gate pass"
                >
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Try Again
                </Button>
              )}
              
              {errorConfig.showContactSecurity && (
                <Button
                  onClick={handleContactSecurity}
                  variant="outline"
                  className="w-full min-h-[48px] px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  aria-label="Contact security for assistance"
                >
                  <Phone className="h-4 w-4 mr-2" aria-hidden="true" />
                  Contact Security
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderExpiredState = () => {
    if (!state.visitor) return null;

    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center" role="alert" aria-live="polite">
          <AlertCircle className="h-6 w-6 text-amber-600 mx-auto mb-2" aria-hidden="true" />
          <p className="text-amber-800 font-medium">This pass has expired</p>
          <p className="text-amber-700 text-sm mt-1">
            The check-in OTP is no longer valid. Please contact security for assistance.
          </p>
        </div>
        
        <GatePassView
          visitor={state.visitor}
          otp={state.otp || 'EXPIRED'}
          validityTimestamp={state.validityTimestamp || new Date()}
          expired={true}
          loading={false}
        />
        
        <div className="text-center pt-4">
          <Button
            onClick={handleContactSecurity}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px] px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            aria-label="Contact security for assistance"
          >
            <Phone className="h-4 w-4 mr-2" aria-hidden="true" />
            Contact Security
          </Button>
        </div>
      </div>
    );
  };

  const renderSuccessState = () => {
    if (!state.visitor || !state.validityTimestamp) return null;

    return (
      <div ref={contentRef} tabIndex={-1} aria-label="Gate pass content">
        <GatePassView
          visitor={state.visitor}
          otp={state.otp}
          validityTimestamp={state.validityTimestamp}
          loading={false}
          qrCodeDataUrl={state.qrCodeDataUrl}
          showQRCode={Boolean(state.qrCodeDataUrl)}
        />
        
        {/* Additional Info for CHECKED_IN status */}
        {state.visitStatus === VisitStatus.CHECKED_IN && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-blue-800 font-medium">You are currently checked in</p>
            <p className="text-blue-700 text-sm mt-1">
              Show this pass to security when checking out.
            </p>
          </div>
        )}
      </div>
    );
  };

  // Show loading while params load
  if (!isParamsLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mx-auto" aria-label="Loading" data-testid="loading-spinner" />
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div
        className={cn(
          'w-full max-w-lg mx-auto',
          state.pageState === 'loading' && 'opacity-75'
        )}
        data-testid="gate-pass-container"
      >
        {/* Page Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Visitor Gate Pass</h1>
          <p className="text-sm text-gray-600 mt-1">Show this pass at the security desk</p>
        </div>

        {/* State-Specific Content */}
        {state.pageState === 'loading' && renderLoadingState()}
        {state.pageState === 'error' && renderErrorState()}
        {state.pageState === 'expired' && renderExpiredState()}
        {state.pageState === 'success' && renderSuccessState()}
      </div>
    </div>
  );
}
