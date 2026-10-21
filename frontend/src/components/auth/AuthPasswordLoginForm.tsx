'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import Link from 'next/link';
import Image from 'next/image';
import { clearStoredAuthToken, getStoredAuthToken } from '@/lib/auth-storage';
import { resolveNativeResumePath, setLastNativePersona } from '@/lib/native-session';
import apiClient from '@/lib/api';
import { DistributorOnboardingService } from '@/lib/services/distributorOnboardingService';
import { useAuth } from '@/hooks/useAuth';
import {
  getDashboardPathForRole,
  getDashboardPrefetchPath,
  type DecodedUser,
} from '@/lib/auth-routing';
import { findDeliveryPortal, findRolePortal, isPortalRole } from '@/lib/role-portals';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import { appSafeHomeHref } from '@/lib/native-home-guard';
import { isNativeApp } from '@/lib/platform';
import { cn } from '@/lib/utils';

const LoginFormSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

function LoginFormSkeleton() {
  return (
    <Card className="flex w-full max-w-lg flex-col border-[#001B71]/08 shadow-xl">
      <CardHeader className="space-y-3 text-center sm:space-y-6">
        <div className="flex justify-center">
          <div className="h-12 w-[180px] animate-pulse rounded-md bg-muted sm:h-20 sm:w-[220px]" />
        </div>
        <div className="mx-auto h-7 w-40 animate-pulse rounded bg-muted sm:h-9 sm:w-48" />
        <div className="mx-auto h-4 w-full max-w-sm animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-6">
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </CardContent>
    </Card>
  );
}

type AuthPasswordLoginFormProps = {
  /** When set (e.g. from /security/login), overrides ?role= in the URL */
  forcedRole?: string | null;
};

export function AuthPasswordLoginForm({ forcedRole }: AuthPasswordLoginFormProps = {}) {
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [homeHref, setHomeHref] = useState('/');
  const [nativeShell, setNativeShell] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = (() => {
    const raw = searchParams.get('returnTo');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
    return raw;
  })();
  const roleParam = forcedRole ?? searchParams.get('role');
  const rolePortal = isPortalRole(roleParam) ? findRolePortal(roleParam) : undefined;
  const deliveryPortal = !rolePortal ? findDeliveryPortal(roleParam) : undefined;
  const portalLabel = rolePortal?.label ?? deliveryPortal?.label;
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHomeHref(appSafeHomeHref());
    setNativeShell(isNativeApp());
    const existing = getStoredAuthToken();
    if (!existing) return;
    try {
      const decodedUser = jwtDecode<DecodedUser>(existing);
      if (!decodedUser.role) return;
      const resume = isNativeApp() ? resolveNativeResumePath() : null;
      router.replace(returnTo ?? resume ?? getDashboardPathForRole(decodedUser.role));
    } catch {
      // Stale token — stay on the sign-in form.
    }
  }, [returnTo, router]);

  useEffect(() => {
    router.prefetch(getDashboardPrefetchPath(roleParam));
  }, [router, roleParam]);

  const form = useForm<z.infer<typeof LoginFormSchema>>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const {
    formState: { isSubmitting },
  } = form;

  if (!mounted) {
    return <LoginFormSkeleton />;
  }

  const onSubmit = async (data: z.infer<typeof LoginFormSchema>) => {
    setError(null);
    try {
      clearStoredAuthToken();
      const res = await apiClient.post<{ access_token: string }>(
        '/api/auth/login-password',
        {
          email: data.email.trim().toLowerCase(),
          password: data.password,
        },
      );

      const accessToken = res.data.access_token;
      login(accessToken);

      const decodedUser = jwtDecode<DecodedUser>(accessToken);
      if (isNativeApp()) {
        setLastNativePersona(
          decodedUser.role === 'DISTRIBUTOR' || decodedUser.role === 'DISTRIBUTOR_SECURITY'
            ? 'distributor'
            : 'staff',
        );
      }
      const dashboardPath = returnTo ?? getDashboardPathForRole(decodedUser.role);
      router.prefetch(getDashboardPrefetchPath(decodedUser.role));
      router.push(dashboardPath);
      toast.success('Login successful');
    } catch (err: unknown) {
      let errorMessage = 'Invalid login ID or password.';
      if (typeof err === 'object' && err && 'response' in err) {
        const data = (err as { response?: { data?: { detail?: string; message?: string } } }).response
          ?.data;
        errorMessage = data?.detail || data?.message || errorMessage;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <Card
      className={cn(
        'flex w-full min-w-0 max-w-lg flex-col overflow-hidden border-[#001B71]/08 shadow-xl',
        'max-lg:shadow-md',
      )}
    >
      <CardHeader className="space-y-2 px-4 pb-2 pt-4 text-center lg:space-y-4 lg:p-6">
        <div className="flex justify-center">
          <Image
            src="/images/conninter-logo.png"
            alt="Conninter Logo"
            width={220}
            height={80}
            className="h-auto w-[140px] lg:w-[200px]"
            priority
          />
        </div>

        <CardTitle className="text-xl font-bold lg:text-3xl">
          {portalLabel ? `Sign in — ${portalLabel}` : 'Sign in'}
        </CardTitle>
        <CardDescription className="text-sm lg:text-base">
          {rolePortal
            ? `Use your work email and password to open the ${rolePortal.label.toLowerCase()} dashboard.`
            : deliveryPortal
              ? `Use your email and password to open the ${deliveryPortal.label.toLowerCase()} dashboard.`
              : 'Use your hospital login ID (work email) and password to access your dashboard.'}
        </CardDescription>
        {rolePortal ? (
          <Badge variant="secondary" className="mx-auto w-fit max-sm:hidden">
            After login → {rolePortal.dashboardPath.split('?')[0]}
          </Badge>
        ) : deliveryPortal ? (
          <Badge variant="secondary" className="mx-auto w-fit max-sm:hidden">
            After login → {deliveryPortal.dashboardPath}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 lg:p-6 lg:pt-0">
        {error && (
          <div
            data-testid="login-error"
            className="mb-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-600"
          >
            {error}
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 lg:space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Login ID (Email)</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="email-input"
                      type="email"
                      placeholder={
                        rolePortal?.demoEmail ?? deliveryPortal?.demoEmail ?? 'you@hospital.com'
                      }
                      autoComplete="username"
                      className="h-11"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        data-testid="password-input"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="h-11 pr-11"
                        {...field}
                        disabled={isSubmitting}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-right text-sm">
                    <Link
                      href={`/auth/forgot-password?returnTo=${encodeURIComponent(pathname || '/staff/login')}`}
                      className="font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </p>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              data-testid="login-submit"
              className="h-11 w-full cursor-pointer"
              disabled={isSubmitting}
              variant="default"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            {error?.includes('WhatsApp') ? (
              <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-left">
                <p className="text-sm text-amber-950">
                  Enter the 6-digit code sent to your WhatsApp, then sign in.
                </p>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={phoneOtp}
                  onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="WhatsApp code"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={otpBusy || phoneOtp.length !== 6}
                    onClick={() => {
                      const email = form.getValues('email').trim().toLowerCase();
                      setOtpBusy(true);
                      void DistributorOnboardingService.verifyPhone(email, phoneOtp)
                        .then((result) => {
                          toast.success(result.message);
                          setError(null);
                          setPhoneOtp('');
                        })
                        .catch(() => toast.error('Could not verify the code'))
                        .finally(() => setOtpBusy(false));
                    }}
                  >
                    Verify code
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={otpBusy}
                    onClick={() => {
                      const email = form.getValues('email').trim().toLowerCase();
                      setOtpBusy(true);
                      void DistributorOnboardingService.resendPhoneOtp(email)
                        .then((result) => toast.success(result.message))
                        .catch(() => toast.error('Could not resend the code'))
                        .finally(() => setOtpBusy(false));
                    }}
                  >
                    Resend
                  </Button>
                </div>
              </div>
            ) : null}
            <p className="pt-0.5 text-center text-xs text-muted-foreground sm:text-sm">
              {!nativeShell ? (
                <>
                  <Link href={homeHref} className="font-medium text-primary hover:underline">
                    ← Back to home
                  </Link>
                  {' · '}
                </>
              ) : null}
              <Link href="/portal" className="font-medium text-primary hover:underline">
                Visitor sign in
              </Link>
              {' · '}
              <Link href="/auth/login-otp" className="font-medium text-primary hover:underline">
                Email OTP
              </Link>
            </p>
            {deliveryPortal?.id === 'DISTRIBUTOR' ? (
              <p className="text-center text-xs text-muted-foreground sm:text-sm">
                New distributor?{' '}
                <Link href="/vendor/register" className="font-medium text-amber-700 hover:underline">
                  Apply to onboard
                </Link>
              </p>
            ) : null}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
