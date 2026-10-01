'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Hospital,
  LogIn,
  Shield,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  HOSPITAL_ROLE_PORTALS,
  getLoginPathForRole,
  type PortalRole,
} from '@/lib/role-portals';

const VISITOR_STEPS = [
  {
    step: 1,
    title: 'Book online',
    description: 'Pick hospital, department, section, and doctor. Enter your details and appointment time.',
    href: '/book-appointment',
    label: 'Book appointment',
    status: 'REQUEST_SENT',
  },
  {
    step: 2,
    title: 'Track status',
    description: 'Use your booking ID and phone to see if the doctor has approved your visit.',
    href: '/book-appointment/status',
    label: 'Check status',
    status: 'REQUEST_SENT → APPROVED',
  },
  {
    step: 3,
    title: 'Doctor approves',
    description:
      'Your doctor receives a WhatsApp message with appointment details and a secure one-time link to approve or decline.',
    href: '/book-appointment/status',
    label: 'Check status',
    status: 'REQUEST_SENT → APPROVED',
  },
  {
    step: 4,
    title: 'Visit the hospital',
    description: 'On your appointment day, go to security with a valid ID. They verify ID proof before check-in.',
    href: '/book-appointment/how-it-works#security',
    label: 'Security steps',
    status: 'APPROVED',
  },
  {
    step: 5,
    title: 'Check-in & meet doctor',
    description: 'Security checks you in with OTP/QR. Your doctor is notified when you arrive.',
    href: '/book-appointment/how-it-works#security',
    label: 'At the gate',
    status: 'CHECKED_IN',
  },
  {
    step: 6,
    title: 'Check-out',
    description: 'Security checks you out when you leave. Visit duration is recorded automatically.',
    href: '/book-appointment/status',
    label: 'Track completion',
    status: 'CHECKED_OUT',
  },
] as const;

const PORTAL_ICONS: Record<PortalRole, typeof Stethoscope> = {
  STAFF: Stethoscope,
  SECURITY: Shield,
  HOSPITAL_ADMIN: Hospital,
  DEPARTMENT_ADMIN: Building2,
  SUB_DEPARTMENT_ADMIN: Users,
  SUPER_ADMIN: ClipboardList,
};

interface AppointmentFlowGuideProps {
  showVisitorSteps?: boolean;
  showRolePortals?: boolean;
  compact?: boolean;
}

export function AppointmentFlowGuide({
  showVisitorSteps = true,
  showRolePortals = true,
  compact = false,
}: AppointmentFlowGuideProps) {
  return (
    <div className={compact ? 'space-y-6' : 'space-y-10'}>
      {showVisitorSteps && (
        <section id="visitor-flow">
          <div className="mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Visitor journey (public — no login)
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Everything a patient or visitor does from the frontend.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {VISITOR_STEPS.map((item) => (
              <Card key={item.step} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">Step {item.step}</Badge>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {item.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={item.href}>
                      {item.label}
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {showRolePortals && (
        <section id="staff-flow">
          <div className="mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Hospital staff portals (sign in required)
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Each role uses a different dashboard page in the frontend.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {HOSPITAL_ROLE_PORTALS.map((portal) => {
              const Icon = PORTAL_ICONS[portal.role];
              return (
              <Card key={portal.role}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {portal.label}
                  </CardTitle>
                  <CardDescription>{portal.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <Button size="sm" asChild>
                    <Link href={getLoginPathForRole(portal.role)}>Sign in to dashboard</Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={portal.dashboardPath}>
                      <LogIn className="mr-2 h-3 w-3" />
                      Dashboard path
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
            })}
          </div>
        </section>
      )}

      <section id="security">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security desk — appointment day
            </CardTitle>
            <CardDescription>
              Frontend path: Security Dashboard → Today tab
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
              <span>
                <strong>1. Verify ID</strong> — open today&apos;s appointment, enter ID type and number
              </span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
              <span>
                <strong>2. Check-in</strong> — Check-In tab → enter visitor OTP or scan QR
              </span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
              <span>
                <strong>3. Check-out</strong> — when visitor leaves, complete check-out to record duration
              </span>
            </p>
            <Button className="mt-2" size="sm" asChild>
              <Link href="/security/dashboard?tab=appointments">Go to Security Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
