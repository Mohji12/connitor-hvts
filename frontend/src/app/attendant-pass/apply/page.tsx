'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  AttendantPassService,
  type AttendantAdmissionLookup,
  type AttendantPassBranch,
} from '@/lib/services/attendantPassService';
import { ConnitorLoader } from '@/components/ConnitorLoader';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

function branchShortLabel(branch: AttendantPassBranch): string {
  const location = [branch.city, branch.state].filter(Boolean).join(', ');
  return location ? `${branch.name} (${location})` : branch.name;
}

function branchFullLabel(branch: AttendantPassBranch): string {
  const chain = branch.hospitalChainName ? `${branch.hospitalChainName} · ` : '';
  return `${chain}${branchShortLabel(branch)}`;
}

function patientDisplayName(lookup: AttendantAdmissionLookup): string {
  return lookup.patientName ?? lookup.patientFirstName;
}

function PatientSummary({
  lookup,
  className,
}: {
  lookup: AttendantAdmissionLookup;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn('rounded-lg border border-[#001B71]/08 bg-[#4A90E2]/10 p-4 text-sm text-primary', className)}>
      <p className="font-medium">
        Selected patient: {patientDisplayName(lookup)}
        {lookup.mrn ? ` · MRN ${lookup.mrn}` : ''}
      </p>
      <p className="mt-1 text-slate-700">
        {lookup.wardName ? lookup.wardName : 'Ward not listed'}
        {lookup.roomNumber ? ` · Room ${lookup.roomNumber}` : ''}
      </p>
      <p className="mt-1 text-slate-700">
        Visiting hours:{' '}
        {lookup.visitingHours?.summary ??
          `${lookup.visitingHours?.defaultWindow.startTime ?? '11:00'}–${lookup.visitingHours?.defaultWindow.endTime ?? '16:00'} IST (default)`}
      </p>
      {lookup.hasAttendantInside && (
        <p className="mt-2 text-red-800 font-medium">
          An attendant is currently inside with this patient. They must check out at security
          before another person can apply.
        </p>
      )}
      {!lookup.hasAttendantInside && lookup.hasActivePass && (
        <p className="mt-2 text-amber-800">
          Another visitor currently holds the active pass. Ward staff must revoke it before yours
          can be issued.
        </p>
      )}
    </div>
  );
}

function ApplyForm(): React.ReactElement {
  const params = useSearchParams();
  const initialBranchId = params.get('branchId') ?? '';
  const [branches, setBranches] = React.useState<AttendantPassBranch[]>([]);
  const [branchId, setBranchId] = React.useState(initialBranchId);
  const [searchMode, setSearchMode] = React.useState<'name' | 'mrn'>('name');
  const [patientQuery, setPatientQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<AttendantAdmissionLookup[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [mrn, setMrn] = React.useState('');
  const [lookup, setLookup] = React.useState<AttendantAdmissionLookup | null>(null);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [relationship, setRelationship] = React.useState('');
  const [done, setDone] = React.useState(false);
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    AttendantPassService.listPublicBranches()
      .then((items) => {
        setBranches(items);
        if (!initialBranchId && items.length === 1) {
          setBranchId(items[0].id);
        }
      })
      .catch(() => toast.error('Could not load hospitals'));
  }, [initialBranchId]);

  React.useEffect(() => {
    if (initialBranchId) {
      setBranchId(initialBranchId);
    }
  }, [initialBranchId]);

  React.useEffect(() => {
    setLookup(null);
    setSearchResults([]);
    setPatientQuery('');
    setMrn('');
  }, [branchId, searchMode]);

  React.useEffect(() => {
    if (searchMode !== 'name' || !branchId.trim() || patientQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const handle = window.setTimeout(() => {
      setSearching(true);
      AttendantPassService.searchAdmissionsByName(branchId.trim(), patientQuery.trim())
        .then(setSearchResults)
        .catch(() => {
          setSearchResults([]);
          toast.error('Could not search patients');
        })
        .finally(() => setSearching(false));
    }, 350);

    return () => window.clearTimeout(handle);
  }, [branchId, patientQuery, searchMode]);

  const selectedBranch = branches.find((b) => b.id === branchId);

  const doMrnLookup = async () => {
    if (!branchId.trim() || !mrn.trim()) {
      toast.error('Select a hospital and enter patient MRN');
      return;
    }
    setLookupLoading(true);
    try {
      const res = await AttendantPassService.lookupAdmission(branchId.trim(), mrn.trim());
      setLookup(res);
      toast.success(`Found ${patientDisplayName(res)}`);
    } catch {
      setLookup(null);
      toast.error('No active admission found for this MRN at the selected hospital');
    } finally {
      setLookupLoading(false);
    }
  };

  const selectPatient = (patient: AttendantAdmissionLookup) => {
    setLookup(patient);
    toast.success(`Selected ${patientDisplayName(patient)}`);
  };

  const submit = async () => {
    if (!lookup || !name.trim() || !email.trim() || !phone.trim()) {
      toast.error('Fill all required fields');
      return;
    }
    if (lookup.hasAttendantInside) {
      toast.error(
        'An attendant is currently inside for this patient. They must check out first.',
      );
      return;
    }
    setSubmitting(true);
    try {
      await AttendantPassService.publicApply({
        admissionId: lookup.admissionId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        relationship: relationship.trim() || undefined,
      });
      setDone(true);
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detail || 'Could not submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card className="mx-auto w-full max-w-xl">
        <CardContent className="space-y-3 pt-8 text-center">
          <h2 className="text-xl font-semibold">Request submitted</h2>
          <p className="text-sm text-muted-foreground">
            Ward staff will review your request by email. When approved, your visit pass and QR code
            will be sent to your email. Bring a government ID to security.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-xl space-y-6">
      {(lookupLoading || searching) && (
        <ConnitorLoader
          variant="fullscreen"
          message={lookupLoading ? 'Looking up patient…' : 'Searching patients…'}
        />
      )}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Apply for visit pass</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Only one family member may hold an active pass at a time. Find the admitted patient, then
          submit your visit request.
        </p>
        {selectedBranch && (
          <div className="rounded-lg border border-[#001B71]/08 bg-[#4A90E2]/10 px-4 py-3 text-sm text-primary">
            <span className="font-medium">Hospital:</span> {branchFullLabel(selectedBranch)}
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Find patient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="hospital-select">Hospital</Label>
            {branches.length > 0 ? (
              <Select value={branchId || undefined} onValueChange={setBranchId}>
                <SelectTrigger id="hospital-select" className="w-full min-w-0 [&>span]:line-clamp-1">
                  <SelectValue placeholder="Select hospital" />
                </SelectTrigger>
                <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id} className="whitespace-normal">
                      {branchFullLabel(branch)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="hospital-select"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                placeholder="Hospital branch ID (from hospital)"
                className="w-full"
              />
            )}
          </div>

          <Tabs
            value={searchMode}
            onValueChange={(value) => setSearchMode(value as 'name' | 'mrn')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="name">Search by name</TabsTrigger>
              <TabsTrigger value="mrn">Search by MRN</TabsTrigger>
            </TabsList>

            <TabsContent value="name" className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="patient-name">Patient name</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="patient-name"
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    placeholder="Enter at least 2 letters of patient name"
                    className="w-full pl-9"
                    disabled={!branchId}
                  />
                </div>
                {!branchId && (
                  <p className="text-xs text-muted-foreground">Select a hospital first.</p>
                )}
              </div>

              {searching && (
                <p className="text-sm text-muted-foreground">Searching patients…</p>
              )}

              {!searching && patientQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No admitted patients matched that name at this hospital.
                </p>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Select patient
                  </p>
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {searchResults.map((patient) => {
                      const selected = lookup?.admissionId === patient.admissionId;
                      return (
                        <button
                          key={patient.admissionId}
                          type="button"
                          onClick={() => selectPatient(patient)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                            selected
                              ? 'border-primary bg-[#4A90E2]/10'
                              : 'border-border bg-background hover:border-[#4A90E2] hover:bg-[#4A90E2]/08',
                          )}
                        >
                          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-sm">
                              {patientDisplayName(patient)}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              MRN {patient.mrn}
                              {patient.wardName ? ` · ${patient.wardName}` : ''}
                              {patient.roomNumber ? ` · Room ${patient.roomNumber}` : ''}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="mrn" className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="patient-mrn">Patient MRN</Label>
                <Input
                  id="patient-mrn"
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  placeholder="From admission document"
                  className="w-full"
                  disabled={!branchId}
                />
              </div>
              <Button
                disabled={lookupLoading || !branchId}
                className="w-full sm:w-auto"
                onClick={() => void doMrnLookup()}
              >
                Look up patient
              </Button>
            </TabsContent>
          </Tabs>

          {lookup && <PatientSummary lookup={lookup} />}
        </CardContent>
      </Card>

      {lookup && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Your details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="visitor-name">Full name</Label>
              <Input
                id="visitor-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="visitor-email">Email (pass QR will be sent here)</Label>
              <Input
                id="visitor-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visitor-phone">Phone</Label>
              <Input
                id="visitor-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visitor-relationship">Relationship to patient</Label>
              <Input
                id="visitor-relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                disabled={submitting || Boolean(lookup?.hasAttendantInside)}
                className="w-full sm:w-auto"
                onClick={() => void submit()}
              >
                Submit request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AttendantPassApplyPage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-[#F7F9FC] px-4 py-8 md:px-8">
      <React.Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ApplyForm />
      </React.Suspense>
    </main>
  );
}
