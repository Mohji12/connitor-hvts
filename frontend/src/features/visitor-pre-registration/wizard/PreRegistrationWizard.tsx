'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api-errors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { VisitorAccountApi } from '@/features/visitor-pre-registration/api/visitorAccountService';
import { VisitorProfilePreviewCard } from '@/features/visitor-pre-registration/preview/VisitorProfilePreviewCard';
import {
  basicInfoSchema,
  passwordSchema,
  professionalSchema,
  type BasicInfoValues,
  type PasswordValues,
  type ProfessionalValues,
  type VisitorPreviewData,
} from '@/features/visitor-pre-registration/schemas/visitorAccountSchema';
import { LivePhotoStep } from './steps/LivePhotoStep';
import { GovernmentIdStep } from './steps/GovernmentIdStep';
import { VisitorAuthService } from '@/lib/services/visitorAuthService';
import { getVisitorToken } from '@/lib/services/visitorPortalService';

const STEPS = [
  'Basic info',
  'Professional',
  'Live photo',
  'Government ID',
  'Password',
  'Verification',
] as const;

const STORAGE_KEY = 'visitor_pre_reg_account_id';

export function PreRegistrationWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const loginPath = returnTo
    ? `/visitor/login?returnTo=${encodeURIComponent(returnTo)}`
    : '/visitor/login';
  const [step, setStep] = useState(0);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [preview, setPreview] = useState<VisitorPreviewData>({});
  const [loading, setLoading] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [accountExists, setAccountExists] = useState(false);

  useEffect(() => {
    if (getVisitorToken()) {
      toast.info('You are already signed in.');
      const dest =
        returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
          ? returnTo
          : '/visitor/dashboard';
      router.replace(dest);
      return;
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      setAccountId(stored);
    }
  }, [router, returnTo]);

  const basicForm = useForm<BasicInfoValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      emailType: 'PERSONAL',
    },
  });

  const professionalForm = useForm<ProfessionalValues>({
    resolver: zodResolver(professionalSchema),
    defaultValues: { companyName: '', jobTitle: '', linkedinUrl: '' },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirmPassword: '', acceptTerms: false as unknown as true },
  });

  const syncPreview = (patch: Partial<VisitorPreviewData>) => {
    setPreview((prev) => {
      const next = { ...prev, ...patch };
      if (next.firstName || next.lastName) {
        next.fullName = [next.firstName, next.lastName].filter(Boolean).join(' ');
      }
      if (next.jobTitle && next.companyName) {
        next.headline = `${next.jobTitle} at ${next.companyName}`;
      }
      return next;
    });
  };

  const persistAccountId = (id: string) => {
    setAccountId(id);
    sessionStorage.setItem(STORAGE_KEY, id);
  };

  const onBasicSubmit = async (values: BasicInfoValues) => {
    setLoading(true);
    setAccountExists(false);
    try {
      syncPreview(values);
      if (accountId) {
        setStep(1);
        return;
      }
      const result = await VisitorAccountApi.createDraft(values);
      persistAccountId(result.accountId);
      syncPreview({ accountId: result.accountId, profileStatus: result.profileStatus });
      if (result.resumed) {
        toast.info('Continuing your previous registration');
        try {
          const existing = await VisitorAccountApi.getPreview(result.accountId);
          setPreview(existing);
          if (existing.companyName) {
            professionalForm.reset({
              companyName: existing.companyName ?? '',
              jobTitle: existing.jobTitle ?? '',
              linkedinUrl: existing.linkedinUrl ?? '',
            });
          }
        } catch {
          // Preview is optional for resume; wizard can still proceed.
        }
      }
      setStep(1);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Could not save basic info');
      const alreadyRegistered =
        message.toLowerCase().includes('log in') ||
        message.toLowerCase().includes('already registered');
      if (alreadyRegistered) {
        setAccountExists(true);
        sessionStorage.removeItem(STORAGE_KEY);
        setAccountId(null);
        toast.message('Redirecting to sign in…');
        router.push(
          `${loginPath}${loginPath.includes('?') ? '&' : '?'}identifier=${encodeURIComponent(values.email)}`,
        );
        return;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const onProfessionalSubmit = async (values: ProfessionalValues) => {
    if (!accountId) return;
    setLoading(true);
    try {
      syncPreview(values);
      await VisitorAccountApi.updateProfessional(accountId, values);
      setStep(2);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not save professional details'));
    } finally {
      setLoading(false);
    }
  };

  const onPhotoCapture = async (file: File, blobUrl: string) => {
    if (!accountId) return;
    setLoading(true);
    try {
      await VisitorAccountApi.uploadPhoto(accountId, file);
      syncPreview({ photoBlobUrl: blobUrl });
      toast.success('Live photo saved');
      setStep(3);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Photo upload failed'));
    } finally {
      setLoading(false);
    }
  };

  const onGovtIdCapture = async (file: File, govtIdType: string, other?: string) => {
    if (!accountId) return;
    setLoading(true);
    try {
      await VisitorAccountApi.uploadGovernmentId(accountId, file, govtIdType, other);
      toast.success('Government ID saved');
      setStep(4);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'ID upload failed'));
    } finally {
      setLoading(false);
    }
  };

  const onPasswordSubmit = async (values: PasswordValues) => {
    if (!accountId) return;
    setLoading(true);
    try {
      await VisitorAccountApi.setPassword(accountId, values.password, values.acceptTerms);
      toast.success('Password saved');
      setStep(5);
      await sendVerifications();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not save password'));
    } finally {
      setLoading(false);
    }
  };

  const sendVerifications = async () => {
    if (!accountId) return;
    try {
      const phone = await VisitorAccountApi.sendPhoneOtp(accountId);
      if (phone.testOtp) toast.message(`Test OTP: ${phone.testOtp}`);
      const email = await VisitorAccountApi.sendEmailVerification(accountId);
      setEmailSent(true);
      if (email.testEmailOtp) toast.message(`Test email OTP: ${email.testEmailOtp}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not send verification'));
    }
  };

  const finishIfActivated = (result: { activated?: boolean; profileStatus?: string }) => {
    if (result.activated || result.profileStatus === 'ACTIVE') {
      sessionStorage.removeItem(STORAGE_KEY);
      toast.success('Account activated! Sign in to continue.');
      router.push(loginPath);
      return true;
    }
    return false;
  };

  const verifyEmail = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const result = await VisitorAccountApi.verifyEmail(accountId, emailOtp);
      syncPreview({ emailVerified: true, profileStatus: result.profileStatus ?? 'ACTIVE' });
      if (finishIfActivated(result)) return;
      toast.success('Email verified — your account is active. Sign in to continue.');
      sessionStorage.removeItem(STORAGE_KEY);
      router.push(loginPath);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Invalid email OTP'));
    } finally {
      setLoading(false);
    }
  };

  const verifyPhone = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const result = await VisitorAccountApi.verifyPhone(accountId, phoneOtp);
      syncPreview({ phoneVerified: true });
      if (finishIfActivated(result)) return;
      toast.success('Phone verified');
      const updated = await VisitorAccountApi.getPreview(accountId);
      syncPreview(updated);
      if (updated.profileStatus === 'ACTIVE') {
        finishIfActivated({ profileStatus: 'ACTIVE' });
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Invalid OTP'));
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader>
          <CardTitle>Create your Conninter profile</CardTitle>
          <CardDescription>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </CardDescription>
          <Progress value={progress} className="mt-2" />
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <Form {...basicForm}>
              <form onSubmit={basicForm.handleSubmit(onBasicSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={basicForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input {...field} onChange={(e) => { field.onChange(e); syncPreview({ firstName: e.target.value }); }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={basicForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last name</FormLabel>
                        <FormControl>
                          <Input {...field} onChange={(e) => { field.onChange(e); syncPreview({ lastName: e.target.value }); }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={basicForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile (10 digits)</FormLabel>
                      <FormControl>
                        <Input {...field} onChange={(e) => { field.onChange(e); syncPreview({ phone: e.target.value }); }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={basicForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} onChange={(e) => { field.onChange(e); syncPreview({ email: e.target.value }); }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={basicForm.control}
                  name="emailType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email type</FormLabel>
                      <Select value={field.value} onValueChange={(v) => { field.onChange(v); syncPreview({ emailType: v as 'WORK' | 'PERSONAL' }); }}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PERSONAL">Personal</SelectItem>
                          <SelectItem value="WORK">Work</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue
                </Button>
                {accountExists && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 space-y-3">
                    <p>
                      This email or mobile number is already registered. Sign in to book visits or
                      manage your profile.
                    </p>
                    <Button type="button" onClick={() => router.push(loginPath)}>
                      Go to visitor login
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          )}

          {step === 1 && (
            <Form {...professionalForm}>
              <form onSubmit={professionalForm.handleSubmit(onProfessionalSubmit)} className="space-y-4">
                <FormField
                  control={professionalForm.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input {...field} onChange={(e) => { field.onChange(e); syncPreview({ companyName: e.target.value, headline: `${professionalForm.getValues('jobTitle') || ''} at ${e.target.value}`.trim() }); }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={professionalForm.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job title</FormLabel>
                      <FormControl>
                        <Input {...field} onChange={(e) => { field.onChange(e); syncPreview({ jobTitle: e.target.value, headline: `${e.target.value} at ${professionalForm.getValues('companyName') || ''}`.trim() }); }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={professionalForm.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn URL (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} onChange={(e) => { field.onChange(e); syncPreview({ linkedinUrl: e.target.value }); }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(0)}>Back</Button>
                  <Button type="submit" disabled={loading}>Continue</Button>
                </div>
              </form>
            </Form>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <LivePhotoStep onCapture={onPhotoCapture} loading={loading} />
              <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <GovernmentIdStep onCapture={onGovtIdCapture} loading={loading} />
              <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
            </div>
          )}

          {step === 4 && (
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal leading-snug">
                        I accept the terms of service and privacy policy
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(3)}>Back</Button>
                  <Button type="submit" disabled={loading}>Continue to verification</Button>
                </div>
              </form>
            </Form>
          )}

          {step === 5 && accountId && (
            <div className="space-y-6">
              <div className="rounded-lg border p-4 space-y-3">
                <p className="font-medium">Email verification</p>
                <p className="text-sm text-muted-foreground">
                  {emailSent
                    ? 'Enter the 6-digit code sent to your email. Your account activates as soon as email is verified.'
                    : 'Sending verification code…'}
                </p>
                <InputOTP maxLength={6} value={emailOtp} onChange={setEmailOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <Button type="button" onClick={verifyEmail} disabled={loading || emailOtp.length < 6}>
                  Verify email
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={sendVerifications}>
                  Resend email & SMS codes
                </Button>
              </div>
              <div className="rounded-lg border p-4 space-y-3">
                <p className="font-medium">Phone verification (optional)</p>
                <p className="text-sm text-muted-foreground">
                  You can verify your mobile now or complete it later from your profile.
                </p>
                <InputOTP maxLength={6} value={phoneOtp} onChange={setPhoneOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <Button type="button" onClick={verifyPhone} disabled={loading || phoneOtp.length < 6}>
                  Verify phone
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2 border-t pt-4">
            <Button type="button" variant="ghost" size="sm" asChild>
              <a href={VisitorAuthService.getGoogleAuthUrl()}>Sign up with Google</a>
            </Button>
            <Button type="button" variant="ghost" size="sm" asChild>
              <a href={VisitorAuthService.getLinkedInAuthUrl()}>Sign up with LinkedIn</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Live preview</p>
        <VisitorProfilePreviewCard data={preview} />
      </div>
    </div>
  );
}
