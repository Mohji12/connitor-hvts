'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { VisitorService } from '@/lib/services/visitorService';
import { UserService } from '@/lib/services/userService';
import {
  RegisterVisitorSchema,
  CreateVisitRequestSchema,
} from '@/lib/schema/schema';
import { toast } from 'sonner';

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
import { Loader2, User, Edit, RefreshCw, Upload, X } from 'lucide-react';

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
  id: string;
  name: string;
  phone: string;
}

export function SecurityCheckIn({
  user,
}: {
  user: { branchId: string; hospitalChainId: string };
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'check' | 'register' | 'request'>('check');
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [isEditingVisitor, setIsEditingVisitor] = useState(false);

  const phoneForm = useForm<PhoneCheckFormData>({
    resolver: zodResolver(PhoneCheckSchema),
    defaultValues: { phone: '' },
  });

  const handleCheckVisitor = async (data: PhoneCheckFormData) => {
    setIsLoading(true);
    try {
      const existingVisitor = await VisitorService.checkByPhone(
        data.phone,
        user.branchId,
      );
      if (existingVisitor) {
        setVisitor(existingVisitor);
        setStep('request');
        toast.success('Visitor Found', {
          description: 'Please create a visit request.',
        });
      } else {
        setVisitor({ phone: data.phone } as Visitor);
        setStep('register');
        toast.info('Visitor Not Found', {
          description: 'Please register them first.',
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

  const onRegistrationSuccess = (registeredVisitor: Visitor) => {
    setVisitor(registeredVisitor);
    setStep('request');
    setIsEditingVisitor(false);
    toast.success('Visitor Registered', {
      description: 'Now, please create the visit request.',
    });
  };

  const handleStartOver = () => {
    setVisitor(null);
    setStep('check');
    setIsEditingVisitor(false);
    phoneForm.reset({ phone: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8 pb-4 lg:pb-8">
      {/* Welcome Section */}
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
            <User className="h-6 w-6 text-white" />
          </div>
          Security Check-In Portal
        </h1>
        <p className="text-slate-600 text-base md:text-lg mt-2">
          Welcome, manage visitor registrations and check-ins
        </p>
      </header>

      {/* Main Form Section */}
      <div className="w-full  mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Visitor Management</CardTitle>
            <CardDescription>
              {step === 'check' &&
                'Check if visitor is registered by phone number'}
              {step === 'register' && 'Register a new visitor'}
              {step === 'request' && 'Create a visit request'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 'check' && (
              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(handleCheckVisitor)}>
                  <FormField
                    control={phoneForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="flex-grow w-full">
                        <FormLabel>Visitor Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter 10-digit phone number"
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
                    Check Visitor
                  </Button>
                </form>
              </Form>
            )}

            {visitor && step !== 'check' && (
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
                          Registering new visitor with phone:{' '}
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
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
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
                branchId={user.branchId}
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

            {step === 'request' && visitor && (
              <CreateVisitRequestForm
                visitor={visitor}
                branchId={user.branchId}
                onSuccess={handleStartOver}
                onCancel={handleStartOver}
              />
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
      // Convert empty strings to null for optional fields
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

      if (isEditing) {
        // Use the new updateVisitor function
        const result = await VisitorService.updateVisitor(
          String(defaultValues.id!),
          processedData,
          {
            photo: photoFile || undefined,
            governmentIdDocument: govIdFile || undefined,
            officeIdDocument: officeIdFile || undefined,
          },
        );
        onSuccess(result.visitor);
        toast.success('Visitor details updated successfully!');
      } else {
        const result = await VisitorService.registerVisitor(processedData, {
          photo: photoFile || undefined,
          governmentIdDocument: govIdFile || undefined,
          officeIdDocument: officeIdFile || undefined,
        });
        onSuccess(result.visitor);
      }
    } catch (error) {
      toast.error(isEditing ? 'Update Failed' : 'Registration Failed', {
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
            <span className="text-sm truncate max-w-[135px]">{file.name}</span>
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
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="cursor-pointer"
            >
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? 'Update Visitor' : 'Register Visitor'}
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
  onSuccess: () => void;
  onCancel: () => void;
}

// Replace the CreateVisitRequestForm component with this corrected version:
function CreateVisitRequestForm({
  visitor,
  branchId,
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
    UserService.getDepartmentsByBranch(branchId)
      .then((deps) => setDepartments(deps || []))
      .catch(() => toast.error('Could not fetch departments.'));
  }, [branchId]);

  useEffect(() => {
    if (selectedDepartment) {
      setIsFetchingStaff(true);
      UserService.getStaffByDepartment(branchId, selectedDepartment)
        .then((staff) => {
          setStaffList(
            staff.map((s: StaffMember) => ({
              id: s.id,
              name: s.name,
              phone: s.phone,
            })),
          );
        })
        .catch((error) => {
          toast.error('Failed to fetch staff', {
            description:
              (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message || 'Please check network or contact admin.',
          });
          setStaffList([]);
        })
        .finally(() => setIsFetchingStaff(false));
    }
  }, [selectedDepartment, branchId]);

  const onSubmit = async (data: CreateVisitRequestFormData) => {
    try {
      const submissionData = {
        ...data,
        personToMeet:
          data.personToMeet === 'other' ? 'other' : data.personToMeet,
        staffName: data.personToMeet === 'other' ? data.staffName : undefined,
        staffPhone: data.personToMeet === 'other' ? data.staffPhone : undefined,
      };

      await VisitorService.createVisitRequest(submissionData);
      toast.success('Visit request submitted successfully!', {
        description: 'The staff member has been notified.',
      });
      onSuccess();
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            name="purpose"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purpose of Visit *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Scheduled Meeting with HR"
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
                    onValueChange={(value) => {
                      // Keep as string for "other", convert to number for staff IDs
                      field.onChange(value === 'other' ? value : String(value));
                    }}
                    value={
                      field.value !== undefined && field.value !== null
                        ? String(field.value)
                        : undefined
                    }
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
