'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useAuthSession } from '@/hooks/useAuthSession';
import {
  AttendantPassService,
  type AttendantAdmission,
  type AttendantPassRow,
} from '@/lib/services/attendantPassService';
import { AmsPageShell, AmsQrPassCard } from '@/features/attendant-management/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AmsShiftChangePage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string }>();
  const branchId = user?.branchId;
  const [admissions, setAdmissions] = React.useState<AttendantAdmission[]>([]);
  const [admissionId, setAdmissionId] = React.useState('');
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [relationship, setRelationship] = React.useState('Relative');
  const [loading, setLoading] = React.useState(false);
  const [issued, setIssued] = React.useState<AttendantPassRow | null>(null);

  React.useEffect(() => {
    if (!branchId) return;
    AttendantPassService.listAdmissions(branchId).then(setAdmissions).catch(() => undefined);
  }, [branchId]);

  const selected = admissions.find((a) => a.id === admissionId);

  const submit = async () => {
    if (!admissionId || !name.trim() || phone.trim().length < 10) {
      toast.error('Select patient and enter new attendant details');
      return;
    }
    setLoading(true);
    try {
      const result = await AttendantPassService.shiftChange({
        admissionId,
        name: name.trim(),
        phone: phone.trim(),
        relationship,
      });
      setIssued(result.pass);
      toast.success('Shift change complete');
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detail || 'Shift change failed');
    } finally {
      setLoading(false);
    }
  };

  if (issued) {
    return (
      <AmsPageShell title="Shift Change — New QR">
        <AmsQrPassCard
          passNumber={issued.passNumber}
          attendantName={issued.attendant?.name ?? name}
          patientName={selected?.patient?.name ?? 'Patient'}
          ward={selected?.wardName}
          bed={selected?.bedNumber}
          validTo={issued.validTo ?? issued.expiresAt}
          status={issued.status}
          qrPayload={issued.qrPayload}
          qrSignature={issued.qrSignature}
        />
      </AmsPageShell>
    );
  }

  return (
    <AmsPageShell
      title="Shift Change"
      subtitle="Exit the current attendant and register the replacement."
    >
      <Card className="rounded-xl max-w-xl">
        <CardHeader>
          <CardTitle>Changeover</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Patient</Label>
            <Select value={admissionId} onValueChange={setAdmissionId}>
              <SelectTrigger>
                <SelectValue placeholder="Search / select patient" />
              </SelectTrigger>
              <SelectContent>
                {admissions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.patient?.name} · {a.wardName ?? 'Ward'}
                    {a.hasAttendantInside ? ' · INSIDE' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selected?.hasAttendantInside && (
            <p className="text-sm text-amber-800">
              Current attendant will be marked exited before issuing the new pass.
            </p>
          )}
          <div>
            <Label>New attendant name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Mobile</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </div>
          <div>
            <Label>Relationship</Label>
            <Input value={relationship} onChange={(e) => setRelationship(e.target.value)} />
          </div>
          <Button
            className="w-full bg-[#0052CC] hover:bg-[#0041a3]"
            disabled={loading}
            onClick={() => void submit()}
          >
            {loading ? 'Processing…' : 'Complete shift change & generate QR'}
          </Button>
        </CardContent>
      </Card>
    </AmsPageShell>
  );
}
