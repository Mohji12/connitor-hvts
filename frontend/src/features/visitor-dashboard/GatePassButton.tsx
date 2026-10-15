'use client';

import Link from 'next/link';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatIstDateTime } from '@/lib/datetime';
import type { VisitorAppointment } from '@/lib/services/visitorPortalService';
import { cn } from '@/lib/utils';
import { doctorLabel } from './visit-filters';

interface GatePassButtonProps {
  item: VisitorAppointment;
  className?: string;
  size?: 'default' | 'lg';
}

/** Phones open the full-screen pass page; larger screens show the QR in a dialog. */
export function GatePassButton({ item, className, size = 'default' }: GatePassButtonProps): React.ReactElement {
  const buttonClass = cn(
    'bg-emerald-600 text-white hover:bg-emerald-700',
    size === 'lg' ? 'h-12 text-base' : 'h-10',
    className,
  );
  return (
    <>
      <Button asChild className={cn(buttonClass, 'lg:hidden')}>
        <Link href={`/visitor/pass?id=${encodeURIComponent(item.bookingId)}`}>
          <QrCode className="mr-2 h-4 w-4" />
          Show gate pass
        </Link>
      </Button>
      <Dialog>
        <DialogTrigger asChild>
          <Button className={cn(buttonClass, 'max-lg:hidden')}>
            <QrCode className="mr-2 h-4 w-4" />
            Show gate pass
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Gate pass</DialogTitle>
            <DialogDescription>
              {[doctorLabel(item.doctorName), formatIstDateTime(item.appointmentDate)].filter(Boolean).join(' · ')}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-center">
            {item.checkInQrCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.checkInQrCode}
                alt="Check-in QR code"
                className="mx-auto aspect-square w-full max-w-60 object-contain"
              />
            ) : null}
            <p className="mt-3 text-sm font-medium text-emerald-900">Show this QR at hospital security</p>
            {item.checkInOtp ? (
              <p className="mt-2 text-xs text-emerald-800">
                Backup OTP <span className="font-mono text-sm font-semibold tracking-widest">{item.checkInOtp}</span>
                {item.checkInOtpExpiry ? <> · valid until {formatIstDateTime(item.checkInOtpExpiry)}</> : null}
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
