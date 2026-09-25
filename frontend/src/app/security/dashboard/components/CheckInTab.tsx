'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VisitorDetailsCard } from './VisitorDetailsCard';
import {
  verifyCheckInOtp,
  scanCheckInQr,
  mapErrorCodeToMessage,
  ApiError,
  type VerifyCheckInOtpResponse,
  type OtpVerificationState,
  type TabViewMode,
  type VisitorSearchData,
} from '@/lib/api/visitors-api';
import { ClipboardCheck, Phone, AlertCircle, Loader2, QrCode, KeyRound } from 'lucide-react';
import { PhoneLookupFlow } from './PhoneLookupFlow';
import { QrCheckInScanner } from '@/components/security/QrCheckInScanner';
import { VisitorService } from '@/lib/services/visitorService';
import {
  UrgentPasscodeService,
  type ConfirmVerifyUrgentPasscodeResponse,
} from '@/lib/services/urgentPasscodeService';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

type ExtendedViewMode = TabViewMode | 'urgent_passcode' | 'urgent_handoff';

export interface CheckInTabProps {
  /** Branch ID for the check-in operation */
  branchId: string;
  /** Callback when check-in is successful */
  onCheckInSuccess?: (visitId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * CheckInTab - OTP Verification component for visitor check-in
 *
 * Features:
 * - 6-digit OTP input with auto-focus and paste support
 * - OTP verification via API
 * - Visitor details display after successful verification
 * - Error handling with user-friendly messages
 * - Phone lookup alternative (placeholder for Task 6.4)
 * - Accessible with proper ARIA attributes and keyboard navigation
 * - Focus management for screen readers
 */
export function CheckInTab({
  branchId,
  onCheckInSuccess,
  className,
}: CheckInTabProps): React.ReactElement {
  // View mode state
  const [viewMode, setViewMode] = React.useState<ExtendedViewMode>('qr');
  const [qrState, setQrState] = React.useState<OtpVerificationState>('idle');
  const [qrError, setQrError] = React.useState<string | undefined>(undefined);

  // OTP state
  const [otpValue, setOtpValue] = React.useState('');
  const [otpState, setOtpState] = React.useState<OtpVerificationState>('idle');
  const [otpError, setOtpError] = React.useState<string | undefined>(undefined);

  // Visitor data state
  const [visitorData, setVisitorData] =
    React.useState<VerifyCheckInOtpResponse | null>(null);

  // Check-in state
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);
  const [isCheckingOut, setIsCheckingOut] = React.useState(false);

  const [urgentCode, setUrgentCode] = React.useState('');
  const [urgentLoading, setUrgentLoading] = React.useState(false);
  const [urgentError, setUrgentError] = React.useState<string | undefined>();
  const [urgentHandoff, setUrgentHandoff] =
    React.useState<ConfirmVerifyUrgentPasscodeResponse | null>(null);

  // Refs for focus management
  const otpInputRef = React.useRef<HTMLInputElement>(null);
  const visitorCardRef = React.useRef<HTMLDivElement>(null);
  const errorAlertRef = React.useRef<HTMLDivElement>(null);

  // Focus OTP input on mount
  React.useEffect(() => {
    if (viewMode === 'otp' && otpState === 'idle') {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [viewMode, otpState]);

  // Focus visitor card on successful verification
  React.useEffect(() => {
    if (viewMode === 'visitor_details' && visitorData) {
      const timer = setTimeout(() => {
        visitorCardRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [viewMode, visitorData]);

  // Focus error alert when error occurs
  React.useEffect(() => {
    if (otpError && otpState === 'error') {
      const timer = setTimeout(() => {
        errorAlertRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [otpError, otpState]);

  /**
   * Announces status to screen readers
   */
  const announceStatus = React.useCallback((message: string): void => {
    // Create a live region for screen reader announcements
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  /**
   * Handles OTP completion and triggers verification
   */
  const handleOtpComplete = React.useCallback(
    async (otp: string): Promise<void> => {
      if (otp.length !== 6) return;

      setOtpState('loading');
      setOtpError(undefined);

      try {
        const response = await verifyCheckInOtp({ otp, branchId });

        if (response.success) {
          setVisitorData(response);
          setOtpState('success');
          setViewMode('visitor_details');
          announceStatus('OTP Verified! Ready to check in.');
        }
      } catch (error) {
        setOtpState('error');
        if (error instanceof ApiError) {
          setOtpError(error.message || mapErrorCodeToMessage(error.code));
        } else {
          setOtpError(mapErrorCodeToMessage('UNKNOWN_ERROR'));
        }
        // Focus back to OTP input for retry
        setTimeout(() => {
          otpInputRef.current?.focus();
        }, 100);
      }
    },
    [branchId, announceStatus],
  );

  /**
   * Handles OTP value changes
   */
  const handleOtpChange = React.useCallback(
    (value: string): void => {
      setOtpValue(value);
      // Clear error when user starts typing again
      if (otpError) {
        setOtpError(undefined);
        setOtpState('idle');
      }
    },
    [otpError],
  );

  /**
   * Handles manual verify button click
   */
  const handleVerifyClick = React.useCallback((): void => {
    if (otpValue.length === 6) {
      void handleOtpComplete(otpValue);
    }
  }, [otpValue, handleOtpComplete]);

  /**
   * Handles cancel action - resets to OTP view
   */
  const handleCancel = React.useCallback((): void => {
    setViewMode('qr');
    setOtpValue('');
    setOtpState('idle');
    setOtpError(undefined);
    setQrState('idle');
    setQrError(undefined);
    setVisitorData(null);
    setIsCheckingIn(false);
    setIsCheckingOut(false);
    setUrgentCode('');
    setUrgentHandoff(null);
    setUrgentError(undefined);
  }, []);

  const handleQrScan = React.useCallback(
    async (payload: string): Promise<void> => {
      setQrState('loading');
      setQrError(undefined);

      try {
        const response = await scanCheckInQr(payload);
        setVisitorData(response);
        setQrState('success');
        setViewMode('visitor_details');
        if (response.canCheckOut) {
          announceStatus('QR verified. Visitor is checked in — ready for check-out.');
        } else {
          announceStatus('QR verified. Verify ID proof and check in.');
        }
      } catch (error) {
        setQrState('error');
        if (error instanceof ApiError) {
          setQrError(error.message || mapErrorCodeToMessage(error.code));
        } else {
          setQrError(mapErrorCodeToMessage('UNKNOWN_ERROR'));
        }
      }
    },
    [announceStatus],
  );

  /**
   * Handles check-in action
   * Calls check-in API with visitId from verified OTP response.
   * Shows success toast on completion, transitions back to OTP input.
   */
  const handleCheckIn = React.useCallback(async (): Promise<void> => {
    if (!visitorData) return;

    setIsCheckingIn(true);
    try {
      const response = await VisitorService.checkInVisit(visitorData.visitId);

      // Show success toast with visitor name
      const passId = response.visitorPassId ?? visitorData.visit.visitorPassId;
      toast.success('Check-In Successful', {
        description: `${response.visitor.firstName} ${response.visitor.lastName} is now checked in.${
          passId ? ` Pass ID: ${passId}` : ''
        }`,
      });

      // Announce to screen readers
      announceStatus('Check-in completed successfully.');

      // Call parent callback if provided
      onCheckInSuccess?.(response.visitId);

      // Reset to fresh OTP input state
      handleCancel();
    } catch (error) {
      // Map error codes to user-friendly messages
      let errorMessage = 'Check-in failed. Please try again.';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as {
          response?: {
            data?: {
              error?: string;
              message?: string;
              detail?: string | { code?: string; message?: string };
            };
          };
        };
        const raw = apiError.response?.data;
        const detailText =
          typeof raw?.detail === 'string'
            ? raw.detail
            : raw?.detail?.message ?? '';
        const errorCode =
          raw?.error ??
          raw?.message ??
          (detailText.startsWith('HOLD_CURRENT_VISIT')
            ? 'HOLD_CURRENT_VISIT'
            : detailText.startsWith('SLOT_NOT_STARTED')
              ? 'SLOT_NOT_STARTED'
              : undefined);
        
        if (errorCode) {
          switch (errorCode) {
            case 'VISIT_NOT_APPROVED':
              errorMessage = 'Visit is not approved for check-in.';
              break;
            case 'ALREADY_CHECKED_IN':
              errorMessage = 'Visitor is already checked in.';
              break;
            case 'VISIT_ALREADY_COMPLETED':
              errorMessage = 'This visit has already been completed.';
              break;
            case 'VISIT_NOT_FOUND':
              errorMessage = 'Visit not found. Please verify again.';
              break;
            case 'FORBIDDEN_BRANCH':
              errorMessage = 'You do not have access to this visit.';
              break;
            case 'ID_PROOF_NOT_VERIFIED':
              errorMessage = 'ID proof must be verified before check-in for appointments.';
              break;
            case 'HOLD_CURRENT_VISIT':
              errorMessage = detailText.replace(/^HOLD_CURRENT_VISIT:?\s*/, '') ||
                'Hold this visitor — the current appointment for this doctor is still in progress.';
              break;
            case 'SLOT_NOT_STARTED':
              errorMessage = detailText.replace(/^SLOT_NOT_STARTED:?\s*/, '') ||
                'Meeting has not started yet. Do not check in this visitor yet.';
              break;
          }
        }
      }

      toast.error('Check-In Failed', {
        description: errorMessage,
      });

      announceStatus(`Check-in failed. ${errorMessage}`);
    } finally {
      setIsCheckingIn(false);
    }
  }, [visitorData, onCheckInSuccess, handleCancel, announceStatus]);

  const handleCheckOut = React.useCallback(async (): Promise<void> => {
    if (!visitorData) return;

    setIsCheckingOut(true);
    try {
      const response = await VisitorService.checkOut(visitorData.visitId);

      toast.success('Check-Out Successful', {
        description: `${response.visitor?.firstName ?? visitorData.visitor.firstName} has checked out. Thank-you message sent.`,
      });

      announceStatus('Check-out completed successfully.');

      onCheckInSuccess?.(visitorData.visitId);
      handleCancel();
    } catch (error) {
      let errorMessage = 'Check-out failed. Please try again.';

      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as {
          response?: { data?: { error?: string; message?: string } };
        };
        const errorCode =
          apiError.response?.data?.error ?? apiError.response?.data?.message;

        if (errorCode) {
          switch (errorCode) {
            case 'NOT_CHECKED_IN':
              errorMessage = 'Visitor is not checked in yet.';
              break;
            case 'VISIT_ALREADY_COMPLETED':
              errorMessage = 'This visit has already been completed.';
              break;
            case 'VISIT_NOT_FOUND':
              errorMessage = 'Visit not found. Please scan again.';
              break;
          }
        }
      }

      toast.error('Check-Out Failed', { description: errorMessage });
      announceStatus(`Check-out failed. ${errorMessage}`);
    } finally {
      setIsCheckingOut(false);
    }
  }, [visitorData, onCheckInSuccess, handleCancel, announceStatus]);

  /**
   * Handles phone lookup button click
   */
  const handlePhoneLookupClick = React.useCallback((): void => {
    setViewMode('phone');
  }, []);

  const handleUrgentVerify = React.useCallback(async (): Promise<void> => {
    if (urgentCode.length !== 6) return;
    setUrgentLoading(true);
    setUrgentError(undefined);
    try {
      await UrgentPasscodeService.verify(urgentCode);
      const handoff = await UrgentPasscodeService.confirmVerify(urgentCode);
      setUrgentHandoff(handoff);
      setViewMode('urgent_handoff');
      announceStatus('Passcode verified. Ask visitor to register and book on the link or QR.');
    } catch (error) {
      setUrgentError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setUrgentLoading(false);
    }
  }, [urgentCode, announceStatus]);

  /** Always open the registration form on this frontend (not API / PUBLIC_FRONTEND_URL host). */
  const urgentRegisterUrl = React.useMemo((): string => {
    if (!urgentHandoff?.gateToken) return urgentHandoff?.registerUrl ?? '';
    if (typeof window === 'undefined') return urgentHandoff.registerUrl;
    return `${window.location.origin}/visitor/urgent/?token=${encodeURIComponent(urgentHandoff.gateToken)}`;
  }, [urgentHandoff]);

  /**
   * Handles visitor found from phone lookup
   */
  const handleVisitorFound = React.useCallback((visitor: VisitorSearchData): void => {
    // For now, we'll create a mock VerifyCheckInOtpResponse from the visitor data
    // In Task 6.5, this will be replaced with actual check-in logic
    const mockResponse: VerifyCheckInOtpResponse = {
      success: true,
      visitId: 'mock-visit-id', // This will be generated in Task 6.5
      visitorId: visitor.id,
      visitor: {
        id: visitor.id,
        firstName: visitor.firstName,
        lastName: visitor.lastName,
        phone: visitor.phone,
        email: visitor.email,
        photo: visitor.photo,
        company: visitor.company,
      },
      visit: {
        id: 'mock-visit-id',
        visitCategory: 'MEETING', // Default, will be determined in Task 6.5
        visitSubType: null,
        status: 'APPROVED',
        checkInOtp: '000000', // Not applicable for phone lookup
        checkInOtpExpiry: new Date().toISOString(),
        purpose: null,
        department: null,
        deliveryPlatform: null,
        deliveryRecipient: null,
        orderReference: null,
        staffName: null,
        staffPhone: null,
      },
      canCheckIn: true,
    };

    setVisitorData(mockResponse);
    setViewMode('visitor_details');
    announceStatus('Visitor selected. Ready to check in.');
  }, [announceStatus]);

  // Determine if verify button should be disabled
  const isVerifyDisabled = otpValue.length !== 6 || otpState === 'loading';

  return (
    <div
      id="check-in-tab-content"
      role="tabpanel"
      aria-labelledby="tab-check-in"
      className={cn('p-4', className)}
      data-testid="check-in-tab"
    >
      {/* Screen reader announcements */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {otpState === 'loading' && 'Verifying OTP...'}
        {otpState === 'success' && 'OTP Verified! Ready to check in.'}
        {otpState === 'error' && otpError}
      </div>

      {viewMode === 'visitor_details' && visitorData ? (
        <div ref={visitorCardRef} tabIndex={-1}>
          <VisitorDetailsCard
            visitorData={visitorData}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onCancel={handleCancel}
            isCheckingIn={isCheckingIn}
            isCheckingOut={isCheckingOut}
          />
        </div>
      ) : viewMode === 'phone' ? (
        <PhoneLookupFlow
          branchId={branchId}
          onVisitorFound={handleVisitorFound}
          onBack={() => setViewMode('qr')}
        />
      ) : viewMode === 'urgent_handoff' && urgentHandoff ? (
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">Ask visitor to register</h2>
            <p className="text-sm text-gray-500">
              Meeting{' '}
              <span className="font-medium text-gray-800">
                {urgentHandoff.host.name ?? 'Doctor'}
              </span>
              {urgentHandoff.note ? ` — ${urgentHandoff.note}` : ''}
            </p>
            <p className="text-sm text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-md px-3 py-2">
              Visitor registers, books with this doctor (no further approval), then shows Entry QR
              for check-in and Exit QR for checkout.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 text-center">
            <div className="flex justify-center">
              <QRCodeSVG value={urgentRegisterUrl} size={200} level="M" includeMargin />
            </div>
            <p className="text-xs break-all text-muted-foreground">{urgentRegisterUrl}</p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                void navigator.clipboard.writeText(urgentRegisterUrl);
                toast.success('Registration link copied');
              }}
            >
              Copy link
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => window.open(urgentRegisterUrl, '_blank', 'noopener,noreferrer')}
            >
              Open registration form
            </Button>
            <p className="text-xs text-muted-foreground">
              Link valid ~{urgentHandoff.gateTokenExpiresInMinutes} minutes. After booking, scan
              their Entry QR on this tab.
            </p>
            <Button type="button" className="w-full" onClick={handleCancel}>
              Done — back to QR scan
            </Button>
          </div>
        </div>
      ) : viewMode === 'urgent_passcode' ? (
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">Doctor urgent passcode</h2>
            <p className="text-sm text-gray-500">
              Enter the 6-digit code the visitor received from their doctor
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={urgentCode}
                onChange={setUrgentCode}
                onComplete={() => void handleUrgentVerify()}
                disabled={urgentLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {urgentError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{urgentError}</AlertDescription>
              </Alert>
            )}
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={urgentCode.length !== 6 || urgentLoading}
              onClick={() => void handleUrgentVerify()}
            >
              {urgentLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying…
                </>
              ) : (
                'Verify passcode'
              )}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => setViewMode('qr')}>
              Back
            </Button>
          </div>
        </div>
      ) : viewMode === 'otp' ? (
        // OTP Verification View (fallback)
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Enter OTP
            </h2>
            <p className="text-sm text-gray-500">
              Fallback if QR scan is unavailable — enter the 6-digit OTP from the visitor
            </p>
          </div>

          {/* OTP Input Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="otp-input"
                className="block text-sm font-medium text-gray-700"
              >
                Visitor OTP
              </label>
              <div className="flex justify-center">
                <InputOTP
                  id="otp-input"
                  ref={otpInputRef}
                  maxLength={6}
                  value={otpValue}
                  onChange={handleOtpChange}
                  onComplete={handleOtpComplete}
                  disabled={otpState === 'loading'}
                  aria-label="Visitor Check-In OTP"
                  aria-describedby={otpError ? 'otp-error' : undefined}
                  aria-invalid={otpState === 'error'}
                  data-testid="otp-input"
                  className={cn(
                    otpState === 'error' &&
                      '[&_div[data-slot="input-otp-slot"]]:border-red-500 [&_div[data-slot="input-otp-slot"]]:ring-red-200',
                  )}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            {otpError && (
              <Alert
                ref={errorAlertRef}
                variant="destructive"
                className="text-sm"
                role="alert"
                aria-live="polite"
                id="otp-error"
                tabIndex={-1}
              >
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{otpError}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleVerifyClick}
              disabled={isVerifyDisabled}
              aria-label="Verify visitor OTP"
              aria-busy={otpState === 'loading'}
              data-testid="verify-otp-button"
            >
              {otpState === 'loading' ? (
                <>
                  <Loader2
                    className="h-4 w-4 mr-2 animate-spin"
                    aria-hidden="true"
                  />
                  Verifying...
                </>
              ) : (
                <>
                  <ClipboardCheck className="h-4 w-4 mr-2" aria-hidden="true" />
                  Verify OTP
                </>
              )}
            </Button>
          </div>

          <div className="text-center">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setViewMode('qr')}
              aria-label="Back to QR scan"
            >
              <QrCode className="h-4 w-4 mr-2" aria-hidden="true" />
              Scan QR instead
            </Button>
          </div>
        </div>
      ) : (
        // QR Scan View (primary)
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Scan Visitor QR
            </h2>
            <p className="text-sm text-gray-500">
              Visitor shows the QR from doctor approval — scan it to load their details
            </p>
          </div>

          <QrCheckInScanner
            onScan={handleQrScan}
            disabled={qrState === 'loading'}
          />

          {qrState === 'loading' && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying QR code...
            </div>
          )}

          {qrError && (
            <Alert variant="destructive" className="text-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{qrError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setViewMode('otp')}
              aria-label="Enter OTP manually"
            >
              <ClipboardCheck className="h-4 w-4 mr-2" aria-hidden="true" />
              Enter OTP instead
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handlePhoneLookupClick}
              aria-label="Check visitor by phone number"
              data-testid="phone-lookup-button"
            >
              <Phone className="h-4 w-4 mr-2" aria-hidden="true" />
              Check Visitor by Phone
            </Button>
            <Button
              variant="outline"
              className="w-full border-indigo-200 text-indigo-900"
              onClick={() => {
                setUrgentCode('');
                setUrgentError(undefined);
                setViewMode('urgent_passcode');
              }}
              aria-label="Doctor urgent passcode check-in"
            >
              <KeyRound className="h-4 w-4 mr-2" aria-hidden="true" />
              Doctor urgent passcode
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Check-in steps
            </h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Visitor shows QR code from their portal or approval email</li>
              <li>Scan the QR to load visitor and appointment details</li>
              <li>Verify government ID (required for appointments)</li>
              <li>Tap Check In to complete entry</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
