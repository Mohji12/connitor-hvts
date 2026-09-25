'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { professionalSchema, type ProfessionalValues } from '@/features/visitor-pre-registration/schemas/visitorAccountSchema';
import { VisitorAccountApi } from '@/features/visitor-pre-registration/api/visitorAccountService';
import { getVisitorToken } from '@/lib/services/visitorPortalService';

export default function VisitorProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<ProfessionalValues>({
    resolver: zodResolver(professionalSchema),
    defaultValues: { companyName: '', jobTitle: '', linkedinUrl: '' },
  });

  useEffect(() => {
    const token = getVisitorToken();
    if (!token) {
      router.replace('/visitor/login');
      return;
    }
    VisitorAccountApi.getMyProfile(token).then((p) => {
      form.reset({
        companyName: p.companyName ?? '',
        jobTitle: p.jobTitle ?? '',
        linkedinUrl: p.linkedinUrl ?? '',
      });
    });
  }, [form, router]);

  const onSubmit = async (values: ProfessionalValues) => {
    const token = getVisitorToken();
    if (!token) return;
    setLoading(true);
    try {
      await VisitorAccountApi.updateMyProfile(token, values);
      toast.success('Profile updated');
      router.push('/visitor/dashboard');
    } catch {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <VisitorPortalShell>
      <div className="mx-auto max-w-lg p-6 py-10">
        <Card className="border-[#001B71]/08 shadow-sm">
          <CardHeader>
            <CardTitle>Edit profile</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="companyName" render={({ field }) => (
                  <FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="jobTitle" render={({ field }) => (
                  <FormItem><FormLabel>Job title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                  <FormItem><FormLabel>LinkedIn URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
                  <Button type="button" variant="outline" asChild><Link href="/visitor/dashboard">Cancel</Link></Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </VisitorPortalShell>
  );
}
