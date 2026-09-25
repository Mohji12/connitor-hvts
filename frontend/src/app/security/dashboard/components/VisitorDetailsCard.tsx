'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ClipboardCheck,
  X,
  User,
  Building2,
  Phone,
  Mail,
  Clock,
  MapPin,
  Package,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import type { VerifyCheckInOtpResponse } from '@/lib/api/visitors-api';
import { formatIstDateTime } from '@/lib/datetime';
import { IdProofVerificationForm } from '@/components/security/IdProofVerificationForm';

export interface VisitorDetailsCardProps {
  /** Visitor data from OTP verification */
  visitorData: VerifyCheckInOtpResponse;
  /** Callback when Check In button is clicked */
  onCheckIn: () => void;
  /** Callback when Check Out button is clicked (same QR after check-in) */
  onCheckOut?: () => void;
  /** Callback when Cancel button is clicked */
  onCancel: () => void;
  /** Whether check-in is in progress */
  isCheckingIn?: boolean;
  /** Whether check-out is in progress */
  isCheckingOut?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Formats a date string to a readable format
 */
function formatExpiryTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * VisitorDetailsCard - Displays visitor details after successful OTP verification
 *
 * Features:
 * - Displays visitor photo with initials fallback
 * - Shows visitor name, phone, company with badges
 * - Displays visit details (purpose, host, department, delivery info)
 * - Shows Check-In OTP and expiry time
 * - Provides Check In and Cancel action buttons
 * - Accessible with proper ARIA attributes
 */
export function VisitorDetailsCard({
  visitorData,
  onCheckIn,
  onCheckOut,
  onCancel,
  isCheckingIn = false,
  isCheckingOut = false,
  className,
}: VisitorDetailsCardProps): React.ReactElement {
  const { visitor, visit, canCheckIn, canCheckOut } = visitorData;
  const isMeeting = visit.visitCategory === 'MEETING';
  const isDelivery = visit.visitCategory === 'DELIVERY';
  const isAppointment = !!visit.appointmentDate;
  const [idProofVerified, setIdProofVerified] = React.useState(
    visit.idProofVerified ?? false,
  );
  const canProceedCheckIn = canCheckIn && (!isAppointment || idProofVerified);

  return (
    <Card
      className={cn('w-full max-w-lg mx-auto', className)}
      role="dialog"
      aria-label="Visitor details"
      data-testid="visitor-details-card"
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-emerald-100">
            {visitor.photo ? (
              <AvatarImage
                src={visitor.photo}
                alt={`${visitor.firstName} ${visitor.lastName}`}
                className="object-cover"
              />
            ) : null}
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-semibold">
              <User className="h-8 w-8" aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900 truncate">
              {visitor.firstName} {visitor.lastName}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge
                variant={isMeeting ? 'default' : 'secondary'}
                className={cn(
                  'text-xs',
                  isMeeting && 'bg-blue-100 text-blue-700 hover:bg-blue-100',
                  isDelivery && 'bg-orange-100 text-orange-700 hover:bg-orange-100',
                )}
              >
                {isMeeting ? 'Meeting' : 'Delivery'}
              </Badge>
              <Badge variant="outline" className="text-xs text-gray-600">
                {visit.status}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Visitor Contact Info */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">Contact Information</h3>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>{visitor.phone}</span>
            </div>
            {visitor.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{visitor.email}</span>
              </div>
            )}
            {visitor.company && (
              <div className="flex items-center gap-2 text-gray-600">
                <Building2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{visitor.company}</span>
              </div>
            )}
          </div>
        </div>

        {/* Visit Details */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900">Visit Details</h3>
          <div className="grid gap-2 text-sm">
            {isMeeting && (
              <>
                {visit.purpose && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <ClipboardCheck className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{visit.purpose}</span>
                  </div>
                )}
                {visit.department && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>{visit.department}</span>
                  </div>
                )}
                {visit.staffName && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>Host: {visit.staffName}</span>
                    {visit.staffPhone && (
                      <span className="text-gray-400">({visit.staffPhone})</span>
                    )}
                  </div>
                )}
              </>
            )}
            {isDelivery && (
              <>
                {visit.deliveryPlatform && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Package className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>Platform: {visit.deliveryPlatform}</span>
                  </div>
                )}
                {visit.deliveryRecipient && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>Recipient: {visit.deliveryRecipient}</span>
                  </div>
                )}
                {visit.orderReference && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <ClipboardCheck className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>Order: {visit.orderReference}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {isAppointment && visit.appointmentDate && (
          <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>
              Scheduled: {formatIstDateTime(visit.appointmentDate)}
            </span>
          </div>
        )}

        {visit.visitorPassId ? (
          <div className="flex items-center justify-between text-sm bg-[#4A90E2]/10 border border-[#001B71]/20 rounded-lg p-3">
            <span className="font-medium text-primary">Pass ID</span>
            <span className="font-mono font-semibold tracking-wide text-primary">
              {visit.visitorPassId}
            </span>
          </div>
        ) : null}

        {isAppointment && (
          <IdProofVerificationForm
            visitId={visitorData.visitId}
            idProofVerified={idProofVerified}
            onVerified={() => setIdProofVerified(true)}
          />
        )}

        {/* Check-In OTP Info */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span className="text-sm font-medium text-emerald-900">Check-In OTP</span>
            </div>
            <span className="text-lg font-bold text-emerald-700 tracking-wider">
              {visit.checkInOtp}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-emerald-600">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>Valid until {formatExpiryTime(visit.checkInOtpExpiry)}</span>
          </div>
        </div>

        {/* Cannot Check In Alert */}
        {!canCheckIn && !canCheckOut && (
          <Alert variant="destructive" className="text-sm">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              This visitor cannot be checked in. The visit may have expired or already been completed.
            </AlertDescription>
          </Alert>
        )}
        {canCheckOut && (
          <Alert className="text-sm border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-700" aria-hidden="true" />
            <AlertDescription className="text-amber-900">
              Visitor is already checked in. Scan confirmed — you can check them out now.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex gap-3 pt-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isCheckingIn}
          aria-label="Cancel and verify another visitor"
        >
          <X className="h-4 w-4 mr-2" aria-hidden="true" />
          Cancel / Verify Another
        </Button>
        <Button
          className={cn(
            'flex-1 bg-emerald-600 hover:bg-emerald-700 text-white',
            canCheckOut && 'bg-amber-600 hover:bg-amber-700',
            !canProceedCheckIn && !canCheckOut && 'opacity-50 cursor-not-allowed',
          )}
          onClick={canCheckOut ? onCheckOut : onCheckIn}
          disabled={(canCheckOut ? !onCheckOut : !canProceedCheckIn) || isCheckingIn || isCheckingOut}
          aria-label={canCheckOut ? 'Check out visitor' : 'Check in visitor'}
          aria-busy={isCheckingIn || isCheckingOut}
        >
          {(isCheckingIn || isCheckingOut) ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
              {canCheckOut ? 'Checking Out...' : 'Checking In...'}
            </>
          ) : canCheckOut ? (
            <>
              <ClipboardCheck className="h-4 w-4 mr-2" aria-hidden="true" />
              Check Out
            </>
          ) : (
            <>
              <ClipboardCheck className="h-4 w-4 mr-2" aria-hidden="true" />
              Check In
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
