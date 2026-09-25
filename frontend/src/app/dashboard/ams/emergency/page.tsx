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
import { Textarea } from '@/components/ui/textarea';

export default function AmsEmergencyPage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string }>();
  const branchId = user?.branchId;
  const [admissions, setAdmissions] = React.useState<AttendantAdmission[]>([]);
  const [admissionId, setAdmissionId] = React.useState('');
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [hours, setHours] = React.useState('2');
  const [loading, setLoading] = React.useState(false);
  const [issued, setIssued] = React.useState<AttendantPassRow | null>(null);

  React.useEffect(() => {
    if (!branchId) return;
    AttendantPassService.listAdmissions(branchId).then(setAdmissions).catch(() => undefined);
  }, [branchId]);

  const selected = admissions.find((a) => a.id === admissionId);

  const submit = async () => {
    if (!admissionId || !name.trim() || phone.trim().length < 10 || reason.trim().length < 3) {
      toast.error('Patient, name, mobile, and reason are required');
      return;
    }
    setLoading(true);
    try {
      const result = await AttendantPassService.emergencyPass({
        admissionId,
        name: name.trim(),
        phone: phone.trim(),
        reason: reason.trim(),
        validityHours: parseFloat(hours) || 2,
      });
      setIssued(result.pass);
      toast.success('Emergency pass issued');
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detail || 'Could not issue emergency pass');
    } finally {
      setLoading(false);
    }
  };

  if (issued) {
    return (
      <AmsPageShell title="Emergency Pass">
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
    <AmsPageShell title="Emergency Pass" subtitle="Quick registration — aim to finish in under 30 seconds.">
      <Card className="rounded-xl max-w-lg border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Quick generate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Patient</Label>
            <Select value={admissionId} onValueChange={setAdmissionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {admissions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.patient?.name} · {a.wardName ?? 'Ward'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Attendant name</Label>
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
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Validity (hours)</Label>
            <Input type="number" min={0.5} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <Button
            className="w-full bg-red-600 hover:bg-red-700"
            disabled={loading}
            onClick={() => void submit()}
          >
            {loading ? 'Generating…' : 'Generate'}
          </Button>
        </CardContent>
      </Card>
    </AmsPageShell>
  );
}
