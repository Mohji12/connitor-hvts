'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Stethoscope, Clock, Languages, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import {
  AppointmentService,
  type DoctorSlot,
  type PublicDoctor,
} from '@/lib/services/appointmentService';
import { todayIstDateIso } from '@/lib/datetime';
import { fetchVisitorBookingIdentity } from '@/lib/visitor-booking-profile';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { VISITOR_KINDS, type VisitorKind } from '@/lib/constants/visit-constants';
import {
  VisitPaymentChoice,
  type VisitPaymentResult,
} from '@/features/visitor-wallet/VisitPaymentChoice';
import {
  BookingProfileStep,
  type BookingProfileIdentity,
} from '@/features/book-appointment/BookingProfileStep';
import { SlotCalendar } from '@/features/book-appointment/SlotCalendar';
import {
  bookingResumeHref,
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
} from '@/features/book-appointment/booking-draft';
import { getVisitorToken } from '@/lib/services/visitorPortalService';
import { VisitorAuthService } from '@/lib/services/visitorAuthService';

/** 5 = create profile (visitors without one), 5A = visit details. */
type Step = 1 | 2 | 3 | 4 | 5 | '5A' | 6 | 7;

const STEP_ORDER: Step[] = [1, 2, 3, 4, 5, '5A', 6, 7];

function stepIndex(step: Step): number {
  return STEP_ORDER.indexOf(step);
}

export interface BookAppointmentWizardProps {
  initialBranchId?: string;
  initialBranchName?: string;
  showHeaderLinks?: boolean;
  title?: string;
  className?: string;
}

function visitorDashboardHref(bookingId: string): string {
  return `/visitor/dashboard?booked=${encodeURIComponent(bookingId)}`;
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
  showHeaderLinks = true,
  title = 'Book Doctor Appointment',
  className,
}: BookAppointmentWizardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const minStep: Step = initialBranchId ? 2 : 1;
  const totalSteps = initialBranchId ? 6 : 7;

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
  const [itemsCarrying, setItemsCarrying] = React.useState('');
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
  const [loadingVisitorProfile, setLoadingVisitorProfile] = React.useState(false);
  /** True once the visitor created their profile inside this booking (step 5). */
  const [profileCreatedHere, setProfileCreatedHere] = React.useState(false);
  const [hasAccount, setHasAccount] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void VisitorAuthService.hasValidSession().then((valid) => {
      if (!cancelled) setHasAccount(valid);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [step]);

  const stepOffset = initialBranchId ? 1 : 0;
  const displayStep = (step === '5A' ? 5 : step) - stepOffset;
  const stepLabel = step === '5A' && profileCreatedHere ? `${displayStep}A` : String(displayStep);
  const isVisitDetailsStep = step === '5A';

  const applyVisitorIdentity = React.useCallback((identity: BookingProfileIdentity | null) => {
    if (!identity) return;
    setFirstName(identity.firstName);
    setLastName(identity.lastName);
    setPhone(identity.phone);
    setEmail(identity.email);
    const complete =
      Boolean(identity.firstName.trim()) &&
      Boolean(identity.lastName.trim()) &&
      identity.phone.length === 10 &&
      identity.email.includes('@');
    setIsRegisteredVisitor(complete);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setLoadingVisitorProfile(true);
    fetchVisitorBookingIdentity()
      .then((identity) => {
        if (!cancelled) applyVisitorIdentity(identity);
      })
      .finally(() => {
        if (!cancelled) setLoadingVisitorProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyVisitorIdentity]);

  React.useEffect(() => {
    if (step !== '5A' || isRegisteredVisitor) return;
    let cancelled = false;
    fetchVisitorBookingIdentity().then((identity) => {
      if (!cancelled) applyVisitorIdentity(identity);
    });
    return () => {
      cancelled = true;
    };
  }, [step, isRegisteredVisitor, applyVisitorIdentity]);

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
    setStep(getVisitorToken() ? '5A' : 5);
  };

  const onProfileVerified = (identity: BookingProfileIdentity) => {
    applyVisitorIdentity(identity);
    setProfileCreatedHere(true);
    setHasAccount(true);
    setError('');
    setStep('5A');
  };

  const canGoBack = stepIndex(step) > stepIndex(minStep) && step !== 7;

  const goBack = () => {
    if (!canGoBack) return;
    let prev = STEP_ORDER[stepIndex(step) - 1];
    // The profile step is only for visitors who are not signed in yet.
    if (prev === 5 && getVisitorToken()) prev = 4;
    setStep(prev);
  };

  /** Slot chosen before the wallet recharge; re-applied once that date's slots reload. */
  const pendingSlotIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('resume') !== '1') return;
    params.delete('resume');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    const draft = loadBookingDraft();
    clearBookingDraft();
    if (!draft) return;
    setBranchId(draft.branchId);
    setBranchName(draft.branchName);
    setDepartmentId(draft.departmentId);
    setSubDepartmentId(draft.subDepartmentId);
    setDoctorId(draft.doctorId);
    setSelectedDoctor(draft.selectedDoctor);
    if (!draft.selectedDoctor && draft.doctorId) {
      AppointmentService.getPublicDoctor(draft.doctorId)
        .then(setSelectedDoctor)
        .catch(() => undefined);
    }
    setAppointmentDate(draft.appointmentDate);
    setRequestCustomSlot(draft.requestCustomSlot);
    setPreferredTime(draft.preferredTime);
    setPurpose(draft.purpose);
    setItemsCarrying(draft.itemsCarrying);
    setAppointmentMode(draft.appointmentMode);
    setVisitorType(draft.visitorType);
    setCompanyName(draft.companyName);
    setCompanyEmail(draft.companyEmail);
    if (draft.firstName) setFirstName(draft.firstName);
    if (draft.lastName) setLastName(draft.lastName);
    if (draft.phone) setPhone(draft.phone);
    if (draft.email) setEmail(draft.email);
    setProfileCreatedHere(draft.profileCreatedHere);
    pendingSlotIdRef.current = draft.requestCustomSlot ? null : draft.slotId || null;
    setStep(draft.resumeStep ?? 6);
  }, []);

  React.useEffect(() => {
    const requestId = new URLSearchParams(window.location.search).get('slotRequest');
    if (!requestId) return;
    if (!getVisitorToken()) {
      setError('Please sign in to book the visit slot the doctor approved.');
      return;
    }
    let cancelled = false;
    AppointmentService.getSlotRequest(requestId)
      .then((request) => {
        if (cancelled) return;
        if (request.status !== 'APPROVED' || !request.slotId) {
          setError(
            request.status === 'REJECTED'
              ? 'The doctor could not approve this visit request. Please request another time.'
              : 'The doctor has not confirmed this visit request yet.',
          );
          return;
        }
        if (request.slotBooked) {
          setError('This approved slot is already booked.');
          return;
        }
        setBranchId(request.branchId);
        setBranchName(request.branchName);
        setDepartmentId(request.departmentId);
        setSubDepartmentId(request.subDepartmentId);
        setDoctorId(request.doctorId);
        setAppointmentDate(request.date);
        setRequestCustomSlot(false);
        setPurpose(request.purpose);
        pendingSlotIdRef.current = request.slotId;
        AppointmentService.getPublicDoctor(request.doctorId)
          .then((doctor) => {
            if (!cancelled) setSelectedDoctor(doctor);
          })
          .catch(() => undefined);
        setStep('5A');
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your approved visit slot.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    setSlotId('');
  }, [doctorId, appointmentDate]);

  React.useEffect(() => {
    if (!doctorId || !appointmentDate || stepIndex(step) < stepIndex('5A')) return;
    let cancelled = false;
    setLoadingSlots(true);
    AppointmentService.listDoctorSlots(doctorId, appointmentDate)
      .then((rows) => {
        if (cancelled) return;
        setSlots(rows);
        const pending = pendingSlotIdRef.current;
        if (pending) {
          pendingSlotIdRef.current = null;
          if (rows.some((row) => row.id === pending)) {
            setSlotId(pending);
          } else {
            setError('The time slot you picked was just taken. Please choose another time.');
            setStep('5A');
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSlots([]);
        setError('Could not load available time slots.');
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [doctorId, appointmentDate, step]);

  const selectedSlot = slots.find((s) => s.id === slotId);
  const noSlotsOnDate =
    step === '5A' && !requestCustomSlot && Boolean(appointmentDate) && !loadingSlots && slots.length === 0;
  const [exiting, setExiting] = React.useState(false);
  const [sendingRequest, setSendingRequest] = React.useState(false);

  const sendSlotRequest = async () => {
    if (!appointmentDate || !preferredTime) {
      setError('Please choose a date and time for your visit request.');
      return;
    }
    if (purpose.trim().length < 3) {
      setError('Please enter the purpose of your visit.');
      return;
    }
    if (!getVisitorToken()) {
      setError('Please sign in to send a visit request to the doctor.');
      return;
    }
    setError('');
    setSendingRequest(true);
    try {
      await AppointmentService.createSlotRequest({
        branchId,
        departmentId,
        subDepartmentId,
        doctorId,
        date: appointmentDate,
        time: preferredTime,
        purpose: purpose.trim(),
      });
      toast.success("Request sent. We'll WhatsApp you once the doctor confirms.");
      router.push('/visitor/dashboard');
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      setError(detail || 'Could not send your request. Please try again.');
      setSendingRequest(false);
    }
  };

  const exitAndNotify = async () => {
    setExiting(true);
    try {
      await AppointmentService.joinSlotWaitlist(doctorId, appointmentDate);
      toast.success("We'll notify you on WhatsApp once slots are available.");
      router.push(hasAccount || getVisitorToken() ? '/visitor/dashboard' : '/');
    } catch {
      toast.error('Could not save your request. Please try again.');
      setExiting(false);
    }
  };

  const readyToBook = (): boolean => {
    const normalizedEmail = email.trim().toLowerCase();
    if (purpose.trim().length < 3) {
      setError('Please enter the purpose of your visit.');
      return false;
    }
    if (itemsCarrying.trim().length < 2) {
      setError('Please mention what you are carrying.');
      return false;
    }
    if (!requestCustomSlot && !slotId) {
      setError('Please select a time slot, or request a visit slot from the doctor.');
      return false;
    }
    if (requestCustomSlot && !appointmentDate) {
      setError('Please choose a date for your visit request.');
      return false;
    }
    if (requestCustomSlot && !preferredTime) {
      setError('Please choose a time for your visit request.');
      return false;
    }
    if (isRegisteredVisitor) {
      if (!firstName.trim() || !phone || phone.length !== 10 || !normalizedEmail.includes('@')) {
        setError('Your profile is missing contact details. Update your profile and try again.');
        return false;
      }
    } else if (
      phone.length !== 10 ||
      !normalizedEmail.includes('@') ||
      !firstName.trim() ||
      !lastName.trim()
    ) {
      setError('Please fill in all required fields and use a valid 10-digit phone and email.');
      return false;
    }
    if (visitorType === 'SALES_REPRESENTATIVE') {
      if (!companyName.trim() || !companyEmail.includes('@')) {
        setError('Company name and a valid company email are required for Sales Representative.');
        return false;
      }
    }
    return true;
  };

  const rechargeAndResume = () => {
    saveBookingDraft({
      branchId,
      branchName,
      departmentId,
      subDepartmentId,
      doctorId,
      selectedDoctor,
      appointmentDate,
      slotId,
      requestCustomSlot,
      preferredTime,
      purpose,
      itemsCarrying,
      appointmentMode,
      visitorType,
      companyName,
      companyEmail,
      firstName,
      lastName,
      phone,
      email,
      profileCreatedHere,
    });
    router.push(`/visitor/wallet?returnTo=${encodeURIComponent(bookingResumeHref())}`);
  };

  const continueToPayment = () => {
    if (!readyToBook()) return;
    setError('');
    setStep(6);
  };

  const submit = async (payment: VisitPaymentResult) => {
    if (!readyToBook()) return;
    const normalizedEmail = email.trim().toLowerCase();
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
        purpose: purpose.trim(),
        itemsCarrying: itemsCarrying.trim(),
        appointmentMode,
        visitorType,
        companyName: visitorType === 'SALES_REPRESENTATIVE' ? companyName.trim() : undefined,
        companyEmail: visitorType === 'SALES_REPRESENTATIVE' ? companyEmail.trim() : undefined,
        paymentMethod: payment.paymentMethod,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        razorpaySignature: payment.razorpaySignature,
      });
      setResult({ bookingId: res.bookingId, message: res.message });
      setStep(7);
      router.replace(visitorDashboardHref(res.bookingId));
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
    <div
      className={cn(
        'mx-auto w-full max-w-lg space-y-4 transition-[max-width]',
        step === 5 && 'lg:max-w-4xl',
        isVisitDetailsStep && 'max-lg:pb-24',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {noSlotsOnDate ? (
          <Button variant="ghost" size="sm" disabled={exiting} onClick={() => void exitAndNotify()}>
            <LogOut className="mr-1 h-4 w-4" /> {exiting ? 'Exiting…' : 'Exit'}
          </Button>
        ) : canGoBack ? (
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        ) : showHeaderLinks ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={hasAccount ? '/visitor/dashboard' : '/'}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {showHeaderLinks && hasAccount && (
          <Button variant="link" size="sm" asChild>
            <Link href="/visitor/dashboard">Check booking status</Link>
          </Button>
        )}
      </div>

      <Card className="relative overflow-hidden max-lg:rounded-2xl">
        {fetchingNext && (
          <ConnitorLoader variant="fullscreen" message={fetchingNext} />
        )}
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {step !== 7 && (
            <>
              <p className="text-sm text-muted-foreground">
                Step {stepLabel} of {totalSteps}
                {step === 5 && ' · Create your profile'}
                {isVisitDetailsStep && ' · Visit details'}
              </p>
              <div
                className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={totalSteps}
                aria-valuenow={displayStep}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${Math.min(100, (displayStep / totalSteps) * 100)}%` }}
                />
              </div>
            </>
          )}
          {initialBranchId && branchName && step !== 7 && (
            <p className="text-sm text-primary font-medium">{branchName}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {step === 1 && (
            <div className="space-y-2">
              <Label>Select Hospital Location</Label>
              {loadingHospitals && (
                <ConnitorLoader variant="section" message="Loading hospitals…" className="min-h-[50vh]" />
              )}
              {!loadingHospitals && hospitals.length === 0 && !error && (
                <p className="text-sm text-muted-foreground">No hospitals available for booking.</p>
              )}
              {hospitals.map((h) => (
                <Button
                  key={h.id}
                  variant="outline"
                  className="h-auto w-full min-w-0 justify-start whitespace-normal py-2.5 text-left leading-snug max-lg:min-h-12 max-lg:rounded-xl"
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
                <ConnitorLoader variant="section" message="Loading departments…" className="min-h-[50vh]" />
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
                  className="h-auto w-full min-w-0 justify-start whitespace-normal py-2.5 text-left leading-snug max-lg:min-h-12 max-lg:rounded-xl"
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
                  className="h-auto w-full min-w-0 justify-start whitespace-normal py-2.5 text-left leading-snug max-lg:min-h-12 max-lg:rounded-xl"
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
              <BookingProfileStep onVerified={onProfileVerified} />
            </div>
          )}

          {isVisitDetailsStep && selectedDoctor && (
            <div className="space-y-4">
              <DoctorDetailCard doctor={selectedDoctor} />

              {loadingVisitorProfile && (
                <ConnitorLoader variant="inline" message="Loading your profile…" />
              )}

              {isRegisteredVisitor && !loadingVisitorProfile && (
                <div className="rounded-lg border border-[#4A90E2]/25 bg-[#4A90E2]/5 p-3 text-sm text-muted-foreground">
                  {profileCreatedHere ? 'Profile created and phone verified' : 'Signed in'} — booking as{' '}
                  <span className="font-medium text-foreground">
                    {[firstName, lastName].filter(Boolean).join(' ')}
                  </span>{' '}
                  (+91 {phone}).{' '}
                  <Link href="/visitor/dashboard" className="font-medium text-primary underline-offset-4 hover:underline">
                    Manage profile
                  </Link>
                </div>
              )}

              {!isRegisteredVisitor && !loadingVisitorProfile && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Your profile is missing some contact details. Fill them in for this booking.
                  </p>
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone (10 digits)</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={10} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Appointment Date</Label>
                <SlotCalendar
                  doctorId={doctorId}
                  value={appointmentDate}
                  onChange={setAppointmentDate}
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
                {noSlotsOnDate && (
                  <div className="space-y-3 rounded-md border border-dashed border-amber-300 bg-amber-50 p-3 text-sm">
                    <p className="text-amber-900">
                      No slots are available on this date. Tap Exit and we will notify you on
                      WhatsApp once slots open. You can also pick a green date, or ask the doctor
                      for a visit slot below.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-amber-400 bg-white"
                      disabled={exiting}
                      onClick={() => void exitAndNotify()}
                    >
                      <LogOut className="mr-1 h-4 w-4" />
                      {exiting ? 'Exiting…' : 'Exit and notify me'}
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <Button
                      key={slot.id}
                      type="button"
                      size="sm"
                      variant={!requestCustomSlot && slotId === slot.id ? 'default' : 'outline'}
                      className={cn(
                        'text-xs max-lg:h-10',
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
                        The doctor gets your request for {appointmentDate || 'the selected date'} at{' '}
                        {preferredTime || 'the selected time'} on WhatsApp. Once they confirm, we
                        WhatsApp you a link to book and pay for that slot. Nothing is charged now.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visit-purpose">Purpose of the visit</Label>
                <Textarea
                  id="visit-purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                  minLength={3}
                  maxLength={191}
                  placeholder="For example: product discussion, follow-up consultation"
                />
              </div>
              {requestCustomSlot ? (
                <StickyActionBar>
                  <Button
                    className="w-full max-lg:h-12 max-lg:text-base"
                    onClick={() => void sendSlotRequest()}
                    disabled={sendingRequest || !preferredTime || purpose.trim().length < 3}
                  >
                    {sendingRequest ? 'Sending…' : 'Send request to doctor'}
                  </Button>
                </StickyActionBar>
              ) : (
              <>
              <div className="space-y-2">
                <Label htmlFor="items-carrying">What are you carrying?</Label>
                <Textarea
                  id="items-carrying"
                  value={itemsCarrying}
                  onChange={(e) => setItemsCarrying(e.target.value)}
                  required
                  minLength={2}
                  maxLength={500}
                  placeholder="For example: laptop, product samples, documents. Write Nothing if you are not carrying anything."
                />
              </div>
              <div className="space-y-2">
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
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company name</Label>
                    <Input
                      id="company-name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
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
              <StickyActionBar>
                <Button
                  className="w-full max-lg:h-12 max-lg:text-base"
                  onClick={continueToPayment}
                  disabled={!slotId}
                >
                  Continue to payment
                </Button>
              </StickyActionBar>
              </>
              )}
            </div>
          )}

          {step === 6 && (
            <VisitPaymentChoice
              returnTo={pathname || '/book-appointment'}
              busy={loading}
              onPay={submit}
              onRecharge={rechargeAndResume}
              allowDummy
            />
          )}

          {step === 7 && result && (
            <div className="space-y-4 text-center">
              <p className="font-medium text-green-600">Booking Confirmed</p>
              <p className="text-sm">{result.message}</p>
              <p className="text-sm text-left">
                <span className="text-muted-foreground">Purpose of the visit: </span>
                {purpose.trim()}
              </p>
              <p className="text-sm text-left">
                <span className="text-muted-foreground">Carrying: </span>
                {itemsCarrying.trim()}
              </p>
              <p className="text-sm text-muted-foreground break-all">Booking ID: {result.bookingId}</p>
              <p className="text-xs text-muted-foreground">
                Opening your dashboard, where you can follow the doctor&apos;s approval…
              </p>
              <Button asChild className="w-full">
                <Link href={visitorDashboardHref(result.bookingId)}>Go to my dashboard</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
