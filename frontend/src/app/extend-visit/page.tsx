'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VisitExtendApi, type VisitExtendPreview } from '@/lib/services/visitExtendService';
import { formatIstDateTime } from '@/lib/datetime';

function ExtendVisitContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const visitId = params.get('visitId');
  const [preview, setPreview] = useState<VisitExtendPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [minutes, setMinutes] = useState(10);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !visitId) {
      setError('This extension link is missing required details.');
      setLoading(false);
      return;
    }
    VisitExtendApi.preview(visitId, token)
      .then((data) => {
        setPreview(data);
        if (!data.canAct) {
          setError(
            data.used
              ? 'This extension link has already been used.'
              : 'This extension link has expired.',
          );
        }
      })
      .catch((err: { response?: { status?: number; data?: { detail?: string } } }) => {
        setError(err.response?.data?.detail ?? 'This link is invalid or has expired.');
      })
      .finally(() => setLoading(false));
  }, [token, visitId]);

  const confirm = async () => {
    if (!token || !visitId) return;
    setSaving(true);
    setError('');
    try {
      const result = await VisitExtendApi.confirm(visitId, token, minutes);
      setDone(
        result.expectedEndTime
          ? `Extended by ${result.extendedByMinutes} minutes. New end: ${formatIstDateTime(result.expectedEndTime)}.`
          : `Extended by ${result.extendedByMinutes} minutes.`,
      );
    } catch (err: unknown) {
      const detail =
        typeof err === 'object' && err && 'response' in err
          ? String(
              (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '',
            )
          : '';
      setError(detail || 'Could not extend this visit.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
      </div>
    );
  }

  if (error && !preview?.canAct) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <XCircle className="h-5 w-5" /> Unable to extend
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-teal-800">
            <CheckCircle2 className="h-5 w-5" /> Visit extended
          </CardTitle>
          <CardDescription>{done}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          {preview?.visitorName && <p>Visitor: {preview.visitorName}</p>}
          {preview?.doctorName && <p>Doctor: {preview.doctorName}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Extend this visit</CardTitle>
        <CardDescription>
          {preview?.visitorName ? `Visit with ${preview.visitorName}` : 'Current visitor'}
          {preview?.expectedEndTime
            ? ` is due to end at ${formatIstDateTime(preview.expectedEndTime)}.`
            : '.'}{' '}
          Security will hold the next visitor until the new end time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="space-y-1.5">
          <Label htmlFor="extend-minutes">Add minutes (1–60)</Label>
          <Input
            id="extend-minutes"
            type="number"
            min={1}
            max={60}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
          />
        </div>
        <Button className="w-full" disabled={saving} onClick={() => void confirm()}>
          {saving ? 'Saving…' : `Extend by ${minutes} minutes`}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ExtendVisitPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
          </div>
        }
      >
        <ExtendVisitContent />
      </Suspense>
    </main>
  );
}
