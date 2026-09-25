'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AppointmentApprovalApi,
  type ApprovalPreview,
} from '@/lib/services/appointmentApprovalService';

function ApproveVisitContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const [preview, setPreview] = useState<ApprovalPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Missing approval token.');
      setLoading(false);
      return;
    }
    AppointmentApprovalApi.getPreview(token)
      .then(setPreview)
      .catch((err: { response?: { status?: number; data?: { detail?: string } } }) => {
        const status = err.response?.status;
        const detail = err.response?.data?.detail;
        if (status === 410) {
          setError(detail ?? 'This approval link has already been used or has expired.');
        } else {
          setError(detail ?? 'This link is invalid or has expired.');
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const onApprove = async () => {
    if (!token) return;
    setActing(true);
    try {
      const result = await AppointmentApprovalApi.approve(token);
      setDone('approved');
      toast.success(result.message);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? 'Could not approve. The link may have expired or already been used.');
    } finally {
      setActing(false);
    }
  };

  const onReject = async () => {
    if (!token) return;
    setActing(true);
    try {
      const result = await AppointmentApprovalApi.reject(token);
      setDone('rejected');
      toast.success(result.message);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? 'Could not decline appointment.');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <ConnitorLoader variant="section" message="Loading appointment…" className="py-10" />
    );
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (done === 'approved') {
    return (
      <div className="space-y-3 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <p className="font-medium">Appointment approved</p>
        <p className="text-sm text-muted-foreground">
          The visitor has been notified with QR check-in details. Security and admin dashboards
          have been updated. This link can no longer be used.
        </p>
      </div>
    );
  }

  if (done === 'rejected') {
    return (
      <div className="space-y-3 text-center">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <p className="font-medium">Appointment declined</p>
        <p className="text-sm text-muted-foreground">The visitor has been notified.</p>
      </div>
    );
  }

  if (!preview) return null;

  if (preview.used || preview.expired || !preview.canAct) {
    return (
      <p className="text-muted-foreground">
        {preview.used
          ? 'This approval link has already been used.'
          : preview.expired
            ? 'This approval link has expired.'
            : `This appointment is already ${preview.status.toLowerCase().replace('_', ' ')}.`}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
        <p>
          <span className="text-muted-foreground">Visitor:</span>{' '}
          <strong>{preview.visitorName}</strong>
        </p>
        <p>
          <span className="text-muted-foreground">Doctor:</span>{' '}
          {preview.doctorName ?? '—'}
        </p>
        {preview.appointmentDate && (
          <p>
            <span className="text-muted-foreground">
              {preview.isCustomSlotRequest ? 'Requested date & time:' : 'Date & time:'}
            </span>{' '}
            {preview.appointmentDate}
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Meeting mode:</span>{' '}
          {preview.appointmentMode === 'ONLINE' ? 'Online' : 'Offline'}
        </p>
        {preview.isOpenSlotRequest && (
          <p className="text-amber-800 text-xs pt-1">
            {preview.visitorName} is requesting a visit slot. You decide the date and time.
          </p>
        )}
        {preview.isCustomSlotRequest && !preview.isOpenSlotRequest && (
          <p className="text-amber-800 text-xs pt-1">
            Visitor requested this date, time, and meeting mode (not from your published slots).
            Approving confirms this slot.
          </p>
        )}
        {preview.purpose && (
          <p>
            <span className="text-muted-foreground">Purpose:</span> {preview.purpose}
          </p>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        No login required. This secure link works once — after you choose Yes or No it cannot be
        used again (expires in 24 hours).
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" onClick={onApprove} disabled={acting}>
          {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {preview.isOpenSlotRequest
            ? 'Approve visit request'
            : preview.isCustomSlotRequest
              ? 'Approve this time'
              : 'Yes'}
        </Button>
        <Button variant="destructive" className="flex-1" onClick={onReject} disabled={acting}>
          No
        </Button>
      </div>
    </div>
  );
}

export default function ApproveVisitPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Appointment approval</CardTitle>
          <CardDescription>Doctor one-tap approval — no login required</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ConnitorLoader variant="inline" message="Loading…" />}>
            <ApproveVisitContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
