'use client';

import * as React from 'react';
import { Users, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VisitCategory } from '@/lib/constants/visit-constants';

export interface VisitTypeBadgeProps {
  visitType: VisitCategory.MEETING | VisitCategory.DELIVERY;
  className?: string;
}

export function VisitTypeBadge({
  visitType,
  className,
}: VisitTypeBadgeProps): React.ReactNode {
  const isMeeting = visitType === VisitCategory.MEETING;
  const Icon = isMeeting ? Users : Package;
  const label = isMeeting ? 'Meeting' : 'Delivery';
  const variantStyles = isMeeting
    ? 'border-emerald-600 text-emerald-600'
    : 'border-amber-600 text-amber-600';

  return (
    <Badge
      variant="outline"
      className={cn(variantStyles, className)}
      aria-label={`Visit type: ${label.toLowerCase()}`}
    >
      <Icon aria-hidden="true" className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}


