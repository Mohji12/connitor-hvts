'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import Link from 'next/link';
import Image from 'next/image';
import { clearStoredAuthToken } from '@/lib/auth-storage';
import apiClient from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
  getDashboardPathForRole,
  type DecodedUser,
} from '@/lib/auth-routing';
import { findRolePortal, resolveDeliveryPortal } from '@/lib/role-portals';
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

const LoginFormSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

function LoginFormSkeleton() {
  return (
    <Card className="w-full max-w-lg h-auto min-h-[500px] shadow-xl flex flex-col justify-between border-[#001B71]/08">
      <CardHeader className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-[220px] rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-9 w-48 mx-auto rounded bg-muted animate-pulse" />
        <div className="h-5 w-full max-w-sm mx-auto rounded bg-muted animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
        <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
        <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = forcedRole ?? searchParams.get('role');
  const rolePortal = findRolePortal(roleParam);
  const deliveryPortal = !rolePortal ? resolveDeliveryPortal(roleParam) : undefined;
  const portalLabel = rolePortal?.label ?? deliveryPortal?.label;
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      router.push(getDashboardPathForRole(decodedUser.role));
      toast.success('Login successful');
    } catch (err: unknown) {
      let errorMessage = 'Invalid login ID or password.';
      if (typeof err === 'object' && err && 'response' in err) {
        // @ts-expect-error: dynamic error shape
        errorMessage = err.response?.data?.message || errorMessage;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

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

        <CardTitle className="text-3xl font-bold">
          {portalLabel ? `Sign in — ${portalLabel}` : 'Sign in'}
        </CardTitle>
        <CardDescription className="text-lg">
          {rolePortal
            ? `Use your work email and password to open the ${rolePortal.label.toLowerCase()} dashboard.`
            : deliveryPortal
              ? `Use your email and password to open the ${deliveryPortal.label.toLowerCase()} dashboard.`
              : 'Use your hospital login ID (work email) and password to access your dashboard.'}
        </CardDescription>
        {rolePortal ? (
          <Badge variant="secondary" className="mx-auto w-fit">
            After login → {rolePortal.dashboardPath.split('?')[0]}
          </Badge>
        ) : deliveryPortal ? (
          <Badge variant="secondary" className="mx-auto w-fit">
            After login → {deliveryPortal.dashboardPath}
          </Badge>
        ) : null}
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
                </FormItem>
              )}
            />
            <Button
              type="submit"
              data-testid="login-submit"
              className="w-full cursor-pointer"
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
            <p className="text-center text-sm text-muted-foreground pt-2">
              <Link href="/" className="text-primary hover:underline font-medium">
                ← Back to home
              </Link>
              {' · '}
              <Link href="/portal" className="text-primary hover:underline font-medium">
                Visitor sign in
              </Link>
            </p>
            {deliveryPortal?.id === 'DISTRIBUTOR' ? (
              <p className="text-center text-sm text-muted-foreground">
                New distributor?{' '}
                <Link href="/vendor/register" className="text-amber-700 hover:underline font-medium">
                  Apply to onboard
                </Link>
              </p>
            ) : null}
            <p className="text-center text-sm text-muted-foreground">
              Prefer OTP?{' '}
              <Link href="/auth/login-otp" className="text-primary hover:underline font-medium">
                Sign in with email OTP
              </Link>
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
