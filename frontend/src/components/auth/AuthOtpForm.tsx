'use client';

import { useState, useEffect, Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { clearStoredAuthToken } from '@/lib/auth-storage';
import apiClient from '@/lib/api';
import {
  getBackendUnreachableMessage,
  isBackendUnreachable,
} from '@/lib/api-errors';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// ShadCN Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { jwtDecode } from 'jwt-decode';
import Image from 'next/image';
import { getDashboardPathForRole } from '@/lib/auth-routing';

// Validation
const OtpFormSchema = z.object({
  otp: z.string().min(6, {
    message: 'OTP must be 6 digits',
  }),
});

interface DecodedUser {
  id: string;
  phone: string;
  role: string;
  hospitalChainId?: string;
  branchId?: string;
}

const TIMER_DURATION = 3 * 60; // 3 minutes

function maskEmail(value: string): string {
  const [local, domain] = value.split('@');
  if (!local || !domain) return value;
  const visible = local.length <= 2 ? local[0] ?? '*' : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function AuthOtpForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(TIMER_DURATION);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedEmail = sessionStorage.getItem('email');
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      toast.error('Email not found. Please sign in again.');
      router.push('/auth/login');
    }
  }, [router]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [resendTimer]);

  const form = useForm<z.infer<typeof OtpFormSchema>>({
    resolver: zodResolver(OtpFormSchema),
    defaultValues: { otp: '' },
  });

  const {
    formState: { isSubmitting },
  } = form;

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    try {
      const res = await apiClient.post<{ message: string; testOtp?: string }>(
        '/api/auth/login',
        { email },
      );
      setResendTimer(TIMER_DURATION);
      if (res.data.testOtp) {
        toast.message(`Dev OTP: ${res.data.testOtp}`);
      }
      toast.success('OTP resent successfully!');
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof err.response === 'object' &&
        err.response !== null &&
        'data' in err.response &&
        typeof err.response.data === 'object' &&
        err.response.data !== null &&
        'message' in err.response.data &&
        typeof err.response.data.message === 'string'
      ) {
        toast.error(err.response.data.message);
      } else {
        toast.error('Failed to resend OTP.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof OtpFormSchema>) => {
    if (!email) {
      toast.error('Email not found. Please sign in again.');
      router.push('/auth/login');
      return;
    }
    setError(null);
    try {
      clearStoredAuthToken();
      const res = await apiClient.post('/api/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: data.otp.trim(),
      });

      const accessToken = res.data.access_token;

      sessionStorage.removeItem('email');

      login(accessToken);

      const decodedUser = jwtDecode<DecodedUser>(accessToken);
      router.push(getDashboardPathForRole(decodedUser.role));
      toast.success('Login successful');
    } catch (err: unknown) {
      let errorMessage = 'Invalid OTP';
      if (isBackendUnreachable(err)) {
        errorMessage = getBackendUnreachableMessage();
      } else if (axios.isAxiosError(err) && err.response?.data) {
        const payload = err.response.data as { message?: string; detail?: string };
        errorMessage = payload.message ?? payload.detail ?? errorMessage;
      }
      setError(errorMessage);
      toast.error(errorMessage);
      form.reset();
    }
  };

  if (!mounted || !email) {
    return (
      <Card className="w-full max-w-lg min-h-[500px] shadow-xl border-[#001B71]/08">
        <CardContent className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg h-auto min-h-[500px] shadow-xl flex flex-col justify-between border-[#001B71]/08">
      <CardHeader className="text-center space-y-6">
        <div className="flex justify-center">
          <Image
            src="/ConnInter.png"
            alt="Conninter Logo"
            width={220}
            height={80}
            className="h-auto w-[220px]"
            priority
          />
        </div>

        <CardTitle className="text-3xl font-bold">Verify OTP</CardTitle>
        <CardDescription className="text-lg">
          Enter the 6-digit code Conninter sent to{' '}
          <span className="font-medium text-foreground">{maskEmail(email)}</span>
        </CardDescription>
        <p className="text-sm text-muted-foreground">
          Check your inbox and spam folder. The code expires in 3 minutes.
        </p>
      </CardHeader>

      <CardContent>
        {error && (
          <div
            data-testid="login-error"
            className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md mb-4"
          >
            {error}
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>One-Time Password</FormLabel>
                  <FormControl>
                    <div className="flex justify-center">
                      <InputOTP
                        data-testid="otp-input"
                        maxLength={6}
                        {...field}
                        disabled={isSubmitting}
                      >
                        <InputOTPGroup className="gap-2">
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <Fragment key={index}>
                              <InputOTPSlot
                                index={index}
                                className={cn(
                                'w-9 h-11 sm:w-10 sm:h-12 text-base sm:text-lg border-2 rounded-md text-center',
                                'border-gray-300 ring-1 ring-inset ring-gray-200',
                              )}
                              />
                              {index === 2 && (
                                <InputOTPSeparator className="w-4 text-gray-400 text-lg" />
                              )}
                            </Fragment>
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              data-testid="otp-submit"
              className="w-full cursor-pointer"
              disabled={isSubmitting || form.watch('otp').length < 6}
              variant="default"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>Verify OTP</>
              )}
            </Button>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {resendTimer > 0
                  ? `Resend OTP in ${formatTimer(resendTimer)}`
                  : "Didn't get the code?"}
              </span>
              <Button
                type="button"
                variant="link"
                onClick={handleResend}
                disabled={resendTimer > 0 || isResending}
                className="px-0 text-red-500 cursor-pointer"
              >
                {isResending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Resend OTP'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
