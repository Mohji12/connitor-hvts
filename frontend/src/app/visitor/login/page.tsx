'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import {
  getBackendUnreachableMessage,
  isBackendUnreachable,
} from '@/lib/api-errors';
import {
  VisitorPortalService,
  getVisitorToken,
  setVisitorToken,
} from '@/lib/services/visitorPortalService';
import { VisitorAuthService } from '@/lib/services/visitorAuthService';

const EmailSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
});

const PasswordLoginSchema = z.object({
  identifier: z.string().min(3, 'Enter email or phone'),
  password: z.string().min(8, 'Enter your password'),
});

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isBackendUnreachable(error)) {
    return getBackendUnreachableMessage();
  }
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as { message?: string; detail?: string };
    const detail = data.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: string } | undefined;
      if (first?.msg) return first.msg;
    }
    return data.message ?? fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0] ?? ''}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

export default function VisitorLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F9FC]" />}>
      <VisitorLoginContent />
    </Suspense>
  );
}

function VisitorLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const [mode, setMode] = useState<'password' | 'legacy-otp'>('password');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [legacyEmail, setLegacyEmail] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const postLoginPath =
    returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
      ? returnTo
      : '/visitor/dashboard';

  useEffect(() => {
    if (getVisitorToken()) {
      router.replace(postLoginPath);
    }
  }, [router, postLoginPath]);

  const passwordForm = useForm<z.infer<typeof PasswordLoginSchema>>({
    resolver: zodResolver(PasswordLoginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const switchToLegacyOtp = () => {
    setMode('legacy-otp');
    setStep('email');
    setLegacyEmail('');
    setOtp('');
  };

  const switchToPassword = () => {
    setMode('password');
    setStep('email');
    setOtp('');
  };

  useEffect(() => {
    const identifier = searchParams.get('identifier')?.trim();
    if (identifier) {
      passwordForm.setValue('identifier', identifier);
    }
  }, [searchParams, passwordForm]);

  const loginWithPassword = async (data: z.infer<typeof PasswordLoginSchema>) => {
    setLoading(true);
    try {
      const result = await VisitorAuthService.login(data.identifier, data.password);
      toast.success(`Welcome back, ${result.name}!`);
      router.push(postLoginPath);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Invalid credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    const parsed = EmailSchema.safeParse({ email: legacyEmail.trim() });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const normalized = parsed.data.email.trim().toLowerCase();
      const result = await VisitorPortalService.requestOtp(normalized);
      setEmail(normalized);
      setLegacyEmail(normalized);
      setStep('otp');
      if (result.testOtp) {
        toast.message(`Dev OTP: ${result.testOtp}`);
      }
      toast.success(result.message);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not send OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) {
      toast.error('Enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      const result = await VisitorPortalService.verifyOtp(email, otp);
      setVisitorToken(result.access_token);
      toast.success('Welcome back!');
      router.push(postLoginPath);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Invalid OTP.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <VisitorPortalShell>
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 py-10">
        <Card className="border-[#001B71]/08 shadow-sm">
          <CardHeader>
            <CardTitle>Visitor sign in</CardTitle>
            <CardDescription>
              {mode === 'password'
                ? 'Sign in with your Conninter profile (email or phone + password).'
                : 'Legacy sign-in: email OTP after booking an appointment without a profile.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === 'password' ? (
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(loginWithPassword)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email or mobile</FormLabel>
                        <FormControl>
                          <Input {...field} autoComplete="username" placeholder="you@example.com or 9876543210" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" autoComplete="current-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
                  </Button>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button type="button" variant="outline" asChild>
                      <a href={VisitorAuthService.getGoogleAuthUrl()}>Continue with Google</a>
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <a href={VisitorAuthService.getLinkedInAuthUrl()}>Continue with LinkedIn</a>
                    </Button>
                  </div>
                  <Button type="button" variant="link" className="w-full px-0" onClick={switchToLegacyOtp}>
                    Booked without a profile? Use email OTP
                  </Button>
                </form>
              </Form>
            ) : step === 'email' ? (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label htmlFor="visitor-legacy-email" className="text-sm font-medium">
                    Email address
                  </label>
                  <Input
                    id="visitor-legacy-email"
                    name="visitor-legacy-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="you@example.com"
                    value={legacyEmail}
                    onChange={(e) => setLegacyEmail(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  className="w-full"
                  disabled={loading || !legacyEmail.trim()}
                  onClick={sendOtp}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send email OTP'}
                </Button>
                <Button type="button" variant="link" className="w-full px-0" onClick={switchToPassword}>
                  Back to password sign in
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to <strong>{maskEmail(email)}</strong>
                </p>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button className="w-full" onClick={verifyOtp} disabled={loading || otp.length < 6}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & open dashboard'}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                  }}
                >
                  Use a different email
                </Button>
                <Button variant="link" className="w-full" onClick={switchToPassword}>
                  Back to password sign in
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          No profile yet?{' '}
          <Link
            href={
              returnTo
                ? `/visitor/register?returnTo=${encodeURIComponent(returnTo)}`
                : '/visitor/register'
            }
            className="font-medium text-primary underline"
          >
            Create your Conninter profile
          </Link>
          {' · '}
          <Link href="/book-appointment" className="font-medium text-primary underline">
            Book an appointment
          </Link>
        </p>
      </div>
    </VisitorPortalShell>
  );
}
