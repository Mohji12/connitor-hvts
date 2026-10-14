'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import apiClient from '@/lib/api';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/staff/login/';
  }
  return value;
}

function errorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err && 'response' in err) {
    const data = (err as { response?: { data?: { detail?: string; message?: string } } }).response?.data;
    return data?.detail || data?.message || fallback;
  }
  return fallback;
}

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get('returnTo'));
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) {
      toast.error('Enter the email you use to sign in.');
      return;
    }
    setBusy(true);
    try {
      const response = await apiClient.post<{ message: string }>('/api/auth/forgot-password', {
        email: normalized,
      });
      setEmail(normalized);
      setStep('reset');
      toast.success(response.data.message);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send the reset code.'));
    } finally {
      setBusy(false);
    }
  };

  const updatePassword = async () => {
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit code from your email.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const response = await apiClient.post<{ message: string }>('/api/auth/reset-password', {
        email,
        otp,
        password,
      });
      toast.success(response.data.message);
      router.push(returnTo);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the password.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="w-full max-w-lg border-[#001B71]/08 shadow-xl">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-3xl font-bold">Forgot password</CardTitle>
        <CardDescription className="text-base">
          {step === 'email'
            ? 'We will email a 6-digit code to the address you use to sign in.'
            : `Enter the code sent to ${email}, then choose a new password.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'email' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Login ID (Email)</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@hospital.com"
                disabled={busy}
              />
            </div>
            <Button type="button" className="w-full" disabled={busy} onClick={() => void sendCode()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send code
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="forgot-otp">Email code</Label>
              <Input
                id="forgot-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forgot-password">New password</Label>
              <Input
                id="forgot-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forgot-confirm">Confirm password</Label>
              <Input
                id="forgot-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={busy}
              />
            </div>
            <Button type="button" className="w-full" disabled={busy} onClick={() => void updatePassword()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update password
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={busy}
              onClick={() => void sendCode()}
            >
              Resend code
            </Button>
          </>
        )}
        <p className="text-center text-sm text-muted-foreground">
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => router.push(returnTo)}
          >
            Back to sign in
          </button>
        </p>
      </CardContent>
    </Card>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthPageShell>
  );
}
