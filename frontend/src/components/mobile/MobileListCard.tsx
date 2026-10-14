import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MobileListMeta {
  label: string;
  value: React.ReactNode;
}

interface MobileListCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: React.ReactNode;
  leading?: React.ReactNode;
  meta?: MobileListMeta[];
  actions?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Phone replacement for a table row or a full-width option button. */
export function MobileListCard({
  title,
  subtitle,
  status,
  leading,
  meta,
  actions,
  href,
  onClick,
  selected,
  disabled,
  className,
}: MobileListCardProps): React.ReactElement {
  const interactive = Boolean(href || onClick);
  const body = (
    <>
      <div className="flex min-w-0 items-start gap-3">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 break-words text-sm font-semibold leading-snug text-foreground">{title}</div>
            {status}
          </div>
          {subtitle ? <div className="m-meta mt-0.5 break-words">{subtitle}</div> : null}
          {meta && meta.length > 0 ? (
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {meta.map((m) => (
                <div key={m.label} className="min-w-0">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{m.label}</dt>
                  <dd className="break-words text-xs text-foreground">{m.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        {interactive && !actions ? (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : null}
      </div>
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </>
  );

  const classes = cn(
    'block w-full rounded-xl border bg-white p-3.5 text-left shadow-sm transition-colors',
    selected ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200',
    interactive && !disabled && 'active:bg-[#F7F9FC]',
    disabled && 'pointer-events-none opacity-60',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={classes}>
        {body}
      </button>
    );
  }
  return <div className={classes}>{body}</div>;
}
