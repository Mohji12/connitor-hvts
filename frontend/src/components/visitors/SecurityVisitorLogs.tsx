'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import useSWR from 'swr';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Check,
  LogIn,
  LogOut,
  Hourglass,
  Search,
  Loader2,
  XCircle,
  UserPlus,
  X,
  User,
} from 'lucide-react';

// API Services
import { VisitorService } from '@/lib/services/visitorService';
import { SecurityService } from '@/lib/services/securityService';
import { cn } from '@/lib/utils';

// Schemas and Types
import {
  VisitorSummary,
  VerifyVisitCodeSchema,
  Branch,
  RejectVisitFormData,
  RejectVisitFormSchema,
} from '@/lib/schema/schema';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BranchService } from '@/lib/services/branchService';
import { Textarea } from '@/components/ui/textarea';

type SecurityVisitorLogsProps = {
  user: {
    branchId: string;
    hospitalChainId: string;
    id: string;
  };
};

//================================================================//
// Helper Functions                                               //
//================================================================//
const formatDateTime = (dateTimeString: string | null | undefined) => {
  if (!dateTimeString) return 'N/A';
  return format(new Date(dateTimeString), 'p');
};

const calculateDuration = (start: string | null, end: string | null) => {
  if (!start || !end) return '--';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} min`;
  const diffHours = (diffMins / 60).toFixed(1);
  return `${diffHours} hr`;
};

const getStatusBadge = (status: VisitorSummary['status']) => {
  switch (status) {
    case 'REQUEST_SENT':
    case 'PENDING':
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-600">
          <Hourglass className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    case 'APPROVED':
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          <Check className="mr-1 h-3 w-3" />
          Approved
        </Badge>
      );
    case 'CHECKED_IN':
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <LogIn className="mr-1 h-3 w-3" />
          Checked-In
        </Badge>
      );
    case 'CHECKED_OUT':
      return (
        <Badge variant="secondary">
          <LogOut className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Rejected
        </Badge>
      );
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const SecurityVisitorAvatar = ({
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

//================================================================//
// CHILD COMPONENT: Verify Code Dialog                            //
//================================================================//
const VerifyCodeDialog = ({
  visitor,
  open,
  onClose,
  onSuccess,
}: {
  visitor: VisitorSummary | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const form = useForm<z.infer<typeof VerifyVisitCodeSchema>>({
    resolver: zodResolver(VerifyVisitCodeSchema),
    defaultValues: { phone: visitor?.visitorPhone || '', visitCode: '' },
  });

  React.useEffect(() => {
    if (visitor) {
      form.reset({ phone: visitor.visitorPhone, visitCode: '' });
    }
  }, [visitor, form]);

  if (!visitor) return null;

  const onSubmit = async (data: z.infer<typeof VerifyVisitCodeSchema>) => {
    toast.promise(VisitorService.verifyCode(data), {
      loading: 'Verifying and checking in...',
      success: () => {
        onSuccess();
        onClose();
        return `Visitor ${visitor.visitorName} checked in successfully!`;
      },
      error: (err: Error) => err.message || 'Failed to check in.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify & Check-In Visitor</DialogTitle>
          <DialogDescription>
            Enter the 6-digit code provided by{' '}
            <span className="font-semibold text-primary">
              {visitor.visitorName}
            </span>{' '}
            to complete the check-in process.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-4"
          >
            <FormField
              control={form.control}
              name="visitCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visit Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter 6-digit code" {...field} />
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
                disabled={form.formState.isSubmitting}
                className="cursor-pointer"
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirm Check-In
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

//================================================================//
// CHILD COMPONENT: Reject Dialog for Security                    //
//================================================================//
const RejectDialog = ({
  visitor,
  open,
  onClose,
  onSuccess,
}: {
  visitor: VisitorSummary | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const form = useForm<RejectVisitFormData>({
    resolver: zodResolver(RejectVisitFormSchema),
    defaultValues: { rejectionReason: '' },
  });

  if (!visitor) return null;

  const onSubmit = async (data: RejectVisitFormData) => {
    toast.promise(SecurityService.rejectVisit(visitor.id, data), {
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
            <span className="font-semibold text-primary">
              {visitor.visitorName}
            </span>
            .
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
                      placeholder="e.g., Visitor does not meet security requirements."
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

//================================================================//
// CHILD COMPONENT: Checkout Confirmation Dialog                  //
//================================================================//
const CheckoutConfirmationDialog = ({
  open,
  onCancel,
  onConfirm,
  visitorName,
  isCheckingOut,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  visitorName: string;
  isCheckingOut: boolean;
}) => (
  <AlertDialog open={open} onOpenChange={onCancel}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Confirm Visitor Check-Out</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to check out the visitor{' '}
          <span className="font-semibold text-primary">{visitorName}</span>?
          This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel} className="cursor-pointer">
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
          disabled={isCheckingOut}
        >
          {isCheckingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Check-Out
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

//================================================================//
// CHILD COMPONENT: Visitors Table (Updated)                      //
//================================================================//
const VisitorsTable = ({
  visitors,
  isLoading,
  onVerify,
  onCheckout,
  onApprove,
  onReject,
}: {
  visitors: VisitorSummary[];
  isLoading: boolean;
  onVerify: (visitor: VisitorSummary) => void;
  onCheckout: (visitor: VisitorSummary) => void;
  onApprove?: (visitor: VisitorSummary) => void;
  onReject?: (visitor: VisitorSummary) => void;
  tab: string;
}) => {
  const [expandedVisitorId, setExpandedVisitorId] = useState<string | null>(
    null,
  );

  const handleRowClick = (visitorId: string) => {
    setExpandedVisitorId(expandedVisitorId === visitorId ? null : visitorId);
  };

  const renderActions = (visitor: VisitorSummary) => {
    switch (visitor.status) {
      case 'APPROVED':
        return (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onVerify(visitor);
            }}
            className="cursor-pointer w-full sm:w-auto"
          >
            Verify & Check-In
          </Button>
        );
      case 'CHECKED_IN':
        return (
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              onCheckout(visitor);
            }}
            className="cursor-pointer w-full sm:w-auto"
          >
            Check-Out
          </Button>
        );
      case 'PENDING':
      case 'REQUEST_SENT':
        return (
          <div className="flex justify-end gap-2 pt-3 sm:pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onReject?.(visitor);
              }}
              className="cursor-pointer"
            >
              <X className="mr-1 h-4 w-4" /> Reject
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onApprove?.(visitor);
              }}
              className="cursor-pointer"
            >
              <Check className="mr-1 h-4 w-4" /> Approve
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4">
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (visitors.length === 0) {
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visitor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check-In Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visitors.map((v) => (
              <React.Fragment key={v.id}>
                <TableRow
                  onClick={() => handleRowClick(v.id)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <SecurityVisitorAvatar
                        photoUrl={v.visitorPhoto}
                        visitorName={v.visitorName}
                        className="h-8 w-8"
                        fallbackClassName="text-xs bg-primary/10"
                      />
                      <div>
                        <div className="font-medium">{v.visitorName}</div>
                        {v.visitorEmail && (
                          <div className="text-xs text-muted-foreground">
                            {v.visitorEmail}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {v.visitorPhone}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(v.status)}</TableCell>
                  <TableCell>{formatDateTime(v.checkInTime)}</TableCell>
                  <TableCell>
                    {calculateDuration(v.checkInTime, v.checkOutTime)}
                  </TableCell>
                  <TableCell className="text-right">
                    {renderActions(v)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="p-0"
                    style={{ padding: 0, border: 'none' }}
                  >
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        expandedVisitorId === v.id ? 'max-h-96' : 'max-h-0'
                      }`}
                    >
                      <div className="p-4 bg-muted/50 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                        <div>
                          <p className="font-semibold text-muted-foreground">
                            Person to Meet
                          </p>
                          <p>{v.personToMeet || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground">
                            Purpose
                          </p>
                          <p>{v.purpose || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground">
                            Visitor Photo
                          </p>
                          <div className="mt-2">
                            <SecurityVisitorAvatar
                              photoUrl={v.visitorPhoto}
                              visitorName={v.visitorName}
                              className="h-20 w-20"
                              fallbackClassName="text-sm bg-primary/10"
                            />
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground">
                            Request Time
                          </p>
                          <p>{formatDateTime(v.createdAt)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground">
                            Check-In By
                          </p>
                          <p>
                            {v.checkedInBy || 'N/A'}
                            {v.checkedInLocation &&
                              ` at ${v.checkedInLocation}`}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground">
                            Check-Out By
                          </p>
                          <p>{v.checkedOutBy || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground">
                            Check-Out Time
                          </p>
                          <p>{formatDateTime(v.checkOutTime)}</p>
                        </div>
                        {/* Show rejection reason if the visitor was rejected */}
                        {v.rejectionReason && (
                          <div className="md:col-span-3">
                            <p className="font-semibold text-muted-foreground">
                              Rejection Reason
                            </p>
                            <p className="text-red-500">{v.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-4 md:hidden">
        {visitors.map((v) => (
          <div
            key={v.id}
            className="border rounded-lg p-4 text-sm"
            onClick={() => handleRowClick(v.id)}
          >
            <div className="flex justify-between items-start cursor-pointer">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={v.visitorPhoto || ''}
                    alt={v.visitorName}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary/10">
                    {v.visitorName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="font-semibold">{v.visitorName}</p>
                  {v.visitorEmail && (
                    <p className="text-xs text-muted-foreground">
                      {v.visitorEmail}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {v.visitorPhone}
                  </p>
                </div>
              </div>
              {getStatusBadge(v.status)}
            </div>
            <div className="border-t my-3"></div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Person to Meet:</span>
                <span className="font-medium text-right">{v.personToMeet}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-In:</span>
                <span className="font-medium text-right">
                  {formatDateTime(v.checkInTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-Out:</span>
                <span className="font-medium text-right">
                  {formatDateTime(v.checkOutTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium text-right">
                  {calculateDuration(v.checkInTime, v.checkOutTime)}
                </span>
              </div>
            </div>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                expandedVisitorId === v.id ? 'max-h-96' : 'max-h-0'
              }`}
            >
              <div className="mt-3 pt-3 border-t space-y-3 text-xs">
                <div>
                  <p className="font-semibold text-muted-foreground">Purpose</p>
                  <p>{v.purpose || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">
                    Visitor Photo
                  </p>
                  <div className="mt-2">
                    <Avatar className="h-16 w-16">
                      <AvatarImage
                        src={v.visitorPhoto || ''}
                        alt={v.visitorName}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-sm bg-primary/10">
                        {v.visitorName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground font-semibold">
                    Checked-in By
                  </p>
                  <p>
                    {v.checkedInBy || 'N/A'}
                    {v.checkedInLocation && ` at (${v.checkedInLocation})`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground font-semibold">
                    Checked-out By
                  </p>
                  <p>
                    {v.checkedOutBy || 'N/A'}
                    {v.checkedOutLocation && ` at (${v.checkedOutLocation})`}
                  </p>
                </div>
                {/* Show rejection reason if the visitor was rejected */}
                {v.rejectionReason && (
                  <div className="mt-2">
                    <p className="font-semibold text-muted-foreground">
                      Rejection Reason
                    </p>
                    <p className="text-red-500">{v.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
            {renderActions(v) && (
              <div className="border-t mt-3 pt-3">{renderActions(v)}</div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

//================================================================//
// MAIN PAGE COMPONENT                                            //
//================================================================//
export function SecurityVisitorLogs({ user }: SecurityVisitorLogsProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('APPROVED');

  const [visitorToVerify, setVisitorToVerify] = useState<VisitorSummary | null>(
    null,
  );
  const [visitorToCheckout, setVisitorToCheckout] =
    useState<VisitorSummary | null>(null);
  const [visitorToReject, setVisitorToReject] = useState<VisitorSummary | null>(
    null,
  );
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const { data: branch } = useSWR<Branch>(
    user.hospitalChainId
      ? `/api/chain/${user.hospitalChainId}/branches/${user.branchId}`
      : null,
    () => BranchService.getById(user.hospitalChainId, user.branchId),
  );

  const branchCreationDate = useMemo(() => {
    if (!branch?.createdAt) return undefined;
    const creationDate = new Date(branch.createdAt);
    return new Date(
      creationDate.getUTCFullYear(),
      creationDate.getUTCMonth(),
      creationDate.getUTCDate(),
    );
  }, [branch]);

  const formattedDate = date ? format(date, 'yyyy-MM-dd') : undefined;

  const {
    data: allVisitors,
    isLoading,
    mutate,
  } = useSWR(
    formattedDate
      ? `/api/visitor/summary?date=${formattedDate}&branchId=${user.branchId}`
      : null,
    () =>
      VisitorService.getVisitorSummary({
        date: formattedDate,
        // branchId: user.branchId, // Removed to fix type error
      }),
    { refreshInterval: 5_000 },
  );

  const visitorsByStatus = useMemo(() => {
    const initial: { [key: string]: VisitorSummary[] } = {
      PENDING: [],
      APPROVED: [],
      CHECKED_IN: [],
      COMPLETED: [],
      REJECTED: [],
    };
    if (!allVisitors?.data) return initial;

    const filteredData: VisitorSummary[] = searchQuery
      ? allVisitors.data.filter(
          (v: VisitorSummary) =>
            v.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.visitorPhone.includes(searchQuery),
        )
      : allVisitors.data;

    return filteredData.reduce(
      (acc: typeof initial, visitor: VisitorSummary) => {
        if (visitor.status === 'REQUEST_SENT' || visitor.status === 'PENDING') {
          acc.PENDING.push(visitor);
        } else if (visitor.status === 'APPROVED') {
          acc.APPROVED.push(visitor);
        } else if (visitor.status === 'CHECKED_IN') {
          acc.CHECKED_IN.push(visitor);
        } else if (visitor.status === 'CHECKED_OUT') {
          acc.COMPLETED.push(visitor);
        } else if (visitor.status === 'REJECTED') {
          acc.REJECTED.push(visitor);
        }
        return acc;
      },
      initial,
    );
  }, [allVisitors, searchQuery]);

  const handleApprove = (visitor: VisitorSummary) => {
    toast.promise(SecurityService.approveVisit(visitor.id), {
      loading: 'Approving request...',
      success: () => {
        mutate();
        return 'Visitor approved.';
      },
      error: (err) => err.message || 'Failed to approve.',
    });
  };

  const handleRejectSuccess = () => {
    mutate();
  };

  const handleCheckoutConfirm = async () => {
    if (!visitorToCheckout) return;
    setIsCheckingOut(true);
    toast.promise(VisitorService.checkOut(visitorToCheckout.id), {
      loading: 'Checking out visitor...',
      success: () => {
        mutate();
        setVisitorToCheckout(null);
        setIsCheckingOut(false);
        return `Visitor ${visitorToCheckout.visitorName} checked out.`;
      },
      error: (err) => {
        setIsCheckingOut(false);
        return err.message || 'Failed to check out.';
      },
    });
  };

  const TABS = [
    { value: 'APPROVED', label: 'Approved' },
    { value: 'CHECKED_IN', label: 'Checked-In' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  return (
    <>
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8 pb-4 lg:pb-8">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            Visitor Operations Center
          </h1>
          <p className="text-slate-600 text-base md:text-lg mt-2">
            Manage and monitor all visitor activity for the branch
          </p>
        </header>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
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
                autoFocus
                disabled={{ before: branchCreationDate, after: new Date() }}
              />
            </PopoverContent>
          </Popover>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sm:hidden mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="Select a view..." />
              </SelectTrigger>
              <SelectContent>
                {TABS.map((tab) => (
                  <SelectItem
                    key={tab.value}
                    value={tab.value}
                    className="cursor-pointer"
                  >
                    {tab.label} (
                    {
                      visitorsByStatus[
                        tab.value as keyof typeof visitorsByStatus
                      ].length
                    }
                    )
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TabsList className="hidden sm:grid w-full grid-cols-5">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="cursor-pointer"
              >
                {tab.label}
                <Badge variant="secondary" className="ml-2">
                  {
                    visitorsByStatus[tab.value as keyof typeof visitorsByStatus]
                      .length
                  }
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            <TabsContent value="APPROVED">
              <VisitorsTable
                visitors={visitorsByStatus.APPROVED}
                isLoading={isLoading}
                onVerify={setVisitorToVerify}
                onCheckout={setVisitorToCheckout}
                tab="APPROVED"
              />
            </TabsContent>
            <TabsContent value="CHECKED_IN">
              <VisitorsTable
                visitors={visitorsByStatus.CHECKED_IN}
                isLoading={isLoading}
                onVerify={setVisitorToVerify}
                onCheckout={setVisitorToCheckout}
                tab="CHECKED_IN"
              />
            </TabsContent>
            <TabsContent value="PENDING">
              <VisitorsTable
                visitors={visitorsByStatus.PENDING}
                isLoading={isLoading}
                onVerify={setVisitorToVerify}
                onCheckout={setVisitorToCheckout}
                onApprove={handleApprove}
                onReject={setVisitorToReject}
                tab="PENDING"
              />
            </TabsContent>
            <TabsContent value="COMPLETED">
              <VisitorsTable
                visitors={visitorsByStatus.COMPLETED}
                isLoading={isLoading}
                onVerify={setVisitorToVerify}
                onCheckout={setVisitorToCheckout}
                tab="COMPLETED"
              />
            </TabsContent>
            <TabsContent value="REJECTED">
              <VisitorsTable
                visitors={visitorsByStatus.REJECTED}
                isLoading={isLoading}
                onVerify={setVisitorToVerify}
                onCheckout={setVisitorToCheckout}
                tab="REJECTED"
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <VerifyCodeDialog
        open={!!visitorToVerify}
        onClose={() => setVisitorToVerify(null)}
        onSuccess={mutate}
        visitor={visitorToVerify}
      />

      <RejectDialog
        open={!!visitorToReject}
        onClose={() => setVisitorToReject(null)}
        onSuccess={handleRejectSuccess}
        visitor={visitorToReject}
      />

      <CheckoutConfirmationDialog
        open={!!visitorToCheckout}
        onCancel={() => setVisitorToCheckout(null)}
        onConfirm={handleCheckoutConfirm}
        visitorName={visitorToCheckout?.visitorName || ''}
        isCheckingOut={isCheckingOut}
      />
    </>
  );
}
