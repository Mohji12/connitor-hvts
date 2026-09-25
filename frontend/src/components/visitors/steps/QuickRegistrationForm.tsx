'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const QuickRegistrationSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

type QuickRegistrationFormData = z.infer<typeof QuickRegistrationSchema>;

interface QuickRegistrationFormProps {
  phone: string;
  onSubmit: (data: { firstName: string; lastName: string }) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
}

export function QuickRegistrationForm({
  phone,
  onSubmit,
  onBack,
  isLoading = false,
}: QuickRegistrationFormProps) {
  const form = useForm<QuickRegistrationFormData>({
    resolver: zodResolver(QuickRegistrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

  const handleSubmit = async (data: QuickRegistrationFormData) => {
    await onSubmit(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Quick Registration</h2>
        <p className="text-gray-500">Just a few details for your delivery</p>
      </div>

      {/* Phone display */}
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <Label className="text-sm text-gray-500">Phone Number</Label>
        <p className="text-lg font-medium text-gray-900">{phone}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your first name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button type="button" variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Continue
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default QuickRegistrationForm;
