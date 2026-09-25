'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FileUploadField } from '../shared/FileUploadField';

const CompleteProfileSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  company: z.string().min(1, 'Company name is required'),
  designation: z.string().min(1, 'Designation is required'),
  middleName: z.string().optional(),
  alternatePhone: z.string().optional(),
  alternateEmail: z.string().email().optional().or(z.literal('')),
  companyWebsite: z.string().optional(),
  address: z.string().optional(),
  reportingManagerName: z.string().optional(),
  reportingManagerPhone: z.string().optional(),
  photo: z.string().optional(),
  governmentIdDocument: z.string().optional(),
  officeIdDocument: z.string().optional(),
});

type CompleteProfileFormData = z.infer<typeof CompleteProfileSchema>;

interface CompleteProfilePromptProps {
  visitor: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  onSubmit: (
    data: CompleteProfileFormData,
    files: {
      photo?: File;
      governmentIdDocument?: File;
      officeIdDocument?: File;
    },
  ) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
}

export function CompleteProfilePrompt({
  visitor,
  onSubmit,
  onBack,
  isLoading = false,
}: CompleteProfilePromptProps) {
  const [isOptionalOpen, setIsOptionalOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [officeIdFile, setOfficeIdFile] = useState<File | null>(null);

  const form = useForm<CompleteProfileFormData>({
    resolver: zodResolver(CompleteProfileSchema),
    defaultValues: {
      email: '',
      company: '',
      designation: '',
      middleName: '',
      alternatePhone: '',
      alternateEmail: '',
      companyWebsite: '',
      address: '',
      reportingManagerName: '',
      reportingManagerPhone: '',
      photo: '',
      governmentIdDocument: '',
      officeIdDocument: '',
    },
  });

  const handleFileChange = (file: File | null, fieldName: string) => {
    if (file) {
      form.setValue(fieldName as keyof CompleteProfileFormData, file.name);
    } else {
      form.setValue(fieldName as keyof CompleteProfileFormData, '');
    }
  };

  const handleSubmit = async (data: CompleteProfileFormData) => {
    await onSubmit(data, {
      photo: photoFile ?? undefined,
      governmentIdDocument: govIdFile ?? undefined,
      officeIdDocument: officeIdFile ?? undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
        <p className="text-gray-500">
          For meeting visits, we need a few more details.
          <br />
          This is a one-time step — your info will be saved.
        </p>
      </div>

      {/* Existing info display */}
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-2">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="w-4 h-4" />
          <span className="font-medium">Already on file:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
          <div>
            <span className="text-gray-500">Name:</span> {visitor.firstName} {visitor.lastName}
          </div>
          <div>
            <span className="text-gray-500">Phone:</span> {visitor.phone}
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <p className="text-sm font-medium text-gray-700">Please provide:</p>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="your.email@company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company *</FormLabel>
                <FormControl>
                  <Input placeholder="Your company name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="designation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Designation *</FormLabel>
                <FormControl>
                  <Input placeholder="Your role/title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Document Uploads */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Documents (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FileUploadField
                label="Visitor Photo"
                description="Upload a clear photo (JPG, PNG, JPEG)"
                accept=".jpg,.jpeg,.png,.img"
                file={photoFile}
                fieldName="photo"
                onFileChange={(file) => {
                  setPhotoFile(file);
                  handleFileChange(file, 'photo');
                }}
              />
              <FileUploadField
                label="Government ID"
                description="Upload government ID (JPG, PNG, JPEG, PDF)"
                accept=".jpg,.jpeg,.png,.img,.pdf"
                file={govIdFile}
                fieldName="governmentIdDocument"
                onFileChange={(file) => {
                  setGovIdFile(file);
                  handleFileChange(file, 'governmentIdDocument');
                }}
              />
              <FileUploadField
                label="Office ID"
                description="Upload office ID (JPG, PNG, JPEG, PDF)"
                accept=".jpg,.jpeg,.png,.img,.pdf"
                file={officeIdFile}
                fieldName="officeIdDocument"
                onFileChange={(file) => {
                  setOfficeIdFile(file);
                  handleFileChange(file, 'officeIdDocument');
                }}
              />
            </div>
          </div>

          {/* Optional Fields Collapsible */}
          <Collapsible
            open={isOptionalOpen}
            onOpenChange={setIsOptionalOpen}
            className="border rounded-lg"
          >
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full flex items-center justify-between p-4"
              >
                <span className="text-gray-600">Additional Details (Optional)</span>
                {isOptionalOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 pt-0 space-y-4">
              <FormField
                control={form.control}
                name="middleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Middle Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Middle name" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alternatePhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alternate Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Alternate phone number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alternateEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alternate Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="alternate@email.com"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyWebsite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.company.com" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Your address" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reportingManagerName"
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
                control={form.control}
                name="reportingManagerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reporting Manager Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Manager's phone" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button type="button" variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save & Continue
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default CompleteProfilePrompt;
