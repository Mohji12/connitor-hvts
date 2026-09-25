'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusBadgeVariant = 'pending' | 'approved' | 'rejected' | 'checked-in' | 'checked-out';

const statusVariantMap: Record<StatusBadgeVariant, string> = {
  pending: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
  rejected: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
  'checked-in': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
  'checked-out': 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/20 dark:text-gray-300 dark:border-gray-700',
};

const statusLabels: Record<StatusBadgeVariant, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  'checked-in': 'Checked In',
  'checked-out': 'Checked Out',
};

export interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  children?: React.ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps): React.ReactNode {
  const variantClasses = statusVariantMap[variant];
  const defaultLabel = statusLabels[variant];

  return (
    <Badge className={cn(variantClasses, className)} variant="outline">
      {children || defaultLabel}
    </Badge>
  );
}


