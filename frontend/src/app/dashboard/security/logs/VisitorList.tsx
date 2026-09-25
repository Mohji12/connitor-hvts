'use client';

import * as React from 'react';
import { Users, SearchX, AlertCircle } from 'lucide-react';
import { VisitorProfileCard, VisitorData } from '@/components/visitors/shared/VisitorProfileCard';
import { SearchInput } from '@/components/visitors/logs/SearchInput';
import { VisitorActionButtons } from '@/components/visitors/security/VisitorActionButtons';
import { RejectVisitDialog } from '@/components/visitors/security/RejectVisitDialog';
import { Button } from '@/components/ui/button';
import { VisitorProfile, VisitStatus } from '@/types/visitor';
import { cn } from '@/lib/utils';
import { rejectVisit } from '@/services/visit.service';
import { toast } from 'sonner';

export interface VisitorListProps {
  visitors: VisitorProfile[];
  isLoading: boolean;
  error: Error | null;
  searchQuery?: string;
  selectedFilter?: string;
  onSearch: (query: string) => void;
  onActionComplete: (visitId: string, newStatus: VisitStatus) => void;
  onVerifyOtp: (visitorId: string) => void;
  onCheckOut: (visitorId: string) => void;
  onViewDetails: (visitorId: string) => void;
  onRetry?: () => void;
  className?: string;
}

/**
 * Filter visitors by search query
 * Searches across: name, phone, personToMeet, platform
 */
function filterVisitorsByQuery(visitors: VisitorProfile[], query: string): VisitorProfile[] {
  if (!query.trim()) return visitors;
  const lowerQuery = query.toLowerCase();

  return visitors.filter(
    (visitor) =>
      visitor.visitorName.toLowerCase().includes(lowerQuery) ||
      visitor.visitorPhone.includes(lowerQuery) ||
      visitor.personToMeet?.toLowerCase().includes(lowerQuery) ||
      visitor.purpose?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get filter-specific empty state message
 */
function getEmptyStateMessage(filter?: string): { title: string; description: string } {
  switch (filter) {
    case 'PENDING':
      return {
        title: 'No pending visitors',
        description: 'No visitors are currently waiting for approval.',
      };
    case 'APPROVED':
      return {
        title: 'No approved visitors',
        description: 'No visitors have been approved and are awaiting check-in.',
      };
    case 'IN':
      return {
        title: 'No checked-in visitors',
        description: 'No visitors are currently checked in.',
      };
    case 'OUT':
      return {
        title: 'No checked-out visitors',
        description: 'No visitors have checked out yet.',
      };
    default:
      return {
        title: 'No Visitors',
        description: 'No visitors in this category at the moment.',
      };
  }
}

/**
 * Loading skeleton for visitor cards
 */
function VisitorCardSkeleton(): React.ReactElement {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border animate-pulse">
      <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-1/3" />
      </div>
      <div className="h-6 w-16 bg-muted rounded flex-shrink-0" />
    </div>
  );
}

/**
 * VisitorList Component
 *
 * Displays a searchable list of visitors with status-aware action buttons.
 * Includes loading, error, and empty states.
 */
export function VisitorList({
  visitors,
  isLoading,
  error,
  searchQuery = '',
  selectedFilter,
  onSearch,
  onActionComplete,
  onVerifyOtp,
  onCheckOut,
  onViewDetails,
  onRetry,
  className,
}: VisitorListProps): React.ReactElement {
  const [localSearchQuery, setLocalSearchQuery] = React.useState(searchQuery);
  const [debouncedQuery, setDebouncedQuery] = React.useState(searchQuery);
  const [showRejectDialog, setShowRejectDialog] = React.useState(false);
  const [rejectDialogVisitor, setRejectDialogVisitor] = React.useState<VisitorProfile | null>(
    null
  );
  const [isRejectSubmitting, setIsRejectSubmitting] = React.useState(false);

  // Debounce search query (300ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(localSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchQuery]);

  // Call parent onSearch when debounced query changes
  React.useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  // Filter visitors by search query
  const filteredVisitors = React.useMemo(
    () => filterVisitorsByQuery(visitors, localSearchQuery),
    [visitors, localSearchQuery]
  );

  // Action handlers
  const handleOpenRejectDialog = (visitId: string) => {
    const visitor = visitors.find((v) => v.id === visitId);
    if (visitor) {
      setRejectDialogVisitor(visitor);
      setShowRejectDialog(true);
    }
  };

  const handleRejectSubmit = async (reason: string) => {
    if (!rejectDialogVisitor) return;

    setIsRejectSubmitting(true);
    try {
      await rejectVisit(rejectDialogVisitor.id, reason);
      
      // Success
      toast.success('Visit rejected.');
      onActionComplete(rejectDialogVisitor.id, VisitStatus.REJECTED);
      
      // Close dialog
      setShowRejectDialog(false);
      setRejectDialogVisitor(null);
    } catch (error) {
      // Error
      const errorMessage = error instanceof Error ? error.message : 'Failed to reject visit';
      toast.error(`Failed to reject. ${errorMessage}`);
    } finally {
      setIsRejectSubmitting(false);
    }
  };

  const handleCloseRejectDialog = () => {
    setShowRejectDialog(false);
    setRejectDialogVisitor(null);
  };

  const handleVerifyOtp = (visitorId: string) => {
    onVerifyOtp(visitorId);
  };

  const handleCheckOut = (visitorId: string) => {
    onCheckOut(visitorId);
  };

  const handleViewDetails = (visitorId: string) => {
    onViewDetails(visitorId);
  };

  // Convert VisitorProfile to VisitorData for VisitorProfileCard
  const convertToVisitorData = (visitor: VisitorProfile): VisitorData => ({
    id: visitor.id,
    visitorName: visitor.visitorName,
    visitorPhone: visitor.visitorPhone,
    visitorEmail: visitor.visitorEmail,
    visitorPhoto: visitor.visitorPhoto,
    visitType: visitor.visitType,
    status: visitor.status as VisitorData['status'],
    personToMeet: visitor.personToMeet,
    purpose: visitor.purpose,
    checkInTime: visitor.checkInTime,
    checkOutTime: visitor.checkOutTime,
  });

  return (
    <div className={cn('space-y-4', className)} data-testid="visitor-list">
      {/* Search Input */}
      <SearchInput
        value={localSearchQuery}
        onChange={setLocalSearchQuery}
        disabled={isLoading}
        placeholder="Search by name, phone, or host..."
      />

      {/* Loading State */}
      {isLoading && (
        <div data-testid="loading-skeleton" aria-busy="true" aria-label="Loading visitors">
          <div className="space-y-3">
            <VisitorCardSkeleton />
            <VisitorCardSkeleton />
            <VisitorCardSkeleton />
            <VisitorCardSkeleton />
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div
          data-testid="visitors-error"
          className="flex flex-col items-center justify-center py-12 px-4 text-center"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Visitors</h3>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" data-testid="retry-button">
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Empty State - No Visitors */}
      {!isLoading && !error && filteredVisitors.length === 0 && !localSearchQuery && (
        <div data-testid="empty-state" className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{getEmptyStateMessage(selectedFilter).title}</h3>
          <p className="text-sm text-muted-foreground">
            {getEmptyStateMessage(selectedFilter).description}
          </p>
        </div>
      )}

      {/* Empty State - No Search Results */}
      {!isLoading &&
        !error &&
        filteredVisitors.length === 0 &&
        localSearchQuery.trim().length > 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <SearchX className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No visitors match your search &quot;{localSearchQuery}&quot;
            </p>
            <Button onClick={() => setLocalSearchQuery('')} variant="outline">
              Clear Search
            </Button>
          </div>
        )}

      {/* Visitor List */}
      {!isLoading && !error && filteredVisitors.length > 0 && (
        <div role="list" aria-label="Visitor list" className="space-y-3">
          {filteredVisitors.map((visitor) => (
            <VisitorProfileCard
              key={visitor.id}
              visitor={convertToVisitorData(visitor)}
              compact={true}
              onClick={() => handleViewDetails(visitor.id)}
              actions={
                <VisitorActionButtons
                  visitId={visitor.id}
                  visitorName={visitor.visitorName}
                  currentStatus={visitor.status}
                  onActionComplete={onActionComplete}
                  onReject={handleOpenRejectDialog}
                  onVerifyOtp={handleVerifyOtp}
                  onCheckOut={handleCheckOut}
                />
              }
            />
          ))}
        </div>
      )}

      {/* Reject Visit Dialog */}
      {rejectDialogVisitor && (
        <RejectVisitDialog
          isOpen={showRejectDialog}
          visitorName={rejectDialogVisitor.visitorName}
          onClose={handleCloseRejectDialog}
          onReject={handleRejectSubmit}
          isSubmitting={isRejectSubmitting}
        />
      )}
    </div>
  );
}
