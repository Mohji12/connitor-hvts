'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api-errors';
import { saveDeviceEnrollment } from '@/lib/offline-gate/store';
import {
  GateOfflineService,
  type DeviceRegisterResponse,
  type GateOpsSummary,
} from '@/lib/services/gateOfflineService';

export default function GateOfflineOpsPage(): React.ReactElement {
  const [ops, setOps] = React.useState<GateOpsSummary | null>(null);
  const [label, setLabel] = React.useState('Lobby Android');
  const [enrolled, setEnrolled] = React.useState<DeviceRegisterResponse | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setOps(await GateOfflineService.ops());
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load gate devices.'));
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const register = async (): Promise<void> => {
    setBusy(true);
    try {
      const device = await GateOfflineService.registerDevice({
        label,
        offlineEnabled: true,
      });
      setEnrolled(device);
      await saveDeviceEnrollment({
        devicePublicId: device.devicePublicId,
        deviceSecret: device.deviceSecret,
        gateId: device.gateId,
        branchId: device.branchId,
        verifyKey: device.verifyKey,
        offlineEnabled: device.offlineEnabled,
      });
      toast.success('Device enrolled on this phone. Copy the secret now — it is shown once.');
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not register this device.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <h1 className="text-xl font-semibold text-[#001B71] max-lg:hidden">Gate offline</h1>
      <Card>
        <CardHeader>
          <CardTitle>Pilot controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Server flag: {ops?.offlineEnabled ? 'GATE_OFFLINE_ENABLED is on' : 'offline acceptance is off'}.
            Enroll only authorized gate phones. Cached QR images stay display-only.
          </p>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <div>
              <Label htmlFor="gate-label">This phone label</Label>
              <Input id="gate-label" value={label} onChange={(event) => setLabel(event.target.value)} />
            </div>
            <Button className="self-end" type="button" disabled={busy} onClick={() => void register()}>
              Enroll this phone
            </Button>
          </div>
          {enrolled ? (
            <pre className="overflow-x-auto rounded-md bg-slate-50 p-3 text-xs">
              {`publicId: ${enrolled.devicePublicId}\nsecret: ${enrolled.deviceSecret}\nKeep the secret on this device only.`}
            </pre>
          ) : null}
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ['Active devices', ops?.counts.activeDevices ?? 0],
          ['Conflicts', ops?.counts.conflicts ?? 0],
          ['Offline accepts', ops?.counts.offlineAccepts ?? 0],
          ['Rejected sync', ops?.counts.rejectedSync ?? 0],
        ].map(([labelText, value]) => (
          <Card key={String(labelText)}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">{labelText}</p>
              <p className="text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Registered devices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(ops?.devices ?? []).map((device) => (
            <div key={device.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm">
              <div>
                <p className="font-medium">{device.label}</p>
                <p className="text-slate-500">
                  {device.devicePublicId} · {device.status} · sync {device.lastSyncAt ?? 'never'} · manifest v
                  {device.manifestVersion ?? '—'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void GateOfflineService.setOfflineEnabled(device.id, !device.offlineEnabled).then(load)
                  }
                >
                  {device.offlineEnabled ? 'Disable offline' : 'Enable offline'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void GateOfflineService.revokeDevice(device.id).then(load)}
                >
                  Revoke
                </Button>
              </div>
            </div>
          ))}
          {ops && ops.devices.length === 0 ? <p className="text-sm text-slate-500">No devices yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
