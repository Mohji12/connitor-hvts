'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Building2, Save } from 'lucide-react';
import apiClient from '@/lib/api';
import { setStoredAuthToken } from '@/lib/auth-storage';
import { displayRole } from '@/lib/role-label';
import { CameraAccessCard } from '@/components/mobile/CameraAccessCard';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { ProfileShareQr } from '@/components/profile/ProfileShareQr';

export type AccountProfile = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  userType?: string | null;
  hospitalChainName?: string | null;
  branchName?: string | null;
  departmentName?: string | null;
  subDepartmentName?: string | null;
  hospitalChain?: { name?: string | null } | null;
  branch?: { name?: string | null } | null;
  distributorId?: string | null;
  profileShareToken?: string | null;
  profileCardUrl?: string | null;
  access_token?: string;
};

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
  }
  return fallback;
}

export function AccountProfileForm(): React.ReactElement {
  const [profile, setProfile] = React.useState<AccountProfile | null>(null);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await apiClient.get<AccountProfile>('/api/auth/me');
      setProfile(res.data);
      setName(res.data.name ?? '');
      setEmail(res.data.email ?? '');
      setPhone(res.data.phone ?? '');
    } catch {
      toast.error('Could not load your profile');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error('Name, email and mobile are required');
      return;
    }
    if (newPassword && !currentPassword) {
      toast.error('Enter your current password to set a new one');
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.patch<AccountProfile>('/api/auth/me', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        ...(newPassword
          ? { currentPassword, newPassword }
          : {}),
      });
      if (res.data.access_token) {
        setStoredAuthToken(res.data.access_token);
        window.dispatchEvent(new Event('auth-session-updated'));
      }
      setProfile(res.data);
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Profile saved');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save profile'));
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <ConnitorLoader variant="section" message="Loading profile…" className="min-h-[50vh] py-16" />;
  }

  const hospital = profile.hospitalChainName ?? profile.hospitalChain?.name;
  const branch = profile.branchName ?? profile.branch?.name;
  const isDistributor = profile.role === 'DISTRIBUTOR';

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 p-4 pb-24 lg:space-y-6 md:p-6 lg:pb-6">
      <div className="min-w-0 max-lg:hidden">
        <h1 className="text-2xl font-bold">My profile</h1>
        <p className="text-sm text-muted-foreground">
          Update how your name and contact details appear across Conninter.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workplace</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm lg:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Role</span>
            <br />
            <span className="font-medium">{displayRole(profile.role)}</span>
            {profile.userType ? (
              <span className="text-muted-foreground"> · {profile.userType}</span>
            ) : null}
          </p>
          <p>
            <span className="text-muted-foreground">Hospital</span>
            <br />
            <span className="font-medium">{hospital || '—'}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Centre / branch</span>
            <br />
            <span className="font-medium">{branch || '—'}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Department</span>
            <br />
            <span className="font-medium">
              {[profile.departmentName, profile.subDepartmentName].filter(Boolean).join(' · ') || '—'}
            </span>
          </p>
        </CardContent>
      </Card>

      {isDistributor ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="font-medium">Company profile</p>
              <p className="text-sm text-muted-foreground">
                GST, address, and hospital mappings live on your distributor profile.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full shrink-0 lg:w-auto">
              <Link href="/vendor/profile">
                <Building2 className="mr-2 h-4 w-4" />
                Edit company
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <ProfileShareQr token={profile.profileShareToken} cardUrl={profile.profileCardUrl} />

      <CameraAccessCard />

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Field id="name" label="Full name">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field id="phone" label="Mobile">
            <Input
              id="phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </Field>
          <div className="lg:col-span-2">
            <Field id="email" label="Login email">
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Field id="currentPassword" label="Current password">
            <PasswordInput
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Field id="newPassword" label="New password">
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <p className="text-xs text-muted-foreground lg:col-span-2">
            Leave blank to keep your current password. New passwords must be at least 8 characters.
          </p>
        </CardContent>
      </Card>

      <StickyActionBar aboveTabBar>
        <Button className="w-full" onClick={() => void save()} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </StickyActionBar>
    </div>
  );
}
