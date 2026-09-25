'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VisitStatus } from '@/types/visitor';
import { cn } from '@/lib/utils';

export interface ActionButton {
  label: string;
  variant: 'default' | 'destructive' | 'outline';
  action: 'approve' | 'reject' | 'verifyOtp' | 'checkOut';
}

export interface VisitorActionButtonsProps {
  visitorId: string;
  visitorName: string;
  status: VisitStatus;
  isProcessing: boolean;
  onApprove: (visitorId: string) => void;
  onReject: (visitorId: string) => void;
  onVerifyOtp: (visitorId: string) => void;
  onCheckOut: (visitorId: string) => void;
  className?: string;
}

/**
 * Get action buttons configuration based on visitor status
 */
function getActionsForStatus(status: VisitStatus): ActionButton[] {
  switch (status) {
    case VisitStatus.PENDING:
    case VisitStatus.REQUEST_SENT:
      return [
        { label: 'Approve', variant: 'default', action: 'approve' },
        { label: 'Reject', variant: 'destructive', action: 'reject' },
      ];
    case VisitStatus.APPROVED:
      return [{ label: 'Verify OTP', variant: 'default', action: 'verifyOtp' }];
    case VisitStatus.CHECKED_IN:
      return [{ label: 'Check Out', variant: 'outline', action: 'checkOut' }];
    case VisitStatus.CHECKED_OUT:
    case VisitStatus.REJECTED:
    default:
      return [];
  }
}

/**
 * VisitorActionButtons Component
 *
 * Renders status-aware action buttons for visitor cards.
 * Shows appropriate actions based on visitor status with loading states.
 */
export function VisitorActionButtons({
  visitorId,
  visitorName,
  status,
  isProcessing,
  onApprove,
  onReject,
  onVerifyOtp,
  onCheckOut,
  className,
}: VisitorActionButtonsProps): React.ReactElement | null {
  const actions = getActionsForStatus(status);

  if (actions.length === 0) {
    return null;
  }

  const handleAction = (action: ActionButton['action']) => {
    switch (action) {
      case 'approve':
        onApprove(visitorId);
        break;
      case 'reject':
        onReject(visitorId);
        break;
      case 'verifyOtp':
        onVerifyOtp(visitorId);
        break;
      case 'checkOut':
        onCheckOut(visitorId);
        break;
    }
  };

  return (
    <div
      role="group"
      aria-label={`Actions for ${visitorName}`}
      className={cn('flex items-center gap-2', className)}
      data-testid="visitor-action-buttons"
    >
      {actions.map((action) => (
        <Button
          key={action.action}
          type="button"
          variant={action.variant}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleAction(action.action);
          }}
          disabled={isProcessing}
          aria-label={`${action.label} ${visitorName}`}
          data-testid={`action-button-${action.action}`}
          className="min-w-[80px]"
        >
          {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
