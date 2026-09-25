import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useLogsPolling,
  PollingErrorCode,
  type VisitorFilterState,
  type VisitorListResponse,
} from './use-logs-polling';

describe('useLogsPolling', () => {
  let mockFetchVisitors: jest.Mock<Promise<VisitorListResponse>, [VisitorFilterState]>;

  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
    mockFetchVisitors = jest.fn().mockResolvedValue({
      success: true,
      data: {
        visitors: [],
        totalCount: 0,
      },
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, { enabled: false })
      );

      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.lastRefreshTime).toBe(null);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.isPollingActive).toBe(false);
      expect(result.current.state.pollCount).toBe(0);
    });

    it('should auto-start polling when enabled is true', async () => {
      const { result } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, { enabled: true })
      );

      // Polling should be active immediately
      expect(result.current.state.isPollingActive).toBe(true);

      // Wait for the async performPoll to complete
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Wait for promises to resolve
      await waitFor(() => {
        expect(mockFetchVisitors).toHaveBeenCalledTimes(1);
      });

      expect(mockFetchVisitors).toHaveBeenCalledWith({ status: 'PENDING' });
    });

    it('should not auto-start polling when enabled is false', async () => {
      renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, { enabled: false })
      );

      // Wait a bit to ensure no fetch happens
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(mockFetchVisitors).not.toHaveBeenCalled();
    });
  });

  describe('Polling Behavior', () => {
    it('should poll at specified interval', async () => {
      renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, {
          enabled: true,
          intervalMs: 100,
        })
      );

      // Wait for initial fetch
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(mockFetchVisitors).toHaveBeenCalledTimes(1);
      });

      // Wait for next poll
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockFetchVisitors).toHaveBeenCalledTimes(2);
      });

      // Wait for another poll
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockFetchVisitors).toHaveBeenCalledTimes(3);
      });
    });

    it('should update lastRefreshTime on successful poll', async () => {
      const { result } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, {
          enabled: true,
          intervalMs: 100,
        })
      );

      // Initial lastRefreshTime should be null
      expect(result.current.state.lastRefreshTime).toBe(null);

      // Wait for initial fetch
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.state.lastRefreshTime).not.toBe(null);
      });

      const firstTime = result.current.state.lastRefreshTime;

      // Wait for next poll
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // lastRefreshTime should be updated
      await waitFor(() => {
        expect(result.current.state.lastRefreshTime!.getTime()).toBeGreaterThan(firstTime!.getTime());
      });
    });

    it('should increment pollCount on successful poll', async () => {
      const { result } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, {
          enabled: true,
          intervalMs: 100,
        })
      );

      // Initial pollCount should be 0
      expect(result.current.state.pollCount).toBe(0);

      // Wait for initial fetch
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.state.pollCount).toBe(1);
      });

      // Wait for next poll
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.state.pollCount).toBe(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetchVisitors.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, { enabled: true })
      );

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.state.error).not.toBe(null);
      });

      expect(result.current.state.error?.code).toBe(PollingErrorCode.NETWORK_ERROR);
    });

    it('should handle timeout errors', async () => {
      mockFetchVisitors.mockRejectedValueOnce(new Error('Request timeout'));

      const { result } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, { enabled: true })
      );

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.state.error).not.toBe(null);
      });

      expect(result.current.state.error?.code).toBe(PollingErrorCode.TIMEOUT);
    });

    it('should handle unauthorized errors', async () => {
      mockFetchVisitors.mockRejectedValueOnce(new Error('401 Unauthorized'));

      const { result } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, { enabled: true })
      );

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.state.error).not.toBe(null);
      });

      expect(result.current.state.error?.code).toBe(PollingErrorCode.UNAUTHORIZED);
    });

    it('should stop polling after max retries', async () => {
      mockFetchVisitors.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, {
          enabled: true,
          maxRetries: 3,
          intervalMs: 100,
        })
      );

      // Wait for initial fetch (1st failure)
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.state.error).not.toBe(null);
      });

      expect(result.current.state.isPollingActive).toBe(true);

      // Wait for 2nd poll (2nd failure)
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockFetchVisitors).toHaveBeenCalledTimes(2);
      });

      expect(result.current.state.isPollingActive).toBe(true);

      // Wait for 3rd poll (3rd failure - should stop)
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockFetchVisitors).toHaveBeenCalledTimes(3);
      });

      expect(result.current.state.isPollingActive).toBe(false);

      // Wait further - should not poll again
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(mockFetchVisitors).toHaveBeenCalledTimes(3);
    });

    it('should continue polling after error if retries not exceeded', async () => {
      mockFetchVisitors
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          success: true,
          data: { visitors: [], totalCount: 0 },
        });

      const { result } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, { enabled: true, intervalMs: 100 })
      );

      // Wait for initial fetch (failure)
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.state.error).not.toBe(null);
      });

      // Wait for next poll (success)
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.state.error).toBe(null);
      });

      expect(result.current.state.isPollingActive).toBe(true);
    });
  });

  describe('Manual Refresh', () => {
    it('should trigger immediate fetch on refreshNow', async () => {
      const { result } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, { enabled: false })
      );

      expect(mockFetchVisitors).not.toHaveBeenCalled();

      await act(async () => {
        await result.current.refreshNow();
      });

      expect(mockFetchVisitors).toHaveBeenCalledTimes(1);
    });

    it('should reset consecutive failures on refreshNow', async () => {
      mockFetchVisitors
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          success: true,
          data: { visitors: [], totalCount: 0 },
        });

      const { result } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, {
          enabled: true,
          maxRetries: 3,
          intervalMs: 100,
        })
      );

      // Wait for initial fetch (1st failure)
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.state.error).not.toBe(null);
      });

      // Wait for 2nd poll (2nd failure)
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockFetchVisitors).toHaveBeenCalledTimes(2);
      });

      // Manual refresh should reset counter and succeed
      await act(async () => {
        await result.current.refreshNow();
      });

      expect(mockFetchVisitors).toHaveBeenCalledTimes(3);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.isPollingActive).toBe(true);
    });
  });

  describe('Start/Stop Polling', () => {
    it('should start polling on startPolling', async () => {
      const { result } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, { enabled: false })
      );

      expect(result.current.state.isPollingActive).toBe(false);

      await act(async () => {
        result.current.startPolling();
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(mockFetchVisitors).toHaveBeenCalled();
      });

      expect(result.current.state.isPollingActive).toBe(true);
    });

    it('should stop polling on stopPolling', async () => {
      const { result } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, { enabled: true, intervalMs: 100 })
      );

      // Wait for initial fetch
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.state.isPollingActive).toBe(true);
      });

      act(() => {
        result.current.stopPolling();
      });

      expect(result.current.state.isPollingActive).toBe(false);

      const callCount = mockFetchVisitors.mock.calls.length;

      // Wait - should not poll after stopping
      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      expect(mockFetchVisitors).toHaveBeenCalledTimes(callCount);
    });

    it('should toggle polling on togglePolling', async () => {
      const { result } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, { enabled: true, intervalMs: 100 })
      );

      // Wait for initial fetch
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.state.isPollingActive).toBe(true);
      });

      // Toggle off
      act(() => {
        result.current.togglePolling();
      });

      expect(result.current.state.isPollingActive).toBe(false);

      // Toggle on
      await act(async () => {
        result.current.togglePolling();
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.state.isPollingActive).toBe(true);
      });
    });
  });

  describe('Reset Polling', () => {
    it('should reset poll metrics on resetPolling', async () => {
      const { result } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, { enabled: true })
      );

      // Wait for initial fetch
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.state.pollCount).toBe(1);
      });

      expect(result.current.state.lastRefreshTime).not.toBe(null);

      // Reset polling
      act(() => {
        result.current.resetPolling();
      });

      expect(result.current.state.pollCount).toBe(0);
      expect(result.current.state.lastRefreshTime).toBe(null);
      expect(result.current.state.error).toBe(null);
    });
  });

  describe('Filter Preservation', () => {
    it('should pass current filters to fetchVisitors', async () => {
      const filters: VisitorFilterState = {
        status: 'PENDING',
        searchQuery: 'John',
      };

      renderHook(() => useLogsPolling(mockFetchVisitors, filters, { enabled: true }));

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(mockFetchVisitors).toHaveBeenCalledWith(filters);
      });
    });
  });

  describe('Cleanup', () => {
    it('should clear interval on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useLogsPolling(mockFetchVisitors, { status: 'PENDING' }, { enabled: true, intervalMs: 100 })
      );

      // Wait for initial fetch
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(result.current.state.isPollingActive).toBe(true);
      });

      const callCount = mockFetchVisitors.mock.calls.length;

      // Unmount component
      unmount();

      // Wait - should not poll after unmount
      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      expect(mockFetchVisitors).toHaveBeenCalledTimes(callCount);
    });
  });
});
