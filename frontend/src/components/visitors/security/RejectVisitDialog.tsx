'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface RejectVisitDialogProps {
  isOpen: boolean;
  visitorName: string;
  onClose: () => void;
  onReject: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * Validates rejection reason according to business rules
 */
function validateReason(reason: string): string | null {
  const trimmed = reason.trim();

  if (trimmed.length === 0) {
    return 'Please provide a reason for rejection';
  }

  if (trimmed.length < 5) {
    return 'Reason must be at least 5 characters';
  }

  if (trimmed.length > 500) {
    return 'Reason must be less than 500 characters';
  }

  return null;
}

/**
 * RejectVisitDialog Component
 *
 * Standalone dialog for rejecting visit requests with validation.
 * Features:
 * - Reason textarea with character count
 * - Real-time validation (5-500 chars)
 * - Loading state during submission
 * - Accessibility: Focus trap, ARIA attributes, keyboard navigation
 */
export function RejectVisitDialog({
  isOpen,
  visitorName,
  onClose,
  onReject,
  isSubmitting = false,
}: RejectVisitDialogProps): React.ReactElement {
  const [reason, setReason] = React.useState('');
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setReason('');
      setValidationError(null);
    } else {
      // Focus textarea when dialog opens
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Clear validation error when user types valid input
  React.useEffect(() => {
    if (validationError && reason.trim().length >= 5 && reason.trim().length <= 500) {
      setValidationError(null);
    }
  }, [reason, validationError]);

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
  };

  const handleSubmit = async () => {
    const error = validateReason(reason);
    if (error) {
      setValidationError(error);
      return;
    }

    try {
      await onReject(reason.trim());
    } catch {
      // Error handling is done by parent component (toast notifications)
      // Dialog remains open so user can retry
    }
  };

  const handleCancel = () => {
    onClose();
  };

  // Determine character count color
  const charCount = reason.length;
  const charCountColor = cn({
    'text-muted-foreground': charCount < 450,
    'text-yellow-600': charCount >= 450 && charCount <= 500,
    'text-destructive': charCount > 500,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-dialog-title"
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle id="reject-dialog-title">Reject Visit Request</DialogTitle>
          <DialogDescription>
            Are you sure you want to reject the visit request for{' '}
            <strong>{visitorName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="reject-reason" className="text-sm font-medium">
              Reason <span className="text-destructive">*</span>
            </label>
            <span className={cn('text-xs', charCountColor)}>
              {charCount}/500
            </span>
          </div>

          <Textarea
            ref={textareaRef}
            id="reject-reason"
            value={reason}
            onChange={handleReasonChange}
            placeholder="e.g., Visitor not on approved list..."
            rows={4}
            maxLength={500}
            disabled={isSubmitting}
            aria-label="Reason for rejection"
            aria-describedby={validationError ? 'reject-reason-error' : undefined}
            aria-invalid={validationError ? 'true' : 'false'}
            className={cn(validationError && 'border-destructive focus-visible:ring-destructive/20')}
          />

          {validationError && (
            <p
              id="reject-reason-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {validationError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
