'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useAuthSession } from '@/hooks/useAuthSession';
import {
  AttendantPassService,
  type AmsPassPolicy,
} from '@/lib/services/attendantPassService';
import { AmsPageShell } from '@/features/attendant-management/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AmsSettingsPage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string }>();
  const branchId = user?.branchId;
  const [policy, setPolicy] = React.useState<AmsPassPolicy | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!branchId) return;
    AttendantPassService.getPolicy(branchId)
      .then(setPolicy)
      .catch(() => toast.error('Could not load policy'));
  }, [branchId]);

  const save = async () => {
    if (!branchId || !policy) return;
    setLoading(true);
    try {
      const updated = await AttendantPassService.updatePolicy(branchId, policy);
      setPolicy(updated);
      toast.success('AMS settings saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setLoading(false);
    }
  };

  if (!policy) {
    return (
      <AmsPageShell title="Settings">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AmsPageShell>
    );
  }

  const num = (key: keyof AmsPassPolicy, label: string) => (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        value={Number(policy[key] ?? 0)}
        onChange={(e) =>
          setPolicy({ ...policy, [key]: parseInt(e.target.value, 10) || 0 })
        }
      />
    </div>
  );

  const toggle = (key: keyof AmsPassPolicy, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={Boolean(policy[key])}
        onChange={(e) => setPolicy({ ...policy, [key]: e.target.checked })}
      />
      {label}
    </label>
  );

  return (
    <AmsPageShell title="Settings" subtitle="Hospital rules for attendant passes.">
      <Card className="rounded-xl max-w-2xl">
        <CardHeader>
          <CardTitle>Pass policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {num('maxPassesPerPatient', 'Max attendants per patient')}
            {num('maxIcuAttendants', 'ICU attendants allowed')}
            {num('qrValidityHours', 'QR validity (hours)')}
            <div>
              <Label>Visitor timing start</Label>
              <Input
                value={policy.defaultVisitStart}
                onChange={(e) => setPolicy({ ...policy, defaultVisitStart: e.target.value })}
              />
            </div>
            <div>
              <Label>Visitor timing end</Label>
              <Input
                value={policy.defaultVisitEnd}
                onChange={(e) => setPolicy({ ...policy, defaultVisitEnd: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {toggle('allowNightStay', 'Night stay rules enabled')}
            {toggle('smsEnabled', 'SMS')}
            {toggle('whatsappEnabled', 'WhatsApp')}
            {toggle('approvalRequired', 'Approval workflow')}
            {toggle('idProofMandatory', 'ID proof mandatory')}
            {toggle('photoMandatory', 'Photo mandatory')}
            {toggle('emergencySkipId', 'Emergency can skip ID')}
          </div>
          <Button className="bg-[#0052CC]" disabled={loading} onClick={() => void save()}>
            {loading ? 'Saving…' : 'Save settings'}
          </Button>
        </CardContent>
      </Card>
    </AmsPageShell>
  );
}
