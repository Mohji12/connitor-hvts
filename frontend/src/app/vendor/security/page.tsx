'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/mobile/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { DeliveryPageShell } from '@/features/delivery-management/ui';
import { getApiErrorMessage } from '@/lib/api-errors';
import {
  DistributorVisitService,
  type DistributorSecurityStaff,
} from '@/lib/services/distributorVisitService';

export default function VendorSecurityStaffPage(): React.ReactElement {
  const [items, setItems] = React.useState<DistributorSecurityStaff[]>([]);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setItems(await DistributorVisitService.listSecurityStaff());
    } catch {
      toast.error('Could not load desk staff');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function create(): Promise<void> {
    setSaving(true);
    try {
      await DistributorVisitService.createSecurityStaff({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });
      toast.success('Desk security profile created. They can sign in at Delivery login.');
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not create that profile'));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(staff: DistributorSecurityStaff): Promise<void> {
    try {
      const next = await DistributorVisitService.setSecurityStaffActive(staff.id, !staff.isActive);
      setItems((rows) => rows.map((row) => (row.id === next.id ? next : row)));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not update that profile'));
    }
  }

  return (
    <DeliveryPageShell
      title="Desk staff"
      subtitle="Create login profiles for people at your office desk. They scan the visitor meeting pass and check visitors in."
    >
      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New desk security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sec-name">Name</Label>
              <Input id="sec-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sec-email">Login email</Label>
              <Input
                id="sec-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sec-phone">Mobile</Label>
              <Input
                id="sec-phone"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sec-password">Password</Label>
              <PasswordInput
                id="sec-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button className="w-full" disabled={saving} onClick={() => void create()}>
              {saving ? 'Creating…' : 'Create login'}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {items.length === 0 ? (
            <EmptyState
              title="No desk staff yet"
              description="Add a name, email, mobile and password. That person signs in at Delivery login and opens Desk scan."
            />
          ) : (
            items.map((staff) => (
              <div
                key={staff.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{staff.name || 'Desk security'}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[staff.email, staff.phone].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {staff.isActive ? 'Can sign in' : 'Login disabled'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void toggle(staff)}>
                  {staff.isActive ? 'Disable' : 'Enable'}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </DeliveryPageShell>
  );
}
