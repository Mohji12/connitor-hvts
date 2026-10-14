'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CameraOrUploadPicker } from '@/components/visitors/shared/CameraOrUploadPicker';
import { VisitorAccountApi } from '@/features/visitor-pre-registration/api/visitorAccountService';
import { VisitorProfilePreviewCard } from '@/features/visitor-pre-registration/preview/VisitorProfilePreviewCard';
import {
  basicInfoSchema,
  passwordSchema,
  professionalSchema,
} from '@/features/visitor-pre-registration/schemas/visitorAccountSchema';
import { getApiErrorMessage } from '@/lib/api-errors';
import { VisitorAuthService } from '@/lib/services/visitorAuthService';

const bookingProfileSchema = basicInfoSchema.merge(professionalSchema).and(passwordSchema);
type BookingProfileValues = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  emailType: 'WORK' | 'PERSONAL';
  companyName: string;
  jobTitle: string;
  linkedinUrl?: string;
  password: string;
  confirmPassword: string;
  acceptTerms: true;
};

export interface BookingProfileIdentity {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

const MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ID_TYPES = [...PHOTO_TYPES, 'application/pdf'];
const GOVT_ID_TYPES = [
  { value: 'AADHAAR', label: 'Aadhaar' },
  { value: 'PAN', label: 'PAN' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving licence' },
  { value: 'VOTER_ID', label: 'Voter ID' },
  { value: 'OTHER', label: 'Other' },
];

const OTP_ERRORS: Record<string, string> = {
  INVALID_OTP: 'The WhatsApp code is incorrect. Check it and try again.',
  OTP_EXPIRED: 'The WhatsApp code has expired. Tap Resend code.',
  OTP_LOCKED: 'Too many wrong attempts. Wait a few minutes, then resend.',
  OTP_NOT_SENT: 'The code was not sent yet. Tap Resend code.',
};

function errorText(error: unknown, fallback: string): string {
  const message = getApiErrorMessage(error, fallback);
  return OTP_ERRORS[message] ?? message;
}

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}

function SelectedFile({
  file,
  previewUrl,
  label,
  onRemove,
  disabled,
}: {
  file: File;
  previewUrl: string | null;
  label: string;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt={label} className="h-16 w-16 rounded-md object-cover" />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-md bg-white">
          <FileText className="h-7 w-7 text-emerald-700" />
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-sm text-slate-800">{file.name}</p>
      {!disabled && (
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove ${label}`}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface BookingProfileStepProps {
  onVerified: (identity: BookingProfileIdentity) => void;
}

/** Create a visitor profile inside the booking wizard; signs the visitor in once the phone is verified. */
export function BookingProfileStep({ onVerified }: BookingProfileStepProps): React.ReactElement {
  const form = useForm<BookingProfileValues>({
    resolver: zodResolver(bookingProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      emailType: 'PERSONAL',
      companyName: '',
      jobTitle: '',
      linkedinUrl: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false as unknown as true,
    },
  });

  const [photo, setPhoto] = React.useState<File | null>(null);
  const [governmentId, setGovernmentId] = React.useState<File | null>(null);
  const [govtIdType, setGovtIdType] = React.useState('AADHAAR');
  const [govtIdOther, setGovtIdOther] = React.useState('');
  const [accountId, setAccountId] = React.useState<string | null>(null);
  const [codeSent, setCodeSent] = React.useState(false);
  const [otp, setOtp] = React.useState('');
  const [busy, setBusy] = React.useState<'save' | 'verify' | 'resend' | null>(null);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [accountExists, setAccountExists] = React.useState(false);
  const [verified, setVerified] = React.useState(false);

  const photoUrl = useObjectUrl(photo);
  const governmentIdUrl = useObjectUrl(governmentId);
  const values = form.watch();
  const locked = codeSent || busy !== null;

  const preview = {
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone,
    email: values.email,
    emailType: values.emailType,
    companyName: values.companyName,
    jobTitle: values.jobTitle,
    linkedinUrl: values.linkedinUrl || null,
    photoBlobUrl: photoUrl,
    phoneVerified: verified,
  };

  const acceptFile = (file: File, allowed: string[], set: (file: File) => void, kind: string) => {
    setError('');
    if (!allowed.includes(file.type)) {
      setError(kind === 'photo' ? 'Photo must be a JPG, PNG or WebP image.' : 'ID must be an image or a PDF.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Each file must be 5 MB or smaller.');
      return;
    }
    set(file);
  };

  const saveProfile = async (data: BookingProfileValues) => {
    setError('');
    setNotice('');
    setAccountExists(false);
    if (!photo) {
      setError('Add your photo (live camera or upload).');
      return;
    }
    if (!governmentId) {
      setError('Add your government ID (live camera or upload).');
      return;
    }
    if (govtIdType === 'OTHER' && !govtIdOther.trim()) {
      setError('Enter the type of your government ID.');
      return;
    }
    setBusy('save');
    try {
      let id: string;
      try {
        const draft = await VisitorAccountApi.createDraft({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone,
          email: data.email.trim().toLowerCase(),
          emailType: data.emailType,
        });
        id = draft.accountId;
      } catch (e: unknown) {
        const message = getApiErrorMessage(e, 'Could not save your details.');
        const lower = message.toLowerCase();
        if (lower.includes('log in') || lower.includes('already registered')) {
          setAccountExists(true);
          return;
        }
        setError(message);
        return;
      }
      setAccountId(id);
      await VisitorAccountApi.updateProfessional(id, {
        companyName: data.companyName.trim(),
        jobTitle: data.jobTitle.trim(),
        linkedinUrl: data.linkedinUrl,
      });
      await VisitorAccountApi.uploadPhoto(id, photo);
      await VisitorAccountApi.uploadGovernmentId(
        id,
        governmentId,
        govtIdType,
        govtIdType === 'OTHER' ? govtIdOther.trim() : undefined,
      );
      await VisitorAccountApi.setPassword(id, data.password, data.acceptTerms);
      const sent = await VisitorAccountApi.sendPhoneOtp(id);
      setCodeSent(true);
      setOtp('');
      setNotice(
        sent.testOtp
          ? `Code sent to your WhatsApp. (Test code: ${sent.testOtp})`
          : 'Code sent to your WhatsApp.',
      );
    } catch (e: unknown) {
      setError(errorText(e, 'Could not create your profile. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  const resend = async () => {
    if (!accountId) return;
    setError('');
    setBusy('resend');
    try {
      const sent = await VisitorAccountApi.sendPhoneOtp(accountId);
      setNotice(sent.testOtp ? `New code sent. (Test code: ${sent.testOtp})` : 'New code sent to your WhatsApp.');
    } catch (e: unknown) {
      setError(errorText(e, 'Could not send the WhatsApp code.'));
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    if (!accountId) return;
    if (otp.length !== 6) {
      setError('Enter the 6-digit code sent to your WhatsApp.');
      return;
    }
    setError('');
    setBusy('verify');
    const data = form.getValues();
    try {
      await VisitorAccountApi.verifyPhone(accountId, otp);
    } catch (e: unknown) {
      setError(errorText(e, 'The WhatsApp code is incorrect.'));
      setBusy(null);
      return;
    }
    setVerified(true);
    try {
      await VisitorAuthService.login(data.phone, data.password);
      onVerified({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone,
        email: data.email.trim().toLowerCase(),
      });
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Your profile is ready, but signing in failed. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  const editDetails = () => {
    setCodeSent(false);
    setOtp('');
    setNotice('');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="order-2 space-y-4 lg:order-1">
        <div>
          <p className="text-sm font-semibold text-[#001B71]">Create your visitor profile</p>
          <p className="text-xs text-muted-foreground">
            Fill in your details once. After verifying your WhatsApp number you&apos;ll choose your visit
            slot.{' '}
            <Link href="/visitor/login?returnTo=/book-appointment/" className="text-primary underline">
              Already have a profile? Sign in
            </Link>
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(saveProfile)} className="space-y-4" noValidate>
            <fieldset disabled={locked} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="given-name" />
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
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="family-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile number (WhatsApp)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10-digit number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" autoComplete="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emailType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email type</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={field.value}
                          onChange={field.onChange}
                        >
                          <option value="PERSONAL">Personal</option>
                          <option value="WORK">Work</option>
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="organization" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job title</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="organization-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Your photo <span className="text-red-500">*</span>
                </Label>
                {photo ? (
                  <SelectedFile
                    file={photo}
                    previewUrl={photoUrl}
                    label="photo"
                    disabled={locked}
                    onRemove={() => setPhoto(null)}
                  />
                ) : (
                  <CameraOrUploadPicker
                    inputId="booking-profile-photo"
                    inputAriaLabel="Upload your photo"
                    accept={PHOTO_TYPES.join(',')}
                    facingMode="user"
                    fileNamePrefix="profile-photo"
                    disabled={locked}
                    onFile={(file) => acceptFile(file, PHOTO_TYPES, setPhoto, 'photo')}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking-govt-id-type">
                  Government ID <span className="text-red-500">*</span>
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    id="booking-govt-id-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={govtIdType}
                    onChange={(e) => setGovtIdType(e.target.value)}
                  >
                    {GOVT_ID_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {govtIdType === 'OTHER' && (
                    <Input
                      value={govtIdOther}
                      onChange={(e) => setGovtIdOther(e.target.value)}
                      placeholder="ID type"
                      aria-label="Other ID type"
                    />
                  )}
                </div>
                {governmentId ? (
                  <SelectedFile
                    file={governmentId}
                    previewUrl={governmentIdUrl}
                    label="government ID"
                    disabled={locked}
                    onRemove={() => setGovernmentId(null)}
                  />
                ) : (
                  <CameraOrUploadPicker
                    inputId="booking-profile-government-id"
                    inputAriaLabel="Upload government ID"
                    accept={ID_TYPES.join(',')}
                    facingMode="environment"
                    fileNamePrefix="government-id"
                    captureLabel="Take live photo of ID"
                    disabled={locked}
                    onFile={(file) => acceptFile(file, ID_TYPES, setGovernmentId, 'id')}
                  />
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" autoComplete="new-password" />
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
                        <Input {...field} type="password" autoComplete="new-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                At least 8 characters with an uppercase letter, a lowercase letter and a digit.
              </p>
              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                          aria-label="Accept terms"
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">
                        I agree to the terms of use and privacy policy.
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            {!codeSent && (
              <Button type="submit" className="w-full bg-[#001B71] hover:bg-[#001B71]/90" disabled={busy !== null}>
                {busy === 'save' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {busy === 'save' ? 'Saving your profile…' : 'Verify phone and continue'}
              </Button>
            )}
          </form>
        </Form>

        {codeSent && (
          <div className="space-y-3 rounded-xl border border-[#001B71]/15 bg-[#F7F9FC] p-4">
            <Label htmlFor="booking-profile-otp">Enter the 6-digit code sent to +91 {values.phone} on WhatsApp</Label>
            <Input
              id="booking-profile-otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              aria-label="WhatsApp code"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void verify()} disabled={busy !== null || verified}>
                {busy === 'verify' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify code
              </Button>
              <Button type="button" variant="outline" onClick={() => void resend()} disabled={busy !== null || verified}>
                Resend code
              </Button>
              {!verified && (
                <Button type="button" variant="ghost" onClick={editDetails} disabled={busy !== null}>
                  Edit details
                </Button>
              )}
            </div>
          </div>
        )}

        {notice && <p className="text-xs text-emerald-700">{notice}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {accountExists && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            This phone or email already has a profile.{' '}
            <Link
              href={`/visitor/login?returnTo=/book-appointment/&identifier=${encodeURIComponent(values.email)}`}
              className="font-medium underline"
            >
              Sign in
            </Link>{' '}
            to continue booking.
          </p>
        )}
      </div>

      <div className="order-1 lg:order-2">
        <div className="lg:sticky lg:top-24">
          <VisitorProfilePreviewCard data={preview} />
        </div>
      </div>
    </div>
  );
}
