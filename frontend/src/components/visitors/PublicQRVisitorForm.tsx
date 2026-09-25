'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { VisitorService } from '@/lib/services/visitorService';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';

// Shadcn UI Components
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Icons
import {
  Loader2,
  User,
  EyeIcon,
  RefreshCw,
  Upload,
  X,
  Building,
  Clock,
} from 'lucide-react';

// New Step Components
import { VisitTypeSelection } from './steps/VisitTypeSelection';
import { MeetingCategorySelection } from './steps/MeetingCategorySelection';
import { DeliveryCategorySelection } from './steps/DeliveryCategorySelection';
import { QuickRegistrationForm } from './steps/QuickRegistrationForm';
import { CompleteProfilePrompt } from './steps/CompleteProfilePrompt';
import { DeliveryVisitRequest } from './steps/DeliveryVisitRequest';

// Constants
import {
  VisitCategory,
  DELIVERY_SUB_TYPES,
  MeetingSubTypeKey,
  DeliverySubTypeKey,
  isProfileCompleteForMeeting,
} from '@/lib/constants/visit-constants';
import {
  CreateVisitRequestSchema,
  RegisterVisitorSchema,
} from '@/lib/schema/schema';

// Helper schemas for form validation
const PhoneCheckSchema = z.object({
  phone: z.string().length(10, 'Phone number must be 10 digits'),
});

type PhoneCheckFormData = z.infer<typeof PhoneCheckSchema>;
type RegisterVisitorFormData = z.infer<typeof RegisterVisitorSchema>;
type CreateVisitRequestFormData = z.infer<typeof CreateVisitRequestSchema>;

interface Visitor {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  company?: string | null;
  designation?: string | null;
  alternatePhone?: string | null;
  alternateEmail?: string | null;
  companyWebsite?: string | null;
  reportingManagerName?: string | null;
  reportingManagerPhone?: string | null;
  photo?: string | null;
  governmentIdDocument?: string | null;
  officeIdDocument?: string | null;
}

interface StaffMember {
  id: number;
  name: string;
  phone: string;
  department?: string;
}

interface BranchInfo {
  id: string;
  name: string;
  users: StaffMember[];
}

interface VisitRequestData {
  purpose: string;
  department: string;
  personToMeet: number | string;
  staffName?: string;
  staffPhone?: string;
}

export default function PublicQRVisitorForm() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId'); // string | null

  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<
    | 'welcome'
    | 'check'
    | 'visit-type-selection'
    // Meeting flow
    | 'meeting-category-selection'
    | 'complete-profile'
    | 'register'
    | 'registration-success'
    | 'request'
    | 'request-success'
    // Delivery flow
    | 'delivery-category-selection'
    | 'quick-register'
    | 'delivery-request'
    | 'delivery-success'
  >('welcome');
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [isEditingVisitor, setIsEditingVisitor] = useState(false);
  const [visitRequestData, setVisitRequestData] =
    useState<VisitRequestData | null>(null);
  
  // New state for visit type workflow
  const [, setVisitCategory] = useState<VisitCategory | null>(null);
  const [visitSubType, setVisitSubType] = useState<string | null>(null);

  const phoneForm = useForm<PhoneCheckFormData>({
    resolver: zodResolver(PhoneCheckSchema),
    defaultValues: { phone: '' },
  });

  const fetchBranchInfo = useCallback(async () => {
    if (!branchId) return;
    try {
      const info = await VisitorService.getBranchInfo(branchId);
      setBranchInfo(info);
    } catch {
      toast.error('Error', {
        description: 'Failed to fetch branch information.',
      });
    }
  }, [branchId]);

  useEffect(() => {
    if (branchId) {
      fetchBranchInfo();
    }
  }, [branchId, fetchBranchInfo]);

  const handleCheckVisitor = async (data: PhoneCheckFormData) => {
    if (!branchId) {
      toast.error('Error', {
        description: 'Branch ID is missing. Please scan the QR code again.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const existingVisitor = await VisitorService.publicCheckByPhone(
        data.phone,
        branchId!,
      );
      if (existingVisitor) {
        setVisitor(existingVisitor);
        // Navigate to visit type selection instead of directly to request
        setStep('visit-type-selection');
        toast.success('Welcome Back!', {
          description: 'What brings you here today?',
        });
      } else {
        setVisitor({ phone: data.phone } as Visitor);
        // Navigate to visit type selection for new visitors too
        setStep('visit-type-selection');
        toast.info('New Visitor', {
          description: 'Let us know what brings you here.',
        });
      }
    } catch {
      toast.error('Error', {
        description: 'Failed to check visitor status.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle visit type selection (Meeting vs Delivery)
  const handleVisitTypeSelect = (category: VisitCategory) => {
    setVisitCategory(category);
    if (category === VisitCategory.MEETING) {
      setStep('meeting-category-selection');
    } else {
      setStep('delivery-category-selection');
    }
  };

  // Handle meeting category selection
  const handleMeetingCategorySelect = (subType: MeetingSubTypeKey) => {
    setVisitSubType(subType);
    // Check if visitor needs to register or complete profile
    if (!visitor?.id) {
      // New visitor - full registration
      setStep('register');
    } else if (!isProfileCompleteForMeeting(visitor)) {
      // Existing visitor but incomplete profile (e.g., delivery visitor upgrading)
      setStep('complete-profile');
    } else {
      // Full profile - proceed to visit request
      setStep('request');
    }
  };

  // Handle delivery category selection
  const handleDeliveryCategorySelect = (subType: DeliverySubTypeKey) => {
    setVisitSubType(subType);
    if (!visitor?.id) {
      // New visitor - quick registration
      setStep('quick-register');
    } else {
      // Existing visitor - proceed to delivery request
      setStep('delivery-request');
    }
  };

  // Handle quick registration for delivery visitors
  const handleQuickRegister = async (data: { firstName: string; lastName: string }) => {
    if (!branchId || !visitor?.phone) return;
    setIsLoading(true);
    try {
      const result = await VisitorService.quickRegisterVisitor(branchId, {
        phone: visitor.phone,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      setVisitor(result.visitor);
      setStep('delivery-request');
      toast.success('Registered!', {
        description: 'Please complete your delivery details.',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error('Registration Failed', {
        description: axiosError?.response?.data?.message || errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle profile completion for meeting visits
  const handleCompleteProfile = async (
    data: {
      email: string;
      company: string;
      designation: string;
      middleName?: string;
      alternatePhone?: string;
      alternateEmail?: string;
      companyWebsite?: string;
      address?: string;
      reportingManagerName?: string;
      reportingManagerPhone?: string;
    },
    files: {
      photo?: File;
      governmentIdDocument?: File;
      officeIdDocument?: File;
    },
  ) => {
    if (!branchId || !visitor?.id) return;
    setIsLoading(true);
    try {
      const result = await VisitorService.completeProfile(
        visitor.id,
        branchId,
        data,
        files,
      );
      setVisitor(result.visitor);
      setStep('request');
      toast.success('Profile Updated!', {
        description: 'You can now create your visit request.',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error('Update Failed', {
        description: axiosError?.response?.data?.message || errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delivery visit creation
  const handleDeliveryVisit = async (data: {
    deliveryPlatform: string;
    deliveryRecipient?: string;
    orderReference?: string;
  }) => {
    if (!branchId || !visitor?.phone || !visitSubType) return;
    setIsLoading(true);
    try {
      await VisitorService.createDeliveryVisit(branchId, {
        phone: visitor.phone,
        visitSubType: visitSubType,
        deliveryPlatform: data.deliveryPlatform,
        deliveryRecipient: data.deliveryRecipient,
        orderReference: data.orderReference,
      });
      setStep('delivery-success');
      toast.success('Checked In!', {
        description: 'Your delivery visit has been registered.',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error('Failed', {
        description: axiosError?.response?.data?.message || errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegistrationSuccess = (registeredVisitor: Visitor) => {
    setVisitor(registeredVisitor);
    setStep('registration-success');
    setIsEditingVisitor(false);
  };

  const handleStartOver = () => {
    setVisitor(null);
    setStep('check');
    setIsEditingVisitor(false);
    setVisitRequestData(null);
    setVisitCategory(null);
    setVisitSubType(null);
    phoneForm.reset({ phone: '' });
  };

  if (!branchId) {
    return (
      <div className="min-h-screen bg-muted/40 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Access</CardTitle>
            <CardDescription>
              Please scan the QR code to access the visitor form.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
      {/* Welcome Section */}
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Building className="h-12 w-12 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Hello, Visitor</h1>
            <p className="text-muted-foreground">
              <span className="text-xl font-semibold">
                {branchInfo?.name || 'Hospital Branch'}
              </span>{' '}
              Welcoming You
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Section */}
      <div className="w-full max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Visitor Check-In</CardTitle>
            <p className="text-sm text-muted-foreground">
              Already have a Conninter profile?{' '}
              <a href="/visitor/login" className="text-primary underline font-medium">
                Sign in
              </a>{' '}
              to skip registration.
            </p>
            <CardDescription>
              {step === 'welcome' &&
                "Hey! We're excited to have you here today."}
              {step === 'check' && 'Check if you are registered'}
              {step === 'visit-type-selection' && 'Select your visit purpose'}
              {step === 'meeting-category-selection' && 'Select your category'}
              {step === 'delivery-category-selection' && 'Select delivery type'}
              {step === 'quick-register' && 'Quick registration'}
              {step === 'complete-profile' && 'Complete your profile'}
              {step === 'register' && 'Complete your registration'}
              {step === 'registration-success' && 'Registration Successful'}
              {step === 'request' && 'Create your visit request'}
              {step === 'request-success' && 'Visit Request Submitted'}
              {step === 'delivery-request' && 'Delivery details'}
              {step === 'delivery-success' && 'Request Submitted'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 'welcome' && (
              <div className="text-center space-y-4">
                <p className="text-lg">
                  <span className="font-semibold">
                    {branchInfo?.name || 'our facility'} !
                  </span>
                  <br />
                  Please start by entering your phone number
                </p>
                <Button
                  onClick={() => setStep('check')}
                  className="cursor-pointer"
                >
                  Start Check-In
                </Button>
              </div>
            )}

            {step === 'check' && (
              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(handleCheckVisitor)}>
                  <FormField
                    control={phoneForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="flex-grow w-full">
                        <FormLabel>Your Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your 10-digit phone number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto mt-4 cursor-pointer"
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Check Visitor Status
                  </Button>
                </form>
              </Form>
            )}

            {/* Visit Type Selection (Meeting vs Delivery) */}
            {step === 'visit-type-selection' && visitor && (
              <VisitTypeSelection
                visitorName={visitor.firstName ? `${visitor.firstName} ${visitor.lastName || ''}` : undefined}
                isReturningVisitor={!!visitor.id}
                onSelect={handleVisitTypeSelect}
                onBack={handleStartOver}
              />
            )}

            {/* Meeting Category Selection */}
            {step === 'meeting-category-selection' && (
              <MeetingCategorySelection
                onSelect={handleMeetingCategorySelect}
                onBack={() => setStep('visit-type-selection')}
              />
            )}

            {/* Delivery Category Selection */}
            {step === 'delivery-category-selection' && (
              <DeliveryCategorySelection
                onSelect={handleDeliveryCategorySelect}
                onBack={() => setStep('visit-type-selection')}
              />
            )}

            {/* Quick Registration for Delivery */}
            {step === 'quick-register' && visitor && (
              <QuickRegistrationForm
                phone={visitor.phone}
                onSubmit={handleQuickRegister}
                onBack={() => setStep('delivery-category-selection')}
                isLoading={isLoading}
              />
            )}

            {/* Complete Profile for Meeting */}
            {step === 'complete-profile' && visitor && (
              <CompleteProfilePrompt
                visitor={{
                  firstName: visitor.firstName,
                  lastName: visitor.lastName,
                  phone: visitor.phone,
                }}
                onSubmit={handleCompleteProfile}
                onBack={() => setStep('meeting-category-selection')}
                isLoading={isLoading}
              />
            )}

            {/* Delivery Visit Request */}
            {step === 'delivery-request' && visitor && visitSubType && (
              <DeliveryVisitRequest
                visitorName={`${visitor.firstName || ''} ${visitor.lastName || ''}`}
                deliverySubType={DELIVERY_SUB_TYPES[visitSubType as DeliverySubTypeKey]?.label || visitSubType}
                onSubmit={handleDeliveryVisit}
                onBack={() => setStep('delivery-category-selection')}
                isLoading={isLoading}
              />
            )}

            {/* Delivery Success */}
            {step === 'delivery-success' && visitor && (
              <div className="text-center space-y-6">
                <Card className="bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-200">
                  <CardHeader>
                    <div className="mx-auto w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mb-4">
                      <Clock className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl text-amber-800">
                      Request Submitted
                    </CardTitle>
                    <CardDescription className="text-amber-700">
                      Thank you, {visitor.firstName}! Your request has been submitted.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-amber-600 mb-4">
                      Please wait at the gate. Security will assist you shortly.
                    </p>
                    <Button
                      onClick={handleStartOver}
                      variant="outline"
                      className="cursor-pointer"
                    >
                      Done
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Show visitor details alert (excluding certain steps) */}
            {visitor &&
              !['check', 'welcome', 'registration-success', 'request-success', 'delivery-success', 'visit-type-selection', 'meeting-category-selection', 'delivery-category-selection', 'quick-register', 'complete-profile', 'delivery-request'].includes(step) && (
                <Alert>
                  <User className="h-4 w-4" />
                  <AlertTitle>Visitor Details</AlertTitle>
                  <AlertDescription>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        {`${visitor.firstName} ${
                          visitor.middleName ? visitor.middleName + ' ' : ''
                        }${visitor.lastName}` ? (
                          <span>
                            <strong>Name:</strong>{' '}
                            {`${visitor.firstName} ${
                              visitor.middleName ? visitor.middleName + ' ' : ''
                            }${visitor.lastName}`}{' '}
                            | <strong>Phone:</strong> {visitor.phone}
                          </span>
                        ) : (
                          <span>
                            Registering with phone:{' '}
                            <strong>{visitor.phone}</strong>
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {visitor.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsEditingVisitor(true);
                              setStep('register');
                            }}
                            className="cursor-pointer"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleStartOver}
                          className="cursor-pointer"
                        >
                          <RefreshCw className="mr-1 h-4 w-4" />
                          Start Over
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

            {step === 'register' && visitor && (
              <RegisterVisitorForm
                branchId={branchId!}
                defaultValues={visitor}
                isEditing={isEditingVisitor}
                onSuccess={onRegistrationSuccess}
                onCancel={() => {
                  if (visitor.id) {
                    setStep('request');
                  } else {
                    setStep('check');
                  }
                }}
              />
            )}

            {step === 'registration-success' && visitor && (
              <div className="text-center space-y-6">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
                  <CardHeader>
                    <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <CardTitle className="text-2xl text-green-800">
                      Registration Successful!
                    </CardTitle>
                    <CardDescription className="text-green-700">
                      Welcome,{' '}
                      {`${visitor.firstName} ${
                        visitor.middleName ? visitor.middleName + ' ' : ''
                      }${visitor.lastName}`}
                      ! Your profile has been successfully registered.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-green-600 mb-4">
                      You can now proceed to request your visit.
                    </p>
                    <Button
                      onClick={() => setStep('request')}
                      className="bg-green-600 hover:bg-green-700 cursor-pointer"
                    >
                      Click here to request a visit
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {step === 'request' && visitor && (
              <CreateVisitRequestForm
                visitor={visitor}
                branchId={branchId!}
                branchInfo={branchInfo}
                onSuccess={(visitData) => {
                  setVisitRequestData(visitData);
                  setStep('request-success');
                }}
                onCancel={handleStartOver}
              />
            )}

            {step === 'request-success' && visitor && visitRequestData && (
              <div className="text-center space-y-6">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
                  <CardHeader>
                    <div className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <CardTitle className="text-2xl text-blue-800">
                      Visit Request Submitted!
                    </CardTitle>
                    <CardDescription className="text-blue-700">
                      Your visit request has been successfully submitted.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-white/50 rounded-lg p-4 text-left">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        Visit Details:
                      </h4>
                      <div className="space-y-1 text-sm text-purple-600">
                        <p>
                          <strong>Visitor:</strong>{' '}
                          {`${visitor.firstName} ${
                            visitor.middleName ? visitor.middleName + ' ' : ''
                          }${visitor.lastName}`}
                        </p>
                        <p>
                          <strong>Phone:</strong> {visitor.phone}
                        </p>
                        <p>
                          <strong>Purpose:</strong> {visitRequestData.purpose}
                        </p>
                        <p>
                          <strong>Person to Meet:</strong>{' '}
                          {visitRequestData.personToMeet === 'other'
                            ? visitRequestData.staffName
                            : branchInfo?.users.find(
                                (u) =>
                                  u.id ===
                                  Number(visitRequestData.personToMeet),
                              )?.name || 'Not specified'}
                        </p>
                        <p>
                          <strong>Department:</strong>{' '}
                          {visitRequestData.department}
                        </p>
                      </div>
                    </div>
                    {/* <Button
                      onClick={handleStartOver}
                      variant="outline"
                      className="cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                    </Button> */}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Sub-components for Forms ---

interface RegisterVisitorFormProps {
  branchId: string;
  defaultValues: Partial<Visitor>;
  isEditing: boolean;
  onSuccess: (visitor: Visitor) => void;
  onCancel: () => void;
}

function RegisterVisitorForm({
  branchId,
  defaultValues,
  isEditing,
  onSuccess,
  onCancel,
}: RegisterVisitorFormProps) {
  const form = useForm<RegisterVisitorFormData>({
    resolver: zodResolver(RegisterVisitorSchema),
    defaultValues: {
      phone: defaultValues.phone || '',
      branchId: branchId,
      firstName: defaultValues.firstName || '',
      middleName: defaultValues.middleName || '',
      lastName: defaultValues.lastName || '',
      email: defaultValues.email || '',
      alternateEmail: defaultValues.alternateEmail || '',
      address: defaultValues.address || '',
      company: defaultValues.company || '',
      companyWebsite: defaultValues.companyWebsite || '',
      designation: defaultValues.designation || '',
      alternatePhone: defaultValues.alternatePhone || '',
      reportingManagerName: defaultValues.reportingManagerName || '',
      reportingManagerPhone: defaultValues.reportingManagerPhone || '',
      photo: defaultValues.photo || '',
      governmentIdDocument: defaultValues.governmentIdDocument || '',
      officeIdDocument: defaultValues.officeIdDocument || '',
    },
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [officeIdFile, setOfficeIdFile] = useState<File | null>(null);

  const handleFileChange = (
    file: File | null,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    fieldName: 'photo' | 'governmentIdDocument' | 'officeIdDocument',
  ) => {
    setFile(file);
    if (file) {
      form.setValue(fieldName, file.name);
    } else {
      form.setValue(fieldName, '');
    }
  };

  const onSubmit = async (data: RegisterVisitorFormData) => {
    try {
      const processedData = {
        ...data,
        alternateEmail: data.alternateEmail || undefined,
        alternatePhone: data.alternatePhone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        company: data.company || undefined,
        companyWebsite: data.companyWebsite || undefined,
        designation: data.designation || undefined,
        reportingManagerName: data.reportingManagerName || undefined,
        reportingManagerPhone: data.reportingManagerPhone || undefined,
      };

      const files = {
        photo: photoFile ?? undefined,
        governmentIdDocument: govIdFile ?? undefined,
        officeIdDocument: officeIdFile ?? undefined,
      };

      const result = await VisitorService.publicRegisterVisitor(
        branchId!,
        processedData,
        files,
      );
      onSuccess(result.visitor);
    } catch (error) {
      toast.error('Registration Failed', {
        description:
          (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message || 'An error occurred.',
      });
    }
  };

  const FileUploadField = ({
    label,
    description,
    accept,
    file,
    setFile,
    fieldName,
  }: {
    label: string;
    description: string;
    accept: string;
    file: File | null;
    setFile: React.Dispatch<React.SetStateAction<File | null>>;
    fieldName: 'photo' | 'governmentIdDocument' | 'officeIdDocument';
  }) => (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
        {file ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm truncate max-w-[100px]">{file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleFileChange(null, setFile, fieldName)}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2 text-center">
              {description}
            </p>
            <Input
              type="file"
              accept={accept}
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) {
                  handleFileChange(selectedFile, setFile, fieldName);
                }
              }}
              className="hidden"
              id={fieldName}
            />
            <div className="text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(fieldName)?.click()}
                className="cursor-pointer"
              >
                Choose File
              </Button>
            </div>
          </>
        )}
      </div>
      <FormMessage />
    </FormItem>
  );

  return (
    <div className="w-full" style={{ overflowX: 'hidden' }}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="firstName"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="First Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="middleName"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Middle Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Middle Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="lastName"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Last Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="phone"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="10-digit number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="email"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="alternateEmail"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alternate Email</FormLabel>
                  <FormControl>
                    <Input placeholder="alternate@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="alternatePhone"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alternate Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Alternate phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="company"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input placeholder="Med India." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              name="companyWebsite"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://company.com" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              name="designation"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
                  <FormControl>
                    <Input placeholder="Senior medical Consultant" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              name="reportingManagerName"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reporting Manager Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Manager's name" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              name="reportingManagerPhone"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reporting Manager Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Manager's phone" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              name="address"
              control={form.control}
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="123 Main St, City, State, ZIP"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* File Upload Fields */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Document Uploads</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FileUploadField
                  label="Visitor Photo"
                  description="Upload a clear photo (JPG, PNG, JPEG)"
                  accept=".jpg,.jpeg,.png,.img"
                  file={photoFile}
                  setFile={setPhotoFile}
                  fieldName="photo"
                />
                <FileUploadField
                  label="Government ID"
                  description="Upload government ID (JPG, PNG, JPEG, PDF)"
                  accept=".jpg,.jpeg,.png,.img,.pdf"
                  file={govIdFile}
                  setFile={setGovIdFile}
                  fieldName="governmentIdDocument"
                />
                <FileUploadField
                  label="Office ID"
                  description="Upload office ID (JPG, PNG, JPEG, PDF)"
                  accept=".jpg,.jpeg,.png,.img,.pdf"
                  file={officeIdFile}
                  setFile={setOfficeIdFile}
                  fieldName="officeIdDocument"
                />
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> If you want to update your profile
                details, please contact security personnel.
              </p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || isEditing}
              className="cursor-pointer"
            >
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? 'Viewing Only' : 'Register Visitor'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

interface CreateVisitRequestFormProps {
  visitor: Visitor;
  branchId: string;
  branchInfo: BranchInfo | null;
  onSuccess: (visitData: VisitRequestData) => void;
  onCancel: () => void;
}

function CreateVisitRequestForm({
  visitor,
  branchId,
  branchInfo,
  onSuccess,
  onCancel,
}: CreateVisitRequestFormProps) {
  const form = useForm<CreateVisitRequestFormData>({
    resolver: zodResolver(CreateVisitRequestSchema),
    defaultValues: {
      phone: visitor.phone,
      purpose: '',
      department: undefined,
      personToMeet: undefined,
      staffName: '',
      staffPhone: '',
    },
  });

  const [departments, setDepartments] = useState<string[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isFetchingStaff, setIsFetchingStaff] = useState(false);

  const selectedDepartment = form.watch('department');
  const selectedPersonToMeet = form.watch('personToMeet');

  useEffect(() => {
    if (branchInfo && branchInfo.users) {
      // Extract unique departments from staff
      const uniqueDepartments = Array.from(
        new Set(
          branchInfo.users.map((user) => user.department).filter(Boolean),
        ),
      ) as string[];
      setDepartments(uniqueDepartments);
    }
  }, [branchInfo]);

  useEffect(() => {
    if (selectedDepartment && branchInfo) {
      setIsFetchingStaff(true);
      try {
        const staffInDepartment = branchInfo.users.filter(
          (user) => user.department === selectedDepartment,
        );
        setStaffList(staffInDepartment);
      } catch {
        toast.error('Failed to fetch staff', {
          description: 'Please try again or contact the facility.',
        });
        setStaffList([]);
      } finally {
        setIsFetchingStaff(false);
      }
    }
  }, [selectedDepartment, branchInfo]);

  const onSubmit = async (data: CreateVisitRequestFormData) => {
    try {
      const submissionData = {
        ...data,
        personToMeet:
          data.personToMeet === 'other' ? 'other' : data.personToMeet,
        staffName: data.personToMeet === 'other' ? data.staffName : undefined,
        staffPhone: data.personToMeet === 'other' ? data.staffPhone : undefined,
      };

      await VisitorService.publicCreateVisitRequest(branchId!, submissionData);

      // Pass the form data to show in success card
      onSuccess({
        purpose: data.purpose,
        department: data.department || '',
        personToMeet: data.personToMeet || '',
        staffName: data.staffName,
        staffPhone: data.staffPhone,
      });
    } catch (error) {
      toast.error('Submission Failed', {
        description:
          (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message || 'An error occurred.',
      });
    }
  };

  return (
    <div className="w-full" style={{ overflowX: 'hidden' }}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 h-[250px] overflow-y-auto"
        >
          <FormField
            name="purpose"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purpose of Visit *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Scheduled Meeting with HR, Medical Appointment, etc."
                    {...field}
                    className="w-full resize-vertical"
                    style={{ overflow: 'auto', wordBreak: 'break-word' }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="department"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map((dep) => (
                        <SelectItem key={dep} value={dep}>
                          {dep.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="personToMeet"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Person to Meet</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedDepartment || isFetchingStaff}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isFetchingStaff
                              ? 'Loading staff...'
                              : 'Select a person'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staffList.map((staff) => (
                        <SelectItem key={staff.id} value={String(staff.id)}>
                          {staff.name} ({staff.phone})
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other (Not Listed)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {selectedPersonToMeet === 'other' && (
            <div className="p-4 bg-muted rounded-md grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                name="staffName"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter staff name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="staffPhone"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter staff phone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="cursor-pointer"
            >
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Submit Visit Request
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
