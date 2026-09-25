'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ArrowRight } from 'lucide-react';
import { clearStoredAuthToken } from '@/lib/auth-storage';
import apiClient from '@/lib/api';
import {
  getBackendUnreachableMessage,
  isBackendUnreachable,
} from '@/lib/api-errors';

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
import Image from 'next/image';
import Link from 'next/link';

const EmailFormSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
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
        <div className="h-4 w-28 rounded bg-muted animate-pulse" />
        <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
        <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
      </CardContent>
    </Card>
  );
}

export function AuthEmailForm() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<z.infer<typeof EmailFormSchema>>({
    resolver: zodResolver(EmailFormSchema),
    defaultValues: { email: '' },
  });

  const {
    formState: { isSubmitting },
  } = form;

  if (!mounted) {
    return <LoginFormSkeleton />;
  }

  const onSubmit = async (data: z.infer<typeof EmailFormSchema>) => {
    setError(null);
    const normalizedEmail = data.email.trim().toLowerCase();
    try {
      clearStoredAuthToken();
      const res = await apiClient.post<{ message: string; testOtp?: string }>(
        '/api/auth/login',
        { email: normalizedEmail },
      );
      sessionStorage.setItem('email', normalizedEmail);
      if (res.data.testOtp) {
        toast.message(`Dev OTP: ${res.data.testOtp}`, { duration: 15000 });
      }
      toast.success(res.data.message || 'OTP sent to your email!');
      router.push('/auth/verify-otp');
    } catch (err: unknown) {
      let errorMessage = 'Failed to send OTP.';
      if (isBackendUnreachable(err)) {
        errorMessage = getBackendUnreachableMessage();
      } else if (typeof err === 'object' && err && 'response' in err) {
        // @ts-expect-error: dynamic error shape
        const detail = err.response?.data?.detail ?? err.response?.data?.message;
        if (typeof detail === 'string') {
          errorMessage = detail;
        }
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

        <CardTitle className="text-3xl font-bold">Welcoming You!</CardTitle>
        <CardDescription className="text-lg">
          Quick and secure login — enter your registered work email to receive a
          one-time password.
        </CardDescription>
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
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="email-input"
                      type="email"
                      placeholder="you@hospital.com"
                      autoComplete="email"
                      {...field}
                      disabled={isSubmitting}
                    />
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
                  Sending...
                </>
              ) : (
                <>
                  Send OTP <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground pt-2">
              Use password instead?{' '}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in with email &amp; password
              </Link>
            </p>
            <p className="text-center text-sm text-muted-foreground">
              New to Conninter?{' '}
              <Link href="/auth/register" className="text-primary hover:underline font-medium">
                Create an account
              </Link>
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
