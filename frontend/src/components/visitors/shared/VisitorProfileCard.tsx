'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { StatusBadge, StatusBadgeVariant } from './StatusBadge';
import { VisitTypeBadge } from './VisitTypeBadge';
import { VisitCategory } from '@/lib/constants/visit-constants';

export interface VisitorData {
  id: string;
  visitorName: string;
  visitorPhone: string;
  visitorEmail?: string | null;
  visitorPhoto?: string | null;
  visitType?: VisitCategory.MEETING | VisitCategory.DELIVERY;
  status: 'PENDING' | 'REQUEST_SENT' | 'APPROVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'REJECTED';
  personToMeet?: string;
  purpose?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
}

export interface VisitorProfileCardProps {
  visitor: VisitorData;
  compact?: boolean;
  actions?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

function getStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'PENDING':
    case 'REQUEST_SENT':
      return 'pending';
    case 'APPROVED':
      return 'approved';
    case 'REJECTED':
      return 'rejected';
    case 'CHECKED_IN':
      return 'checked-in';
    case 'CHECKED_OUT':
      return 'checked-out';
    default:
      return 'pending';
  }
}

export function VisitorProfileCard({
  visitor,
  compact = false,
  actions,
  className,
  onClick,
}: VisitorProfileCardProps): React.ReactNode {
  const [imgError, setImgError] = React.useState(false);
  const [imgLoading, setImgLoading] = React.useState(true);

  const initials = visitor.visitorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const handleImageError = () => {
    setImgError(true);
    setImgLoading(false);
  };

  const handleImageLoad = () => {
    setImgLoading(false);
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <Avatar className="h-10 w-10 flex-shrink-0">
          {visitor.visitorPhoto && !imgError ? (
            <>
              {imgLoading && (
                <AvatarFallback className="bg-primary/10 text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </AvatarFallback>
              )}
              <AvatarImage
                src={visitor.visitorPhoto}
                alt={visitor.visitorName}
                className="object-cover"
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
            </>
          ) : null}
          <AvatarFallback className="bg-primary/10 text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold text-sm truncate">{visitor.visitorName}</p>
            {visitor.visitType && <VisitTypeBadge visitType={visitor.visitType} />}
          </div>
          <p className="text-xs text-muted-foreground truncate">{visitor.visitorPhone}</p>
          {visitor.personToMeet && (
            <p className="text-xs text-muted-foreground truncate">
              Meeting {visitor.personToMeet}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <StatusBadge variant={getStatusVariant(visitor.status)} />
          {actions && <div className="ml-2">{actions}</div>}
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'p-4 hover:shadow-md transition-shadow',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex gap-4">
        <Avatar className="h-16 w-16 flex-shrink-0">
          {visitor.visitorPhoto && !imgError ? (
            <>
              {imgLoading && (
                <AvatarFallback className="bg-primary/10 text-sm">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </AvatarFallback>
              )}
              <AvatarImage
                src={visitor.visitorPhoto}
                alt={visitor.visitorName}
                className="object-cover"
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
            </>
          ) : null}
          <AvatarFallback className="bg-primary/10 text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-base">{visitor.visitorName}</h3>
            {visitor.visitType && <VisitTypeBadge visitType={visitor.visitType} />}
            <StatusBadge variant={getStatusVariant(visitor.status)} />
          </div>

          <p className="text-sm text-muted-foreground mb-1">{visitor.visitorPhone}</p>
          {visitor.visitorEmail && (
            <p className="text-sm text-muted-foreground mb-1 truncate">
              {visitor.visitorEmail}
            </p>
          )}

          {visitor.personToMeet && (
            <p className="text-sm mb-1">
              <span className="text-muted-foreground">Meeting:</span> {visitor.personToMeet}
            </p>
          )}

          {visitor.purpose && (
            <p className="text-sm mb-1">
              <span className="text-muted-foreground">Purpose:</span> {visitor.purpose}
            </p>
          )}
        </div>
      </div>

      {actions && <div className="mt-4 pt-4 border-t">{actions}</div>}
    </Card>
  );
}


