'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, Truck } from 'lucide-react';
import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import { DistributorOnboardingService } from '@/lib/services/distributorOnboardingService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { appSafeHomeHref } from '@/lib/native-home-guard';

const VENDOR_TYPES = [
  { value: 'PHARMA', label: 'Pharma / medicines' },
  { value: 'MEDICAL_DEVICES', label: 'Medical devices' },
  { value: 'SURGICAL_CONSUMABLES', label: 'Surgical consumables' },
  { value: 'LAB_REAGENTS', label: 'Lab reagents' },
  { value: 'GENERAL_STORES', label: 'General stores' },
  { value: 'LINEN_HOUSEKEEPING', label: 'Linen / housekeeping' },
  { value: 'CATERING_FSSAI', label: 'Catering (FSSAI)' },
  { value: 'IT_EQUIPMENT', label: 'IT equipment' },
  { value: 'OTHER', label: 'Other' },
] as const;

const ENTITY_TYPES = [
  'Proprietorship',
  'Partnership',
  'LLP',
  'Pvt Ltd',
  'Public Ltd',
  'Others',
] as const;

const ONBOARDING_FEE = 150;

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
  email: string;
  password: string;
  confirmPassword: string;
  contactPerson: string;
  phone: string;
  vendorName: string;
  legalEntityType: string;
  vendorType: string;
  gstNumber: string;
  gstRegistrationType: string;
  panNumber: string;
  cin: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
  operatingSameAsRegistered: boolean;
  operatingAddressLine1: string;
  operatingAddressLine2: string;
  operatingCity: string;
  operatingState: string;
  operatingPinCode: string;
  supplyCategories: string[];
  deliveryMode: 'OWN_FLEET' | 'THIRD_PARTY';
  goodsDescription: string;
  drugLicenseNumber: string;
  acceptTerms: boolean;
  declarationTrue: boolean;
};

const initialForm: FormState = {
  email: '',
  password: '',
  confirmPassword: '',
  contactPerson: '',
  phone: '',
  vendorName: '',
  legalEntityType: '',
  vendorType: '',
  gstNumber: '',
  gstRegistrationType: 'Regular',
  panNumber: '',
  cin: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pinCode: '',
  operatingSameAsRegistered: true,
  operatingAddressLine1: '',
  operatingAddressLine2: '',
  operatingCity: '',
  operatingState: '',
  operatingPinCode: '',
  supplyCategories: [],
  deliveryMode: 'OWN_FLEET',
  goodsDescription: '',
  drugLicenseNumber: '',
  acceptTerms: false,
  declarationTrue: false,
};

export default function VendorRegisterPage(): React.ReactElement {
  const router = useRouter();
  const [homeHref, setHomeHref] = React.useState('/');
  const [mounted, setMounted] = React.useState(false);
  const [step, setStep] = React.useState(1);

  React.useEffect(() => {
    setMounted(true);
    setHomeHref(appSafeHomeHref());
  }, []);
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState<{
    vendorCode: string;
    message: string;
    email: string;
  } | null>(null);
  const [phoneOtp, setPhoneOtp] = React.useState('');
  const [phoneVerified, setPhoneVerified] = React.useState(false);
  const [otpBusy, setOtpBusy] = React.useState(false);
  const [files, setFiles] = React.useState<Record<string, File | null>>({
    gstCertificate: null,
    panCard: null,
    bankProof: null,
    drugLicense: null,
  });
  const [payMethod, setPayMethod] = React.useState<'UPI' | 'CARD'>('UPI');
  const [upiId, setUpiId] = React.useState('');
  const [cardNumber, setCardNumber] = React.useState('');
  const [cardExpiry, setCardExpiry] = React.useState('');
  const [cardCvv, setCardCvv] = React.useState('');

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!form.email.includes('@')) return 'Enter a valid email';
      if (form.password.length < 8) return 'Password must be at least 8 characters';
      if (form.password !== form.confirmPassword) return 'Passwords do not match';
      if (!form.contactPerson.trim()) return 'Contact name is required';
      if (!/^[6-9]\d{9}$/.test(form.phone)) return 'Enter a valid 10-digit mobile';
    }
    if (s === 2) {
      if (!form.vendorName.trim()) return 'Legal entity name is required';
      if (!form.legalEntityType) return 'Select entity type';
      if (!form.vendorType) return 'Select vendor category';
      if (!form.gstRegistrationType) return 'Select GST registration type';
      if (form.gstRegistrationType !== 'Unregistered') {
        if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstNumber.toUpperCase())) {
          return 'Enter a valid GSTIN';
        }
      }
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.panNumber.toUpperCase())) {
        return 'Enter a valid PAN';
      }
      if (!form.goodsDescription.trim()) return 'Describe the goods you supply';
      if (
        (form.legalEntityType === 'Pvt Ltd' || form.legalEntityType === 'Public Ltd') &&
        !form.cin.trim()
      ) {
        return 'CIN is required for companies';
      }
    }
    if (s === 3) {
      if (!form.addressLine1.trim() || !form.city.trim() || !form.state) {
        return 'Complete registered address';
      }
      if (!/^\d{6}$/.test(form.pinCode)) return 'Enter a valid 6-digit PIN';
      if (!form.operatingSameAsRegistered) {
        if (!form.operatingAddressLine1.trim() || !form.operatingCity.trim()) {
          return 'Complete operating address';
        }
      }
    }
    if (s === 4) {
      if (!files.panCard) return 'Upload PAN card';
      if (!files.bankProof) return 'Upload cancelled cheque / bank proof';
      if (form.gstRegistrationType !== 'Unregistered' && !files.gstCertificate) {
        return 'Upload GST registration certificate';
      }
    }
    if (s === 5) {
      if (!form.acceptTerms || !form.declarationTrue) {
        return 'Accept terms and declaration to continue';
      }
    }
    if (s === 6) {
      if (payMethod === 'UPI' && upiId.trim().length < 3) return 'Enter a UPI ID';
      if (payMethod === 'CARD') {
        if (cardNumber.replace(/\s/g, '').length < 12) return 'Enter card details';
        if (cardExpiry.trim().length < 4) return 'Enter card expiry';
        if (cardCvv.trim().length < 3) return 'Enter card CVV';
      }
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(6, s + 1));
  };

  const submit = async () => {
    const termsErr = validateStep(5);
    if (termsErr) {
      toast.error(termsErr);
      return;
    }
    const payErr = validateStep(6);
    if (payErr) {
      toast.error(payErr);
      return;
    }
    setLoading(true);
    try {
      const documents: Array<{ documentType: string; documentNumber?: string }> = [
        { documentType: 'PAN_CARD' },
        { documentType: 'BANK_PROOF' },
      ];
      if (form.gstRegistrationType !== 'Unregistered') {
        documents.push({ documentType: 'GST_CERTIFICATE', documentNumber: form.gstNumber });
      }
      if (form.vendorType === 'PHARMA' && form.drugLicenseNumber.trim()) {
        documents.push({
          documentType: 'DRUG_LICENSE',
          documentNumber: form.drugLicenseNumber.trim(),
        });
      }

      const result = await DistributorOnboardingService.apply(
        {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          contactPerson: form.contactPerson.trim(),
          phone: form.phone.trim(),
          vendorName: form.vendorName.trim(),
          legalEntityType: form.legalEntityType,
          vendorType: form.vendorType,
          gstNumber:
            form.gstRegistrationType === 'Unregistered'
              ? undefined
              : form.gstNumber.trim().toUpperCase(),
          gstRegistrationType: form.gstRegistrationType,
          panNumber: form.panNumber.trim().toUpperCase(),
          cin: form.cin.trim() || undefined,
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim() || undefined,
          city: form.city.trim(),
          state: form.state,
          pinCode: form.pinCode.trim(),
          operatingSameAsRegistered: form.operatingSameAsRegistered,
          operatingAddressLine1: form.operatingAddressLine1.trim() || undefined,
          operatingAddressLine2: form.operatingAddressLine2.trim() || undefined,
          operatingCity: form.operatingCity.trim() || undefined,
          operatingState: form.operatingState || undefined,
          operatingPinCode: form.operatingPinCode.trim() || undefined,
          branchIds: [],
          supplyCategories: form.supplyCategories,
          deliveryMode: form.deliveryMode,
          goodsDescription: form.goodsDescription.trim(),
          acceptTerms: form.acceptTerms,
          declarationTrue: form.declarationTrue,
          paymentMethod: 'DUMMY',
          documents,
        },
        files,
      );
      setDone({
        vendorCode: result.vendorCode,
        message: result.message,
        email: form.email.trim().toLowerCase(),
      });
      setPhoneVerified(false);
      toast.success('Onboarding complete');
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String(
              (e as { response?: { data?: { detail?: string; message?: string } } }).response?.data
                ?.detail ??
                (e as { response?: { data?: { message?: string } } }).response?.data?.message ??
                '',
            )
          : '';
      toast.error(detail || 'Could not submit application');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    const verify = async () => {
      setOtpBusy(true);
      try {
        const result = await DistributorOnboardingService.verifyPhone(done.email, phoneOtp.trim());
        setPhoneVerified(true);
        toast.success(result.message);
      } catch (e: unknown) {
        const detail =
          typeof e === 'object' && e && 'response' in e
            ? String(
                (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '',
              )
            : '';
        toast.error(detail || 'Could not verify the code');
      } finally {
        setOtpBusy(false);
      }
    };
    const resend = async () => {
      setOtpBusy(true);
      try {
        const result = await DistributorOnboardingService.resendPhoneOtp(done.email);
        toast.success(result.message);
      } catch (e: unknown) {
        const detail =
          typeof e === 'object' && e && 'response' in e
            ? String(
                (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '',
              )
            : '';
        toast.error(detail || 'Could not resend the code');
      } finally {
        setOtpBusy(false);
      }
    };
    return (
      <main className="min-h-screen bg-[#F7F9FC] px-4 py-10">
        <Card className="mx-auto max-w-lg border-[#001B71]/08">
          <CardContent className="space-y-4 pt-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="text-xl font-semibold">Application received</h1>
            <p className="text-sm text-muted-foreground">
              Vendor code <span className="font-mono font-medium text-slate-900">{done.vendorCode}</span>
            </p>
            <p className="text-sm text-muted-foreground">{done.message}</p>
            {phoneVerified ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button asChild>
                  <Link href="/delivery/login">Sign in</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={homeHref}>Home</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 text-left">
                <Label htmlFor="distributor-phone-otp">WhatsApp code</Label>
                <Input
                  id="distributor-phone-otp"
                  inputMode="numeric"
                  maxLength={6}
                  value={phoneOtp}
                  onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit code"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" disabled={otpBusy || phoneOtp.length !== 6} onClick={() => void verify()}>
                    Verify phone
                  </Button>
                  <Button type="button" variant="outline" disabled={otpBusy} onClick={() => void resend()}>
                    Resend code
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC]">
      <header className="pt-safe border-b border-[#001B71]/08 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <span className="lg:hidden">
            <ConninterWordmark size="sm" />
          </span>
          <span className="hidden lg:inline-flex">
            <ConninterWordmark size="md" />
          </span>
          <Button asChild variant="ghost" size="sm" className="h-10 shrink-0 px-2 text-primary">
            <Link href="/delivery/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <Truck className="h-6 w-6 text-primary" />
            Distributor onboarding
          </h1>
          <p className="text-sm text-muted-foreground">
            Step {step} of 6 — provide business details, then pay the ₹{ONBOARDING_FEE} onboarding fee.
          </p>
        </div>

        <Card className="border-[#001B71]/08 bg-white/90">
          <CardHeader>
            <CardTitle className="text-lg">
              {step === 1 && 'Account & contact'}
              {step === 2 && 'Business identity'}
              {step === 3 && 'Registered address'}
              {step === 4 && 'Compliance documents'}
              {step === 5 && 'Terms'}
              {step === 6 && 'Onboarding fee'}
            </CardTitle>
            <CardDescription>
              {step === 6
                ? 'Pay ₹150 to activate your distributor profile. Demo only — no real money is charged.'
                : step === 5
                  ? 'Accept the conditions to continue to payment.'
                  : 'Fields marked required must be completed before continuing.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!mounted ? (
              <p className="text-sm text-muted-foreground">Loading form…</p>
            ) : (
              <>
            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Email (login)</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <PasswordInput
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm password</Label>
                  <PasswordInput
                    value={form.confirmPassword}
                    onChange={(e) => setField('confirmPassword', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary contact name</Label>
                  <Input
                    value={form.contactPerson}
                    onChange={(e) => setField('contactPerson', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mobile</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Legal entity name</Label>
                  <Input
                    value={form.vendorName}
                    onChange={(e) => setField('vendorName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Entity type</Label>
                  <Select
                    value={form.legalEntityType || undefined}
                    onValueChange={(v) => setField('legalEntityType', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vendor category</Label>
                  <Select
                    value={form.vendorType || undefined}
                    onValueChange={(v) => setField('vendorType', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {VENDOR_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>GST registration type</Label>
                  <Select
                    value={form.gstRegistrationType}
                    onValueChange={(v) => setField('gstRegistrationType', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Composition">Composition</SelectItem>
                      <SelectItem value="Unregistered">Unregistered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.gstRegistrationType !== 'Unregistered' && (
                  <div className="space-y-2">
                    <Label htmlFor="gstNumber">GSTIN</Label>
                    <Input
                      id="gstNumber"
                      value={form.gstNumber}
                      onChange={(e) => setField('gstNumber', e.target.value.toUpperCase())}
                      maxLength={15}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="panNumber">PAN</Label>
                  <Input
                    id="panNumber"
                    value={form.panNumber}
                    onChange={(e) => setField('panNumber', e.target.value.toUpperCase())}
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="goodsDescription">Primary goods</Label>
                  <Input
                    id="goodsDescription"
                    value={form.goodsDescription}
                    onChange={(e) => setField('goodsDescription', e.target.value)}
                    placeholder="e.g. Injectable antibiotics, surgical sutures"
                  />
                </div>
                {(form.legalEntityType === 'Pvt Ltd' || form.legalEntityType === 'Public Ltd') && (
                  <div className="space-y-2">
                    <Label>CIN</Label>
                    <Input value={form.cin} onChange={(e) => setField('cin', e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Address line 1</Label>
                  <Input
                    value={form.addressLine1}
                    onChange={(e) => setField('addressLine1', e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Address line 2 (optional)</Label>
                  <Input
                    value={form.addressLine2}
                    onChange={(e) => setField('addressLine2', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setField('city', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>State / UT</Label>
                  <Select value={form.state || undefined} onValueChange={(v) => setField('state', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>PIN code</Label>
                  <Input
                    value={form.pinCode}
                    onChange={(e) => setField('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Checkbox
                    checked={form.operatingSameAsRegistered}
                    onCheckedChange={(v) => setField('operatingSameAsRegistered', Boolean(v))}
                    id="same-ops"
                  />
                  <Label htmlFor="same-ops">Operating / warehouse address same as registered</Label>
                </div>
                {!form.operatingSameAsRegistered && (
                  <>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Operating address line 1</Label>
                      <Input
                        value={form.operatingAddressLine1}
                        onChange={(e) => setField('operatingAddressLine1', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Operating city</Label>
                      <Input
                        value={form.operatingCity}
                        onChange={(e) => setField('operatingCity', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Operating PIN</Label>
                      <Input
                        value={form.operatingPinCode}
                        onChange={(e) =>
                          setField('operatingPinCode', e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                {form.gstRegistrationType !== 'Unregistered' && (
                  <div className="space-y-2">
                    <Label>GST registration certificate</Label>
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) =>
                        setFiles((f) => ({ ...f, gstCertificate: e.target.files?.[0] ?? null }))
                      }
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>PAN card</Label>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setFiles((f) => ({ ...f, panCard: e.target.files?.[0] ?? null }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cancelled cheque / bank proof</Label>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) =>
                      setFiles((f) => ({ ...f, bankProof: e.target.files?.[0] ?? null }))
                    }
                  />
                </div>
                {form.vendorType === 'PHARMA' && (
                  <>
                    <div className="space-y-2">
                      <Label>Drug license number (optional)</Label>
                      <Input
                        value={form.drugLicenseNumber}
                        onChange={(e) => setField('drugLicenseNumber', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Drug license document (optional)</Label>
                      <Input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) =>
                          setFiles((f) => ({ ...f, drugLicense: e.target.files?.[0] ?? null }))
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3 rounded-lg border border-[#001B71]/08 bg-[#4A90E2]/08 p-4">
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={form.acceptTerms}
                    onCheckedChange={(v) => setField('acceptTerms', Boolean(v))}
                  />
                  <span>I accept Conninter platform terms and hospital vendor policies.</span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={form.declarationTrue}
                    onCheckedChange={(v) => setField('declarationTrue', Boolean(v))}
                  />
                  <span>I declare that the information and documents provided are true.</span>
                </label>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-5">
                <div className="rounded-lg border border-[#001B71]/10 bg-[#4A90E2]/08 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#001B71]/70">
                    Amount due
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-[#001B71]">₹{ONBOARDING_FEE}.00</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    One-time Conninter distributor onboarding fee. Hospital approval is not required.
                  </p>
                </div>
                <div className="space-y-3 rounded-lg border p-4">
                  <Label>Payment method</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={payMethod === 'UPI' ? 'default' : 'outline'}
                      onClick={() => setPayMethod('UPI')}
                    >
                      UPI
                    </Button>
                    <Button
                      type="button"
                      variant={payMethod === 'CARD' ? 'default' : 'outline'}
                      onClick={() => setPayMethod('CARD')}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Card
                    </Button>
                  </div>
                  {payMethod === 'UPI' ? (
                    <div className="space-y-2">
                      <Label htmlFor="onboarding-upi">UPI ID</Label>
                      <Input
                        id="onboarding-upi"
                        placeholder="name@upi"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        autoComplete="off"
                      />
                      <p className="text-xs text-muted-foreground">Demo only — no real charge.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="onboarding-card">Card number</Label>
                        <Input
                          id="onboarding-card"
                          placeholder="4111 1111 1111 1111"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="onboarding-expiry">Expiry</Label>
                        <Input
                          id="onboarding-expiry"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="onboarding-cvv">CVV</Label>
                        <Input
                          id="onboarding-cvv"
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground sm:col-span-2">
                        Demo only — no real charge.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={step === 1 || loading}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              {step < 6 ? (
                <Button
                  type="button"
                  onClick={next}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={loading}
                  onClick={() => void submit()}
                >
                  {loading ? 'Processing…' : `Pay ₹${ONBOARDING_FEE}.00`}
                </Button>
              )}
            </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Prefer to sign in?{' '}
          <button
            type="button"
            className="text-primary underline"
            suppressHydrationWarning
            onClick={() => router.push('/delivery/login')}
          >
            Distributor login
          </button>
        </p>
      </div>
    </main>
  );
}
