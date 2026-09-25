'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AttendantApprovalApi,
  type AttendantApprovalPreview,
} from '@/lib/services/attendantApprovalService';

function ApproveAttendantContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const [preview, setPreview] = useState<AttendantApprovalPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);
  const [doneMessage, setDoneMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Missing approval token.');
      setLoading(false);
      return;
    }
    AttendantApprovalApi.getPreview(token)
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
      const result = await AttendantApprovalApi.approve(token);
      setDone('approved');
      setDoneMessage(result.message);
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
      const result = await AttendantApprovalApi.reject(token);
      setDone('rejected');
      setDoneMessage(result.message);
      toast.success(result.message);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? 'Could not decline request.');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <ConnitorLoader variant="section" message="Loading request…" className="py-10" />
    );
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (done === 'approved') {
    return (
      <div className="space-y-3 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <p className="font-medium">Visit pass approved</p>
        <p className="text-sm text-muted-foreground">
          {doneMessage ||
            'The visitor will receive their QR pass by email. This link can no longer be used.'}
        </p>
      </div>
    );
  }

  if (done === 'rejected') {
    return (
      <div className="space-y-3 text-center">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <p className="font-medium">Request declined</p>
        <p className="text-sm text-muted-foreground">
          {doneMessage || 'The attendant visit pass request was declined.'}
        </p>
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
            : `This request is already ${preview.status.toLowerCase().replace('_', ' ')}.`}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 rounded-lg border bg-muted/40 p-4 text-sm">
        {preview.hospitalName && (
          <p>
            <span className="text-muted-foreground">Hospital:</span>{' '}
            <strong>{preview.hospitalName}</strong>
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Visitor:</span>{' '}
          <strong>{preview.attendantName}</strong>
        </p>
        <p>
          <span className="text-muted-foreground">Phone:</span> {preview.attendantPhone}
        </p>
        <p>
          <span className="text-muted-foreground">Email:</span> {preview.attendantEmail}
        </p>
        {preview.relationship && (
          <p>
            <span className="text-muted-foreground">Relationship:</span> {preview.relationship}
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Patient:</span> {preview.patientName}
          {preview.patientMrn ? ` (MRN ${preview.patientMrn})` : ''}
        </p>
        {(preview.wardName || preview.roomNumber) && (
          <p>
            <span className="text-muted-foreground">Location:</span>{' '}
            {[preview.wardName, preview.roomNumber ? `Room ${preview.roomNumber}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        No login required. Approving issues the visit pass QR to the visitor by email. This link
        works once (expires in 24 hours).
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" onClick={() => void onApprove()} disabled={acting}>
          {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Yes — Approve & issue pass
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={() => void onReject()}
          disabled={acting}
        >
          No — Decline
        </Button>
      </div>
    </div>
  );
}

export default function ApproveAttendantPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Attendant pass approval</CardTitle>
          <CardDescription>Ward one-tap approval — no login required</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ConnitorLoader variant="inline" message="Loading…" />}>
            <ApproveAttendantContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
