'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { VisitorAuthService } from '@/lib/services/visitorAuthService';

const Schema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof Schema>>({
    resolver: zodResolver(Schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: z.infer<typeof Schema>) => {
    if (!token) return;
    setLoading(true);
    try {
      await VisitorAuthService.resetPassword(token, values.password);
      toast.success('Password updated');
      router.push('/visitor/login');
    } catch {
      toast.error('Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <p className="text-destructive">Invalid reset link.</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </form>
    </Form>
  );
}

export default function ResetPasswordPage() {
  return (
    <VisitorPortalShell>
      <div className="flex items-center justify-center p-4 py-10">
        <Card className="w-full max-w-md border-[#001B71]/08 shadow-sm">
          <CardHeader>
            <CardTitle>Reset password</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin" />}>
              <ResetPasswordForm />
            </Suspense>
            <Button variant="link" asChild className="mt-4 px-0">
              <Link href="/visitor/login">Back to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </VisitorPortalShell>
  );
}
