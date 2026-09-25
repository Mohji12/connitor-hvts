'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AppointmentApprovalApi,
  type ReschedulePreview,
} from '@/lib/services/appointmentApprovalService';
import { AppointmentService } from '@/lib/services/appointmentService';

function RescheduleVisitContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const [preview, setPreview] = useState<ReschedulePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<{ id: string; label: string; iso: string }[]>(
    [],
  );
  const [selectedSlotIso, setSelectedSlotIso] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Missing approval token.');
      setLoading(false);
      return;
    }
    AppointmentApprovalApi.getReschedulePreview(token)
      .then((data) => {
        setPreview(data);
        if (data.appointmentDateIso) {
          const d = new Date(data.appointmentDateIso);
          if (!Number.isNaN(d.getTime())) {
            setSlotDate(d.toISOString().slice(0, 10));
            setSlotTime(d.toTimeString().slice(0, 5));
          }
        }
      })
      .catch((err: { response?: { status?: number; data?: { detail?: string } } }) => {
        const detail = err.response?.data?.detail;
        setError(detail ?? 'This link is invalid or has expired.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!preview?.doctorId || !slotDate) {
      setAvailableSlots([]);
      return;
    }
    AppointmentService.listDoctorSlots(preview.doctorId, slotDate)
      .then((slots) => {
        const mapped = slots.map((s) => ({
          id: s.id,
          label: s.label || new Date(s.slotStart).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
          iso: s.slotStart,
        }));
        setAvailableSlots(mapped);
      })
      .catch(() => setAvailableSlots([]));
  }, [preview?.doctorId, slotDate]);

  const appointmentIso = useMemo(() => {
    if (selectedSlotIso) return selectedSlotIso;
    if (!slotDate || !slotTime) return '';
    return `${slotDate}T${slotTime}:00`;
  }, [slotDate, slotTime, selectedSlotIso]);

  const onSubmit = async () => {
    if (!token || !appointmentIso) {
      toast.error('Choose a date and time.');
      return;
    }
    setActing(true);
    try {
      const result = await AppointmentApprovalApi.reschedule(token, appointmentIso);
      setDone(true);
      toast.success(result.message);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? 'Could not reschedule. The link may have expired.');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <ConnitorLoader variant="section" message="Loading…" className="py-10" />;
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (done) {
    return (
      <div className="space-y-3 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <p className="font-medium">Appointment confirmed</p>
        <p className="text-sm text-muted-foreground">
          The new time is saved and the visitor has been notified. This link can no longer be used.
        </p>
      </div>
    );
  }

  if (!preview || !preview.canAct || preview.used || preview.expired) {
    return (
      <p className="text-muted-foreground">
        This reschedule link is no longer available.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
        <p>
          <span className="text-muted-foreground">Visitor:</span>{' '}
          <strong>{preview.visitorName}</strong>
        </p>
        {preview.appointmentDate && (
          <p>
            <span className="text-muted-foreground">Currently requested:</span>{' '}
            {preview.appointmentDate}
          </p>
        )}
        {preview.purpose && (
          <p>
            <span className="text-muted-foreground">Purpose:</span> {preview.purpose}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="slot-date">Date</Label>
          <Input
            id="slot-date"
            type="date"
            value={slotDate}
            onChange={(e) => {
              setSlotDate(e.target.value);
              setSelectedSlotIso('');
            }}
          />
        </div>
        {availableSlots.length > 0 && (
          <div className="space-y-2">
            <Label>Available slots</Label>
            <div className="flex flex-wrap gap-2">
              {availableSlots.map((slot) => (
                <Button
                  key={slot.id}
                  type="button"
                  size="sm"
                  variant={selectedSlotIso === slot.iso ? 'default' : 'outline'}
                  onClick={() => setSelectedSlotIso(slot.iso)}
                >
                  {slot.label}
                </Button>
              ))}
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="slot-time">Time (if not using a slot above)</Label>
          <Input
            id="slot-time"
            type="time"
            value={slotTime}
            onChange={(e) => {
              setSlotTime(e.target.value);
              setSelectedSlotIso('');
            }}
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Choosing a new time will confirm the visit immediately and notify the visitor.
      </p>

      <Button className="w-full" onClick={onSubmit} disabled={acting || !appointmentIso}>
        {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Confirm new time
      </Button>
    </div>
  );
}

export default function RescheduleVisitPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reschedule appointment</CardTitle>
          <CardDescription>Pick a new date and time — no login required</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ConnitorLoader variant="inline" message="Loading…" />}>
            <RescheduleVisitContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
