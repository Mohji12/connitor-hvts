'use client';

import * as React from 'react';
import {
  Loader2,
  AlertCircle,
  Clock,
  Mail,
  Building,
  Briefcase,
  Phone,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  StatusBadge,
  StatusBadgeVariant,
} from '@/components/visitors/shared/StatusBadge';
import { VisitTypeBadge } from '@/components/visitors/shared/VisitTypeBadge';
import { VisitCategory } from '@/lib/constants/visit-constants';
import { VisitStatus } from '@/types/visitor';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api';
import { GovernmentIdPreview } from '@/components/security/GovernmentIdPreview';

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface VisitorDetails {
  id: string;
  visitId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  designation?: string | null;
  photoUrl?: string | null;
  govtIdUrl?: string | null;
  govtIdType?: string | null;
  hasGovernmentId?: boolean;
  idProofVerified?: boolean;
  idProofType?: string | null;
  idProofNumber?: string | null;
  visitType: VisitCategory.MEETING | VisitCategory.DELIVERY;
  status: VisitStatus;
  purpose?: string | null;
  hostName?: string | null;           // From dropdown selection
  department?: string | null;
  staffName?: string | null;            // From manual entry
  staffPhone?: string | null;          // From manual entry
  createdAt: string;
  approvedAt?: string | null;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  checkInOtp?: string | null;
  checkInOtpExpiry?: string | null;
  gatePassGeneratedAt?: string | null;
}

export interface VisitorDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitId: string;
  onAction?: (visitId: string) => Promise<ActionResult>;
  visitorData?: VisitorDetails | null;
}

interface ModalState {
  data: VisitorDetails | null;
  loading: boolean;
  error: string | null;
  actionLoading: boolean;
  actionError: string | null;
  photoError: boolean;
}

interface ActionButtonConfig {
  label: string;
  variant: 'primary' | 'secondary' | 'danger';
  disabled: boolean;
  visible: boolean;
}

function getStatusVariant(status: VisitStatus): StatusBadgeVariant {
  switch (status) {
    case VisitStatus.PENDING:
    case VisitStatus.REQUEST_SENT:
      return 'pending';
    case VisitStatus.APPROVED:
      return 'approved';
    case VisitStatus.REJECTED:
      return 'rejected';
    case VisitStatus.CHECKED_IN:
      return 'checked-in';
    case VisitStatus.CHECKED_OUT:
      return 'checked-out';
    default:
      return 'pending';
  }
}

function getActionButtonConfig(status: VisitStatus): ActionButtonConfig {
  switch (status) {
    case VisitStatus.APPROVED:
      return {
        label: 'Check In',
        variant: 'primary',
        disabled: false,
        visible: true,
      };
    case VisitStatus.CHECKED_IN:
      return {
        label: 'Check Out',
        variant: 'danger',
        disabled: false,
        visible: true,
      };
    case VisitStatus.REQUEST_SENT:
      return {
        label: 'Pending Approval',
        variant: 'secondary',
        disabled: true,
        visible: true,
      };
    case VisitStatus.CHECKED_OUT:
    case VisitStatus.REJECTED:
    case VisitStatus.PENDING:
    default:
      return {
        label: '',
        variant: 'primary',
        disabled: true,
        visible: false,
      };
  }
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function mapVariantToButtonVariant(
  variant: ActionButtonConfig['variant'],
): 'default' | 'secondary' | 'destructive' {
  switch (variant) {
    case 'primary':
      return 'default';
    case 'danger':
      return 'destructive';
    case 'secondary':
      return 'secondary';
  }
}

async function fetchVisitorDetails(visitId: string): Promise<VisitorDetails> {
  const response = await apiClient.get<{
    success: true;
    data: VisitorDetails;
  }>(`/api/security/visits/${visitId}/details`);

  if (!response.data?.data) {
    throw new Error('No visitor details found in response');
  }

  return response.data.data;
}

export function VisitorDetailsModal({
  isOpen,
  onClose,
  visitId,
  onAction,
  visitorData,
}: VisitorDetailsModalProps): React.ReactNode {
  const [state, setState] = React.useState<ModalState>({
    data: visitorData || null,
    loading: !visitorData,
    error: null,
    actionLoading: false,
    actionError: null,
    photoError: false,
  });

  // Fetch visitor details if not provided via prop
  const fetchDetails = React.useCallback(async () => {
    if (visitorData) return; // Skip fetch if data is provided

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchVisitorDetails(visitId);
      setState((prev) => ({ ...prev, data, loading: false, error: null }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load visitor details';
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [visitId, visitorData]);

  // Fetch on mount or when modal opens
  React.useEffect(() => {
    if (isOpen && !visitorData) {
      fetchDetails();
    }
  }, [isOpen, fetchDetails, visitorData]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setState((prev) => ({
        ...prev,
        actionError: null,
        actionLoading: false,
      }));
    }
  }, [isOpen]);

  // Update data if visitorData prop changes
  React.useEffect(() => {
    if (visitorData) {
      setState((prev) => ({
        ...prev,
        data: visitorData,
        loading: false,
        error: null,
      }));
    }
  }, [visitorData]);

  const handlePhotoError = () => {
    setState((prev) => ({ ...prev, photoError: true }));
  };

  const handleAction = async () => {
    if (!onAction || !state.data) return;

    setState((prev) => ({ ...prev, actionLoading: true, actionError: null }));

    try {
      const result = await onAction(visitId);

      if (result.success) {
        onClose();
      } else {
        setState((prev) => ({
          ...prev,
          actionLoading: false,
          actionError: result.error || 'Action failed',
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action failed';
      setState((prev) => ({
        ...prev,
        actionLoading: false,
        actionError: message,
      }));
    }
  };

  const handleRetry = () => {
    fetchDetails();
  };

  const { data, loading, error, actionLoading, actionError, photoError } =
    state;

  // Get action button config
  const actionConfig = data
    ? getActionButtonConfig(data.status)
    : {
        visible: false,
        label: '',
        variant: 'primary' as const,
        disabled: true,
      };

  // Generate initials
  const initials = data
    ? `${data.firstName[0]}${data.lastName[0]}`.toUpperCase()
    : 'U';

  // Check if OTP should be displayed
  const shouldShowOtp =
    data?.status === VisitStatus.APPROVED && data.checkInOtp;

  // Get action label with loading state
  const getActionLabel = () => {
    if (actionLoading) {
      if (data?.status === VisitStatus.APPROVED) return 'Checking in...';
      if (data?.status === VisitStatus.CHECKED_IN) return 'Checking out...';
      return 'Processing...';
    }
    return actionConfig.label;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'max-w-[90vw] md:max-w-[80vw] lg:max-w-[600px]',
          'max-h-[90vh] overflow-y-auto',
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="visitor-details-title"
        aria-busy={loading}
      >
        <DialogHeader className={!loading && !error && data ? 'sr-only' : undefined}>
          <DialogTitle id="visitor-details-title">
            {loading
              ? 'Loading Visitor Details'
              : error
                ? 'Error Loading Details'
                : data
                  ? `Visitor Details for ${data.fullName}`
                  : 'Visitor Details'}
          </DialogTitle>
        </DialogHeader>

        {/* Loading State */}
        {loading && (
          <div
            className="flex flex-col items-center justify-center py-12"
            aria-live="polite"
          >
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              Loading visitor details...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Unable to load details
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <div className="flex gap-2">
                <Button onClick={handleRetry} variant="outline">
                  Retry
                </Button>
                <Button onClick={onClose} variant="default">
                  Close
                </Button>
              </div>
            </div>
        )}

        {/* Success State - Visitor Details */}
        {!loading && !error && data && (
            <div className="space-y-6">
              {/* Visitor Header */}
              <div className="flex flex-col items-center space-y-3">
                <Avatar className="h-24 w-24 md:h-32 md:w-32">
                  {data.photoUrl && !photoError ? (
                    <AvatarImage
                      src={data.photoUrl}
                      alt={`${data.fullName}'s photo`}
                      className="object-cover"
                      onError={handlePhotoError}
                    />
                  ) : null}
                  <AvatarFallback className="text-2xl bg-primary/10">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold">{data.fullName}</h2>
                  <p className="text-sm text-muted-foreground">{data.phone}</p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <VisitTypeBadge visitType={data.visitType} />
                  <StatusBadge variant={getStatusVariant(data.status)} />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t" />

              {/* Visitor Information */}
              <div className="space-y-3">
                {data.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{data.email}</span>
                  </div>
                )}
                {data.company && (
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{data.company}</span>
                  </div>
                )}
                {data.designation && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{data.designation}</span>
                  </div>
                )}
              </div>

              <GovernmentIdPreview
                govtIdUrl={data.govtIdUrl}
                govtIdType={data.govtIdType}
              />

              {/* Visit Details */}
              {(data.visitType === VisitCategory.MEETING &&
                (data.hostName || data.staffName || data.department)) ||
              data.purpose ? (
                <>
                  <div className="border-t" />
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Visit Details
                    </p>

                    {/* Host - show either dropdown selection OR manual entry */}
                    {data.visitType === VisitCategory.MEETING &&
                      (data.hostName || data.staffName) && (
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-medium text-muted-foreground min-w-[80px]">
                            Host:
                          </span>
                          <span className="text-sm">
                            {data.hostName || data.staffName}
                          </span>
                        </div>
                      )}

                    {/* Host Phone - Only show for manual entry */}
                    {data.visitType === VisitCategory.MEETING &&
                      data.staffPhone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm">{data.staffPhone}</span>
                        </div>
                      )}

                    {data.visitType === VisitCategory.MEETING &&
                      data.department && (
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-medium text-muted-foreground min-w-[80px]">
                            Department:
                          </span>
                          <span className="text-sm">{data.department}</span>
                        </div>
                      )}
                    {data.purpose && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-medium text-muted-foreground min-w-[80px]">
                          Purpose:
                        </span>
                        <span className="text-sm">{data.purpose}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : null}

              {/* Check-In OTP (APPROVED only) */}
              {shouldShowOtp && (
                <>
                  <div className="border-t" />
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground text-center">
                      Check-In OTP
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
                      <p
                        className="font-mono text-3xl md:text-4xl font-bold tracking-widest text-gray-900 dark:text-gray-100"
                        aria-label={`Check-in one time password: ${data.checkInOtp}`}
                      >
                        {data.checkInOtp}
                      </p>
                    </div>
                    {data.checkInOtpExpiry && (
                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          Valid until: {formatTimestamp(data.checkInOtpExpiry)}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Timestamps */}
              <div className="border-t" />
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Timeline
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requested:</span>
                    <span>{formatTimestamp(data.createdAt)}</span>
                  </div>
                  {data.approvedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Approved:</span>
                      <span>{formatTimestamp(data.approvedAt)}</span>
                    </div>
                  )}
                  {data.checkedInAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Checked In:</span>
                      <span>{formatTimestamp(data.checkedInAt)}</span>
                    </div>
                  )}
                  {data.checkedOutAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Checked Out:
                      </span>
                      <span>{formatTimestamp(data.checkedOutAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Error */}
              {actionError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              )}

              {/* Action Button */}
              {actionConfig.visible && (
                <Button
                  onClick={handleAction}
                  disabled={actionConfig.disabled || actionLoading}
                  variant={mapVariantToButtonVariant(actionConfig.variant)}
                  className={cn(
                    'w-full',
                    actionConfig.variant === 'primary' &&
                      'bg-emerald-500 hover:bg-emerald-600 text-white',
                  )}
                  aria-label={`${actionConfig.label} visitor ${data.fullName}`}
                >
                  {actionLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {getActionLabel()}
                </Button>
              )}
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
