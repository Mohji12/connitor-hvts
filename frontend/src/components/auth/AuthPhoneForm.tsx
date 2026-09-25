'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ArrowRight } from 'lucide-react';
import apiClient from '@/lib/api';

// Shadcn UI
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

// Zod Schema
const PhoneFormSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit phone number.'),
});

export function AuthPhoneForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof PhoneFormSchema>>({
    resolver: zodResolver(PhoneFormSchema),
    defaultValues: { phone: '' },
  });

  const {
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: z.infer<typeof PhoneFormSchema>) => {
    setError(null);
    try {
      await apiClient.post('/api/auth/login', { phone: data.phone });
      sessionStorage.setItem('phone', data.phone);
      toast.success('OTP sent successfully!');
      router.push('/auth/verify-otp');
    } catch (err: unknown) {
      let errorMessage = 'Failed to send OTP.';
      if (typeof err === 'object' && err && 'response' in err) {
        // @ts-expect-error: dynamic error shape
        errorMessage = err.response?.data?.message || 'Failed to send OTP.';
      }
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <Card className="w-full max-w-lg h-auto min-h-[500px] mx-4 sm:mx-auto my-8 sm:my-16 shadow-xl flex flex-col justify-between">
      <CardHeader className="text-center space-y-6">
        <div className="flex justify-center">
          <Image
            src="/ConnInter.png"
            alt="Conninter Logo"
            width={220}
            height={80}
            priority
          />
        </div>

        <CardTitle className="text-3xl font-bold">Welcoming You!</CardTitle>
        <CardDescription className="text-lg">
          Quick and Secure login is just one OTP away – enter your number to
          continue.
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="phone-input"
                      placeholder="Enter your 10-digit phone number"
                      maxLength={10}
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
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
