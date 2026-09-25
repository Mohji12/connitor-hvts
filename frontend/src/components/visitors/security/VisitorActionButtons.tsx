'use client';

import * as React from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VisitStatus } from '@/types/visitor';
import { cn } from '@/lib/utils';
import { approveVisit } from '@/services/visit.service';
import { toast } from 'sonner';

export interface ActionButton {
  label: string;
  variant: 'default' | 'destructive' | 'outline';
  action: 'approve' | 'reject' | 'verifyOtp' | 'checkOut';
  icon?: React.ReactNode;
}

export interface VisitorActionButtonsProps {
  visitId: string;
  visitorName: string;
  currentStatus: VisitStatus;
  onActionComplete: (visitId: string, newStatus: VisitStatus) => void;
  onReject?: (visitId: string) => void;
  onVerifyOtp?: (visitId: string) => void;
  onCheckOut?: (visitId: string) => void;
  disabled?: boolean;
  compact?: boolean;
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
        { 
          label: 'Approve', 
          variant: 'default', 
          action: 'approve',
          icon: <Check className="h-4 w-4" />
        },
        { 
          label: 'Reject', 
          variant: 'destructive', 
          action: 'reject',
          icon: <X className="h-4 w-4" />
        },
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
 * Renders status-aware action buttons for visitor cards with API integration.
 * - Approve: Calls visit service directly, shows success/error toasts
 * - Reject: Opens RejectVisitDialog via callback
 * - Shows appropriate actions based on visitor status with loading states
 */
export function VisitorActionButtons({
  visitId,
  visitorName,
  currentStatus,
  onActionComplete,
  onReject,
  onVerifyOtp,
  onCheckOut,
  disabled = false,
  compact = false,
  className,
}: VisitorActionButtonsProps): React.ReactElement | null {
  const [isApproving, setIsApproving] = React.useState(false);

  const actions = getActionsForStatus(currentStatus);

  if (actions.length === 0) {
    return null;
  }

  const handleApprove = async () => {
    setIsApproving(true);
    
    try {
      await approveVisit(visitId);
      
      // Success
      toast.success('Visit approved. Gate Pass sent.');
      onActionComplete(visitId, VisitStatus.APPROVED);
      
      // Reset state to 'idle' after 1 second per spec
      setTimeout(() => setIsApproving(false), 1000);
    } catch (error) {
      // Error
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve visit';
      toast.error(`Failed to approve. ${errorMessage}`);
      
      // Reset state to 'idle' after 3 seconds per spec
      setTimeout(() => setIsApproving(false), 3000);
    }
  };

  const handleReject = () => {
    if (onReject) {
      onReject(visitId);
    }
  };

  const handleVerifyOtp = () => {
    if (onVerifyOtp) {
      onVerifyOtp(visitId);
    }
  };

  const handleCheckOut = () => {
    if (onCheckOut) {
      onCheckOut(visitId);
    }
  };

  const handleAction = (action: ActionButton['action']) => {
    switch (action) {
      case 'approve':
        handleApprove();
        break;
      case 'reject':
        handleReject();
        break;
      case 'verifyOtp':
        handleVerifyOtp();
        break;
      case 'checkOut':
        handleCheckOut();
        break;
    }
  };

  const isProcessing = isApproving || disabled;

  return (
    <div
      role="group"
      aria-label={`Actions for ${visitorName}`}
      className={cn('flex items-center gap-2', className)}
      data-testid="visitor-action-buttons"
    >
      {actions.map((action) => {
        const isLoading = action.action === 'approve' && isApproving;
        
        return (
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
            aria-busy={isLoading ? 'true' : undefined}
            data-testid={`action-button-${action.action}`}
            className={cn('min-w-[80px]', compact && 'min-w-fit')}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              !compact && action.icon
            )}
            {!compact && <span className={cn(action.icon && 'ml-1')}>{action.label}</span>}
            {compact && action.icon}
          </Button>
        );
      })}
    </div>
  );
}
