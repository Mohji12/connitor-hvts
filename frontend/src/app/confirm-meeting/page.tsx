'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  SalesMeetingConfirmApi,
  type MeetingConfirmPreview,
} from '@/lib/services/salesMeetingConfirmService';

function ConfirmMeetingContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const passId = params.get('passId');
  const status = params.get('status');
  const [preview, setPreview] = useState<MeetingConfirmPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !passId) {
      setError('This confirmation link is missing required details.');
      setLoading(false);
      return;
    }
    const desired = status === 'started' || status === 'not_attended' ? status : null;
    SalesMeetingConfirmApi.preview(passId, token)
      .then(async (data) => {
        setPreview(data);
        if (!desired) return;
        if (!data.canAct) {
          setError(
            data.used
              ? 'This confirmation link has already been used.'
              : 'This confirmation link has expired.',
          );
          return;
        }
        const result = await SalesMeetingConfirmApi.confirm(passId, token, desired);
        setDone(result.meetingStatus);
      })
      .catch((err: { response?: { status?: number; data?: { detail?: string } } }) => {
        const statusCode = err.response?.status;
        const detail = err.response?.data?.detail;
        if (statusCode === 410) {
          setError(detail ?? 'This confirmation link has already been used or has expired.');
        } else {
          setError(detail ?? 'This link is invalid or has expired.');
        }
      })
      .finally(() => setLoading(false));
  }, [token, passId, status]);

  if (loading) {
    return <ConnitorLoader variant="section" message="Recording attendance…" className="py-10" />;
  }

  if (error) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <XCircle className="h-5 w-5" /> Unable to confirm
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (done) {
    const label = done === 'started' ? 'Meeting started' : 'Meeting not attended';
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-teal-800">
            <CheckCircle2 className="h-5 w-5" /> Attendance recorded
          </CardTitle>
          <CardDescription>
            {label}
            {preview?.passId ? ` for pass ${preview.passId}` : ''}.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          {preview?.doctorName && <p>Doctor: {preview.doctorName}</p>}
          {preview?.slotTime && <p>Slot: {preview.slotTime}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Confirm meeting attendance</CardTitle>
        <CardDescription>
          Use the Meeting Started or Meeting Not Attended button from your email.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default function ConfirmMeetingPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
          </div>
        }
      >
        <ConfirmMeetingContent />
      </Suspense>
    </main>
  );
}
