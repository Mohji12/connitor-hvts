'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, ChevronLeft, Clock, MapPin, Package } from 'lucide-react';
import { toast } from 'sonner';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BookingListSearch, filterBySearchName } from '@/features/book-appointment/BookingListSearch';
import {
  BookingProfileStep,
  type BookingProfileIdentity,
} from '@/features/book-appointment/BookingProfileStep';
import { SlotCalendar } from '@/features/book-appointment/SlotCalendar';
import { todayIstDateIso } from '@/lib/datetime';
import { getApiErrorMessage } from '@/lib/api-errors';
import { getVisitorToken } from '@/lib/services/visitorPortalService';
import {
  DistributorVisitService,
  type DistributorVisitSlot,
  type PublicDistributor,
} from '@/lib/services/distributorVisitService';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 4;

export function BookDistributorVisitWizard(): React.ReactElement {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>(1);
  const [query, setQuery] = React.useState('');
  const [vendors, setVendors] = React.useState<PublicDistributor[]>([]);
  const [loadingVendors, setLoadingVendors] = React.useState(true);
  const [selected, setSelected] = React.useState<PublicDistributor | null>(null);
  const [hasAccount, setHasAccount] = React.useState(() => Boolean(getVisitorToken()));
  const [appointmentDate, setAppointmentDate] = React.useState(todayIstDateIso);
  const [slots, setSlots] = React.useState<DistributorVisitSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [slotId, setSlotId] = React.useState('');
  const [purpose, setPurpose] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoadingVendors(true);
    DistributorVisitService.listPublicDistributors()
      .then((items) => {
        if (!cancelled) setVendors(items);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load distributors');
      })
      .finally(() => {
        if (!cancelled) setLoadingVendors(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDates = React.useCallback(
    (from: string, to: string) => {
      if (!selected) return Promise.resolve([]);
      return DistributorVisitService.listAvailableDates(selected.id, from, to);
    },
    [selected],
  );

  React.useEffect(() => {
    if (step < 3 || !selected) return;
    let cancelled = false;
    setLoadingSlots(true);
    DistributorVisitService.listPublicSlots(selected.id, appointmentDate)
      .then((items) => {
        if (cancelled) return;
        setSlots(items);
        setSlotId((current) => (items.some((item) => item.id === current) ? current : ''));
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appointmentDate, selected, step]);

  const visibleVendors = filterBySearchName(vendors, query, (item) =>
    [item.vendorName, item.city, item.goodsDescription, item.vendorCode].filter(Boolean).join(' '),
  );

  function goNextFromVendor(): void {
    setHasAccount(Boolean(getVisitorToken()));
    setStep(getVisitorToken() ? 3 : 2);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function onProfileVerified(identity: BookingProfileIdentity): void {
    setHasAccount(true);
    setStep(3);
  }

  function back(): void {
    if (step === 1) {
      router.push('/visitor/dashboard');
      return;
    }
    if (step === 3 && hasAccount) {
      setStep(1);
      return;
    }
    setStep((current) => (current === 1 ? 1 : ((current - 1) as Step)));
  }

  async function submit(): Promise<void> {
    if (!selected || !slotId || purpose.trim().length < 3) {
      toast.error('Pick a slot and write why you want to meet');
      return;
    }
    setSubmitting(true);
    try {
      const booked = await DistributorVisitService.book({
        distributorId: selected.id,
        slotId,
        purpose: purpose.trim(),
      });
      router.push(`/visitor/dashboard?booked=${encodeURIComponent(booked.bookingId)}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not book this visit'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-3 py-5 lg:px-0 lg:py-8">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11" onClick={back}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Distributor visit</p>
          <h1 className="truncate text-xl font-bold text-slate-900">Meet a distributor</h1>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Book a meeting at the distributor office. They approve the request and send you a meeting pass.
      </p>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choose a distributor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BookingListSearch
              value={query}
              onChange={setQuery}
              placeholder="Search by name, city, or goods"
            />
            {loadingVendors ? (
              <ConnitorLoader variant="inline" message="Loading distributors…" />
            ) : visibleVendors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approved distributors match that search.</p>
            ) : (
              <div className="space-y-2">
                {visibleVendors.map((vendor) => (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => setSelected(vendor)}
                    className={cn(
                      'w-full rounded-xl border p-3 text-left transition hover:border-[#001B71]/30',
                      selected?.id === vendor.id
                        ? 'border-[#001B71] bg-[#001B71]/5'
                        : 'border-slate-200 bg-white',
                    )}
                  >
                    <p className="font-semibold text-slate-900">{vendor.vendorName}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      {vendor.city ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {[vendor.city, vendor.state].filter(Boolean).join(', ')}
                        </span>
                      ) : null}
                      {vendor.goodsDescription ? (
                        <span className="inline-flex items-center gap-1">
                          <Package className="h-3.5 w-3.5" />
                          {vendor.goodsDescription}
                        </span>
                      ) : null}
                    </p>
                  </button>
                ))}
              </div>
            )}
            <StickyActionBar>
              <Button className="w-full" disabled={!selected} onClick={goNextFromVendor}>
                Continue
              </Button>
            </StickyActionBar>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create your visitor profile</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingProfileStep onVerified={onProfileVerified} />
          </CardContent>
        </Card>
      ) : null}

      {step === 3 && selected ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pick a slot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <Building2 className="h-4 w-4" />
                {selected.vendorName}
              </p>
              {selected.city ? (
                <p className="mt-1 text-muted-foreground">{[selected.city, selected.state].filter(Boolean).join(', ')}</p>
              ) : null}
            </div>
            <SlotCalendar value={appointmentDate} onChange={setAppointmentDate} loadDates={loadDates} />
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Open times
              </Label>
              {loadingSlots ? <ConnitorLoader variant="inline" message="Loading slots…" /> : null}
              {!loadingSlots && slots.length === 0 ? (
                <p className="rounded-md border border-dashed bg-amber-50 p-3 text-sm text-amber-900">
                  No open slots on this date. Green days have availability.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <Button
                      key={slot.id}
                      type="button"
                      size="sm"
                      variant={slotId === slot.id ? 'default' : 'outline'}
                      className="text-xs"
                      onClick={() => setSlotId(slot.id)}
                    >
                      {slot.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <StickyActionBar>
              <Button className="w-full" disabled={!slotId} onClick={() => setStep(4)}>
                Continue
              </Button>
            </StickyActionBar>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 && selected ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Purpose of visit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">{selected.vendorName}</Badge>
              <Badge variant="outline">{appointmentDate}</Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">Why are you visiting?</Label>
              <Textarea
                id="purpose"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="Product discussion, warehouse walkthrough, account review…"
                rows={4}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Already have a hospital visit instead?{' '}
              <Link href="/book-appointment" className="font-medium text-primary underline-offset-4 hover:underline">
                Book a doctor
              </Link>
              .
            </p>
            <StickyActionBar>
              <Button className="w-full" disabled={submitting || purpose.trim().length < 3} onClick={() => void submit()}>
                {submitting ? 'Sending request…' : 'Send visit request'}
              </Button>
            </StickyActionBar>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
