'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { QrCheckInScanner } from '@/components/security/QrCheckInScanner';
import { StatusChip } from '@/components/mobile/StatusChip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeliveryPageShell } from '@/features/delivery-management/ui';
import { formatIstDateTime } from '@/lib/datetime';
import { getApiErrorMessage } from '@/lib/api-errors';
import {
  DistributorVisitService,
  type DistributorVisitRecord,
} from '@/lib/services/distributorVisitService';

export default function VendorDeskScanPage(): React.ReactElement {
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [visit, setVisit] = React.useState<DistributorVisitRecord | null>(null);

  async function lookup(payload: string): Promise<void> {
    const value = payload.trim();
    if (!value) return;
    setBusy(true);
    try {
      setVisit(await DistributorVisitService.scanPass(value));
    } catch (error) {
      setVisit(null);
      toast.error(getApiErrorMessage(error, 'Could not find that meeting pass'));
    } finally {
      setBusy(false);
    }
  }

  async function checkIn(): Promise<void> {
    if (!visit) return;
    setBusy(true);
    try {
      const next = await DistributorVisitService.checkIn(visit.id);
      setVisit(next);
      toast.success('Visitor checked in');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not check this visitor in'));
    } finally {
      setBusy(false);
    }
  }

  async function checkOut(): Promise<void> {
    if (!visit) return;
    setBusy(true);
    try {
      const next = await DistributorVisitService.checkOut(visit.id);
      setVisit(next);
      toast.success('Visitor checked out');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not check this visitor out'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeliveryPageShell
      title="Desk scan"
      subtitle="Scan the visitor meeting pass or enter the 6-digit code. This is only for your office — not a hospital gate."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scan pass</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <QrCheckInScanner
              readerId="distributor-desk-scanner"
              disabled={busy}
              hint="Point the camera at the visitor QR"
              onScan={(payload) => void lookup(payload)}
            />
            <div className="space-y-1.5">
              <Label htmlFor="visit-code">Or enter the 6-digit code</Label>
              <div className="flex gap-2">
                <Input
                  id="visit-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <Button disabled={busy || code.length !== 6} onClick={() => void lookup(code)}>
                  Look up
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Visitor</CardTitle>
            {visit ? <StatusChip status={visit.status} /> : null}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!visit ? (
              <p className="text-muted-foreground">Scan a pass to see who is at the desk.</p>
            ) : (
              <>
                <p>
                  <span className="text-muted-foreground">Name:</span> {visit.visitorName || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Company:</span> {visit.companyName || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Phone:</span> {visit.visitorPhone || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">When:</span> {formatIstDateTime(visit.appointmentDate)}
                </p>
                <p>
                  <span className="text-muted-foreground">Purpose:</span> {visit.purpose || '—'}
                </p>
                {visit.checkInTime ? (
                  <p>
                    <span className="text-muted-foreground">Checked in:</span> {formatIstDateTime(visit.checkInTime)}
                  </p>
                ) : null}
                {visit.checkOutTime ? (
                  <p>
                    <span className="text-muted-foreground">Checked out:</span> {formatIstDateTime(visit.checkOutTime)}
                  </p>
                ) : null}
                <div className="flex gap-2 pt-2">
                  {visit.status === 'APPROVED' ? (
                    <Button className="flex-1" disabled={busy} onClick={() => void checkIn()}>
                      Check in
                    </Button>
                  ) : null}
                  {visit.status === 'CHECKED_IN' ? (
                    <Button className="flex-1" disabled={busy} onClick={() => void checkOut()}>
                      Check out
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DeliveryPageShell>
  );
}
