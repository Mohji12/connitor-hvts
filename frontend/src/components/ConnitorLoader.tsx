'use client';

import { cn } from '@/lib/utils';
import { ConninterWordmark } from '@/components/brand/ConninterWordmark';

type ConnitorLoaderProps = {
  /** Short status line under the brand name */
  message?: string;
  /** inline = compact in-flow; section = centered block; overlay = covers parent; fullscreen = covers viewport */
  variant?: 'inline' | 'section' | 'overlay' | 'fullscreen';
  className?: string;
};

/**
 * Branded loading indicator using the Conninter wordmark.
 * Export name kept as ConnitorLoader for existing imports.
 */
export function ConnitorLoader({
  message = 'Loading…',
  variant = 'section',
  className,
}: ConnitorLoaderProps) {
  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        variant === 'inline' && 'flex-row gap-2.5 text-left',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={cn(
          'relative flex items-center justify-center',
          variant === 'inline' ? 'h-8 w-8' : 'h-14 w-14',
        )}
      >
        <span
          className={cn(
            'absolute inset-0 rounded-full bg-[#4A90E2]/30 animate-ping',
            variant === 'inline' && 'opacity-70',
          )}
          aria-hidden
        />
        <div
          className={cn(
            'relative z-10 flex items-center justify-center rounded-full bg-[#001B71] text-white font-extrabold shadow-sm',
            variant === 'inline' ? 'h-8 w-8 text-xs' : 'h-12 w-12 text-sm',
          )}
        >
          C
        </div>
      </div>
      <div className={cn(variant === 'inline' && 'min-w-0')}>
        {variant === 'inline' ? (
          <p className="text-sm font-semibold tracking-tight text-primary">Conninter</p>
        ) : (
          <ConninterWordmark href={null} size="sm" />
        )}
        {message ? (
          <p
            className={cn(
              'text-muted-foreground',
              variant === 'inline' ? 'text-xs' : 'text-sm mt-0.5',
            )}
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#F7F9FC]/90 backdrop-blur-[2px]">
        {content}
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-[2px]">
        {content}
      </div>
    );
  }

  return content;
}
