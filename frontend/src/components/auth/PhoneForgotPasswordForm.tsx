'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api-errors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface PhoneForgotPasswordFormProps {
  sendCode: (phone: string) => Promise<{ message: string; testOtp?: string }>;
  resetPassword: (phone: string, otp: string, password: string) => Promise<{ message: string }>;
  /** Where "Back to sign in" and a successful reset go. */
  signInHref: string;
}

function maskPhone(phone: string): string {
  return phone.length === 10 ? `${phone.slice(0, 2)}******${phone.slice(-2)}` : phone;
}

export function PhoneForgotPasswordForm({
  sendCode,
  resetPassword,
  signInHref,
}: PhoneForgotPasswordFormProps): React.ReactElement {
  const router = useRouter();
  const [step, setStep] = React.useState<'phone' | 'reset'>('phone');
  const [phone, setPhone] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const requestCode = async () => {
    if (phone.length !== 10) {
      toast.error('Enter your 10-digit registered mobile number.');
      return;
    }
    setBusy(true);
    try {
      const result = await sendCode(phone);
      setStep('reset');
      setOtp('');
      toast.success(result.message);
      if (result.testOtp) toast.message(`Test OTP: ${result.testOtp}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not send the code.'));
    } finally {
      setBusy(false);
    }
  };

  const updatePassword = async () => {
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit code sent to your WhatsApp.');
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
      const result = await resetPassword(phone, otp, password);
      toast.success(result.message);
      router.push(signInHref);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not update the password.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="w-full max-w-lg border-[#001B71]/08 shadow-xl">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold sm:text-3xl">Forgot password</CardTitle>
        <CardDescription className="text-base">
          {step === 'phone'
            ? 'Enter your registered mobile number. We will send a 6-digit code on WhatsApp.'
            : `Enter the code sent to ${maskPhone(phone)}, then choose a new password.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'phone' ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void requestCode();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="forgot-phone">Registered mobile number</Label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                  +91
                </span>
                <Input
                  id="forgot-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  className="rounded-l-none"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(-10))}
                  placeholder="10-digit mobile"
                  disabled={busy}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={busy || phone.length !== 10}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send code
            </Button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void updatePassword();
            }}
          >
            <div className="space-y-2">
              <Label>WhatsApp code</Label>
              <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={busy}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="space-y-2">
              <Label htmlFor="forgot-password">New password</Label>
              <PasswordInput
                id="forgot-password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forgot-confirm">Confirm new password</Label>
              <PasswordInput
                id="forgot-confirm"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={busy}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || otp.length !== 6}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reset password
            </Button>
            <div className="flex justify-between text-sm">
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                disabled={busy}
                onClick={() => setStep('phone')}
              >
                Change number
              </button>
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                disabled={busy}
                onClick={() => void requestCode()}
              >
                Resend code
              </button>
            </div>
          </form>
        )}
        <p className="text-center text-sm text-muted-foreground">
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => router.push(signInHref)}
          >
            Back to sign in
          </button>
        </p>
      </CardContent>
    </Card>
  );
}
