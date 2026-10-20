'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { QrCheckInScanner } from '@/components/security/QrCheckInScanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getNetworkOnline, subscribeNetworkStatus } from '@/lib/mobile/network';
import { makeLocalEvent, verifyOfflineScan } from '@/lib/offline-gate/verify';
import {
  appendLocalEvent,
  loadDeviceEnrollment,
  loadVault,
  markEventsAcked,
  pendingEvents,
  saveManifest,
} from '@/lib/offline-gate/store';
import { GateOfflineService } from '@/lib/services/gateOfflineService';
import { getApiErrorMessage } from '@/lib/api-errors';

export function OfflineGateScanPanel(): React.ReactElement {
  const [online, setOnline] = React.useState(getNetworkOnline);
  const [busy, setBusy] = React.useState(false);
  const [pending, setPending] = React.useState(0);
  const [last, setLast] = React.useState<string>('Scan a pass. Online verification is preferred.');
  const [enrolled, setEnrolled] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const device = await loadDeviceEnrollment();
    setEnrolled(Boolean(device));
    const vault = await loadVault();
    setPending(pendingEvents(vault.events).length);
  }, []);

  React.useEffect(() => {
    void refresh();
    return subscribeNetworkStatus(setOnline);
  }, [refresh]);

  const syncNow = async (): Promise<void> => {
    const device = await loadDeviceEnrollment();
    if (!device) {
      toast.error('This phone is not enrolled as a gate device.');
      return;
    }
    setBusy(true);
    try {
      const manifest = await GateOfflineService.downloadManifest(device.devicePublicId, device.deviceSecret);
      await saveManifest(manifest);
      const vault = await loadVault();
      const queued = pendingEvents(vault.events);
      if (queued.length > 0) {
        const { results } = await GateOfflineService.syncEvents(
          device.devicePublicId,
          device.deviceSecret,
          queued,
          manifest.manifestId,
        );
        const ack = results
          .filter((row) => row.result === 'ACCEPTED' || row.result === 'DUPLICATE')
          .map((row) => row.eventId);
        await markEventsAcked(ack);
        const conflicts = results.filter((row) => row.result === 'CONFLICT');
        if (conflicts.length > 0) {
          toast.error(`${conflicts.length} conflicting offline redemption(s) need review.`);
        }
      }
      await refresh();
      toast.success('Manifest updated and pending scans synced.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not sync the gate device.'));
    } finally {
      setBusy(false);
    }
  };

  const onScan = async (raw: string): Promise<void> => {
    const device = await loadDeviceEnrollment();
    const vault = await loadVault();
    if (online) {
      try {
        const onlineResult = await GateOfflineService.verifyOnline(raw);
        setLast(`${onlineResult.decision}: ${onlineResult.reasonCode}`);
        if (onlineResult.decision === 'ACCEPT') {
          toast.success('Server accepted this pass. Complete check-in on the usual scan tab if needed.');
        } else {
          toast.error(onlineResult.reasonCode);
        }
        return;
      } catch {
        // fall through to local
      }
    }
    const result = await verifyOfflineScan({
      rawValue: raw,
      manifest: vault.manifest,
      verifyKey: device?.verifyKey ?? null,
      localEvents: vault.events,
      online: false,
    });
    const event = makeLocalEvent(result);
    if (event) {
      await appendLocalEvent(event);
      await refresh();
    }
    setLast(`${result.decision}: ${result.reasonCode}`);
    if (result.decision === 'ACCEPT') {
      toast.success('Offline accept recorded. It will sync when the phone is online.');
    } else if (result.decision === 'UNCERTAIN') {
      toast.error('Cannot authorize offline. Ask a supervisor or restore the network.');
    } else {
      toast.error(result.reasonCode);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Offline gate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            {online ? 'Online — the server is the authority.' : 'Offline — local signed manifest only.'} A
            saved QR image is not proof of entry.
          </p>
          <p>
            Device: {enrolled ? 'enrolled' : 'not enrolled'}. Pending events: {pending}.
          </p>
          <p className="font-medium">{last}</p>
          <Button type="button" onClick={() => void syncNow()} disabled={busy || !online}>
            Download manifest / sync
          </Button>
        </CardContent>
      </Card>
      <QrCheckInScanner
        readerId="offline-gate-reader"
        hint="Prefer online verification. Offline accept is only for enrolled pilot devices with a fresh manifest."
        onScan={onScan}
        disabled={busy}
      />
    </div>
  );
}
