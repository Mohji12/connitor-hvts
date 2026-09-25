'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import useSWR from 'swr';
import { format, isSameDay } from 'date-fns';
import {
  Check,
  X,
  Loader2,
  Calendar as CalendarIcon,
  Search,
  UserPlus,
  LogIn,
  XCircle,
  LogOut,
  Hourglass,
  Clock,
  User,
  Video,
  KeyRound,
} from 'lucide-react';

// API Services
import { StaffService } from '@/lib/services/staffService';

// Schemas and Types
import {
  StaffVisitor,
  RejectVisitFormSchema,
  RejectVisitFormData,
  User as UserProfile,
  Visitor,
} from '@/lib/schema/schema';

// UI Components
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { UrgentPasscodeDialog } from '@/components/myVisitors/UrgentPasscodeDialog';

type MyVisitorsProps = {
  user: UserProfile;
};

//================================================================//
// Helper Functions                                               //
//================================================================//
const formatDuration = (minutes: number | null) => {
  if (!minutes) return '--';

  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }
};

const formatDateTime = (dateTimeString: string | null | undefined) => {
  if (!dateTimeString) return 'N/A';
  return format(new Date(dateTimeString), 'PPp');
};

// Enhanced Avatar component with better error handling
const VisitorAvatar = ({
  photoUrl,
  visitorName,
  className = 'h-8 w-8',
  fallbackClassName = 'text-xs bg-primary/10',
}: {
  photoUrl?: string | null;
  visitorName: string;
  className?: string;
  fallbackClassName?: string;
}) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  const fallbackText = visitorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || <User className="h-4 w-4" />;

  // If no photo URL or image failed to load, show fallback
  if (!photoUrl || photoUrl === 'pending' || imgError) {
    return (
      <Avatar className={className}>
        <AvatarFallback className={fallbackClassName}>
          {fallbackText}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Avatar className={className}>
      <AvatarImage
        src={photoUrl}
        alt={visitorName}
        className="object-cover"
        onLoad={() => setImgLoading(false)}
        onError={() => {
          setImgError(true);
          setImgLoading(false);
        }}
        style={{
          opacity: imgLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
      {imgLoading && (
        <AvatarFallback className={fallbackClassName}>
          <Loader2 className="h-4 w-4 animate-spin" />
        </AvatarFallback>
      )}
      {imgError && (
        <AvatarFallback className={fallbackClassName}>
          {fallbackText}
        </AvatarFallback>
      )}
    </Avatar>
  );
};

// Helper function to build full visitor name
const buildVisitorName = (visitor: Visitor) => {
  return [visitor.firstName, visitor.middleName, visitor.lastName]
    .filter(Boolean)
    .join(' ');
};

//================================================================//
// CHILD COMPONENT: Dialog for Rejecting a Visit                  //
//================================================================//
const RejectDialog = ({
  visitor,
  open,
  onClose,
  onSuccess,
}: {
  visitor: StaffVisitor | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const form = useForm<RejectVisitFormData>({
    resolver: zodResolver(RejectVisitFormSchema),
    defaultValues: { rejectionReason: '' },
  });

  if (!visitor) return null;

  const visitorName = buildVisitorName(visitor.visitor);

  const onSubmit = async (data: RejectVisitFormData) => {
    toast.promise(StaffService.rejectVisit(visitor.id, data), {
      loading: 'Rejecting request...',
      success: () => {
        onSuccess();
        onClose();
        form.reset();
        return 'Visitor request has been rejected.';
      },
      error: (err: Error) => err.message || 'Failed to reject request.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Visitor Request</DialogTitle>
          <DialogDescription>
            Please provide a brief reason for rejecting the request from{' '}
            <span className="font-semibold text-primary">{visitorName}</span>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-4"
          >
            <FormField
              control={form.control}
              name="rejectionReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Rejection</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., I am unavailable at this time, please reschedule."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={form.formState.isSubmitting}
                className="cursor-pointer"
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirm Rejection
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const ApproveDialog = ({
  visitor,
  open,
  onClose,
  onSuccess,
}: {
  visitor: StaffVisitor | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!visitor) return null;

  const visitorName = buildVisitorName(visitor.visitor);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await StaffService.approveVisit(visitor.id, feedback.trim() || undefined);
      onSuccess();
      onClose();
      setFeedback('');
      toast.success('Approved. The visitor will see your message on their dashboard.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve appointment</DialogTitle>
          <DialogDescription>
            Confirm approval for{' '}
            <span className="font-semibold text-primary">{visitorName}</span>.
            {visitor.appointmentMode === 'ONLINE'
              ? ' A video consultation room will be created and the link sent to the visitor.'
              : ' Add an optional message — the visitor will see it on their dashboard.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Message for visitor (optional)</Label>
            <Textarea
              placeholder="e.g., Please bring your previous reports. Gate opens 15 minutes before your slot."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve appointment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

//================================================================//
// CHILD COMPONENT: Reusable Visitor List (Table + Mobile Cards)  //
//================================================================//
const VisitorList = ({
  visits,
  isLoading,
  onApprove,
  onReject,
  tab,
}: {
  visits: StaffVisitor[];
  isLoading: boolean;
  onApprove?: (visitor: StaffVisitor) => void;
  onReject?: (visitor: StaffVisitor) => void;
  tab: 'pending' | 'active' | 'history';
}) => {
  const [expandedVisitorId, setExpandedVisitorId] = useState<string | null>(
    null,
  );

  const handleRowClick = (visitorId: string) => {
    setExpandedVisitorId(expandedVisitorId === visitorId ? null : visitorId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CHECKED_IN':
        return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            <LogIn className="mr-1 h-3 w-3" />
            Checked-In
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            <Check className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'CHECKED_OUT':
        return (
          <Badge variant="secondary">
            <LogOut className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case 'REQUEST_SENT':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-600">
            <Hourglass className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderActions = (visitor: StaffVisitor) => {
    if (tab !== 'pending' || !onApprove || !onReject) return null;
    return (
      <div className="flex justify-end gap-2 pt-3 sm:pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onReject(visitor);
          }}
          className="cursor-pointer"
        >
          <X className="mr-1 h-4 w-4" /> Reject
        </Button>
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onApprove(visitor);
          }}
          className="cursor-pointer"
        >
          <Check className="mr-1 h-4 w-4" /> Approve
        </Button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-lg border p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-64 bg-background rounded-lg border">
        <UserPlus className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold">No Visitors Found</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          There are no visitors in this category for the selected criteria.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="border rounded-lg hidden md:block">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[15%]">Visitor</TableHead>
              <TableHead className="w-[30%]">Purpose</TableHead>
              <TableHead className="w-[15%]">Status</TableHead>
              <TableHead className="w-[15%]">
                {tab === 'history' ? 'Duration' : 'Time'}
              </TableHead>
              {tab === 'pending' && (
                <TableHead className="text-right w-[25%]">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.map((visit) => {
              const visitorName = buildVisitorName(visit.visitor);

              return (
                <React.Fragment key={visit.id}>
                  <TableRow
                    onClick={() => handleRowClick(visit.id)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <VisitorAvatar
                          photoUrl={visit.visitor.photo || undefined}
                          visitorName={visitorName}
                          className="h-8 w-8"
                          fallbackClassName="text-xs bg-primary/10"
                        />
                        <div>
                          <div className="font-medium">{visitorName}</div>
                          <div className="text-xs text-muted-foreground">
                            {visit.visitor.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {visit.visitor.phone}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{visit.purpose || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(visit.status)}</TableCell>
                    <TableCell>
                      {visit.appointmentMode === 'ONLINE' && (
                        <Badge variant="outline" className="text-violet-600 border-violet-600 mb-1">
                          <Video className="mr-1 h-3 w-3" />
                          Online
                        </Badge>
                      )}
                      {tab === 'history' && visit.status === 'CHECKED_OUT' ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatDuration(visit.durationMinutes ?? null)}
                        </div>
                      ) : visit.appointmentDate ? (
                        formatDateTime(visit.appointmentDate)
                      ) : (
                        formatDateTime(visit.updatedAt)
                      )}
                    </TableCell>
                    {tab === 'pending' && (
                      <TableCell className="text-right">
                        {renderActions(visit)}
                      </TableCell>
                    )}
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} className="p-0 border-none">
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          expandedVisitorId === visit.id
                            ? 'max-h-96'
                            : 'max-h-0'
                        }`}
                      >
                        <div className="p-4 bg-muted/50 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-semibold text-muted-foreground">
                              Purpose of Visit
                            </p>
                            <p>{visit.purpose || 'N/A'}</p>
                          </div>
                          {visit.appointmentDate && (
                            <div>
                              <p className="font-semibold text-muted-foreground">
                                Scheduled Appointment
                              </p>
                              <p>{formatDateTime(visit.appointmentDate)}</p>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-muted-foreground">
                              Visitor Photo
                            </p>
                            <div className="mt-2">
                              <VisitorAvatar
                                photoUrl={visit.visitor.photo || undefined}
                                visitorName={visitorName}
                                className="h-16 w-16"
                                fallbackClassName="text-sm bg-primary/10"
                              />
                            </div>
                          </div>
                          {visit.rejectionReason && (
                            <div className="md:col-span-2">
                              <p className="font-semibold text-muted-foreground">
                                Reason for Rejection
                              </p>
                              <p className="text-red-600">
                                {visit.rejectionReason}
                              </p>
                            </div>
                          )}
                          {tab === 'history' &&
                            visit.status === 'CHECKED_OUT' &&
                            visit.durationMinutes && (
                              <div>
                                <p className="font-semibold text-muted-foreground">
                                  Visit Duration
                                </p>
                                <p className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(visit.durationMinutes)}
                                </p>
                              </div>
                            )}
                          {(visit.checkInTime || visit.checkOutTime) && (
                            <div>
                              <p className="font-semibold text-muted-foreground">
                                Visit Timeline
                              </p>
                              <div className="text-xs space-y-1">
                                {visit.checkInTime && (
                                  <p>
                                    Check-in:{' '}
                                    {formatDateTime(visit.checkInTime)}
                                  </p>
                                )}
                                {visit.checkOutTime && (
                                  <p>
                                    Check-out:{' '}
                                    {formatDateTime(visit.checkOutTime)}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          {visit.appointmentMode === 'ONLINE' &&
                            (visit.status === 'APPROVED' || visit.status === 'CHECKED_IN') &&
                            (visit.meetingHostUrl ?? visit.zoomStartUrl) && (
                              <div className="md:col-span-2">
                                <Button size="sm" asChild>
                                  <a
                                    href={(visit.meetingHostUrl ?? visit.zoomStartUrl) as string}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Video className="mr-1 h-4 w-4" />
                                    Start consultation
                                  </a>
                                </Button>
                              </div>
                            )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-4 md:hidden">
        {visits.map((visit) => {
          const visitorName = buildVisitorName(visit.visitor);

          return (
            <div
              key={visit.id}
              className="border rounded-lg p-4 text-sm"
              onClick={() => handleRowClick(visit.id)}
            >
              <div className="flex justify-between items-start cursor-pointer">
                <div className="flex items-center gap-3">
                  <VisitorAvatar
                    photoUrl={visit.visitor.photo || undefined}
                    visitorName={visitorName}
                    className="h-10 w-10"
                    fallbackClassName="bg-primary/10"
                  />
                  <div className="space-y-1">
                    <p className="font-semibold">{visitorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {visit.visitor.phone}
                    </p>
                  </div>
                </div>
                {getStatusBadge(visit.status)}
              </div>
              {visit.appointmentMode === 'ONLINE' && (
                <Badge variant="outline" className="text-violet-600 border-violet-600 w-fit">
                  <Video className="mr-1 h-3 w-3" />
                  Online
                </Badge>
              )}
              <div className="border-t my-3"></div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purpose:</span>
                  <span className="font-medium text-right">
                    {visit.purpose || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {tab === 'history' && visit.status === 'CHECKED_OUT'
                      ? 'Duration:'
                      : 'Last Updated:'}
                  </span>
                  <span className="font-medium text-right">
                    {tab === 'history' && visit.status === 'CHECKED_OUT' ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(visit.durationMinutes ?? null)}
                      </span>
                    ) : (
                      formatDateTime(visit.updatedAt)
                    )}
                  </span>
                </div>
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  expandedVisitorId === visit.id ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="mt-3 pt-3 border-t space-y-3 text-xs">
                  <div>
                    <p className="font-semibold text-muted-foreground">
                      Purpose
                    </p>
                    <p>{visit.purpose || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">
                      Visitor Photo
                    </p>
                    <div className="mt-2">
                      <VisitorAvatar
                        photoUrl={visit.visitor.photo || undefined}
                        visitorName={visitorName}
                        className="h-16 w-16"
                        fallbackClassName="text-sm bg-primary/10"
                      />
                    </div>
                  </div>
                  {visit.rejectionReason && (
                    <div>
                      <p className="font-semibold text-muted-foreground">
                        Rejection Reason
                      </p>
                      <p className="text-red-600">{visit.rejectionReason}</p>
                    </div>
                  )}
                  {tab === 'history' &&
                    visit.status === 'CHECKED_OUT' &&
                    visit.durationMinutes && (
                      <div>
                        <p className="font-semibold text-muted-foreground">
                          Visit Duration
                        </p>
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(visit.durationMinutes)}
                        </p>
                      </div>
                    )}
                  {(visit.checkInTime || visit.checkOutTime) && (
                    <div>
                      <p className="font-semibold text-muted-foreground">
                        Visit Timeline
                      </p>
                      <div className="space-y-1">
                        {visit.checkInTime && (
                          <p>Check-in: {formatDateTime(visit.checkInTime)}</p>
                        )}
                        {visit.checkOutTime && (
                          <p>Check-out: {formatDateTime(visit.checkOutTime)}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {visit.appointmentMode === 'ONLINE' &&
                    (visit.status === 'APPROVED' || visit.status === 'CHECKED_IN') &&
                    (visit.meetingHostUrl ?? visit.zoomStartUrl) && (
                      <Button size="sm" className="w-full" asChild>
                        <a
                          href={(visit.meetingHostUrl ?? visit.zoomStartUrl) as string}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Video className="mr-1 h-4 w-4" />
                          Start consultation
                        </a>
                      </Button>
                    )}
                </div>
              </div>
              {renderActions(visit) && (
                <div className="border-t mt-3 pt-3">{renderActions(visit)}</div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

//================================================================//
// MAIN PAGE COMPONENT                                            //
//================================================================//
export default function MyVisitors({ user }: MyVisitorsProps) {
  const [visitorToReject, setVisitorToReject] = useState<StaffVisitor | null>(
    null,
  );
  const [visitorToApprove, setVisitorToApprove] = useState<StaffVisitor | null>(
    null,
  );
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [urgentPasscodeOpen, setUrgentPasscodeOpen] = useState(false);

  const pendingCountRef = useRef<number | null>(null);

  const {
    data: allPendingVisits,
    isLoading: isLoadingPending,
    mutate: mutatePending,
  } = useSWR('/api/staff/pending-visits', StaffService.getPendingVisits, {
    refreshInterval: 5_000,
  });

  const {
    data: allHistoricalData,
    isLoading: isLoadingHistory,
    mutate: mutateHistory,
  } = useSWR('/api/staff/history', StaffService.getVisitorHistory, {
    refreshInterval: 5_000,
  });

  useEffect(() => {
    const count = allPendingVisits?.length ?? 0;
    if (pendingCountRef.current !== null && count > pendingCountRef.current) {
      toast.info('New appointment request received');
    }
    pendingCountRef.current = count;
  }, [allPendingVisits?.length]);

  const filteredData = useMemo(() => {
    const search = searchTerm.toLowerCase();
    const filterVisits = (
      visits:
        | (StaffVisitor & {
            branchId?: string;
            department?: string | null;
            staffName?: string | null;
            staffPhone?: string | null;
            visitingCardPhoto?: string | null;
          })[]
        | undefined,
      dateField: 'createdAt' | 'updatedAt',
    ) => {
      if (!visits) return [];
      return visits.filter((v) => {
        const visitorName = buildVisitorName(v.visitor).toLowerCase();
        const dateMatch = date ? isSameDay(new Date(v[dateField]), date) : true;
        const searchMatch =
          visitorName.includes(search) || v.visitor.phone.includes(search);
        return dateMatch && searchMatch;
      });
    };
    const pending = filterVisits(
      allPendingVisits as StaffVisitor[],
      'createdAt',
    );
    const history = filterVisits(
      allHistoricalData as StaffVisitor[],
      'updatedAt',
    );
    return { pending, history };
  }, [date, searchTerm, allPendingVisits, allHistoricalData]);

  const activeVisits = useMemo(
    () =>
      filteredData.history.filter((v) =>
        ['APPROVED', 'CHECKED_IN'].includes(v.status),
      ),
    [filteredData.history],
  );
  const recentHistoryVisits = useMemo(
    () =>
      filteredData.history.filter((v) =>
        ['REJECTED', 'CHECKED_OUT'].includes(v.status),
      ),
    [filteredData.history],
  );

  const disabledDays = useMemo(() => {
    const userCreationDateString = user?.createdAt;
    if (!userCreationDateString) {
      return { after: new Date() };
    }
    const creationDate = new Date(userCreationDateString);
    const beforeDate = new Date(
      Date.UTC(
        creationDate.getUTCFullYear(),
        creationDate.getUTCMonth(),
        creationDate.getUTCDate(),
      ),
    );
    return { before: beforeDate, after: new Date() };
  }, [user]);

  const handleApprove = (visitor: StaffVisitor) => {
    setVisitorToApprove(visitor);
  };

  const handleRejectSuccess = () => {
    mutatePending();
    mutateHistory();
  };

  return (
    <>
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8 pb-4 lg:pb-8">
        <header className="flex flex-col gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              My Visitor Dashboard
            </h1>
            <p className="text-slate-600 text-base md:text-lg mt-2">
              Monitor and manage visitors assigned to you
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name or phone..."
                className="w-full rounded-lg bg-background pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full sm:w-[280px] justify-start text-left font-normal cursor-pointer',
                    !date && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="cursor-pointer"
                  disabled={disabledDays}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
              onClick={() => setUrgentPasscodeOpen(true)}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Urgent passcode
            </Button>
          </div>
        </header>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="cursor-pointer">
              Pending{' '}
              <Badge variant="secondary" className="ml-2">
                {filteredData.pending.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="cursor-pointer">
              Active{' '}
              <Badge variant="secondary" className="ml-2">
                {activeVisits.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="cursor-pointer">
              History{' '}
              <Badge variant="secondary" className="ml-2">
                {recentHistoryVisits.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6 w-full">
            <VisitorList
              visits={filteredData.pending}
              isLoading={isLoadingPending}
              onApprove={handleApprove}
              onReject={setVisitorToReject}
              tab="pending"
            />
          </TabsContent>

          <TabsContent value="active" className="mt-6 w-full">
            <VisitorList
              visits={activeVisits}
              isLoading={isLoadingHistory}
              tab="active"
            />
          </TabsContent>

          <TabsContent value="history" className="mt-6 w-full">
            <VisitorList
              visits={recentHistoryVisits}
              isLoading={isLoadingHistory}
              tab="history"
            />
          </TabsContent>
        </Tabs>
      </div>
      <RejectDialog
        open={!!visitorToReject}
        onClose={() => setVisitorToReject(null)}
        onSuccess={handleRejectSuccess}
        visitor={visitorToReject}
      />
      <ApproveDialog
        open={!!visitorToApprove}
        onClose={() => setVisitorToApprove(null)}
        onSuccess={handleRejectSuccess}
        visitor={visitorToApprove}
      />
      <UrgentPasscodeDialog open={urgentPasscodeOpen} onOpenChange={setUrgentPasscodeOpen} />
    </>
  );
}
