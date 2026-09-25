'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api';
import { cn } from '@/lib/utils';
import type {
  StatusPageProps,
  VisitStatusResponse,
  PollingState,
} from './types';

// Import VisitStatus enum for use in code
import { VisitStatus } from './types';

// =================================================================
// Module-level state (persists across StrictMode remounts)
// =================================================================

// Track which visit IDs have already initiated fetching (to prevent duplicate calls in StrictMode)
const activeFetchSessions = new Set<string>();

// =================================================================
// Constants
// =================================================================

const POLLING_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60; // 30 minutes max
const REDIRECT_DELAY_MS = 2000; // 2 seconds
const RATE_LIMIT_PAUSE_MS = 60000; // 60 seconds
const COUNTDOWN_INTERVAL_MS = 100; // Update countdown every 100ms

const POLLING_ENABLED_STATUS = [VisitStatus.REQUEST_SENT];
const TERMINAL_STATUS = [
  VisitStatus.APPROVED,
  VisitStatus.REJECTED,
  VisitStatus.CHECKED_IN,
  VisitStatus.CHECKED_OUT,
];

// UUID v4 validation regex
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// =================================================================
// Helper Functions
// =================================================================

function isValidUUID(uuid: string): boolean {
  return UUID_V4_REGEX.test(uuid);
}

function isTerminalStatus(status: VisitStatus): boolean {
  return TERMINAL_STATUS.includes(status);
}

function shouldContinuePolling(status: VisitStatus): boolean {
  return POLLING_ENABLED_STATUS.includes(status);
}

function formatLastUpdateTime(date: Date | null): string {
  if (!date) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return '1 minute ago';
  return `${diffMin} minutes ago`;
}

// =================================================================
// Main Component
// =================================================================

export default function StatusCheckPage({ params }: StatusPageProps) {
  const router = useRouter();
  
  // Unwrap async params
  const [visitId, setVisitId] = useState<string>('');
  const [isParamsLoaded, setIsParamsLoaded] = useState(false);

  useEffect(() => {
    params.then((resolvedParams) => {
      setVisitId(resolvedParams.visitId);
      setIsParamsLoaded(true);
    });
  }, [params]);

  // State
  const [state, setState] = useState<PollingState>({
    status: 'idle',
    data: null,
    error: null,
    pollCount: 0,
    lastPollTime: null,
    isRetryable: false,
  });

  const [countdown, setCountdown] = useState<number>(0);

  // Refs for cleanup and tracking
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isPollingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const hasFetchedInitialStatusRef = useRef<boolean>(false);

  // =================================================================
  // API Calls
  // =================================================================

  const isFetchingRef = useRef<boolean>(false);

  const fetchVisitStatus = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      // Prevent duplicate in-flight requests
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const response = await apiClient.get<VisitStatusResponse>(
          `/api/public/visits/${visitId}/status`,
          { signal }
        );

        if (response.data.success && response.data.data) {
          const visitData = response.data.data;

          setState((prev) => ({
            ...prev,
            data: visitData,
            lastPollTime: new Date(),
            pollCount: prev.pollCount + 1,
            error: null,
          }));

          // Handle terminal states
          if (visitData.status === VisitStatus.APPROVED) {
            setState((prev) => ({ ...prev, status: 'approved' }));
            stopPolling();
            startRedirectCountdown();
          } else if (visitData.status === VisitStatus.REJECTED) {
            setState((prev) => ({ ...prev, status: 'rejected' }));
            stopPolling();
          } else if (isTerminalStatus(visitData.status)) {
            // CHECKED_IN or CHECKED_OUT - redirect to gate pass
            setState((prev) => ({ ...prev, status: 'approved' }));
            stopPolling();
            startRedirectCountdown();
          } else if (shouldContinuePolling(visitData.status)) {
            setState((prev) => ({ ...prev, status: 'polling' }));
          }
        }
      } catch (error: unknown) {
        // Don't handle aborted requests
        if (error && typeof error === 'object' && 'name' in error && error.name === 'CanceledError') {
          return;
        }

        // Handle HTTP errors
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status: number; data?: { message?: string } } };
          const status = axiosError.response?.status;
          const message = axiosError.response?.data?.message;

          if (status === 400) {
            setState((prev) => ({
              ...prev,
              status: 'error',
              error: 'Invalid visit ID. Please check the link and try again.',
              isRetryable: false,
            }));
            stopPolling();
          } else if (status === 404) {
            setState((prev) => ({
              ...prev,
              status: 'error',
              error: 'Visit request not found. Please verify your visit ID.',
              isRetryable: false,
            }));
            stopPolling();
          } else if (status === 410) {
            setState((prev) => ({
              ...prev,
              status: 'error',
              error: 'This visit request has expired. Please submit a new request.',
              isRetryable: false,
            }));
            stopPolling();
          } else if (status === 429) {
            // Rate limited - pause for 60 seconds then resume
            isPausedRef.current = true;
            setTimeout(() => {
              isPausedRef.current = false;
            }, RATE_LIMIT_PAUSE_MS);
          } else if (status === 500) {
            setState((prev) => ({
              ...prev,
              status: 'error',
              error: message || 'Server error. Please try again.',
              isRetryable: true,
            }));
            stopPolling();
          } else {
            // Network or unknown error
            setState((prev) => ({
              ...prev,
              status: 'error',
              error: 'Unable to check status. Please check your connection and try again.',
              isRetryable: true,
            }));
            stopPolling();
          }
        } else {
          // Generic error
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: 'Unable to check status. Please try again.',
            isRetryable: true,
          }));
          stopPolling();
        }
      } finally {
        // Reset fetching flag to allow future requests
        isFetchingRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visitId]
  );

  // =================================================================
  // Polling Control
  // =================================================================

  const startPolling = useCallback(() => {
    // Atomic check-and-set to prevent race conditions
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    // Prevent duplicate initial fetch (e.g., in React StrictMode double-mount)
    if (hasFetchedInitialStatusRef.current) return;
    hasFetchedInitialStatusRef.current = true;

    // Immediate first call
    abortControllerRef.current = new AbortController();
    fetchVisitStatus(abortControllerRef.current.signal);

    // Set up interval for subsequent calls
    pollingIntervalRef.current = setInterval(() => {
      // Skip if paused (e.g., rate limited)
      if (isPausedRef.current) return;

      // Check max attempts
      if (state.pollCount >= MAX_POLL_ATTEMPTS) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error:
            'Still waiting for approval? This is taking longer than expected. Please contact security for assistance.',
          isRetryable: false,
        }));
        stopPolling();
        return;
      }

      // Make API call
      abortControllerRef.current = new AbortController();
      fetchVisitStatus(abortControllerRef.current.signal);
    }, POLLING_INTERVAL_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchVisitStatus, state.pollCount]);

  const stopPolling = useCallback(() => {
    isPollingRef.current = false;

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const pausePolling = useCallback(() => {
    isPausedRef.current = true;
  }, []);

  const resumePolling = useCallback(() => {
    isPausedRef.current = false;
  }, []);

  // =================================================================
  // Redirect & Countdown
  // =================================================================

  const startRedirectCountdown = useCallback(() => {
    const redirectTime = Date.now() + REDIRECT_DELAY_MS;
    setCountdown(REDIRECT_DELAY_MS);

    countdownIntervalRef.current = setInterval(() => {
      const remaining = Math.max(0, redirectTime - Date.now());
      setCountdown(remaining);

      if (remaining === 0 && countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }, COUNTDOWN_INTERVAL_MS);

    redirectTimerRef.current = setTimeout(() => {
      // Navigate to gate pass page with state
      router.push(`/visitor-registration/gate-pass/${visitId}`);
    }, REDIRECT_DELAY_MS);
  }, [router, visitId]);

  const cancelRedirect = useCallback(() => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(0);
  }, []);

  // =================================================================
  // Event Handlers
  // =================================================================

  const handleRetry = useCallback(() => {
    // Reset the initial fetch flag so a new API call can be made
    hasFetchedInitialStatusRef.current = false;
    // Clear the active session so retry can fetch again
    if (visitId) {
      activeFetchSessions.delete(visitId);
    }
    setState({
      status: 'idle',
      data: null,
      error: null,
      pollCount: 0,
      lastPollTime: null,
      isRetryable: false,
    });
  }, [visitId]);

  const handleContactSecurity = useCallback(() => {
    // For now, just log - could open a modal or navigate
    console.log('Contact security requested');
    // Future: Could show branch phone number modal
    if (state.data?.branch.phone) {
      alert(`Contact security at: ${state.data.branch.phone}`);
    } else {
      alert('Please contact the security desk at the branch for assistance.');
    }
  }, [state.data]);

  // =================================================================
  // Lifecycle & Effects
  // =================================================================

  // Initialize polling on mount
  useEffect(() => {
    // Use module-level Set to prevent duplicate fetches across StrictMode remounts
    // This check must be FIRST, before any async operations or state checks
    if (visitId && activeFetchSessions.has(visitId)) return;

    // Wait for params to load
    if (!isParamsLoaded || !visitId) return;

    // Validate UUID
    if (!isValidUUID(visitId)) {
      setState({
        status: 'error',
        data: null,
        error: 'Invalid visit ID format. Please check your link.',
        pollCount: 0,
        lastPollTime: null,
        isRetryable: false,
      });
      return;
    }

    // Guard against duplicate polling (e.g., React StrictMode double-mount)
    // If we already have data, don't start polling again
    if (state.data !== null) return;

    // Add to active sessions to prevent duplicate calls
    activeFetchSessions.add(visitId);

    // Start polling
    setState((prev) => ({ ...prev, status: 'polling' }));
    startPolling();

    // Cleanup on unmount
    return () => {
      stopPolling();
      cancelRedirect();
      // Note: We don't remove from activeFetchSessions here because
      // StrictMode can cause mount-unmount-mount cycles, and we want
      // to prevent the second mount from making another call.
      // The session is cleared on page navigation or retry.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isParamsLoaded, visitId]);

  // Handle visibility change (pause/resume polling)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pausePolling();
      } else {
        resumePolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pausePolling, resumePolling]);

  // Restart polling when state is reset to idle
  useEffect(() => {
    if (!isParamsLoaded || !visitId) return;
    if (state.status === 'idle' && isValidUUID(visitId)) {
      setState((prev) => ({ ...prev, status: 'polling' }));
      startPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, isParamsLoaded, visitId]);

  // =================================================================
  // Render Helpers
  // =================================================================

  const renderPollingState = () => (
    <div
      className="flex flex-col items-center justify-center space-y-6 py-8"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Loading Spinner */}
      <div className="relative">
        <Loader2
          className="h-16 w-16 text-blue-600 animate-spin"
          data-testid="loading-spinner"
          aria-label="Loading status"
        />
      </div>

      {/* Status Message */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Your request is being reviewed
        </h1>
        <p className="text-gray-600 text-base">
          Security staff will review your request shortly.
        </p>
        <p className="text-gray-600 text-base">
          You&apos;ll receive a notification once it&apos;s approved.
        </p>
      </div>

      {/* Last Update Time */}
      {state.lastPollTime && (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span>Last checked: {formatLastUpdateTime(state.lastPollTime)}</span>
        </div>
      )}

      {/* Contact Security Button */}
      <div className="w-full pt-4">
        <button
          type="button"
          onClick={handleContactSecurity}
          aria-label="Contact security for help"
          className="w-full text-blue-600 hover:text-blue-800 hover:underline min-h-[44px] py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
        >
          Need help? Contact Security
        </button>
      </div>
    </div>
  );

  const renderApprovedState = () => (
    <div
      className="flex flex-col items-center justify-center space-y-6 py-8"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      {/* Success Icon */}
      <div className="success-icon-container">
        <CheckCircle2
          className="h-20 w-20 md:h-24 md:w-24 text-emerald-500"
          data-testid="success-icon"
          aria-label="Visit approved"
        />
      </div>

      {/* Success Message */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold text-emerald-600">
          Visit Approved!
        </h1>
        <p className="text-gray-600 text-base">
          Your visit request has been approved.
        </p>
        <p className="text-gray-600 text-base">
          Redirecting to your gate pass...
        </p>
      </div>

      {/* Countdown Timer */}
      {countdown > 0 && (
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Redirecting in {Math.ceil(countdown / 1000)}s
          </p>
        </div>
      )}

      {/* Manual Navigation */}
      <div className="w-full space-y-3">
        <Button
          type="button"
          onClick={() => router.push(`/visitor-registration/gate-pass/${visitId}`)}
          aria-label="View gate pass now"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px] px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          View Gate Pass
        </Button>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .success-icon-container {
          animation: fadeInScale 500ms ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .success-icon-container {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );

  const renderRejectedState = () => (
    <div
      className="flex flex-col items-center justify-center space-y-6 py-8"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      {/* Rejection Icon */}
      <div>
        <XCircle
          className="h-20 w-20 md:h-24 md:w-24 text-red-500"
          data-testid="rejection-icon"
          aria-label="Visit rejected"
        />
      </div>

      {/* Rejection Message */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold text-red-600">
          Visit Request Rejected
        </h1>
        {state.data?.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
            <p className="text-sm font-medium text-red-900 mb-1">Reason:</p>
            <p className="text-sm text-red-800">{state.data.rejectionReason}</p>
          </div>
        )}
        <p className="text-gray-600 text-base pt-2">
          Please contact security for more information.
        </p>
      </div>

      {/* Contact Security Button */}
      <div className="w-full space-y-3">
        <Button
          type="button"
          onClick={handleContactSecurity}
          aria-label="Contact security"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white min-h-[48px] px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Contact Security
        </Button>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div
      className="flex flex-col items-center justify-center space-y-6 py-8"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      {/* Error Icon */}
      <div>
        <AlertCircle
          className="h-20 w-20 md:h-24 md:w-24 text-orange-500"
          data-testid="error-icon"
          aria-label="Error"
        />
      </div>

      {/* Error Message */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Unable to Check Status
        </h1>
        {state.error && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md">
            <p className="text-sm text-orange-800">{state.error}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-3">
        {state.isRetryable && (
          <Button
            type="button"
            onClick={handleRetry}
            aria-label="Retry checking status"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white min-h-[48px] px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </Button>
        )}
        <button
          type="button"
          onClick={handleContactSecurity}
          aria-label="Contact security for help"
          className="w-full text-blue-600 hover:text-blue-800 hover:underline min-h-[44px] py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
        >
          Contact Security
        </button>
      </div>
    </div>
  );

  // =================================================================
  // Main Render
  // =================================================================

  // Show loading while params load
  if (!isParamsLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div
        className={cn(
          'w-full max-w-[480px] mx-auto rounded-lg shadow-sm p-6 space-y-4',
          state.status === 'polling' && 'bg-blue-50 border border-blue-100',
          state.status === 'approved' && 'bg-emerald-50 border border-emerald-100',
          state.status === 'rejected' && 'bg-red-50 border border-red-100',
          state.status === 'error' && 'bg-white border border-gray-200'
        )}
        data-testid="status-container"
      >
        {/* Visitor Info Header (if available) */}
        {state.data && (
          <div className="text-center pb-2 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              Visit for {state.data.visitor.fullName}
            </p>
            {state.data.branch && (
              <p className="text-xs text-gray-500">{state.data.branch.name}</p>
            )}
          </div>
        )}

        {/* State-Specific Content */}
        {state.status === 'polling' && renderPollingState()}
        {state.status === 'approved' && renderApprovedState()}
        {state.status === 'rejected' && renderRejectedState()}
        {state.status === 'error' && renderErrorState()}
      </div>
    </div>
  );
}
