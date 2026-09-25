'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import Image from 'next/image';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';
import {
  Departments,
  RegistrationProfileStepSchema,
  SelfRegisterRoles,
  SelfRegistrationFormSchema,
  UserTypes,
  type PublicBranch,
  type PublicHospitalChain,
  type SelfRegistrationFormData,
} from '@/lib/schema/schema';
import { RegistrationService } from '@/lib/services/registrationService';

const OtpFormSchema = z.object({
  otp: z.string().min(6, { message: 'Code must be 6 digits.' }),
});

const REGISTRATION_TIMER_SECONDS = 10 * 60;

type FormStep = 'profile' | 'role' | 'verify';

const ROLE_LABELS: Record<(typeof SelfRegisterRoles)[number], string> = {
  CHAIN_ADMIN: 'Chain Admin',
  BRANCH_ADMIN: 'Branch Admin',
  SECURITY_SUPERVISOR: 'Security Supervisor',
  SECURITY: 'Security',
  STAFF: 'Staff',
};

const STEP_META: Record<FormStep, { label: string; title: string; description: string }> = {
  profile: {
    label: 'Profile',
    title: 'Create your account',
    description: 'Start with your basic details. We will verify your email before you can sign in.',
  },
  role: {
    label: 'Role',
    title: 'Your role & workplace',
    description: 'Tell us how you will use Conninter and which hospital you belong to.',
  },
  verify: {
    label: 'Verify',
    title: 'Verify your email',
    description: 'Enter the 6-digit code we sent to your inbox.',
  },
};

function formatEnumValue(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function maskEmail(value: string): string {
  const [local, domain] = value.split('@');
  if (!local || !domain) return value;
  const visible = local.length <= 2 ? local[0] ?? '*' : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof err.response === 'object' &&
    err.response !== null &&
    'data' in err.response &&
    typeof err.response.data === 'object' &&
    err.response.data !== null &&
    'message' in err.response.data &&
    typeof err.response.data.message === 'string'
  ) {
    return err.response.data.message;
  }
  return fallback;
}

function RegistrationSkeleton() {
  return (
    <Card className="w-full max-w-lg min-h-[520px] shadow-xl border-[#001B71]/08">
      <CardContent className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function StepIndicator({ step }: { step: FormStep }) {
  const steps: FormStep[] = ['profile', 'role', 'verify'];
  const currentIndex = steps.indexOf(step);

  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      {steps.map((item, index) => {
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;
        return (
          <Fragment key={item}>
            <div className="flex flex-col items-center gap-1 min-w-[72px]">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold border-2 transition-colors',
                  isComplete && 'bg-primary border-primary text-white',
                  isActive && 'border-primary text-primary bg-[#4A90E2]/10',
                  !isActive && !isComplete && 'border-muted-foreground/30 text-muted-foreground',
                )}
              >
                {index + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {STEP_META[item].label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-8 sm:w-12 mb-5 rounded',
                  index < currentIndex ? 'bg-primary' : 'bg-muted-foreground/20',
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function RegistrationHeader({ step, email }: { step: FormStep; email?: string }) {
  const meta = STEP_META[step];

  return (
    <CardHeader className="text-center space-y-4 pb-4">
      <div className="flex justify-center">
        <Image
          src="/ConnInter.png"
          alt="Conninter Logo"
          width={220}
          height={80}
          className="h-auto w-[220px]"
          priority
        />
      </div>
      <StepIndicator step={step} />
      <CardTitle className="text-2xl sm:text-3xl font-bold">{meta.title}</CardTitle>
      <CardDescription className="text-base">
        {step === 'verify' && email ? (
          <>
            Enter the code sent to{' '}
            <span className="font-medium text-foreground">{maskEmail(email)}</span>
          </>
        ) : (
          meta.description
        )}
      </CardDescription>
      {step === 'verify' && (
        <p className="text-sm text-muted-foreground">
          The code expires in 10 minutes. After verification you can sign in with email OTP.
        </p>
      )}
    </CardHeader>
  );
}

export function AuthRegistrationForm() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<FormStep>('profile');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [chains, setChains] = useState<PublicHospitalChain[]>([]);
  const [branches, setBranches] = useState<PublicBranch[]>([]);
  const [loadingChains, setLoadingChains] = useState(false);
  const [chainsLoadError, setChainsLoadError] = useState<string | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchesLoadError, setBranchesLoadError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(REGISTRATION_TIMER_SECONDS);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadHospitalChains = async () => {
    setLoadingChains(true);
    setChainsLoadError(null);
    try {
      const data = await RegistrationService.getHospitalChains();
      setChains(data);
      if (data.length === 0) {
        setChainsLoadError('No hospital chains are available yet. Contact your administrator.');
      }
    } catch {
      setChains([]);
      const message =
        'Could not load hospital chains. Make sure the backend is running and registration API is deployed.';
      setChainsLoadError(message);
      toast.error(message);
    } finally {
      setLoadingChains(false);
    }
  };

  useEffect(() => {
    if (step !== 'role') return;
    void loadHospitalChains();
  }, [step]);

  const form = useForm<SelfRegistrationFormData>({
    resolver: zodResolver(SelfRegistrationFormSchema),
    defaultValues: {
      role: 'STAFF',
      name: '',
      email: '',
      phone: '',
      hospitalChainId: '',
      branchId: '',
      userType: undefined,
      department: undefined,
      location: '',
    },
  });

  const otpForm = useForm<z.infer<typeof OtpFormSchema>>({
    resolver: zodResolver(OtpFormSchema),
    defaultValues: { otp: '' },
  });

  const watchRole = form.watch('role');
  const watchChain = form.watch('hospitalChainId');

  const needsBranch = useMemo(
    () =>
      watchRole === 'BRANCH_ADMIN' ||
      watchRole === 'STAFF' ||
      watchRole === 'SECURITY' ||
      watchRole === 'SECURITY_SUPERVISOR',
    [watchRole],
  );

  const isStaff = watchRole === 'STAFF';

  useEffect(() => {
    if (step !== 'role' || !watchChain) {
      if (!watchChain) {
        setBranches([]);
        setBranchesLoadError(null);
      }
      return;
    }
    setLoadingBranches(true);
    setBranchesLoadError(null);
    RegistrationService.getBranches(watchChain)
      .then((data) => {
        setBranches(data);
        if (data.length === 0) {
          setBranchesLoadError('No branches found for this hospital chain.');
        }
      })
      .catch(() => {
        setBranches([]);
        const message = 'Failed to load branches.';
        setBranchesLoadError(message);
        toast.error(message);
      })
      .finally(() => setLoadingBranches(false));
  }, [watchChain, step]);

  useEffect(() => {
    if (step !== 'verify' || resendTimer <= 0) return;
    const timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const goToRoleStep = async () => {
    setError(null);
    const values = form.getValues();
    const result = RegistrationProfileStepSchema.safeParse({
      name: values.name,
      email: values.email,
      phone: values.phone,
    });

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field === 'name' || field === 'email' || field === 'phone') {
          form.setError(field, { message: issue.message });
        }
      }
      return;
    }

    form.clearErrors(['name', 'email', 'phone']);
    setStep('role');
  };

  const onSubmitRegistration = async (data: SelfRegistrationFormData) => {
    setError(null);
    try {
      const result = await RegistrationService.register(data);
      const email = result.email ?? data.email.trim().toLowerCase();
      setRegisteredEmail(email);
      sessionStorage.setItem('registrationEmail', email);
      if (result.testOtp) {
        toast.message(`Dev verification code: ${result.testOtp}`);
      }
      toast.success('Verification code sent to your email.');
      setResendTimer(REGISTRATION_TIMER_SECONDS);
      otpForm.reset();
      setStep('verify');
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Registration failed.');
      setError(message);
      toast.error(message);
    }
  };

  const onSubmitOtp = async (data: z.infer<typeof OtpFormSchema>) => {
    setError(null);
    try {
      await RegistrationService.verifyOtp(registeredEmail, data.otp);
      sessionStorage.removeItem('registrationEmail');
      toast.success('Email verified! You can sign in now.');
      router.push('/auth/login');
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Invalid verification code.');
      setError(message);
      toast.error(message);
      otpForm.reset();
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setIsResending(true);
    try {
      const result = await RegistrationService.resendOtp(registeredEmail);
      setResendTimer(REGISTRATION_TIMER_SECONDS);
      if (result.testOtp) {
        toast.message(`Dev verification code: ${result.testOtp}`);
      }
      toast.success('Verification code resent.');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to resend code.'));
    } finally {
      setIsResending(false);
    }
  };

  if (!mounted) {
    return <RegistrationSkeleton />;
  }

  if (step === 'verify') {
    const isSubmittingOtp = otpForm.formState.isSubmitting;

    return (
      <Card className="w-full max-w-lg min-h-[520px] shadow-xl flex flex-col border-[#001B71]/08">
        <RegistrationHeader step="verify" email={registeredEmail} />
        <CardContent className="flex-1 flex flex-col">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md mb-4">
              {error}
            </div>
          )}
          <Form {...otpForm}>
            <form
              onSubmit={otpForm.handleSubmit(onSubmitOtp)}
              className="space-y-6 flex-1 flex flex-col"
            >
              <FormField
                control={otpForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification code</FormLabel>
                    <FormControl>
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} {...field} disabled={isSubmittingOtp}>
                          <InputOTPGroup className="gap-2">
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                              <Fragment key={index}>
                                <InputOTPSlot
                                  index={index}
                                  className={cn(
                                    'w-9 h-11 sm:w-10 sm:h-12 text-base sm:text-lg border-2 rounded-md text-center',
                                    'border-gray-300 ring-1 ring-inset ring-gray-200',
                                  )}
                                />
                                {index === 2 && (
                                  <InputOTPSeparator className="w-4 text-gray-400 text-lg" />
                                )}
                              </Fragment>
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="mt-auto space-y-3">
                <Button
                  type="submit"
                  className="w-full cursor-pointer"
                  disabled={isSubmittingOtp || otpForm.watch('otp').length < 6}
                >
                  {isSubmittingOtp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>Complete registration</>
                  )}
                </Button>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {resendTimer > 0
                      ? `Resend in ${formatTimer(resendTimer)}`
                      : "Didn't get the code?"}
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleResend}
                    disabled={resendTimer > 0 || isResending}
                    className="px-0 text-primary cursor-pointer"
                  >
                    {isResending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      'Resend code'
                    )}
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full cursor-pointer"
                  onClick={() => {
                    setStep('role');
                    setError(null);
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Card className="w-full max-w-lg min-h-[520px] shadow-xl flex flex-col border-[#001B71]/08">
      <RegistrationHeader step={step} />
      <CardContent className="flex-1 flex flex-col">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md mb-4">
            {error}
          </div>
        )}
        <Form {...form}>
          <form
            onSubmit={
              step === 'profile'
                ? (e) => {
                    e.preventDefault();
                    void goToRoleStep();
                  }
                : form.handleSubmit(onSubmitRegistration)
            }
            className="space-y-4 flex-1 flex flex-col"
          >
            {step === 'profile' && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" autoComplete="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@hospital.com"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          autoComplete="tel"
                          inputMode="numeric"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 'role' && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SelfRegisterRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hospitalChainId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hospital chain</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('branchId', '');
                        }}
                        value={field.value}
                        disabled={loadingChains || isSubmitting || chains.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                loadingChains
                                  ? 'Loading hospital chains...'
                                  : chains.length === 0
                                    ? 'No chains available'
                                    : 'Select hospital chain'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {chains.map((chain) => (
                            <SelectItem key={chain.id} value={chain.id}>
                              {chain.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {chainsLoadError && (
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <p className="text-sm text-red-600">{chainsLoadError}</p>
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto px-0 text-primary shrink-0"
                            onClick={() => void loadHospitalChains()}
                            disabled={loadingChains}
                          >
                            Retry
                          </Button>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {needsBranch && (
                  <FormField
                    control={form.control}
                    name="branchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ''}
                          disabled={!watchChain || loadingBranches || isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  !watchChain
                                    ? 'Select a chain first'
                                    : loadingBranches
                                      ? 'Loading...'
                                      : 'Select branch'
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {branchesLoadError && watchChain && (
                          <p className="text-sm text-red-600 pt-1">{branchesLoadError}</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {isStaff && (
                  <>
                    <FormField
                      control={form.control}
                      name="userType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>User type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select user type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60">
                              {UserTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {formatEnumValue(type)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60">
                              {Departments.map((dept) => (
                                <SelectItem key={dept} value={dept}>
                                  {formatEnumValue(dept)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Ward / floor / room" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            )}

            <div className="mt-auto space-y-3 pt-2">
              {step === 'profile' ? (
                <>
                  <Button type="submit" className="w-full cursor-pointer">
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="text-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </>
              ) : (
                <>
                  <Button type="submit" className="w-full cursor-pointer" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending verification code...
                      </>
                    ) : (
                      <>
                        Send verification code
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full cursor-pointer"
                    disabled={isSubmitting}
                    onClick={() => {
                      setStep('profile');
                      setError(null);
                    }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to profile
                  </Button>
                </>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
