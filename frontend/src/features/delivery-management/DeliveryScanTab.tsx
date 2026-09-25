'use client';

import * as React from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeliveryStatusBadge } from '@/features/delivery-management/ui';
import { formatIstDateTime } from '@/lib/datetime';
import { parseQrScanText, QrCheckInScanner } from '@/components/security/QrCheckInScanner';

interface DeliveryScanTabProps {
  branchId: string;
}

export function DeliveryScanTab({ branchId }: DeliveryScanTabProps): React.ReactElement {
  const [qrText, setQrText] = React.useState('');
  const [signature, setSignature] = React.useState('');
  const [delivery, setDelivery] = React.useState<Record<string, unknown> | null>(null);
  const [passNumber, setPassNumber] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [manualOpen, setManualOpen] = React.useState(false);
  const [queue, setQueue] = React.useState<{
    walkInVisits: Array<Record<string, unknown>>;
    vendorDeliveries: Array<Record<string, unknown>>;
  } | null>(null);

  const [suggestedAction, setSuggestedAction] = React.useState<string | null>(null);
  const [gateTiming, setGateTiming] = React.useState<{
    entryTime?: string | null;
    exitTime?: string | null;
    durationMinutes?: number | null;
  } | null>(null);

  const loadQueue = React.useCallback(async () => {
    try {
      const res = await apiClient.get('/api/delivery/security/queue', { params: { branchId } });
      setQueue(res.data);
    } catch {
      setQueue({ walkInVisits: [], vendorDeliveries: [] });
    }
  }, [branchId]);

  React.useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const validateQr = React.useCallback(
    async (rawText: string, rawSig = '') => {
      setError(null);
      setPassNumber(null);
      setGateTiming(null);
      let payload = rawText.trim();
      let sig = rawSig.trim();
      const parsed = parseQrScanText(rawText);
      if (parsed) {
        payload = parsed.qrPayload;
        sig = parsed.signature;
      }
      if (!payload || !sig) {
        setError('QR payload and signature required');
        setManualOpen(true);
        return;
      }
      setQrText(rawText.trim());
      setSignature(sig);
      try {
        const res = await apiClient.post('/api/delivery/security/process-qr', {
          qrPayload: payload,
          signature: sig,
        });
        setDelivery((res.data.delivery as Record<string, unknown>) ?? null);
        setSuggestedAction(String(res.data.suggestedAction ?? ''));
        if (res.data.actionTaken === 'MARK_EXIT') {
          setGateTiming({
            entryTime: res.data.entryTime as string | null,
            exitTime: res.data.exitTime as string | null,
            durationMinutes: res.data.durationMinutes as number | null,
          });
          const emailed = Number(res.data.emailsSent ?? 0);
          toast.success(
            emailed > 0
              ? `Exit recorded — visit summary emailed to distributor and driver`
              : typeof res.data.message === 'string'
                ? res.data.message
                : 'Exit recorded',
          );
        } else {
          const d = res.data.delivery as Record<string, unknown> | undefined;
          if (d) {
            setGateTiming({
              entryTime: (d.entryTime as string) ?? null,
              exitTime: (d.exitTime as string) ?? null,
              durationMinutes: (d.durationMinutes as number) ?? null,
            });
          }
          toast.success(typeof res.data.message === 'string' ? res.data.message : 'QR valid');
        }
        void loadQueue();
      } catch (e: unknown) {
        setDelivery(null);
        setSuggestedAction(null);
        const detail =
          typeof e === 'object' && e && 'response' in e
            ? String(
                (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '',
              )
            : '';
        setError(detail || 'Scan failed');
      }
    },
    [loadQueue],
  );

  const handleManualScan = async () => {
    await validateQr(qrText, signature);
  };

  const onCameraScan = async (decoded: string) => {
    setQrText(decoded);
    const parsed = parseQrScanText(decoded);
    if (parsed) {
      setSignature(parsed.signature);
      await validateQr(decoded);
    } else {
      setManualOpen(true);
      setError('Scanned QR needs a signature — paste full JSON or enter signature below.');
      toast.message('QR scanned — add signature if needed');
    }
  };

  const allowEntry = async () => {
    if (!delivery?.id) return;
    try {
      const res = await apiClient.post(
        `/api/delivery/security/allow-entry/${String(delivery.id)}`,
      );
      setPassNumber(String(res.data.passNumber));
      setDelivery((prev) => (prev ? { ...prev, status: 'ARRIVED_AT_GATE' } : prev));
      const emailed = Number(res.data.emailsSent ?? 0);
      toast.success(
        emailed > 0
          ? 'Entry allowed — checkout QR emailed to driver/distributor'
          : 'Entry allowed — checkout QR email skipped if no address on file',
      );
      void loadQueue();
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detail || 'Allow entry failed');
    }
  };

  const markExit = async () => {
    if (!delivery?.id) return;
    try {
      const res = await apiClient.post(`/api/delivery/security/mark-exit/${String(delivery.id)}`);
      setGateTiming({
        entryTime: res.data.entryTime as string | null,
        exitTime: res.data.exitTime as string | null,
        durationMinutes: res.data.durationMinutes as number | null,
      });
      setDelivery(
        (res.data.delivery as Record<string, unknown>) ?? {
          ...delivery,
          status: 'EXITED',
        },
      );
      toast.success(
        (() => {
          const mins =
            res.data.durationMinutes != null ? `${res.data.durationMinutes} min inside` : 'Exit marked';
          const emailed = Number(res.data.emailsSent ?? 0);
          return emailed > 0
            ? `${mins} — summary emailed to distributor and driver`
            : mins;
        })(),
      );
      setPassNumber(null);
      void loadQueue();
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detail || 'Mark exit failed');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-amber-100 bg-white/90">
        <CardHeader>
          <CardTitle>Scan delivery QR</CardTitle>
          <p className="text-sm text-muted-foreground">
            Scan the driver&apos;s check-in QR to allow entry. After entry, a checkout QR is emailed —
            scan that after GRN to exit.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <QrCheckInScanner
            readerId="delivery-qr-reader"
            onScan={onCameraScan}
            hint="Show the check-in or checkout QR from the driver's email."
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
                <Label>QR JSON or payload</Label>
                <Input
                  placeholder='{"qrPayload":"...","signature":"..."}'
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                />
              </div>
              <div>
                <Label>Signature (if not in JSON)</Label>
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} />
              </div>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => void handleManualScan()}>
                Validate QR
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {delivery && (
        <Card className="border-teal-200 bg-teal-50/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{String(delivery.deliveryNumber ?? 'Delivery')}</CardTitle>
            <DeliveryStatusBadge status={String(delivery.status ?? '')} />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              {String(delivery.goodsType ?? 'Goods')} · {String(delivery.totalBoxes ?? 0)} boxes
            </p>
            <p>
              Driver / vehicle: {String(delivery.agentName ?? '—')} /{' '}
              {String(delivery.vehicleNumber ?? '—')}
            </p>
            {delivery.expectedArrivalTime ? (
              <p>ETA: {formatIstDateTime(String(delivery.expectedArrivalTime))}</p>
            ) : null}
            {Boolean(gateTiming?.entryTime || delivery.entryTime) ? (
              <p>
                Entry:{' '}
                {formatIstDateTime(String(gateTiming?.entryTime ?? delivery.entryTime))}
              </p>
            ) : null}
            {Boolean(gateTiming?.exitTime || delivery.exitTime) ? (
              <p>
                Exit: {formatIstDateTime(String(gateTiming?.exitTime ?? delivery.exitTime))}
              </p>
            ) : null}
            {gateTiming?.durationMinutes != null || delivery.durationMinutes != null ? (
              <p className="font-semibold text-teal-900">
                Time inside: {String(gateTiming?.durationMinutes ?? delivery.durationMinutes)} min
              </p>
            ) : null}
            {suggestedAction === 'MARK_EXIT' && delivery.status === 'RECEIVED' ? (
              <p className="rounded-md bg-white px-3 py-2 text-amber-900">
                Checkout QR confirmed — scan again or tap Mark exit below.
              </p>
            ) : null}
            {passNumber && (
              <p className="rounded-md bg-white px-3 py-2 font-semibold text-teal-900">
                Gate pass: {passNumber}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {(delivery.status === 'SCHEDULED' || delivery.status === 'APPROVED') && (
                <Button onClick={() => void allowEntry()}>Allow entry</Button>
              )}
              {delivery.status === 'RECEIVED' && (
                <Button variant="outline" onClick={() => void markExit()}>
                  Mark exit (or scan checkout QR)
                </Button>
              )}
            </div>
            {delivery.status === 'ARRIVED_AT_GATE' ||
            delivery.status === 'GATE_VERIFIED' ||
            delivery.status === 'IN_PROGRESS' ? (
              <p className="text-muted-foreground">
                Vehicle is inside — finish GRN, then scan the emailed checkout QR to exit.
              </p>
            ) : null}
            {delivery.status === 'EXITED' || delivery.status === 'CLOSED' ? (
              <p className="text-muted-foreground">Delivery already exited.</p>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 bg-white/90">
        <CardHeader>
          <CardTitle>Unified queue</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-2 font-medium">
              Walk-in visits ({queue?.walkInVisits?.length ?? 0})
            </p>
            <ul className="space-y-1">
              {(queue?.walkInVisits ?? []).slice(0, 6).map((v) => (
                <li key={String(v.id)} className="rounded border px-2 py-1">
                  {String(v.visitCategory)} — {String(v.platform ?? v.status)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium">
              Vendor deliveries ({queue?.vendorDeliveries?.length ?? 0})
            </p>
            <ul className="space-y-1">
              {(queue?.vendorDeliveries ?? []).slice(0, 6).map((d) => (
                <li
                  key={String(d.id)}
                  className="flex items-center justify-between rounded border px-2 py-1"
                >
                  <span>{String(d.deliveryNumber)}</span>
                  <DeliveryStatusBadge status={String(d.status)} />
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
