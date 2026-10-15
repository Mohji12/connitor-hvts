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
import { PasswordInput } from '@/components/ui/password-input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import {
  getBackendUnreachableMessage,
  isBackendUnreachable,
} from '@/lib/api-errors';
import { getVisitorToken } from '@/lib/services/visitorPortalService';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisitorAuthService } from '@/lib/services/visitorAuthService';

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

const RESEND_SECONDS = 30;

function maskPhone(phone: string): string {
  return phone.length === 10 ? `+91 ${phone.slice(0, 2)}******${phone.slice(-2)}` : phone;
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
  const [mode, setMode] = useState<'password' | 'phone-otp'>('password');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const handle = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(handle);
  }, [resendIn]);

  const postLoginPath =
    returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
      ? returnTo
      : '/visitor/dashboard';

  useEffect(() => {
    if (!getVisitorToken()) return;
    let cancelled = false;
    void VisitorAuthService.hasValidSession().then((valid) => {
      if (valid && !cancelled) router.replace(postLoginPath);
    });
    return () => {
      cancelled = true;
    };
  }, [router, postLoginPath]);

  const passwordForm = useForm<z.infer<typeof PasswordLoginSchema>>({
    resolver: zodResolver(PasswordLoginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const switchMode = (next: string) => {
    setMode(next === 'phone-otp' ? 'phone-otp' : 'password');
    setStep('phone');
    setOtp('');
  };

  useEffect(() => {
    const identifier = searchParams.get('identifier')?.trim();
    if (identifier) {
      passwordForm.setValue('identifier', identifier);
      const digits = identifier.replace(/\D/g, '');
      if (!identifier.includes('@') && digits.length >= 10) {
        setPhoneInput(digits.slice(-10));
      }
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
    const digits = phoneInput.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      toast.error('Enter your 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const result = await VisitorAuthService.requestLoginOtp(digits);
      setPhone(digits);
      setPhoneInput(digits);
      setOtp('');
      setStep('otp');
      setResendIn(RESEND_SECONDS);
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
      const result = await VisitorAuthService.loginWithOtp(phone, otp);
      toast.success(`Welcome back, ${result.name}!`);
      router.push(postLoginPath);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Invalid OTP.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <VisitorPortalShell>
      <div className="mx-auto flex max-w-md flex-col gap-4 p-4 py-6 sm:py-10">
        <Card className="border-[#001B71]/08 shadow-sm max-lg:rounded-2xl [&_[data-slot=button]]:max-lg:min-h-11 [&_input]:max-lg:h-11">
          <CardHeader>
            <CardTitle>Visitor sign in</CardTitle>
            <CardDescription>
              {mode === 'password'
                ? 'Sign in with your Conninter profile (email or phone + password).'
                : 'Get a 6-digit code on WhatsApp at your registered mobile number.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={mode} onValueChange={switchMode}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="phone-otp">Mobile OTP</TabsTrigger>
              </TabsList>
            </Tabs>
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
                          <PasswordInput {...field} autoComplete="current-password" />
                        </FormControl>
                        <FormMessage />
                        <p className="text-right text-sm">
                          <Link
                            href={
                              returnTo
                                ? `/visitor/forgot-password?returnTo=${encodeURIComponent(returnTo)}`
                                : '/visitor/forgot-password'
                            }
                            className="font-medium text-primary hover:underline"
                          >
                            Forgot password?
                          </Link>
                        </p>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
                  </Button>
                </form>
              </Form>
            ) : step === 'phone' ? (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendOtp();
                }}
              >
                <div className="grid gap-2">
                  <label htmlFor="visitor-login-phone" className="text-sm font-medium">
                    Mobile number
                  </label>
                  <div className="flex items-center rounded-md border border-input pl-3 focus-within:ring-[3px] focus-within:ring-ring/50">
                    <span className="text-sm text-muted-foreground">+91</span>
                    <Input
                      id="visitor-login-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      placeholder="9876543210"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="border-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading || phoneInput.length !== 10}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP on WhatsApp'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent on WhatsApp to <strong>{maskPhone(phone)}</strong>
                </p>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  >
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
                <div className="flex items-center justify-between text-sm">
                  <Button
                    type="button"
                    variant="link"
                    className="px-0"
                    onClick={() => {
                      setStep('phone');
                      setOtp('');
                    }}
                  >
                    Change number
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0"
                    disabled={loading || resendIn > 0}
                    onClick={() => void sendOtp()}
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
                  </Button>
                </div>
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
