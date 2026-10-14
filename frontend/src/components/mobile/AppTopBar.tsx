'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppTopBarProps {
  title: string;
  subtitle?: string;
  /** `true` goes back in history; a string links to that path. */
  back?: boolean | string;
  actions?: React.ReactNode;
  /** Optional content under the title row, e.g. a progress bar. */
  bottom?: React.ReactNode;
  className?: string;
}

export function AppTopBar({
  title,
  subtitle,
  back,
  actions,
  bottom,
  className,
}: AppTopBarProps): React.ReactElement {
  const router = useRouter();
  const backButtonClass =
    '-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary active:bg-primary/10';

  return (
    <header
      className={cn(
        'pt-safe sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md',
        className,
      )}
    >
      <div className="flex min-h-14 items-center gap-1 px-3">
        {typeof back === 'string' ? (
          <Link href={back} aria-label="Back" className={backButtonClass}>
            <ChevronLeft className="h-6 w-6" />
          </Link>
        ) : back ? (
          <button type="button" aria-label="Back" onClick={() => router.back()} className={backButtonClass}>
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : null}
        <div className={cn('min-w-0 flex-1', !back && 'pl-1')}>
          <h1 className="m-title truncate">{title}</h1>
          {subtitle ? <p className="m-meta truncate">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-0.5">{actions}</div> : null}
      </div>
      {bottom}
    </header>
  );
}
