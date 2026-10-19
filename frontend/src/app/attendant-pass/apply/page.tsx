'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { getApiErrorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/utils';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { AttendantPhotoPicker } from '@/features/attendant-passes/AttendantPhotoPicker';
import { attendantApplyPath, attendantSlugFromPath } from '@/lib/attendant-pass-url';
import { APP_HOME_PATH } from '@/lib/app-back';
import { isNativeApp } from '@/lib/platform';

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
        <p className="mt-2 text-slate-700">
          Other visitors may also book until someone checks in with this patient.
        </p>
      )}
    </div>
  );
}

const HOME_REDIRECT_SECONDS = 5;

function WaitingPrimaryApproval(): React.ReactElement {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = React.useState(HOME_REDIRECT_SECONDS);
  const goHome = React.useCallback(() => {
    router.replace(isNativeApp() ? APP_HOME_PATH : '/');
  }, [router]);

  React.useEffect(() => {
    if (secondsLeft <= 0) {
      goHome();
      return;
    }
    const handle = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(handle);
  }, [secondsLeft, goHome]);

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardContent className="space-y-3 pt-8 text-center">
        <h2 className="text-xl font-semibold">Waiting for approval</h2>
        <p className="text-sm text-muted-foreground">
          We asked the primary attendant (the person already with the patient) to confirm on
          WhatsApp. After they confirm, your attendant pass and QR will arrive on your WhatsApp.
          Show that QR at security to check in, and scan it again when you leave.
        </p>
        <p className="text-xs text-muted-foreground">
          Taking you to the home page in {secondsLeft} second{secondsLeft === 1 ? '' : 's'}…
        </p>
        <Button className="w-full sm:w-auto" onClick={goHome}>
          Go to home page
        </Button>
      </CardContent>
    </Card>
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
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [addCompanion, setAddCompanion] = React.useState(false);
  const [companionName, setCompanionName] = React.useState('');
  const [companionPhone, setCompanionPhone] = React.useState('');
  const [companionRelationship, setCompanionRelationship] = React.useState('');
  const [done, setDone] = React.useState(false);
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [unknownSlug, setUnknownSlug] = React.useState<string | null>(null);

  React.useEffect(() => {
    const slug = attendantSlugFromPath(window.location.pathname);
    AttendantPassService.listPublicBranches()
      .then((items) => {
        setBranches(items);
        if (slug) {
          const match = items.find((b) => b.slug?.toLowerCase() === slug);
          if (match) {
            setBranchId(match.id);
          } else {
            setUnknownSlug(slug);
          }
          return;
        }
        const linked = initialBranchId ? items.find((b) => b.id === initialBranchId) : undefined;
        if (linked?.slug) {
          window.history.replaceState(null, '', attendantApplyPath(linked));
        }
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
    if (addCompanion && (!companionName.trim() || companionPhone.trim().length < 10 || !companionRelationship.trim())) {
      toast.error('Enter the extra person\'s name, phone, and relationship');
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
        photo: photo ?? undefined,
        addCompanion,
        companionName: addCompanion ? companionName.trim() : undefined,
        companionPhone: addCompanion ? companionPhone.trim() : undefined,
        companionRelationship: addCompanion ? companionRelationship.trim() : undefined,
      });
      setDone(true);
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Could not submit request'));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return <WaitingPrimaryApproval />;
  }

  return (
    <div className={cn('relative mx-auto w-full max-w-xl space-y-4 lg:space-y-6', lookup && 'max-lg:pb-24')}>
      {(lookupLoading || searching) && (
        <ConnitorLoader
          variant="fullscreen"
          message={lookupLoading ? 'Looking up patient…' : 'Searching patients…'}
        />
      )}
      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Apply for visit pass</h1>
        <div className="lg:hidden">
          <p className="m-meta">Step {lookup ? 2 : 1} of 2 · {lookup ? 'Your details' : 'Find patient'}</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: lookup ? '100%' : '50%' }}
            />
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground max-lg:text-xs">
          Book during the hospital visiting hours. The pass is sent on WhatsApp right away. A new
          booking closes only while another visitor is checked in with the patient.
        </p>
        {unknownSlug && !selectedBranch && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            The link &ldquo;{unknownSlug}&rdquo; does not match any hospital. Please pick your hospital
            below.
          </div>
        )}
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
            <AttendantPhotoPicker
              value={photo}
              onChange={setPhoto}
              label="Your photo (optional)"
              className="sm:col-span-2"
              disabled={submitting}
            />
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
              <Label htmlFor="visitor-email">Email</Label>
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
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={addCompanion}
                onChange={(e) => setAddCompanion(e.target.checked)}
              />
              Add one person on this pass
            </label>
            {addCompanion && (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="companion-name">Extra person name</Label>
                  <Input
                    id="companion-name"
                    value={companionName}
                    onChange={(e) => setCompanionName(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companion-phone">Extra person phone</Label>
                  <Input
                    id="companion-phone"
                    value={companionPhone}
                    onChange={(e) => setCompanionPhone(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companion-relationship">Relationship to patient</Label>
                  <Input
                    id="companion-relationship"
                    value={companionRelationship}
                    onChange={(e) => setCompanionRelationship(e.target.value)}
                    className="w-full"
                  />
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <StickyActionBar>
                <Button
                  disabled={submitting || Boolean(lookup?.hasAttendantInside)}
                  className="w-full max-lg:h-12 max-lg:text-base lg:w-auto"
                  onClick={() => void submit()}
                >
                  Book pass
                </Button>
              </StickyActionBar>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AttendantPassApplyPage(): React.ReactElement {
  return (
    <main className="pt-safe min-h-screen bg-[#F7F9FC] px-4 py-5 md:px-8 lg:py-8">
      <React.Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ApplyForm />
      </React.Suspense>
    </main>
  );
}
