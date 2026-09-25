'use client';

import * as React from 'react';
import { RefreshCw, Pause, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface LogsRefreshControlProps {
  isLoading: boolean;
  lastRefreshTime: Date | null;
  onManualRefresh: () => Promise<void>;
  onTogglePolling: () => void;
  isPollingActive: boolean;
  className?: string;
}

/**
 * Format last refresh time to human-readable string
 */
function formatLastRefreshTime(date: Date | null): string | null {
  if (!date) return null;

  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'just now';
  }
}

/**
 * LogsRefreshControl Component
 *
 * Displays live/paused indicator, last refresh time, manual refresh button,
 * and polling toggle button.
 */
export function LogsRefreshControl({
  isLoading,
  lastRefreshTime,
  onManualRefresh,
  onTogglePolling,
  isPollingActive,
  className,
}: LogsRefreshControlProps): React.ReactElement {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onManualRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const formattedTime = formatLastRefreshTime(lastRefreshTime);

  return (
    <div
      className={cn('flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg border', className)}
      data-testid="logs-refresh-control"
    >
      {/* Left Section: Status Indicator + Last Refresh Time */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Live/Paused Indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPollingActive ? (
            <>
              <span
                className="relative flex h-2 w-2"
                aria-hidden="true"
                data-testid="live-indicator"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Live
              </span>
            </>
          ) : (
            <>
              <span
                className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500"
                aria-hidden="true"
                data-testid="paused-indicator"
              ></span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Paused
              </span>
            </>
          )}
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div
            className="flex items-center gap-2 flex-shrink-0"
            aria-hidden="true"
          >
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Updating...</span>
          </div>
        )}

        {/* Last Refresh Time */}
        {!isLoading && formattedTime && (
          <span className="text-xs text-muted-foreground flex-shrink-0">
            Updated {formattedTime}
          </span>
        )}
      </div>

      {/* Right Section: Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Manual Refresh Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isLoading || isRefreshing}
          aria-label="Refresh logs"
          className="h-8 px-2"
          data-testid="manual-refresh-button"
        >
          <RefreshCw
            className={cn('h-4 w-4', (isLoading || isRefreshing) && 'animate-spin')}
          />
        </Button>

        {/* Toggle Polling Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onTogglePolling}
          aria-label={isPollingActive ? 'Pause auto-refresh' : 'Start auto-refresh'}
          className="h-8 px-2"
          data-testid="toggle-polling-button"
        >
          {isPollingActive ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
