'use client';

import Link from 'next/link';
import { Suspense } from 'react';

import { AuthPasswordLoginForm } from '@/components/auth/AuthPasswordLoginForm';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { PORTAL_SECURITY_LOGIN_PATH } from '@/lib/role-portals';

/**
 * One sign-in for all hospital accounts (admin, doctor, nurse, ward/AMS, etc.).
 * The API returns your role; you are sent to the right dashboard automatically.
 */
export default function PortalHospitalStaffLoginPage() {
  return (
    <AuthPageShell>
      <div className="flex w-full max-w-lg flex-col gap-4">
        <p className="rounded-xl border border-[#001B71]/10 bg-white/90 px-4 py-3 text-center text-sm text-muted-foreground leading-relaxed">
          Use the <span className="font-medium text-foreground">work email and password</span> your hospital gave you.
          Doctors, admins, clinical staff, and ward (AMS) users all sign in here—no role selection needed.
        </p>
        <Suspense fallback={null}>
          <AuthPasswordLoginForm />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          <Link href={PORTAL_SECURITY_LOGIN_PATH} className="font-medium text-primary hover:underline">
            Security gate login
          </Link>
          {' · '}
          <Link href="/auth/login-otp" className="font-medium text-primary hover:underline">
            Email OTP instead of password
          </Link>
          {' · '}
          <Link href="/portal" className="font-medium text-primary hover:underline">
            All portals
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
