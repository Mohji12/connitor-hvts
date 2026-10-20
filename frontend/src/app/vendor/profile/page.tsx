'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { BadgeCheck, Building2, Save } from 'lucide-react';
import { StickyActionBar } from '@/components/mobile/StickyActionBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeliveryPageShell } from '@/features/delivery-management/ui';
import {
  DistributorDeliveryService,
  type DistributorAddress,
  type DistributorProfile,
} from '@/lib/services/distributorDeliveryService';
import { ConnitorLoader } from '@/components/ConnitorLoader';

const ENTITY_TYPES = ['Proprietorship', 'Partnership', 'LLP', 'Pvt Ltd', 'Public Ltd', 'Others'] as const;
const SUPPLY_OPTIONS = ['medicines', 'implants', 'consumables', 'equipment', 'food', 'linen', 'lab', 'other'] as const;
const INDIAN_STATES = [
  'Andhra Pradesh',
  'Karnataka',
  'Kerala',
  'Tamil Nadu',
  'Telangana',
  'Maharashtra',
  'Gujarat',
  'Rajasthan',
  'Madhya Pradesh',
  'Uttar Pradesh',
  'Delhi',
  'West Bengal',
  'Odisha',
  'Punjab',
  'Haryana',
  'Bihar',
  'Jharkhand',
  'Chhattisgarh',
  'Assam',
  'Goa',
  'Other',
] as const;

type FormState = {
  vendorName: string;
  tradeName: string;
  legalEntityType: string;
  website: string;
  yearEstablished: string;
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  alternatePhone: string;
  dispatchPhone: string;
  accountsEmail: string;
  preferredLanguage: string;
  deliveryMode: string;
  goodsDescription: string;
  address: DistributorAddress;
  serviceableStates: string[];
  supplyCategories: string[];
};

function emptyAddress(): DistributorAddress {
  return { line1: '', line2: '', city: '', state: '', pinCode: '' };
}

function toForm(profile: DistributorProfile): FormState {
  return {
    vendorName: profile.vendorName ?? '',
    tradeName: profile.tradeName ?? '',
    legalEntityType: profile.legalEntityType ?? '',
    website: profile.website ?? '',
    yearEstablished: profile.yearEstablished ? String(profile.yearEstablished) : '',
    contactPerson: profile.contactPerson ?? '',
    designation: profile.designation ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    alternatePhone: profile.alternatePhone ?? '',
    dispatchPhone: profile.dispatchPhone ?? '',
    accountsEmail: profile.accountsEmail ?? '',
    preferredLanguage: profile.preferredLanguage ?? '',
    deliveryMode: profile.deliveryMode ?? 'OWN_FLEET',
    goodsDescription: profile.goodsDescription ?? '',
    address: { ...emptyAddress(), ...(profile.registeredAddress ?? {}) },
    serviceableStates: profile.serviceableStates ?? [],
    supplyCategories: profile.supplyCategories ?? [],
  };
}

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

export default function VendorProfilePage(): React.ReactElement {
  const [profile, setProfile] = React.useState<DistributorProfile | null>(null);
  const [form, setForm] = React.useState<FormState | null>(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await DistributorDeliveryService.getProfile();
      setProfile(data);
      setForm(toForm(data));
    } catch {
      toast.error('Could not load your distributor profile');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const patchAddress = (key: keyof DistributorAddress, value: string) => {
    setForm((prev) =>
      prev ? { ...prev, address: { ...prev.address, [key]: value } } : prev,
    );
  };

  const save = async () => {
    if (!form) return;
    if (!form.vendorName.trim() || !form.contactPerson.trim() || !form.phone.trim()) {
      toast.error('Company name, contact person and mobile are required');
      return;
    }
    if (form.supplyCategories.length < 1) {
      toast.error('Select at least one supply category');
      return;
    }
    setSaving(true);
    try {
      const updated = await DistributorDeliveryService.updateProfile({
        vendorName: form.vendorName.trim(),
        tradeName: form.tradeName.trim() || null,
        legalEntityType: form.legalEntityType || null,
        website: form.website.trim() || null,
        yearEstablished: form.yearEstablished ? Number(form.yearEstablished) : null,
        contactPerson: form.contactPerson.trim(),
        designation: form.designation.trim() || null,
        email: form.email.trim(),
        phone: form.phone.trim(),
        alternatePhone: form.alternatePhone.trim() || null,
        dispatchPhone: form.dispatchPhone.trim() || null,
        accountsEmail: form.accountsEmail.trim() || null,
        preferredLanguage: form.preferredLanguage.trim() || null,
        deliveryMode: form.deliveryMode,
        goodsDescription: form.goodsDescription.trim(),
        city: form.address.city || null,
        state: form.address.state || null,
        registeredAddress: form.address,
        supplyCategories: form.supplyCategories,
        serviceableStates: form.serviceableStates,
      });
      setProfile(updated);
      setForm(toForm(updated));
      toast.success('Profile saved');
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!profile || !form) {
    return <ConnitorLoader variant="section" message="Loading profile…" className="min-h-[50vh] py-16" />;
  }

  return (
    <DeliveryPageShell
      title="Company profile"
      subtitle="Details hospitals see when they review your distributor account."
    >
      <div className="space-y-4 pb-24 lg:pb-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" />
              Account status
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm lg:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Vendor code</span>
              <br />
              <span className="font-medium">{profile.vendorCode}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Verification</span>
              <br />
              <span className="font-medium">{profile.verificationStatus ?? '—'}</span>
            </p>
            <p>
              <span className="text-muted-foreground">GSTIN</span>
              <br />
              <span className="font-medium">{profile.gstNumber ?? 'Locked after onboarding'}</span>
            </p>
            <p>
              <span className="text-muted-foreground">PAN</span>
              <br />
              <span className="font-medium">{profile.panNumber ?? '—'}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 shrink-0" />
              Company
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Field id="vendorName" label="Legal name">
              <Input id="vendorName" value={form.vendorName} onChange={(e) => patch('vendorName', e.target.value)} />
            </Field>
            <Field id="tradeName" label="Trade name">
              <Input id="tradeName" value={form.tradeName} onChange={(e) => patch('tradeName', e.target.value)} />
            </Field>
            <Field id="legalEntityType" label="Entity type">
              <Select value={form.legalEntityType || undefined} onValueChange={(value) => patch('legalEntityType', value)}>
                <SelectTrigger id="legalEntityType">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="yearEstablished" label="Year established">
              <Input
                id="yearEstablished"
                inputMode="numeric"
                value={form.yearEstablished}
                onChange={(e) => patch('yearEstablished', e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </Field>
            <Field id="website" label="Website">
              <Input id="website" value={form.website} onChange={(e) => patch('website', e.target.value)} />
            </Field>
            <Field id="deliveryMode" label="Delivery mode">
              <Select value={form.deliveryMode} onValueChange={(value) => patch('deliveryMode', value)}>
                <SelectTrigger id="deliveryMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWN_FLEET">Own fleet</SelectItem>
                  <SelectItem value="THIRD_PARTY">Third party</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="lg:col-span-2">
              <Field id="goodsDescription" label="Primary goods">
                <Input
                  id="goodsDescription"
                  value={form.goodsDescription}
                  onChange={(e) => patch('goodsDescription', e.target.value)}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Field id="contactPerson" label="Contact person">
              <Input id="contactPerson" value={form.contactPerson} onChange={(e) => patch('contactPerson', e.target.value)} />
            </Field>
            <Field id="designation" label="Designation">
              <Input id="designation" value={form.designation} onChange={(e) => patch('designation', e.target.value)} />
            </Field>
            <Field id="email" label="Login email">
              <Input id="email" type="email" value={form.email} onChange={(e) => patch('email', e.target.value)} />
            </Field>
            <Field id="phone" label="Mobile">
              <Input id="phone" inputMode="tel" value={form.phone} onChange={(e) => patch('phone', e.target.value)} />
            </Field>
            <Field id="alternatePhone" label="Alternate mobile">
              <Input id="alternatePhone" inputMode="tel" value={form.alternatePhone} onChange={(e) => patch('alternatePhone', e.target.value)} />
            </Field>
            <Field id="dispatchPhone" label="Dispatch phone">
              <Input id="dispatchPhone" inputMode="tel" value={form.dispatchPhone} onChange={(e) => patch('dispatchPhone', e.target.value)} />
            </Field>
            <Field id="accountsEmail" label="Accounts email">
              <Input id="accountsEmail" type="email" value={form.accountsEmail} onChange={(e) => patch('accountsEmail', e.target.value)} />
            </Field>
            <Field id="preferredLanguage" label="Preferred language">
              <Input id="preferredLanguage" value={form.preferredLanguage} onChange={(e) => patch('preferredLanguage', e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registered address</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <Field id="line1" label="Address line 1">
                <Input id="line1" value={form.address.line1 ?? ''} onChange={(e) => patchAddress('line1', e.target.value)} />
              </Field>
            </div>
            <div className="lg:col-span-2">
              <Field id="line2" label="Address line 2">
                <Input id="line2" value={form.address.line2 ?? ''} onChange={(e) => patchAddress('line2', e.target.value)} />
              </Field>
            </div>
            <Field id="city" label="City">
              <Input id="city" value={form.address.city ?? ''} onChange={(e) => patchAddress('city', e.target.value)} />
            </Field>
            <Field id="pinCode" label="PIN code">
              <Input
                id="pinCode"
                inputMode="numeric"
                value={form.address.pinCode ?? ''}
                onChange={(e) => patchAddress('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </Field>
            <div className="lg:col-span-2">
              <Field id="state" label="State">
                <Select
                  value={form.address.state || undefined}
                  onValueChange={(value) => patchAddress('state', value)}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supply categories</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {SUPPLY_OPTIONS.map((item) => {
              const checked = form.supplyCategories.includes(item);
              return (
                <label key={item} className="flex items-center gap-2 text-sm capitalize">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      patch(
                        'supplyCategories',
                        value
                          ? [...form.supplyCategories, item]
                          : form.supplyCategories.filter((entry) => entry !== item),
                      );
                    }}
                  />
                  {item}
                </label>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hospitals</CardTitle>
          </CardHeader>
          <CardContent>
            {!profile.branchMappings?.length ? (
              <p className="text-sm text-muted-foreground">
                Hospitals are not selected on this profile. Choose the hospital and its allotted
                slot when you book a delivery.
              </p>
            ) : (
              <ul className="space-y-2">
                {profile.branchMappings.map((row) => (
                  <li key={row.mappingId} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{row.branchName ?? 'Hospital'}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{row.approvalStatus}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <StickyActionBar aboveTabBar>
        <Button className="w-full" onClick={() => void save()} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </StickyActionBar>
    </DeliveryPageShell>
  );
}
