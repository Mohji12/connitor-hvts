'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
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
import { DeliveryPlatformSelector } from '../shared/DeliveryPlatformSelector';

const DeliveryVisitSchema = z.object({
  deliveryPlatform: z.string().min(1, 'Please select a delivery platform'),
  deliveryRecipient: z.string().optional(),
  orderReference: z.string().optional(),
});

type DeliveryVisitFormData = z.infer<typeof DeliveryVisitSchema>;

interface DeliveryVisitRequestProps {
  visitorName: string;
  deliverySubType: string;
  onSubmit: (data: DeliveryVisitFormData) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
}

export function DeliveryVisitRequest({
  visitorName,
  deliverySubType,
  onSubmit,
  onBack,
  isLoading = false,
}: DeliveryVisitRequestProps) {
  const form = useForm<DeliveryVisitFormData>({
    resolver: zodResolver(DeliveryVisitSchema),
    defaultValues: {
      deliveryPlatform: '',
      deliveryRecipient: '',
      orderReference: '',
    },
  });

  const handleSubmit = async (data: DeliveryVisitFormData) => {
    await onSubmit(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Delivery Details</h2>
        <p className="text-gray-500">
          Almost done, {visitorName}! Just a few more details.
        </p>
      </div>

      {/* Delivery type badge */}
      <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-center">
        <span className="text-green-700 font-medium">{deliverySubType}</span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Platform selector */}
          <Controller
            control={form.control}
            name="deliveryPlatform"
            render={({ field }) => (
              <FormItem>
                <DeliveryPlatformSelector
                  value={field.value}
                  onChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deliveryRecipient"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery For (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Name, room number, or department"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="orderReference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order ID / AWB Number (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Tracking number or order reference"
                    {...field}
                  />
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
              Submit Request
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default DeliveryVisitRequest;
