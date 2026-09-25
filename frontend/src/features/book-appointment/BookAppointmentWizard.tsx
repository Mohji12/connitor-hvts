'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, MapPin, Stethoscope, Clock, Languages } from 'lucide-react';
import {
  AppointmentService,
  type DoctorSlot,
  type PublicDoctor,
} from '@/lib/services/appointmentService';
import { todayIstDateIso } from '@/lib/datetime';
import { VisitorAuthService } from '@/lib/services/visitorAuthService';
import { getVisitorToken } from '@/lib/services/visitorPortalService';
import { VisitorAccountApi } from '@/features/visitor-pre-registration/api/visitorAccountService';
import type { VisitorPreviewData } from '@/features/visitor-pre-registration/schemas/visitorAccountSchema';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VISITOR_KINDS, type VisitorKind } from '@/lib/constants/visit-constants';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export interface BookAppointmentWizardProps {
  initialBranchId?: string;
  initialBranchName?: string;
  onSuccess?: (result: { bookingId: string; message: string; phone: string }) => void;
  showHeaderLinks?: boolean;
  title?: string;
  className?: string;
}

function DoctorDetailCard({ doctor }: { doctor: PublicDoctor }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#4A90E2]/15 text-primary">
          <Stethoscope className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-base">{doctor.name}</p>
          {doctor.qualification && (
            <p className="text-muted-foreground">{doctor.qualification}</p>
          )}
          {doctor.experienceYears && (
            <p className="text-muted-foreground">{doctor.experienceYears}+ years experience</p>
          )}
        </div>
      </div>
      <div className="grid gap-1.5 text-muted-foreground">
        {doctor.departmentName && (
          <p>
            <span className="font-medium text-foreground">Department:</span> {doctor.departmentName}
            {doctor.subDepartmentName ? ` · ${doctor.subDepartmentName}` : ''}
          </p>
        )}
        {doctor.location && (
          <p className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {doctor.location}
            {doctor.branchCity ? `, ${doctor.branchCity}` : ''}
          </p>
        )}
        {Array.isArray(doctor.languages) && doctor.languages.length ? (
          <p className="flex items-center gap-1">
            <Languages className="h-3.5 w-3.5 shrink-0" />
            {doctor.languages.join(', ')}
          </p>
        ) : null}
      </div>
      {Array.isArray(doctor.consultationModes) && doctor.consultationModes.length ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {doctor.consultationModes.map((mode) => (
            <Badge key={mode} variant="secondary" className="text-xs">
              {mode === 'ONLINE' ? 'Online consult' : 'In-person'}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BookAppointmentWizard({
  initialBranchId,
  initialBranchName,
  onSuccess,
  showHeaderLinks = true,
  title = 'Book Doctor Appointment',
  className,
}: BookAppointmentWizardProps) {
  const minStep: Step = initialBranchId ? 2 : 1;
  const totalSteps = initialBranchId ? 5 : 6;

  const [step, setStep] = React.useState<Step>(minStep);
  const [hospitals, setHospitals] = React.useState<{ id: string; name: string; city: string }[]>([]);
  const [departments, setDepartments] = React.useState<{ id: string; name: string }[]>([]);
  const [subDepartments, setSubDepartments] = React.useState<{ id: string; name: string }[]>([]);
  const [doctors, setDoctors] = React.useState<PublicDoctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = React.useState<PublicDoctor | null>(null);
  const [slots, setSlots] = React.useState<DoctorSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [branchId, setBranchId] = React.useState(initialBranchId ?? '');
  const [branchName, setBranchName] = React.useState(initialBranchName ?? '');
  const [departmentId, setDepartmentId] = React.useState('');
  const [subDepartmentId, setSubDepartmentId] = React.useState('');
  const [doctorId, setDoctorId] = React.useState('');
  const [slotId, setSlotId] = React.useState('');
  const [requestCustomSlot, setRequestCustomSlot] = React.useState(false);
  const [preferredTime, setPreferredTime] = React.useState('10:00');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [appointmentDate, setAppointmentDate] = React.useState(todayIstDateIso());
  const [purpose, setPurpose] = React.useState('');
  const [appointmentMode, setAppointmentMode] = React.useState<'IN_PERSON' | 'ONLINE'>('IN_PERSON');
  const [visitorType, setVisitorType] = React.useState<VisitorKind>('GENERAL');
  const [companyName, setCompanyName] = React.useState('');
  const [companyEmail, setCompanyEmail] = React.useState('');
  const [result, setResult] = React.useState<{ bookingId: string; message: string } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loadingHospitals, setLoadingHospitals] = React.useState(!initialBranchId);
  const [loadingDepartments, setLoadingDepartments] = React.useState(!!initialBranchId);
  /** Shown while a click waits on the next API response */
  const [fetchingNext, setFetchingNext] = React.useState<string | null>(null);
  const [isRegisteredVisitor, setIsRegisteredVisitor] = React.useState(false);
  const [visitorProfile, setVisitorProfile] = React.useState<VisitorPreviewData | null>(null);

  const displayStep = initialBranchId ? step - 1 : step;

  React.useEffect(() => {
    if (!VisitorAuthService.isAccountSession()) return;
    const token = getVisitorToken();
    if (!token) return;

    VisitorAccountApi.getMyProfile(token)
      .then((profile) => {
        if (profile.profileStatus !== 'ACTIVE') return;
        const parts = profile.fullName?.split(' ') ?? [];
        setFirstName(profile.firstName ?? parts[0] ?? '');
        setLastName(profile.lastName ?? parts.slice(1).join(' ') ?? '');
        setPhone(profile.phone ?? '');
        setEmail(profile.email ?? '');
        setVisitorProfile(profile);
        setIsRegisteredVisitor(true);
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    if (initialBranchId) return;
    setLoadingHospitals(true);
    AppointmentService.listPublicHospitals()
      .then((list) => {
        setHospitals(list);
        if (!list.length) {
          setError(
            'No hospitals are available for online booking yet. Ensure the backend is running and booking data is seeded.',
          );
        }
      })
      .catch(() =>
        setError(
          'Failed to load hospitals. Check your connection and try again. If this persists, the booking API may be unreachable.',
        ),
      )
      .finally(() => setLoadingHospitals(false));
  }, [initialBranchId]);

  React.useEffect(() => {
    if (!initialBranchId) return;
    setLoadingDepartments(true);
    AppointmentService.listPublicDepartments(initialBranchId)
      .then((depts) => {
        setDepartments(depts);
        if (!depts.length) {
          setError('No departments are configured for this hospital yet.');
        }
      })
      .catch(() => setError('Failed to load departments. Please try again.'))
      .finally(() => setLoadingDepartments(false));
  }, [initialBranchId]);

  React.useEffect(() => {
    if (!doctorId || !appointmentDate || step < 5) return;
    setLoadingSlots(true);
    setSlotId('');
    AppointmentService.listDoctorSlots(doctorId, appointmentDate)
      .then(setSlots)
      .catch(() => {
        setSlots([]);
        setError('Could not load available time slots.');
      })
      .finally(() => setLoadingSlots(false));
  }, [doctorId, appointmentDate, step]);

  const selectHospital = async (id: string) => {
    const hospital = hospitals.find((h) => h.id === id);
    setBranchId(id);
    setBranchName(hospital?.name ?? '');
    setDepartmentId('');
    setSubDepartmentId('');
    setDoctorId('');
    setSelectedDoctor(null);
    setError('');
    setFetchingNext('Loading departments…');
    try {
      const depts = await AppointmentService.listPublicDepartments(id);
      setDepartments(depts);
      if (!depts.length) {
        setError('No departments are configured for this hospital yet. Please try another location or contact the hospital.');
      }
      setStep(2);
    } catch {
      setError('Failed to load departments. Please try again.');
    } finally {
      setFetchingNext(null);
    }
  };

  const selectDepartment = async (id: string) => {
    setDepartmentId(id);
    setSubDepartmentId('');
    setDoctorId('');
    setSelectedDoctor(null);
    setError('');
    setFetchingNext('Loading sections…');
    try {
      const subs = await AppointmentService.listPublicSubDepartments(id);
      setSubDepartments(subs);
      if (!subs.length) {
        setError('No sections available in this department yet.');
      }
      setStep(3);
    } catch {
      setError('Failed to load sections. Please try again.');
    } finally {
      setFetchingNext(null);
    }
  };

  const selectSubDepartment = async (id: string) => {
    setSubDepartmentId(id);
    setDoctorId('');
    setSelectedDoctor(null);
    setError('');
    setFetchingNext('Loading doctors…');
    try {
      const docs = await AppointmentService.listPublicDoctors(id);
      setDoctors(docs);
      if (!docs.length) {
        setError('No doctors available in this section yet.');
      }
      setStep(4);
    } catch {
      setError('Failed to load doctors. Please try again.');
    } finally {
      setFetchingNext(null);
    }
  };

  const selectDoctor = async (doctor: PublicDoctor) => {
    setDoctorId(doctor.id);
    setSlotId('');
    setError('');
    setFetchingNext('Loading doctor details…');
    try {
      const detail = await AppointmentService.getPublicDoctor(doctor.id);
      setSelectedDoctor(detail);
    } catch {
      setSelectedDoctor(doctor);
    } finally {
      setFetchingNext(null);
    }
    setStep(5);
  };

  const goBack = () => {
    if (step > minStep && step < 6) setStep((step - 1) as Step);
  };

  React.useEffect(() => {
    if (!doctorId || !appointmentDate || step < 5) return;
    setLoadingSlots(true);
    setSlotId('');
    AppointmentService.listDoctorSlots(doctorId, appointmentDate)
      .then(setSlots)
      .catch(() => {
        setSlots([]);
        setError('Could not load available time slots.');
      })
      .finally(() => setLoadingSlots(false));
  }, [doctorId, appointmentDate, step]);

  const selectedSlot = slots.find((s) => s.id === slotId);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!purpose.trim()) {
      setError('Please enter the purpose of your visit.');
      return;
    }
    if (!requestCustomSlot && !slotId) {
      setError('Please select a time slot, or request a visit slot from the doctor.');
      return;
    }
    if (requestCustomSlot && !appointmentDate) {
      setError('Please choose a date for your visit request.');
      return;
    }
    if (requestCustomSlot && !preferredTime) {
      setError('Please choose a time for your visit request.');
      return;
    }
    if (isRegisteredVisitor) {
      if (!firstName.trim() || !phone || phone.length !== 10 || !normalizedEmail.includes('@')) {
        setError('Your profile is missing contact details. Update your profile and try again.');
        return;
      }
    } else if (
      phone.length !== 10 ||
      !normalizedEmail.includes('@') ||
      !firstName.trim() ||
      !lastName.trim()
    ) {
      setError('Please fill in all required fields and use a valid 10-digit phone and email.');
      return;
    }
    if (visitorType === 'SALES_REPRESENTATIVE') {
      if (!companyName.trim() || !companyEmail.includes('@')) {
        setError('Company name and a valid company email are required for Sales Representative.');
        return;
      }
    }
    setLoading(true);
    setError('');
    try {
      const res = await AppointmentService.book({
        branchId,
        departmentId,
        subDepartmentId,
        doctorId,
        firstName,
        lastName,
        phone,
        email: normalizedEmail,
        slotId: requestCustomSlot ? undefined : slotId,
        appointmentDate: requestCustomSlot
          ? `${appointmentDate}T${preferredTime}:00`
          : selectedSlot?.slotStart,
        requestCustomSlot,
        purpose,
        appointmentMode,
        visitorType,
        companyName: visitorType === 'SALES_REPRESENTATIVE' ? companyName.trim() : undefined,
        companyEmail: visitorType === 'SALES_REPRESENTATIVE' ? companyEmail.trim() : undefined,
      });
      const bookingResult = { bookingId: res.bookingId, message: res.message };
      setResult(bookingResult);
      setStep(6);
      onSuccess?.({ ...bookingResult, phone });
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String(
              (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '',
            )
          : '';
      setError(
        detail ||
          'Booking failed. The slot may have been taken — pick another time and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {step > minStep && step < 6 ? (
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        ) : (
          <span />
        )}
        {showHeaderLinks && (
          <div className="flex items-center gap-1">
            <Button variant="link" size="sm" asChild>
              <Link href="/book-appointment/how-it-works">How it works</Link>
            </Button>
            <Button variant="link" size="sm" asChild>
              <Link href="/book-appointment/status">Check booking status</Link>
            </Button>
          </div>
        )}
      </div>

      <Card className="relative overflow-hidden">
        {fetchingNext && (
          <ConnitorLoader variant="overlay" message={fetchingNext} />
        )}
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {step < 6 && (
            <p className="text-sm text-muted-foreground">
              Step {displayStep} of {totalSteps}
            </p>
          )}
          {initialBranchId && branchName && step < 6 && (
            <p className="text-sm text-primary font-medium">{branchName}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {step === 1 && (
            <div className="space-y-2">
              <Label>Select Hospital Location</Label>
              {loadingHospitals && (
                <ConnitorLoader variant="section" message="Loading hospitals…" className="py-8" />
              )}
              {!loadingHospitals && hospitals.length === 0 && !error && (
                <p className="text-sm text-muted-foreground">No hospitals available for booking.</p>
              )}
              {hospitals.map((h) => (
                <Button
                  key={h.id}
                  variant="outline"
                  className="w-full justify-start"
                  disabled={Boolean(fetchingNext)}
                  onClick={() => void selectHospital(h.id)}
                >
                  {h.name} — {h.city}
                </Button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <Label>Select Department</Label>
              {loadingDepartments && (
                <ConnitorLoader variant="section" message="Loading departments…" className="py-8" />
              )}
              {!loadingDepartments && departments.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No departments available for this hospital location.
                </p>
              )}
              {departments.map((d) => (
                <Button
                  key={d.id}
                  variant="outline"
                  className="w-full justify-start"
                  disabled={Boolean(fetchingNext)}
                  onClick={() => void selectDepartment(d.id)}
                >
                  {d.name}
                </Button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <Label>Select Section</Label>
              {subDepartments.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No sections available in this department.
                </p>
              )}
              {subDepartments.map((s) => (
                <Button
                  key={s.id}
                  variant="outline"
                  className="w-full justify-start"
                  disabled={Boolean(fetchingNext)}
                  onClick={() => void selectSubDepartment(s.id)}
                >
                  {s.name}
                </Button>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <Label>Select Doctor</Label>
              {doctors.length === 0 && (
                <p className="text-sm text-muted-foreground">No doctors available in this section.</p>
              )}
              {doctors.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  disabled={Boolean(fetchingNext)}
                  className="w-full rounded-lg border bg-card p-4 text-left transition hover:border-primary hover:bg-[#4A90E2]/08 disabled:opacity-60"
                  onClick={() => void selectDoctor(d)}
                >
                  <p className="font-medium">{d.name}</p>
                  {d.departmentName && (
                    <p className="text-sm text-muted-foreground mt-0.5">{d.departmentName}</p>
                  )}
                  {d.location && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {d.location}
                    </p>
                  )}
                  {d.qualification && (
                    <p className="text-xs text-muted-foreground mt-1">{d.qualification}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {step === 5 && selectedDoctor && (
            <div className="space-y-4">
              <DoctorDetailCard doctor={selectedDoctor} />

              {isRegisteredVisitor ? (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
                  <p className="font-medium">
                    Booking as{' '}
                    {visitorProfile?.fullName ||
                      [firstName, lastName].filter(Boolean).join(' ') ||
                      'your profile'}
                  </p>
                  {phone && email && (
                    <p className="text-muted-foreground">
                      +91 {phone} · {email}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground pt-1">
                    Your saved profile is used for this booking. The doctor will receive your name
                    and visit purpose.
                  </p>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                    <Link href="/visitor/dashboard">Manage profile</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <Label>First Name</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Phone (10 digits)</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={10} required />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                      placeholder="Required for dashboard login"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Already registered?{' '}
                    <Link href="/visitor/login?returnTo=/book-appointment" className="underline">
                      Sign in
                    </Link>{' '}
                    to skip entering your details.
                  </p>
                </>
              )}

              <div>
                <Label>Appointment Date</Label>
                <Input
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  type="date"
                  min={todayIstDateIso()}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Available time slots
                </Label>
                {loadingSlots && (
                  <ConnitorLoader variant="inline" message="Loading time slots…" className="py-3" />
                )}
                {!loadingSlots && slots.length === 0 && (
                  <p className="text-sm text-muted-foreground rounded-md border border-dashed p-3">
                    No published slots on this date. You can still ask the doctor for a visit slot
                    below.
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <Button
                      key={slot.id}
                      type="button"
                      size="sm"
                      variant={!requestCustomSlot && slotId === slot.id ? 'default' : 'outline'}
                      className={cn(
                        'text-xs',
                        !requestCustomSlot && slotId === slot.id && 'bg-primary',
                      )}
                      onClick={() => {
                        setRequestCustomSlot(false);
                        setSlotId(slot.id);
                      }}
                    >
                      {slot.label}
                    </Button>
                  ))}
                </div>

                <div className="rounded-lg border border-dashed p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Ask doctor for a visit slot</p>
                    <Button
                      type="button"
                      size="sm"
                      variant={requestCustomSlot ? 'default' : 'outline'}
                      onClick={() => {
                        setRequestCustomSlot(true);
                        setSlotId('');
                      }}
                    >
                      {requestCustomSlot ? 'Visit request selected' : 'Request a visit slot'}
                    </Button>
                  </div>
                  {requestCustomSlot && (
                    <div className="space-y-2">
                      <Label htmlFor="preferred-time">Requested time</Label>
                      <Input
                        id="preferred-time"
                        type="time"
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Choose a date, time, purpose, and meeting mode. The doctor will be emailed
                        your name with {appointmentDate || 'the selected date'} at{' '}
                        {preferredTime || 'the selected time'} ({appointmentMode === 'ONLINE'
                          ? 'online'
                          : 'offline'}
                        ) and can approve or decline.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Purpose</Label>
                <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="visitor-type">Visitor type</Label>
                <select
                  id="visitor-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={visitorType}
                  onChange={(e) => {
                    const next = e.target.value as VisitorKind;
                    setVisitorType(next);
                    if (next !== 'SALES_REPRESENTATIVE') {
                      setCompanyName('');
                      setCompanyEmail('');
                    }
                  }}
                >
                  {VISITOR_KINDS.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </select>
              </div>
              {visitorType === 'SALES_REPRESENTATIVE' && (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                  <div>
                    <Label htmlFor="company-name">Company name</Label>
                    <Input
                      id="company-name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-email">Company email</Label>
                    <Input
                      id="company-email"
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      required
                      placeholder="attendance updates go here"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Visit type</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant={appointmentMode === 'IN_PERSON' ? 'default' : 'outline'}
                    className="h-auto py-3 justify-start"
                    onClick={() => setAppointmentMode('IN_PERSON')}
                  >
                    <span className="text-left">
                      <span className="block font-medium">Offline (in-person)</span>
                      <span className="block text-xs opacity-80">Visit the hospital with QR check-in</span>
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant={appointmentMode === 'ONLINE' ? 'default' : 'outline'}
                    className="h-auto py-3 justify-start"
                    onClick={() => setAppointmentMode('ONLINE')}
                  >
                    <span className="text-left">
                      <span className="block font-medium">Online</span>
                      <span className="block text-xs opacity-80">Video link after doctor approval</span>
                    </span>
                  </Button>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={submit}
                disabled={
                  loading || (!requestCustomSlot && !slotId) || (requestCustomSlot && !preferredTime)
                }
              >
                {loading
                  ? 'Submitting…'
                  : requestCustomSlot
                    ? 'Send visit request to doctor'
                    : 'Confirm Booking'}
              </Button>
            </div>
          )}

          {step === 6 && result && (
            <div className="space-y-4 text-center">
              <p className="font-medium text-green-600">Booking Confirmed</p>
              <p className="text-sm">{result.message}</p>
              <p className="text-sm text-muted-foreground break-all">Booking ID: {result.bookingId}</p>
              <p className="text-xs text-muted-foreground">
                Save your booking ID. You will receive approval once the doctor reviews your request.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link href={`/book-appointment/status?bookingId=${result.bookingId}&phone=${phone}`}>
                  Track this booking
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
