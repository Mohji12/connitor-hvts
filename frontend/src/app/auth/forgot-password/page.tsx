'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { PhoneForgotPasswordForm } from '@/components/auth/PhoneForgotPasswordForm';

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/staff/login/';
  }
  return value;
}

function StaffForgotPassword() {
  const searchParams = useSearchParams();
  return (
    <PhoneForgotPasswordForm
      signInHref={safeReturnPath(searchParams.get('returnTo'))}
      sendCode={async (phone) => {
        const response = await apiClient.post<{ message: string; testOtp?: string }>(
          '/api/auth/forgot-password',
          { phone },
        );
        return response.data;
      }}
      resetPassword={async (phone, otp, password) => {
        const response = await apiClient.post<{ message: string }>('/api/auth/reset-password', {
          phone,
          otp,
          password,
        });
        return response.data;
      }}
    />
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={null}>
        <StaffForgotPassword />
      </Suspense>
    </AuthPageShell>
  );
}
