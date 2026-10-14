import * as React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveListProps {
  /** Card list shown below `lg`. */
  mobile: React.ReactNode;
  /** Table (or any wide layout) shown from `lg` up. */
  desktop: React.ReactNode;
  className?: string;
}

/** Same data, two layouts: cards on phones, the existing table on desktop. */
export function ResponsiveList({ mobile, desktop, className }: ResponsiveListProps): React.ReactElement {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="space-y-2 lg:hidden">{mobile}</div>
      <div className="hidden lg:block">{desktop}</div>
    </div>
  );
}
