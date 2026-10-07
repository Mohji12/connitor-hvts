'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { CheckCircle2, IdCard, Loader2 } from 'lucide-react';
import { AttendantPassService } from '@/lib/services/attendantPassService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { parseQrScanText, QrCheckInScanner } from '@/components/security/QrCheckInScanner';

interface AttendantPassScanTabProps {
  branchId: string;
}

type ScanResult = {
  valid?: boolean;
  passNumber?: string;
  scanType?: string;
  isInside?: boolean;
  enteredAt?: string | null;
  exitedAt?: string | null;
  durationMinutes?: number | null;
  govtIdImageUrl?: string;
  emailsSent?: number;
  emailRecipients?: string[];
  checkoutQrEmailed?: boolean;
  outsideVisitingHours?: boolean;
  visitingHoursSummary?: string | null;
  attendant?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    relationship?: string;
    status?: string;
    companionName?: string | null;
  };
  admission?: {
    wardName?: string | null;
    roomNumber?: string | null;
    patient?: { name?: string; mrn?: string } | null;
  };
};

export function AttendantPassScanTab({ branchId }: AttendantPassScanTabProps): React.ReactElement {
  const [qrText, setQrText] = React.useState('');
  const [signature, setSignature] = React.useState('');
  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [manualOpen, setManualOpen] = React.useState(false);
  const [meetings, setMeetings] = React.useState<
    Array<{ message: string; companionName?: string | null; passNumber: string }>
  >([]);
  const [activity, setActivity] = React.useState<
    Array<{ name: string; patient: string; status: string; companionName?: string | null; passNumber?: string }>
  >([]);

  const loadMeetings = React.useCallback(() => {
    if (!branchId) return;
    AttendantPassService.dashboardSummary(branchId)
      .then((data) => {
        setMeetings(data.meetings ?? []);
        setActivity(data.recentActivity ?? []);
      })
      .catch(() => undefined);
  }, [branchId]);

  React.useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const applyDecodedQr = (decoded: string) => {
    setQrText(decoded);
    const parsed = parseQrScanText(decoded);
    if (parsed) {
      setSignature(parsed.signature);
      const isExit = parsed.qrPayload.startsWith('PASS-EXIT:');
      toast.success(
        isExit
          ? 'Checkout QR scanned — validate to check out'
          : 'Pass QR scanned. Validate to check in, or to check out if they are already inside.',
      );
    } else {
      setManualOpen(true);
      toast.message('QR scanned — enter signature if not included');
    }
  };

  const handleScan = async () => {
    setError(null);
    setResult(null);
    let payload = qrText.trim();
    let sig = signature.trim();
    const parsed = parseQrScanText(qrText);
    if (parsed) {
      payload = parsed.qrPayload;
      sig = parsed.signature;
    }
    if (!payload || !sig) {
      setError('QR payload and signature are required');
      return;
    }
    const isExitQr = payload.startsWith('PASS-EXIT:');

    const form = new FormData();
    form.append('qrPayload', payload);
    form.append('signature', sig);
    form.append('scanType', isExitQr ? 'EXIT' : 'ENTRY');

    setLoading(true);
    try {
      const res = (await AttendantPassService.scanPass(form)) as ScanResult;
      setResult(res);
      loadMeetings();
      if (res.scanType === 'EXIT') {
        const emailed = Number(res.emailsSent ?? 0);
        toast.success(
          emailed > 0
            ? `Checked out — visit summary emailed to attendant`
            : res.durationMinutes != null
              ? `Checked out — ${res.durationMinutes} min inside`
              : 'Checked out',
        );
      } else {
        toast.success('Checked in. Scan the same QR to check out.');
      }
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      setError(detail || 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const attendant = result?.attendant;
  const admission = result?.admission;
  const patientName = admission?.patient?.name;

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <div
          key={meeting.passNumber}
          className="rounded-xl border border-[#0052CC]/20 bg-[#4A90E2]/10 px-4 py-3 text-sm text-[#001B71]"
        >
          <p className="font-medium">{meeting.message}</p>
          {meeting.companionName ? <p className="mt-1">With {meeting.companionName}</p> : null}
        </div>
      ))}
      <Card>
        <CardHeader>
          <CardTitle>Scan attendant visit pass</CardTitle>
          <p className="text-sm text-muted-foreground">
            Branch {branchId}. Scan the WhatsApp pass QR to check in. Scan that same QR to check out.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <QrCheckInScanner
            readerId="attendant-qr-reader"
            onScan={async (decoded) => applyDecodedQr(decoded)}
            hint="Show the QR from the attendant pass on WhatsApp."
            buttonLabel="Open camera"
          />

          <Button
            type="button"
            variant="ghost"
            className="h-auto px-0 text-sm text-muted-foreground"
            onClick={() => setManualOpen((v) => !v)}
          >
            {manualOpen ? 'Hide manual entry' : 'Paste QR manually'}
          </Button>

          {manualOpen && (
            <div className="space-y-3 rounded-lg border border-dashed p-3">
              <div>
                <Label>QR (JSON or payload)</Label>
                <Input
                  placeholder='Paste QR JSON {"qrPayload":"...","signature":"..."} or payload'
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                />
              </div>
              <div>
                <Label>Signature (if not in JSON)</Label>
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} />
              </div>
            </div>
          )}

          {(qrText || signature) && !manualOpen && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              QR captured{signature ? ' with signature' : ''}.
              Validate to check this person in, or to check them out if they are already inside.
            </p>
          )}

          <Button disabled={loading} onClick={() => void handleScan()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating…
              </>
            ) : (
              'Validate QR'
            )}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {activity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {activity.slice(0, 8).map((row, idx) => (
              <div key={`${row.passNumber ?? row.name}-${idx}`} className="flex justify-between gap-3">
                <span>
                  {row.name}
                  {row.companionName ? ` with ${row.companionName}` : ''} · {row.patient}
                </span>
                <span className="font-medium">{row.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                {result.scanType === 'EXIT' ? 'Exit recorded' : 'Entry recorded'}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.scanType === 'EXIT'
                  ? Number(result.emailsSent ?? 0) > 0
                    ? 'Visit complete. Summary emailed to the attendant, ward, and security.'
                    : 'Visit complete. Duration recorded (email skipped if no address on file).'
                  : 'Attendant is inside. Scan the same QR when they leave.'}
              </p>
            </div>
            <Badge className="bg-emerald-600 hover:bg-emerald-600">
              {result.scanType ?? 'ENTRY'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-teal-900">
                <IdCard className="h-4 w-4" />
                Gate pass
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold tracking-wide text-slate-900">
                {result.passNumber ?? '—'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Scan type: {result.scanType ?? 'ENTRY'}
              </p>
              {result.durationMinutes != null && (
                <p className="mt-2 font-semibold text-teal-900">
                  Time inside: {result.durationMinutes} min
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-white p-4 text-sm">
                <p className="font-medium text-slate-900">Attendant</p>
                <dl className="mt-2 space-y-1.5 text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <dt>Name</dt>
                    <dd className="text-right font-medium text-slate-800">
                      {attendant?.name ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Relationship</dt>
                    <dd className="text-right">{attendant?.relationship ?? '—'}</dd>
                  </div>
                  {attendant?.companionName ? (
                    <div className="flex justify-between gap-2">
                      <dt>With</dt>
                      <dd className="text-right">{attendant.companionName}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-2">
                    <dt>Phone</dt>
                    <dd className="text-right">{attendant?.phone ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Email</dt>
                    <dd className="break-all text-right">{attendant?.email ?? '—'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border bg-white p-4 text-sm">
                <p className="font-medium text-slate-900">Patient / ward</p>
                <dl className="mt-2 space-y-1.5 text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <dt>Patient</dt>
                    <dd className="text-right font-medium text-slate-800">
                      {patientName ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>MRN</dt>
                    <dd className="text-right">{admission?.patient?.mrn ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Ward</dt>
                    <dd className="text-right">{admission?.wardName ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Room</dt>
                    <dd className="text-right">{admission?.roomNumber ?? '—'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
