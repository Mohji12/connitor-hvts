'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { PhoneForgotPasswordForm } from '@/components/auth/PhoneForgotPasswordForm';
import { VisitorAuthService } from '@/lib/services/visitorAuthService';

function VisitorForgotPassword() {
  const returnTo = useSearchParams().get('returnTo');
  const signInHref =
    returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
      ? `/visitor/login?returnTo=${encodeURIComponent(returnTo)}`
      : '/visitor/login';
  return (
    <PhoneForgotPasswordForm
      signInHref={signInHref}
      sendCode={(phone) => VisitorAuthService.forgotPassword(phone)}
      resetPassword={(phone, otp, password) => VisitorAuthService.resetPassword(phone, otp, password)}
    />
  );
}

export default function VisitorForgotPasswordPage() {
  return (
    <VisitorPortalShell>
      <div className="flex items-center justify-center p-4 py-10">
        <Suspense fallback={null}>
          <VisitorForgotPassword />
        </Suspense>
      </div>
    </VisitorPortalShell>
  );
}
