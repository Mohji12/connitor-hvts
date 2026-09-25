'use client';

import { AuthOtpForm } from '@/components/auth/AuthOtpForm';
import { AuthPageShell } from '@/components/auth/AuthPageShell';

export default function VerifyOtpPage() {
  return (
    <AuthPageShell>
      <AuthOtpForm />
    </AuthPageShell>
  );
}
