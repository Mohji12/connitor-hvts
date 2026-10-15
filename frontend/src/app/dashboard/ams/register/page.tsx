'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useAuthSession } from '@/hooks/useAuthSession';
import { getApiErrorMessage } from '@/lib/api-errors';
import {
  AttendantPassService,
  type AttendantAdmission,
  type AttendantPassRow,
} from '@/lib/services/attendantPassService';
import { AmsPageShell, AmsQrPassCard } from '@/features/attendant-management/ui';
import { AttendantPhotoPicker } from '@/features/attendant-passes/AttendantPhotoPicker';
import { DepartmentService } from '@/lib/services/departmentService';
import type { Department } from '@/lib/schema/schema';
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

const RELATIONSHIPS = [
  'Father',
  'Mother',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Spouse',
  'Relative',
  'Friend',
  'Caregiver',
  'Other',
];

const ID_TYPES = ['Aadhar', 'Driving License', 'PAN', 'Passport', 'Hospital ID'];

const PERMISSIONS = [
  'Wheelchair Assistance',
  'Night Stay',
  'ICU Access',
  'Pediatric Ward',
  'Lab Access',
  'Operation Theatre Waiting',
  'Other',
];

export default function AmsRegisterPage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string }>();
  const branchId = user?.branchId;
  const [admissions, setAdmissions] = React.useState<AttendantAdmission[]>([]);
  const [admissionId, setAdmissionId] = React.useState('');
  const [createPatient, setCreatePatient] = React.useState(false);
  const [mrn, setMrn] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [department, setDepartment] = React.useState('');
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [relationship, setRelationship] = React.useState('Spouse');
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [idProofType, setIdProofType] = React.useState('Aadhar');
  const [validFrom, setValidFrom] = React.useState('');
  const [validTo, setValidTo] = React.useState('');
  const [entriesMode, setEntriesMode] = React.useState('Unlimited');
  const [customEntries, setCustomEntries] = React.useState('1');
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [remarks, setRemarks] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [issued, setIssued] = React.useState<AttendantPassRow | null>(null);

  React.useEffect(() => {
    if (!branchId) return;
    AttendantPassService.listAdmissions(branchId).then(setAdmissions).catch(() => undefined);
    DepartmentService.list({ branchId })
      .then(setDepartments)
      .catch(() => toast.error('Could not load departments'));
  }, [branchId]);

  const togglePermission = (p: string) => {
    setPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const resolveMaxEntries = (): number | undefined => {
    if (entriesMode === 'Unlimited') return undefined;
    if (entriesMode === 'Custom') return parseInt(customEntries, 10) || 1;
    return parseInt(entriesMode, 10) || 1;
  };

  const submit = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      let admId = admissionId;
      if (createPatient) {
        if (!mrn.trim() || !firstName.trim() || !lastName.trim()) {
          toast.error('MRN and patient name are required');
          return;
        }
        if (!department) {
          toast.error('Select the department');
          return;
        }
        const patient = await AttendantPassService.createPatient({
          branchId,
          mrn: mrn.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
        const admission = await AttendantPassService.createAdmission({
          patientId: patient.id,
          branchId,
          department,
        });
        admId = admission.id;
      }
      if (!admId || !name.trim() || phone.trim().length < 10) {
        toast.error('Select a patient and enter the name and mobile of the person with the patient');
        return;
      }
      const attendant = await AttendantPassService.registerAttendantFull({
        admissionId: admId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        relationship,
        photo: photo ?? undefined,
        idProofType,
        remarks: remarks.trim() || undefined,
        specialPermissions: permissions,
        maxEntries: resolveMaxEntries(),
        attendantKind: 'FIXED',
      });
      await AttendantPassService.approveAttendant(attendant.id);
      const pass = await AttendantPassService.issuePassFull(attendant.id, {
        revokeExisting: true,
        validFrom: validFrom || undefined,
        validTo: validTo || undefined,
        maxEntries: resolveMaxEntries(),
      });
      setIssued(pass);
      toast.success('Pass allotted');
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const selected = admissions.find((a) => a.id === admissionId);

  if (issued) {
    return (
      <AmsPageShell title="QR Pass" subtitle="The pass is on its way to the person with the patient.">
        <AmsQrPassCard
          passNumber={issued.passNumber}
          attendantName={issued.attendant?.name ?? name}
          patientName={
            issued.attendant?.admission?.patient?.name ??
            selected?.patient?.name ??
            'Patient'
          }
          ward={issued.attendant?.admission?.wardName ?? selected?.wardName}
          bed={issued.attendant?.admission?.bedNumber ?? selected?.bedNumber}
          validTo={issued.validTo ?? issued.expiresAt}
          status={issued.status}
          qrPayload={issued.qrPayload}
          qrSignature={issued.qrSignature}
        />
        <Button className="bg-[#0052CC]" onClick={() => window.location.reload()}>
          Allot another pass
        </Button>
      </AmsPageShell>
    );
  }

  return (
    <AmsPageShell
      title="Allot pass"
      subtitle="Enter the patient details and allot the pass to one person with the patient. The WhatsApp pass goes to their mobile."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Patient details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={createPatient}
                onChange={(e) => setCreatePatient(e.target.checked)}
              />
              Create new patient admission
            </label>
            {!createPatient ? (
              <div>
                <Label>Select admission</Label>
                <Select value={admissionId} onValueChange={setAdmissionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {admissions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {[a.patient?.name, a.patient?.mrn, a.department || a.wardName]
                          .filter(Boolean)
                          .join(' · ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>UHID / MRN</Label>
                  <Input value={mrn} onChange={(e) => setMrn(e.target.value)} />
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={departments.length ? 'Select department' : 'No departments found'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>First name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Person with the patient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AttendantPhotoPicker value={photo} onChange={setPhoto} disabled={loading} />
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Mobile</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              </div>
              <div>
                <Label>Email (optional)</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Relationship</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Identity proof</Label>
              <Select value={idProofType} onValueChange={setIdProofType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                ID image is captured at security gate check-in.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl lg:col-span-2">
          <CardHeader>
            <CardTitle>Validity, entries & permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Start time</Label>
                <Input
                  type="datetime-local"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </div>
              <div>
                <Label>End time</Label>
                <Input
                  type="datetime-local"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Allowed entries</Label>
                <Select value={entriesMode} onValueChange={setEntriesMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Unlimited', '1', '2', '3', 'Custom'].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {entriesMode === 'Custom' && (
                <div>
                  <Label>Custom count</Label>
                  <Input
                    type="number"
                    min={1}
                    value={customEntries}
                    onChange={(e) => setCustomEntries(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {PERMISSIONS.map((p) => (
                <label key={p} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={permissions.includes(p)}
                    onChange={() => togglePermission(p)}
                  />
                  {p}
                </label>
              ))}
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button
                className="bg-[#0052CC] hover:bg-[#0041a3]"
                disabled={loading}
                onClick={() => void submit()}
              >
                {loading ? 'Saving…' : 'Allot pass'}
              </Button>
              <Button type="button" variant="outline" onClick={() => window.history.back()}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AmsPageShell>
  );
}
