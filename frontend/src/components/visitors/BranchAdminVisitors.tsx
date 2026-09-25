'use client';

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import useSWR from 'swr';
import {
  Calendar as CalendarIcon,
  Users,
  LogIn,
  LogOut,
  Hourglass,
  CheckCircle,
  XCircle,
  UserPlus,
} from 'lucide-react';

// API Services
import { VisitorService } from '@/lib/services/visitorService';
import { BranchService } from '@/lib/services/branchService'; // IMPORT BranchService
import { cn } from '@/lib/utils';

// Schemas and Types
import {
  VisitorSummary,
  VisitorSummaryResponseSchema,
  Branch, // IMPORT Branch type
} from '@/lib/schema/schema';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// UPDATE PROPS to include hospitalChainId for the API call
type BranchAdminVisitorProps = {
  user: {
    hospitalChainId: string;
    branchId: string;
  };
};

//================================================================//
// Helper Functions                                               //
//================================================================//

const formatDateTime = (dateTimeString: string | null) => {
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
    // FIX: Treat 'REQUEST_SENT' the same as 'PENDING'
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
          <CheckCircle className="mr-1 h-3 w-3" />
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

//================================================================//
// CHILD COMPONENT: Visitors Table                                //
//================================================================//
const VisitorsTable = ({
  visitors,
  isLoading,
}: {
  visitors: VisitorSummary[];
  isLoading: boolean;
}) => {
  const [expandedVisitorId, setExpandedVisitorId] = useState<string | null>(
    null,
  );

  const handleRowClick = (visitorId: string) => {
    setExpandedVisitorId(expandedVisitorId === visitorId ? null : visitorId);
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4">
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Desktop Table View */}
      <div className="border rounded-lg hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visitor</TableHead>
              <TableHead>Person to Meet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check-In</TableHead>
              <TableHead>Check-Out</TableHead>
              <TableHead>Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visitors.length > 0 ? (
              visitors.map((v) => (
                <React.Fragment key={v.id}>
                  <TableRow
                    onClick={() => handleRowClick(v.id)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="font-medium">{v.visitorName}</div>
                      {v.visitorEmail && (
                        <div className="text-xs text-muted-foreground">
                          {v.visitorEmail}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {v.visitorPhone}
                      </div>
                    </TableCell>
                    <TableCell>{v.personToMeet}</TableCell>
                    <TableCell>{getStatusBadge(v.status)}</TableCell>
                    <TableCell>{formatDateTime(v.checkInTime)}</TableCell>
                    <TableCell>{formatDateTime(v.checkOutTime)}</TableCell>
                    <TableCell>
                      {calculateDuration(v.checkInTime, v.checkOutTime)}
                    </TableCell>
                  </TableRow>
                  {/* START: SMOOTH TRANSITION LOGIC */}
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="p-0"
                      style={{
                        border: 'none',
                        transition: 'all 0.3s ease-in-out',
                      }}
                    >
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          expandedVisitorId === v.id ? 'max-h-96' : 'max-h-0'
                        }`}
                      >
                        <div className="p-4 bg-muted/50 space-y-3">
                          <h4 className="font-semibold">Visit Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="font-semibold text-muted-foreground">
                                Purpose
                              </p>
                              <p>{v.purpose || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-muted-foreground">
                                Visitor Address
                              </p>
                              <p>{v.visitorAddress || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-muted-foreground">
                                Request Time
                              </p>
                              <p>{formatDateTime(v.createdAt)}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-muted-foreground">
                                Checked-in By
                              </p>
                              <p>
                                {v.checkedInBy || 'N/A'}
                                {v.checkedInLocation &&
                                  ` at (${v.checkedInLocation})`}
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold text-muted-foreground">
                                Checked-out By
                              </p>
                              <p>
                                {v.checkedOutBy || 'N/A'}
                                {v.checkedOutLocation &&
                                  ` at (${v.checkedOutLocation})`}
                              </p>
                            </div>
                            {v.rejectionReason && (
                              <div>
                                <p className="font-semibold text-muted-foreground">
                                  Rejection Reason
                                </p>
                                <p className="text-red-500">
                                  {v.rejectionReason}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* END: SMOOTH TRANSITION LOGIC */}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="border rounded-lg h-50 flex flex-col items-center justify-center gap-4 text-center">
                    <UserPlus className="h-12 w-12 text-muted-foreground/50" />
                    <div>
                      <h3 className="text-lg font-semibold">
                        No Visitors Found
                      </h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        There are no visitors in this category for the selected
                        criteria.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View (Accordion included) */}
      <div className="space-y-4 md:hidden">
        {visitors.length > 0 ? (
          visitors.map((v) => (
            <div
              key={v.id}
              className="border rounded-lg p-4 text-sm"
              onClick={() => handleRowClick(v.id)}
            >
              <div className="flex justify-between items-start cursor-pointer">
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
                {getStatusBadge(v.status)}
              </div>
              <div className="border-t my-3"></div>
              <div className="space-y-2 text-xs cursor-pointer">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Person to meet:</span>
                  <span className="font-medium text-right">
                    {v.personToMeet}
                  </span>
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
              {/* Expanded Details for Mobile with Transition */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  expandedVisitorId === v.id ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="mt-3 pt-3 border-t space-y-2 text-xs">
                  <div>
                    <p className="text-muted-foreground font-semibold">
                      Purpose
                    </p>
                    <p>{v.purpose || 'N/A'}</p>
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
                  {v.rejectionReason && (
                    <div>
                      <p className="font-semibold text-muted-foreground">
                        Rejection Reason
                      </p>
                      <p className="text-red-500">{v.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="border rounded-lg h-50 flex flex-col items-center justify-center gap-4 text-center">
            <UserPlus className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <h3 className="text-lg font-semibold">No Visitors Found</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                There are no visitors in this category for the selected
                criteria.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

//================================================================//
// MAIN PAGE COMPONENT                                            //
//================================================================//
export function BranchAdminVisitor({ user }: BranchAdminVisitorProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const { data: visitorResponse, isLoading } = useSWR(
    formattedDate
      ? `/api/visitors/summary?date=${formattedDate}&branchId=${user.branchId}`
      : null,
    async () => {
      const response = await VisitorService.getVisitorSummary({
        date: formattedDate,
        personToMeet: undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined,
      });

      // Convert numeric IDs to strings before validation
      const processedData = {
        ...response,
        data:
          response.data?.map(
            (visitor: { id: string; [key: string]: unknown }) => ({
              ...visitor,
              id: String(visitor.id),
            }),
          ) || [],
      };

      const validation = VisitorSummaryResponseSchema.safeParse(processedData);
      if (validation.success) {
        return validation.data;
      } else {
        console.error('Zod validation error:', validation.error);
        return { data: [], total: 0, page: 1, limit: 20 };
      }
    },
    { refreshInterval: 5_000 },
  );

  const filteredVisitors = useMemo(() => {
    if (!visitorResponse?.data) return [];
    let filtered = visitorResponse.data;

    if (statusFilter !== 'all') {
      if (statusFilter === 'PENDING') {
        filtered = filtered.filter(
          (v) => v.status === 'PENDING' || v.status === 'REQUEST_SENT',
        );
      } else {
        filtered = filtered.filter((v) => v.status === statusFilter);
      }
    }

    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.visitorName.toLowerCase().includes(lowercasedQuery) ||
          v.visitorPhone.includes(lowercasedQuery),
      );
    }
    return filtered;
  }, [visitorResponse, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    if (!visitorResponse?.data) {
      return { total: 0, checkedIn: 0, completed: 0, pending: 0 };
    }
    return {
      total: visitorResponse.data.length,
      checkedIn: visitorResponse.data.filter((v) => v.status === 'CHECKED_IN')
        .length,
      completed: visitorResponse.data.filter((v) => v.status === 'CHECKED_OUT')
        .length,
      pending: visitorResponse.data.filter(
        (v) =>
          v.status === 'PENDING' ||
          v.status === 'APPROVED' ||
          v.status === 'REQUEST_SENT',
      ).length,
    };
  }, [visitorResponse]);

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 pb-4 lg:pb-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
            <Users className="h-6 w-6 text-white" />
          </div>
          Branch Visitor Analytics
        </h1>
        <p className="text-slate-600 text-base md:text-lg">
          Monitor and review all visitor activity for your branch
        </p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Visitors Today
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-12" /> : stats.total}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Currently Checked-In
            </CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? <Skeleton className="h-8 w-12" /> : stats.checkedIn}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Visits
            </CardTitle>
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-12" /> : stats.completed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending/Approved
            </CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {isLoading ? <Skeleton className="h-8 w-12" /> : stats.pending}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
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
                autoFocus
                className="cursor-pointer"
                // FIX: Use the normalized date for the 'before' property
                disabled={{
                  before: branchCreationDate,
                  after: new Date(),
                }}
              />
            </PopoverContent>
          </Popover>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px] cursor-pointer">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">
                All Statuses
              </SelectItem>
              <SelectItem value="PENDING" className="cursor-pointer">
                Pending
              </SelectItem>
              <SelectItem value="APPROVED" className="cursor-pointer">
                Approved
              </SelectItem>
              <SelectItem value="CHECKED_IN" className="cursor-pointer">
                Checked-In
              </SelectItem>
              <SelectItem value="CHECKED_OUT" className="cursor-pointer">
                Completed
              </SelectItem>
              <SelectItem value="REJECTED" className="cursor-pointer">
                Rejected
              </SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:max-w-xs"
          />
        </div>

        <VisitorsTable visitors={filteredVisitors} isLoading={isLoading} />
      </div>
    </div>
  );
}
