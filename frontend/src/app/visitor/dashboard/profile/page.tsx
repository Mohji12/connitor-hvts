'use client';

import { useEffect, useState, type FormEvent, type ReactElement, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { VisitorPortalShell } from '@/components/auth/VisitorPortalShell';
import { CameraAccessCard } from '@/components/mobile/CameraAccessCard';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VisitorAccountApi } from '@/features/visitor-pre-registration/api/visitorAccountService';
import { getVisitorToken } from '@/lib/services/visitorPortalService';
import { ProfileShareQr } from '@/components/profile/ProfileShareQr';

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
  }
  return fallback;
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export default function VisitorProfileEditPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [shareToken, setShareToken] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    const token = getVisitorToken();
    if (!token) {
      router.replace('/visitor/login');
      return;
    }
    VisitorAccountApi.getMyProfile(token)
      .then((p) => {
        setFirstName(p.firstName ?? '');
        setLastName(p.lastName ?? '');
        setPhone((p.phone ?? '').replace(/\D/g, '').slice(-10));
        setEmail(p.email ?? '');
        setCompanyName(p.companyName ?? '');
        setJobTitle(p.jobTitle ?? '');
        setLinkedinUrl(p.linkedinUrl ?? '');
        setShareToken(p.profileShareToken ?? '');
        setShareUrl(p.profileCardUrl ?? '');
      })
      .catch(() => {
        toast.error('Could not load your profile');
        router.replace('/visitor/login');
      })
      .finally(() => setReady(true));
  }, [router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const token = getVisitorToken();
    if (!token) return;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || phone.length !== 10) {
      toast.error('Name, email and a 10-digit mobile number are required');
      return;
    }
    setLoading(true);
    try {
      await VisitorAccountApi.updateMyProfile(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone,
        email: email.trim(),
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        linkedinUrl: linkedinUrl.trim(),
      });
      toast.success('Profile saved');
      router.push('/visitor/dashboard');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save profile'));
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <VisitorPortalShell appTabs>
        <ConnitorLoader variant="section" message="Loading profile…" className="min-h-[50vh] py-16" />
      </VisitorPortalShell>
    );
  }

  return (
    <VisitorPortalShell appTabs>
      <form
        onSubmit={(event) => void onSubmit(event)}
        className="mx-auto w-full min-w-0 max-w-lg space-y-4 p-4 pb-28 lg:pb-10 sm:p-6 sm:py-10"
      >
        <div className="min-w-0 max-lg:hidden">
          <h1 className="text-2xl font-bold">My profile</h1>
          <p className="text-sm text-muted-foreground">
            Update the details hospitals see when you book a visit.
          </p>
        </div>

        <ProfileShareQr token={shareToken} cardUrl={shareUrl} />

        <CameraAccessCard className="lg:hidden" />

        <Card className="border-[#001B71]/10 shadow-sm">
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Field id="firstName" label="First name">
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field id="lastName" label="Last name">
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
            <Field id="phone" label="Mobile">
              <Input
                id="phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </Field>
            <Field id="email" label="Email">
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        <Card className="border-[#001B71]/10 shadow-sm">
          <CardHeader>
            <CardTitle>Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field id="companyName" label="Company">
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </Field>
            <Field id="jobTitle" label="Job title">
              <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </Field>
            <Field id="linkedinUrl" label="LinkedIn URL">
              <Input
                id="linkedinUrl"
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://"
              />
            </Field>
          </CardContent>
        </Card>

        <StickyActionBar aboveTabBar>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {loading ? 'Saving…' : 'Save profile'}
          </Button>
          <Button type="button" variant="outline" asChild className="hidden lg:inline-flex">
            <Link href="/visitor/dashboard">Cancel</Link>
          </Button>
        </StickyActionBar>
      </form>
    </VisitorPortalShell>
  );
}
