'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LiveIndicatorProps {
  isLive: boolean;
  label?: string;
  className?: string;
}

export function LiveIndicator({
  isLive,
  label = 'Live',
  className,
}: LiveIndicatorProps): React.ReactElement {
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      aria-live="polite"
      role="status"
      aria-label={isLive ? 'System is live' : 'System is offline'}
      data-testid="live-indicator"
    >
      <span
        className={cn(
          'relative flex h-2.5 w-2.5',
          isLive ? 'text-green-500' : 'text-gray-400'
        )}
        aria-hidden="true"
      >
        {isLive && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
            data-testid="live-ping"
          />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full h-2.5 w-2.5',
            isLive ? 'bg-green-500' : 'bg-gray-400'
          )}
          data-testid="live-dot"
        />
      </span>
      <span
        className={cn(
          'text-xs font-medium',
          isLive ? 'text-gray-700' : 'text-gray-500'
        )}
      >
        {isLive ? label : 'Offline'}
      </span>
    </div>
  );
}
