'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { VisitorProfile } from '@/types/visitor';

/**
 * Polling Error Codes
 */
export enum PollingErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
}

/**
 * Polling Error Type
 */
export interface PollingError {
  code: PollingErrorCode;
  message: string;
  timestamp: Date;
}

/**
 * Logs Polling State
 */
export interface LogsPollingState {
  isLoading: boolean;
  lastRefreshTime: Date | null;
  error: PollingError | null;
  isPollingActive: boolean;
  pollCount: number;
}

/**
 * Polling Configuration
 */
export interface PollingConfig {
  intervalMs: number;
  enabled: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
}

/**
 * Default Polling Configuration
 */
const DEFAULT_POLLING_CONFIG: PollingConfig = {
  intervalMs: 5000,
  enabled: true,
  retryOnFailure: true,
  maxRetries: 3,
};

/**
 * Visitor Filter State (Internal filtering for polling)
 * This is a generic filter state that can be passed to the fetch function
 */
export interface VisitorFilterState {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
}

/**
 * Visitor List Response Structure
 */
export interface VisitorListResponse {
  success: boolean;
  data: {
    visitors: VisitorProfile[];
    totalCount: number;
  };
}

/**
 * Map JavaScript error to PollingError type
 */
function mapErrorToPollingError(error: unknown): PollingError {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Check for network-related errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return {
        code: PollingErrorCode.NETWORK_ERROR,
        message: 'Network error. Please check your connection.',
        timestamp: new Date(),
      };
    }

    // Check for timeout errors
    if (errorMessage.includes('timeout')) {
      return {
        code: PollingErrorCode.TIMEOUT,
        message: 'Request timed out. Please try again.',
        timestamp: new Date(),
      };
    }

    // Check for authorization errors
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return {
        code: PollingErrorCode.UNAUTHORIZED,
        message: 'Session expired. Please log in again.',
        timestamp: new Date(),
      };
    }

    // Default to server error for other errors
    return {
      code: PollingErrorCode.SERVER_ERROR,
      message: error.message || 'An error occurred while fetching data.',
      timestamp: new Date(),
    };
  }

  // Fallback for non-Error objects
  return {
    code: PollingErrorCode.SERVER_ERROR,
    message: 'An unexpected error occurred.',
    timestamp: new Date(),
  };
}

/**
 * Custom Hook: useLogsPolling
 *
 * Provides auto-polling functionality for the Logs tab.
 *
 * @param fetchVisitors - Callback function to fetch visitor data
 * @param currentFilters - Current filter state to pass to fetchVisitors
 * @param config - Optional configuration to override default polling behavior
 * @returns Object containing state and control functions
 */
export function useLogsPolling(
  fetchVisitors: (filters: VisitorFilterState) => Promise<VisitorListResponse>,
  currentFilters: VisitorFilterState,
  config?: Partial<PollingConfig>
) {
  // Merge with default config
  const pollingConfig: PollingConfig = { ...DEFAULT_POLLING_CONFIG, ...config };

  // React state (triggers re-renders on changes)
  const [state, setState] = useState<LogsPollingState>({
    isLoading: false,
    lastRefreshTime: null,
    error: null,
    isPollingActive: pollingConfig.enabled,
    pollCount: 0,
  });

  // Refs for mutable values that don't trigger re-renders
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveFailuresRef = useRef<number>(0);
  const isUnmountedRef = useRef<boolean>(false);
  const isPollingRef = useRef<boolean>(false);

  /**
   * Stop automatic polling
   */
  const stopPolling = useCallback((): void => {
    // Update state to inactive
    setState((prev) => ({ ...prev, isPollingActive: false }));

    // Clear interval
    if (timerIdRef.current !== null) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
  }, []);

  /**
   * Perform a single poll fetch
   */
  const performPoll = useCallback(async (): Promise<void> => {
    // Guard against calling after unmount
    if (isUnmountedRef.current) {
      return;
    }

    // Guard against concurrent polls using ref for synchronous check
    if (isPollingRef.current) {
      return;
    }

    // Mark as polling and update loading state
    isPollingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Fetch visitors with current filters preserved
      await fetchVisitors(currentFilters);

      // Update success state (only if not unmounted)
      if (!isUnmountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          lastRefreshTime: new Date(),
          error: null,
          pollCount: prev.pollCount + 1,
        }));
        consecutiveFailuresRef.current = 0;
      }
    } catch (error) {
      // Map error to PollingError type
      const pollingError = mapErrorToPollingError(error);

      // Update error state (only if not unmounted)
      if (!isUnmountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: pollingError,
        }));
        consecutiveFailuresRef.current += 1;

        // Stop polling if max retries exceeded
        if (
          consecutiveFailuresRef.current >= pollingConfig.maxRetries &&
          pollingConfig.retryOnFailure
        ) {
          stopPolling();
        }
      }
    } finally {
      // Always clear the polling flag
      isPollingRef.current = false;
    }
  }, [fetchVisitors, currentFilters, pollingConfig.maxRetries, pollingConfig.retryOnFailure, stopPolling]);

  /**
   * Start automatic polling
   */
  const startPolling = useCallback((): void => {
    // Already running
    if (timerIdRef.current !== null) {
      return;
    }

    // Update state to active
    setState((prev) => ({ ...prev, isPollingActive: true }));

    // Immediate fetch on start
    performPoll();

    // Schedule recurring polls
    timerIdRef.current = setInterval(() => {
      performPoll();
    }, pollingConfig.intervalMs);
  }, [performPoll, pollingConfig.intervalMs]);

  /**
   * Manual refresh - triggers immediate single poll fetch
   * Resets consecutive failures counter
   */
  const refreshNow = useCallback(async (): Promise<void> => {
    // Reset failure counter on manual trigger
    consecutiveFailuresRef.current = 0;
    await performPoll();
  }, [performPoll]);

  /**
   * Reset polling state - clears pollCount, error, and lastRefreshTime
   * Useful when filters change to provide fresh "session" metrics
   */
  const resetPolling = useCallback((): void => {
    setState((prev) => ({
      ...prev,
      lastRefreshTime: null,
      error: null,
      pollCount: 0,
    }));
    consecutiveFailuresRef.current = 0;
  }, []);

  /**
   * Toggle polling on/off
   */
  const togglePolling = useCallback((): void => {
    if (state.isPollingActive) {
      stopPolling();
    } else {
      startPolling();
    }
  }, [state.isPollingActive, startPolling, stopPolling]);

  // Auto-start polling on mount if enabled
  useEffect(() => {
    // Reset unmounted flag on mount (handles React StrictMode double-run)
    isUnmountedRef.current = false;

    if (pollingConfig.enabled) {
      startPolling();
    }

    // Cleanup on unmount (prevents memory leaks)
    return () => {
      isUnmountedRef.current = true;
      if (timerIdRef.current !== null) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount/unmount

  return {
    state,
    refreshNow,
    startPolling,
    stopPolling,
    resetPolling,
    togglePolling,
  };
}
