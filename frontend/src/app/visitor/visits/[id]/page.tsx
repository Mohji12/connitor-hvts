'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarClock, MessageSquare, Video, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { StatusChip } from '@/components/mobile/StatusChip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GatePassButton } from '@/features/visitor-dashboard/GatePassButton';
import { doctorLabel, hasGatePass } from '@/features/visitor-dashboard/visit-filters';
import { formatIstDateTime } from '@/lib/datetime';
import {
  VisitorPortalService,
  clearVisitorToken,
  getVisitorToken,
  type VisitorAppointment,
} from '@/lib/services/visitorPortalService';
import { visitorVisitIdFromLocation } from '@/lib/static-export-route';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement | null {
  if (value == null || value === '') return null;
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}:</span> {value}
    </p>
  );
}

function modeLabel(mode: string | null | undefined): string | null {
  if (!mode) return null;
  if (mode === 'ONLINE' || mode === 'online') return 'Online session';
  return 'In person';
}

function typeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value === 'SALES_REPRESENTATIVE') return 'Sales representative';
  if (value === 'VENDOR') return 'Vendor';
  return 'General visit';
}

export default function VisitorVisitDetailPage(): React.ReactElement {
  const router = useRouter();
  const params = useParams();
  const [id, setId] = React.useState(() =>
    visitorVisitIdFromLocation(
      typeof window === 'undefined' ? '' : window.location.pathname,
      params.id,
    ),
  );
  const [visit, setVisit] = React.useState<VisitorAppointment | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setId(visitorVisitIdFromLocation(window.location.pathname, params.id));
  }, [params.id]);

  React.useEffect(() => {
    if (!getVisitorToken()) {
      router.replace('/visitor/login');
      return;
    }
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    VisitorPortalService.getAppointment(id)
      .then((row) => {
        if (cancelled) return;
        setVisit(row);
        if (!row) toast.error('Could not find this visit');
      })
      .catch((error: { response?: { status?: number } }) => {
        if (cancelled) return;
        if (error.response?.status === 401) {
          clearVisitorToken();
          router.replace('/visitor/login');
          return;
        }
        toast.error('Could not load visit details');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (loading) {
    return <ConnitorLoader variant="fullscreen" message="Opening visit details…" />;
  }

  return (
    <VisitorPortalShell appTabs>
      <main className="mx-auto w-full min-w-0 max-w-3xl space-y-4 px-3 py-5 lg:px-6 lg:py-8">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-11 w-11">
            <Link href="/visitor/dashboard" aria-label="Back to my visits">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-900">Visit details</h1>
            <p className="hidden text-sm text-muted-foreground lg:block">
              Status, hospital, slot, and gate pass for this booking.
            </p>
          </div>
        </div>

        {!visit ? (
          <Card>
            <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
              <p>This visit is not on your account, or it has not loaded.</p>
              <Button asChild variant="outline">
                <Link href="/visitor/dashboard">Back to my visits</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-[#001B71]/10 bg-white/90">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="min-w-0 truncate text-base">
                  {doctorLabel(visit.doctorName) ?? visit.departmentName ?? 'Visit'}
                </CardTitle>
                <StatusChip status={visit.status} />
              </CardHeader>
              <CardContent className="space-y-2">
                <DetailRow
                  label="Hospital"
                  value={[visit.hospitalChainName, visit.branchName].filter(Boolean).join(' · ') || null}
                />
                <DetailRow
                  label="Department"
                  value={[visit.departmentName, visit.subDepartmentName].filter(Boolean).join(' · ') || null}
                />
                <DetailRow label="Scheduled" value={formatIstDateTime(visit.appointmentDate)} />
                <DetailRow label="Mode" value={modeLabel(visit.appointmentMode)} />
                <DetailRow label="Visit type" value={typeLabel(visit.visitorType)} />
                {visit.companyName ? <DetailRow label="Company" value={visit.companyName} /> : null}
                <DetailRow label="Purpose" value={visit.purpose} />
                <DetailRow label="Carrying" value={visit.itemsCarrying} />
                {visit.checkInTime ? (
                  <DetailRow label="Checked in" value={formatIstDateTime(visit.checkInTime)} />
                ) : null}
                {visit.checkOutTime ? (
                  <DetailRow
                    label="Checked out"
                    value={`${formatIstDateTime(visit.checkOutTime)}${
                      visit.totalDurationMinutes ? ` · ${visit.totalDurationMinutes} min` : ''
                    }`}
                  />
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-[#001B71]/10 bg-white/90">
              <CardHeader>
                <CardTitle className="text-base">Gate pass</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {hasGatePass(visit) ? (
                  <>
                    <p className="text-muted-foreground">
                      Show this pass at the hospital gate. It is also saved on this phone.
                    </p>
                    <GatePassButton item={visit} className="w-full" />
                  </>
                ) : visit.status === 'REQUEST_SENT' ? (
                  <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                    Waiting for the doctor. Your gate pass appears here once approved.
                  </p>
                ) : (
                  <p className="text-muted-foreground">No active gate pass on this visit.</p>
                )}
                {visit.meetingJoinUrl ? (
                  <Button asChild variant="outline" className="w-full">
                    <a href={visit.meetingJoinUrl}>
                      <Video className="mr-2 h-4 w-4" />
                      Join online session
                    </a>
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            {visit.doctorFeedback ? (
              <Card className="border-[#001B71]/10 bg-white/90 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-4 w-4" />
                    Message from doctor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-800">{visit.doctorFeedback}</p>
                  {visit.doctorFeedbackAt ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatIstDateTime(visit.doctorFeedbackAt)}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {visit.status === 'REJECTED' && visit.rejectionReason ? (
              <Card className="border-red-200 bg-red-50 lg:col-span-2">
                <CardContent className="flex items-start gap-2 pt-6 text-sm text-red-800">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{visit.rejectionReason}</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </main>
    </VisitorPortalShell>
  );
}
