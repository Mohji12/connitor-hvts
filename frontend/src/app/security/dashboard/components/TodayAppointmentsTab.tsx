'use client';

import * as React from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Calendar, CheckCircle2, Hourglass, IdCard, LogOut, PauseCircle, RefreshCw, ShieldCheck, Video } from 'lucide-react';
import {
  SecurityAppointmentService,
  type TodayAppointment,
} from '@/lib/services/securityAppointmentService';
import { VisitorService } from '@/lib/services/visitorService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MEETING_STATUS_LABELS } from '@/lib/constants/visit-constants';
import { formatIstDateTime } from '@/lib/datetime';
import { IdProofVerificationForm } from '@/components/security/IdProofVerificationForm';
import { VisitorGovernmentIdDialog } from '@/components/security/VisitorGovernmentIdDialog';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
import { EmptyState, ListSkeleton } from '@/components/mobile/EmptyState';
import { ResponsiveDialog } from '@/components/mobile/ResponsiveDialog';

type Props = {
  branchId: string;
  className?: string;
  /** Bump to refetch appointments (e.g. after check-in from Check-In tab). */
  refreshKey?: number;
};

const REFRESH_MS = 5_000;

type MobileFilter = 'today' | 'pending' | 'upcoming';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  REQUEST_SENT: 'outline',
  APPROVED: 'secondary',
  CHECKED_IN: 'default',
  CHECKED_OUT: 'outline',
};

function AppointmentCard({
  appt,
  onVerify,
  onViewId,
  onCheckOut,
}: {
  appt: TodayAppointment;
  onVerify: (appt: TodayAppointment) => void;
  onViewId: (appt: TodayAppointment) => void;
  onCheckOut: (visitId: string, visitorName: string) => void;
}) {
  const doctorConfirmed =
    appt.doctorConfirmed ?? appt.status === 'APPROVED';

  return (
    <Card className="max-lg:gap-3 max-lg:rounded-2xl max-lg:py-4 [&_[data-slot=button]]:max-lg:h-10">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">{appt.visitorName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Dr. {appt.doctorName ?? '—'} · {appt.visitorPhone}
            </p>
            {appt.appointmentDate && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatIstDateTime(appt.appointmentDate)}
              </p>
            )}
            {appt.visitorPassId ? (
              <p className="text-xs font-mono font-semibold text-primary mt-1">
                Pass ID: {appt.visitorPassId}
              </p>
            ) : null}
            {appt.expectedEndTime && appt.status === 'CHECKED_IN' ? (
              <p className="text-xs text-amber-800 mt-1">
                Expected end: {formatIstDateTime(appt.expectedEndTime)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {appt.isOnline && (
              <Badge className="bg-violet-600 hover:bg-violet-600">
                <Video className="h-3 w-3 mr-1" />
                Online appointment
              </Badge>
            )}
            {doctorConfirmed && appt.status === 'APPROVED' && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Doctor confirmed
              </Badge>
            )}
            <Badge variant={STATUS_VARIANT[appt.status] ?? 'outline'}>
              {appt.status === 'REQUEST_SENT' ? 'Awaiting doctor' : appt.status}
            </Badge>
            {appt.holdNextVisitor && (
              <Badge className="bg-amber-600 hover:bg-amber-600">
                <PauseCircle className="h-3 w-3 mr-1" />
                Hold next visitor
              </Badge>
            )}
            {appt.visitorType === 'SALES_REPRESENTATIVE' && appt.meetingStatus && (
              <Badge variant="outline" className="border-primary text-primary">
                Meeting: {MEETING_STATUS_LABELS[appt.meetingStatus] ?? appt.meetingStatus}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{appt.purpose ?? 'Appointment visit'}</p>
        {appt.status === 'CHECKED_IN' && appt.checkInTime && (
          <p className="text-xs text-emerald-700">
            Checked in at {formatIstDateTime(appt.checkInTime)}
          </p>
        )}
        {appt.status === 'CHECKED_OUT' && appt.checkOutTime && (
          <p className="text-xs text-muted-foreground">
            Checked out at {formatIstDateTime(appt.checkOutTime)}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {!appt.isOnline && (
            <Button size="sm" variant="ghost" onClick={() => onViewId(appt)}>
              <IdCard className="h-4 w-4 mr-1" /> View ID
            </Button>
          )}
          {appt.status === 'REQUEST_SENT' ? (
            <p className="text-xs text-amber-700">
              Waiting for Dr. {appt.doctorName ?? '—'} to approve this booking.
            </p>
          ) : appt.isOnline ? (
            <div className="space-y-1">
              <p className="text-xs text-violet-700">
                Virtual visit — no physical check-in required
              </p>
              {appt.meetingJoinUrl && (
                <a
                  href={appt.meetingJoinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-violet-600 underline"
                >
                  Video consultation link (reference)
                </a>
              )}
            </div>
          ) : (
            <>
              {appt.status === 'APPROVED' && !appt.idProofVerified && (
                <Button size="sm" variant="outline" onClick={() => onVerify(appt)}>
                  <ShieldCheck className="h-4 w-4 mr-1" /> Verify ID
                </Button>
              )}
              {appt.status === 'APPROVED' && appt.idProofVerified && (
                <span className="text-xs text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> ID verified — scan visitor QR in Check-In tab
                </span>
              )}
              {appt.status === 'CHECKED_IN' && (
                <Button size="sm" onClick={() => onCheckOut(appt.visitId, appt.visitorName)}>
                  <LogOut className="h-4 w-4 mr-1" /> Check Out
                </Button>
              )}
              {appt.status === 'CHECKED_OUT' && (
                <span className="text-xs text-muted-foreground">Visit completed</span>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TodayAppointmentsTab({ className, refreshKey = 0 }: Props) {
  const [verifyVisit, setVerifyVisit] = React.useState<TodayAppointment | null>(null);
  const [viewIdVisit, setViewIdVisit] = React.useState<TodayAppointment | null>(null);
  const [mobileFilter, setMobileFilter] = React.useState<MobileFilter>('today');
  const { data: pendingData, isLoading: pendingLoading, mutate: mutatePending } = useSWR(
    ['/api/security/appointments/pending', refreshKey],
    () => SecurityAppointmentService.getPendingAppointments(),
    { refreshInterval: REFRESH_MS },
  );
  const { data, isLoading, mutate } = useSWR(
    ['/api/security/appointments/today', refreshKey],
    () => SecurityAppointmentService.getTodayAppointments(),
    { refreshInterval: REFRESH_MS },
  );
  const { data: confirmedData, isLoading: confirmedLoading, mutate: mutateConfirmed } = useSWR(
    '/api/security/appointments/confirmed',
    () => SecurityAppointmentService.getConfirmedAppointments(),
    { refreshInterval: REFRESH_MS },
  );

  const pendingAppointments = pendingData?.appointments ?? [];
  const appointments = data?.appointments ?? [];
  const upcomingConfirmed = confirmedData?.appointments ?? [];

  const refreshAll = () => {
    mutatePending();
    mutate();
    mutateConfirmed();
  };

  const handleCheckOut = async (visitId: string, visitorName: string) => {
    try {
      const result = await VisitorService.checkOut(visitId);
      const duration =
        (result as { totalDurationMinutes?: number; durationMinutes?: number })
          .totalDurationMinutes ??
        (result as { durationMinutes?: number }).durationMinutes;
      toast.success(`${visitorName} checked out`, {
        description: duration != null ? `Visit duration: ${duration} minutes` : undefined,
      });
      refreshAll();
    } catch {
      toast.error('Check-out failed');
    }
  };

  const mobileLists: Record<MobileFilter, TodayAppointment[]> = {
    today: appointments,
    pending: pendingAppointments,
    upcoming: upcomingConfirmed,
  };
  const hideOnMobile = (section: MobileFilter): string | undefined =>
    mobileFilter === section ? undefined : 'max-lg:hidden';
  const anyLoading = pendingLoading || isLoading || confirmedLoading;

  return (
    <div className={className}>
      <div className="mb-4 hidden items-center justify-between lg:flex">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Appointments
          </h2>
          <p className="text-sm text-muted-foreground">
            New bookings appear under pending until the doctor approves. Confirmed visits can be checked in.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="mb-3 flex items-center gap-2 lg:hidden">
        <SegmentedControl
          className="flex-1"
          value={mobileFilter}
          onChange={setMobileFilter}
          ariaLabel="Filter appointments"
          options={[
            { value: 'today', label: 'Today', count: appointments.length },
            { value: 'pending', label: 'Pending', count: pendingAppointments.length },
            { value: 'upcoming', label: 'Upcoming', count: upcomingConfirmed.length },
          ]}
        />
        <Button variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={refreshAll} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {anyLoading && (
        <>
          <p className="hidden text-sm text-muted-foreground lg:block">Loading appointments...</p>
          {mobileLists[mobileFilter].length === 0 ? <ListSkeleton className="lg:hidden" /> : null}
        </>
      )}

      {!anyLoading && mobileLists[mobileFilter].length === 0 && (
        <EmptyState
          className="lg:hidden"
          icon={Calendar}
          title={
            mobileFilter === 'pending'
              ? 'Nothing waiting for a doctor'
              : mobileFilter === 'upcoming'
                ? 'No upcoming confirmed visits'
                : 'No appointments today'
          }
        />
      )}

      {!pendingLoading && pendingAppointments.length > 0 && (
        <div className={hideOnMobile('pending')}>
          <h3 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1.5 max-lg:hidden">
            <Hourglass className="h-4 w-4" />
            Pending doctor approval ({pendingAppointments.length})
          </h3>
          <ul className="space-y-3 mb-6">
            {pendingAppointments.map((appt) => (
              <li key={appt.visitId}>
                <AppointmentCard
                  appt={appt}
                  onVerify={setVerifyVisit}
                  onViewId={setViewIdVisit}
                  onCheckOut={handleCheckOut}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isLoading && appointments.length === 0 && pendingAppointments.length === 0 && (
        <Card className="mb-4 max-lg:hidden">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No doctor-confirmed appointments scheduled for today.
          </CardContent>
        </Card>
      )}

      {appointments.length > 0 && (
        <div className={hideOnMobile('today')}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 max-lg:hidden">Today</h3>
          <ul className="space-y-3 mb-6">
            {appointments.map((appt) => (
              <li key={appt.visitId}>
                <AppointmentCard
                  appt={appt}
                  onVerify={setVerifyVisit}
                  onViewId={setViewIdVisit}
                  onCheckOut={handleCheckOut}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {!confirmedLoading && upcomingConfirmed.length > 0 && (
        <div className={hideOnMobile('upcoming')}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 max-lg:hidden">
            Upcoming — doctor confirmed
          </h3>
          <ul className="space-y-3">
            {upcomingConfirmed.map((appt) => (
              <li key={appt.visitId}>
                <AppointmentCard
                  appt={appt}
                  onVerify={setVerifyVisit}
                  onViewId={setViewIdVisit}
                  onCheckOut={handleCheckOut}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {viewIdVisit && (
        <VisitorGovernmentIdDialog
          visitId={viewIdVisit.visitId}
          visitorName={viewIdVisit.visitorName}
          open
          onOpenChange={(o) => !o && setViewIdVisit(null)}
        />
      )}

      {verifyVisit && (
        <ResponsiveDialog
          open
          onOpenChange={(o) => !o && setVerifyVisit(null)}
          title={`Verify ID — ${verifyVisit.visitorName}`}
        >
          <IdProofVerificationForm
            visitId={verifyVisit.visitId}
            idProofVerified={false}
            onVerified={() => {
              setVerifyVisit(null);
              refreshAll();
            }}
          />
        </ResponsiveDialog>
      )}
    </div>
  );
}
