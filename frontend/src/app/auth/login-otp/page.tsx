'use client';

import { AuthEmailForm } from '@/components/auth/AuthEmailForm';
import { AuthPageShell } from '@/components/auth/AuthPageShell';

export default function LoginOtpPage() {
  return (
    <AuthPageShell>
      <AuthEmailForm />
    </AuthPageShell>
  );
}
