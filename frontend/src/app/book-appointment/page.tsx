'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookAppointmentWizard } from '@/features/book-appointment/BookAppointmentWizard';
import { saveBookingDraft } from '@/features/book-appointment/booking-draft';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { AppointmentService, type SlotRequestRecord } from '@/lib/services/appointmentService';
import { getVisitorToken } from '@/lib/services/visitorPortalService';
import { branchSlug } from '@/lib/branch-slug';
import { useRegisterTopBar } from '@/lib/app-back';

type ResolvedBranch =
  | { status: 'loading' }
  | { status: 'found'; id: string; name: string }
  | { status: 'not-found' };

function useBranchFromSlug(slug: string | undefined): ResolvedBranch | null {
  const [resolved, setResolved] = React.useState<ResolvedBranch | null>(
    slug ? { status: 'loading' } : null,
  );

  React.useEffect(() => {
    if (!slug) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    setResolved({ status: 'loading' });
    AppointmentService.listPublicHospitals()
      .then((list) => {
        if (cancelled) return;
        const match = list.find((h) => branchSlug(h.name) === slug.toLowerCase());
        setResolved(match ? { status: 'found', id: match.id, name: match.name } : { status: 'not-found' });
      })
      .catch(() => {
        if (!cancelled) setResolved({ status: 'not-found' });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return resolved;
}

function slotRequestMessage(request: SlotRequestRecord): { title: string; body: string } {
  if (request.status === 'PENDING') {
    return {
      title: 'Waiting for the doctor',
      body: `Dr. ${request.doctorName} hasn't confirmed your visit request yet. We'll WhatsApp you once they do.`,
    };
  }
  if (request.status === 'REJECTED') {
    return {
      title: 'Request not confirmed',
      body: `Dr. ${request.doctorName} couldn't confirm this time. Please pick another slot.`,
    };
  }
  return { title: 'Already booked', body: 'You have already booked this visit. See it on your dashboard.' };
}

/** Opens an approved slot request (WhatsApp "Book Visit" link) in the booking wizard. */
function SlotRequestHandoff({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [state, setState] = React.useState<
    { status: 'loading' } | { status: 'done'; request: SlotRequestRecord } | { status: 'error' }
  >({ status: 'loading' });

  React.useEffect(() => {
    const here = `/book-appointment/?slotRequest=${encodeURIComponent(requestId)}`;
    if (!getVisitorToken()) {
      router.replace(`/visitor/login?returnTo=${encodeURIComponent(here)}`);
      return;
    }
    let cancelled = false;
    AppointmentService.getSlotRequest(requestId)
      .then((request) => {
        if (cancelled) return;
        if (request.status === 'APPROVED' && request.slotId && !request.slotBooked) {
          saveBookingDraft({
            branchId: request.branchId,
            branchName: request.branchName,
            departmentId: request.departmentId,
            subDepartmentId: request.subDepartmentId,
            doctorId: request.doctorId,
            selectedDoctor: null,
            appointmentDate: request.date,
            slotId: request.slotId,
            requestCustomSlot: false,
            preferredTime: request.time,
            purpose: request.purpose,
            itemsCarrying: '',
            appointmentMode: 'IN_PERSON',
            visitorType: 'GENERAL',
            companyName: '',
            companyEmail: '',
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            profileCreatedHere: false,
            resumeStep: '5A',
          });
          const params = new URLSearchParams({
            branchId: request.branchId,
            branchName: request.branchName,
            resume: '1',
          });
          router.replace(`/book-appointment/?${params.toString()}`);
          return;
        }
        setState({ status: 'done', request });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [requestId, router]);

  if (state.status === 'loading') {
    return <ConnitorLoader variant="section" message="Opening your visit…" className="min-h-[70vh]" />;
  }

  const { title, body } =
    state.status === 'error'
      ? { title: 'Request not found', body: "We couldn't find this visit request on your account." }
      : slotRequestMessage(state.request);

  return (
    <div className="mx-auto max-w-lg space-y-3 rounded-lg border bg-white p-6 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
      <Link
        href="/visitor/dashboard"
        className="inline-block text-sm text-primary underline-offset-4 hover:underline"
      >
        Go to dashboard
      </Link>
    </div>
  );
}

function BookAppointmentContent() {
  const searchParams = useSearchParams();
  const slotRequestId = searchParams.get('slotRequest');
  if (slotRequestId) {
    return <SlotRequestHandoff requestId={slotRequestId} />;
  }
  return <BookingWizardForBranch />;
}

function lockedModeFromSearch(
  raw: string | null,
): 'IN_PERSON' | 'ONLINE' | undefined {
  if (raw === 'online') return 'ONLINE';
  if (raw === 'offline' || raw === 'in_person' || raw === 'IN_PERSON') return 'IN_PERSON';
  return undefined;
}

function BookingWizardForBranch() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId') ?? undefined;
  const branchName = searchParams.get('branchName') ?? undefined;
  const chainParam = searchParams.get('chain') ?? undefined;
  const lockedAppointmentMode = lockedModeFromSearch(searchParams.get('mode'));
  const wizardTitle =
    lockedAppointmentMode === 'ONLINE'
      ? 'Book Online Session'
      : lockedAppointmentMode === 'IN_PERSON'
        ? 'Book In-Person Visit'
        : 'Book Doctor Appointment';
  const slug = branchId ? undefined : (searchParams.get('branch') ?? undefined);
  const resolved = useBranchFromSlug(slug);

  if (resolved?.status === 'loading') {
    return <ConnitorLoader variant="section" message="Loading hospital…" className="min-h-[70vh]" />;
  }

  if (resolved?.status === 'not-found') {
    return (
      <div className="mx-auto max-w-lg space-y-3 rounded-lg border bg-white p-6 text-center">
        <p className="font-semibold text-foreground">Hospital not found</p>
        <p className="text-sm text-muted-foreground">
          This booking link doesn&apos;t match any hospital. Please choose a hospital to continue.
        </p>
        <Link
          href="/book-appointment/"
          className="inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          Choose a hospital
        </Link>
      </div>
    );
  }

  if (resolved?.status === 'found') {
    return (
      <BookAppointmentWizard
        key={`${resolved.id}-${lockedAppointmentMode ?? 'any'}`}
        initialBranchId={resolved.id}
        initialBranchName={resolved.name}
        title={wizardTitle}
        lockedAppointmentMode={lockedAppointmentMode}
      />
    );
  }

  return (
    <BookAppointmentWizard
      key={`${chainParam ?? 'any'}-${lockedAppointmentMode ?? 'any'}`}
      initialBranchId={branchId}
      initialBranchName={branchName ?? undefined}
      initialChainId={chainParam}
      title={wizardTitle}
      lockedAppointmentMode={lockedAppointmentMode}
    />
  );
}

export default function BookAppointmentPage() {
  useRegisterTopBar();
  return (
    <div className="pt-safe min-h-dvh w-full min-w-0 bg-[#F7F9FC] p-4 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <Suspense fallback={<ConnitorLoader variant="section" className="min-h-[70vh]" />}>
          <BookAppointmentContent />
        </Suspense>
      </div>
    </div>
  );
}
