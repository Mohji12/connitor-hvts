'use client';

import * as React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { VisitCategory } from '@/lib/constants/visit-constants';

export interface HostInfo {
  name: string;
  department: string;
}

export interface DeliveryInfo {
  platform?: string;
  recipient: string;
}

export interface GatePassVisitorData {
  id: string;
  visitorName: string;
  visitorPhone: string;
  visitorPhoto?: string;
  visitType: VisitCategory.MEETING | VisitCategory.DELIVERY;
  visitDate: Date;
  visitTime: string;
  purpose?: string;
  host?: HostInfo;
  deliveryInfo?: DeliveryInfo;
}

export interface GatePassViewProps {
  visitor: GatePassVisitorData;
  otp: string;
  validityTimestamp: Date;
  loading?: boolean;
  error?: string | null;
  expired?: boolean;
  showQRCode?: boolean;
  qrCodeDataUrl?: string | null;
  className?: string;
}

export function GatePassView({
  visitor,
  otp,
  validityTimestamp,
  loading = false,
  error = null,
  expired = false,
  showQRCode = false,
  qrCodeDataUrl = null,
  className,
}: GatePassViewProps): React.ReactNode {
  const [imgError, setImgError] = React.useState(false);

  // Determine state based on priority
  const state: 'loading' | 'error' | 'expired' | 'success' = loading
    ? 'loading'
    : error
    ? 'error'
    : expired || new Date(validityTimestamp) < new Date()
    ? 'expired'
    : 'success';

  const initials = visitor.visitorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  // Format validity time
  const formatValidityTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // Loading State
  if (state === 'loading') {
    return (
      <Card className={cn('max-w-md mx-auto', className)}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <div className="border-t pt-4">
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-4 w-40 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  // Error State
  if (state === 'error') {
    return (
      <Card className={cn('max-w-md mx-auto border-destructive', className)}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Unable to Load Gate Pass</h3>
              <p className="text-sm text-muted-foreground">{error || 'An error occurred'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Expired State
  if (state === 'expired') {
    return (
      <Card className={cn('max-w-md mx-auto opacity-75', className)}>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Gate Pass</CardTitle>
            <Badge variant="outline" className="text-gray-500 border-gray-400">
              Expired
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col items-center space-y-3">
            <Avatar className="h-32 w-32">
              {visitor.visitorPhoto && !imgError ? (
                <AvatarImage
                  src={visitor.visitorPhoto}
                  alt={visitor.visitorName}
                  className="object-cover"
                  onError={() => setImgError(true)}
                />
              ) : null}
              <AvatarFallback className="text-3xl bg-gray-100 text-gray-600">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="font-bold text-2xl text-gray-700">{visitor.visitorName}</h3>
              <p className="text-gray-500 text-sm">{visitor.visitorPhone}</p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground text-center">
              Visit Details
            </p>
            <div className="text-center space-y-1">
              <p className="text-sm">
                <span className="text-muted-foreground">Date:</span>{' '}
                {visitor.visitDate.toLocaleDateString()}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Time:</span> {visitor.visitTime}
              </p>
              {visitor.purpose && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Purpose:</span> {visitor.purpose}
                </p>
              )}
            </div>
          </div>

          <div className="border-t pt-4 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <p className="text-sm">This gate pass has expired</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success State
  const isMeeting = visitor.visitType === VisitCategory.MEETING;

  return (
    <Card className={cn('max-w-md mx-auto', className)}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Gate Pass</CardTitle>
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* Visitor Section */}
        <div className="flex flex-col items-center space-y-3">
          <Avatar className="h-32 w-32 border-4 border-emerald-100">
            {visitor.visitorPhoto && !imgError ? (
              <AvatarImage
                src={visitor.visitorPhoto}
                alt={visitor.visitorName}
                className="object-cover"
                onError={() => setImgError(true)}
              />
            ) : null}
            <AvatarFallback className="text-3xl bg-primary/10">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="font-bold text-2xl">{visitor.visitorName}</h3>
            <p className="text-muted-foreground text-sm">{visitor.visitorPhone}</p>
          </div>
        </div>

        {/* Visit Details */}
        <div className="border-t pt-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground text-center">
            Visit Details
          </p>
          <div className="text-center space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Date:</span>{' '}
              {visitor.visitDate.toLocaleDateString()}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Time:</span> {visitor.visitTime}
            </p>
            {visitor.purpose && (
              <p className="text-sm">
                <span className="text-muted-foreground">Purpose:</span> {visitor.purpose}
              </p>
            )}
          </div>

          {/* Visit Type Badge */}
          <div className="flex justify-center mt-3">
            <Badge
              variant="outline"
              className={cn(
                'text-sm',
                isMeeting
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-amber-600 text-amber-600'
              )}
            >
              {isMeeting ? 'Meeting' : 'Delivery'}
            </Badge>
          </div>
        </div>

        {/* Host or Delivery Info */}
        {isMeeting && visitor.host ? (
          <div className="border-t pt-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground text-center">
              Host Information
            </p>
            <div className="text-center space-y-1">
              <p className="font-medium">{visitor.host.name}</p>
              <p className="text-sm text-muted-foreground">{visitor.host.department}</p>
            </div>
          </div>
        ) : !isMeeting && visitor.deliveryInfo ? (
          <div className="border-t pt-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground text-center">
              Delivery Information
            </p>
            <div className="text-center space-y-1">
              {visitor.deliveryInfo.platform && (
                <p className="font-medium">{visitor.deliveryInfo.platform}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Recipient: {visitor.deliveryInfo.recipient}
              </p>
            </div>
          </div>
        ) : null}

        {/* OTP Section */}
        <div className="border-t pt-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground text-center mb-2">
            Show to Security:
          </p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
            <p
              className="font-mono text-5xl font-bold tracking-widest text-gray-900 dark:text-gray-100"
              aria-label={`Check-in one time password: ${otp}`}
            >
              {otp}
            </p>
          </div>
        </div>

        {/* Validity */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Valid until: {formatValidityTime(validityTimestamp)}</span>
          </div>
        </div>

        {/* QR Code for security scan */}
        {(showQRCode || qrCodeDataUrl) && (
          <div className="border-t pt-4 flex flex-col items-center gap-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Scan at Security Desk
            </p>
            {qrCodeDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodeDataUrl}
                alt="Check-in QR code"
                className="h-40 w-40 rounded-lg border bg-white p-2"
              />
            ) : (
              <div className="w-40 h-40 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <p className="text-xs text-muted-foreground text-center">QR Code</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


