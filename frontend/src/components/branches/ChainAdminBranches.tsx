'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import useSWR from 'swr';
import { z } from 'zod';

// API Services
import { BranchService } from '@/lib/services/branchService';
import { UserService } from '@/lib/services/userService';

// Schemas and Types
import {
  BranchSchema,
  User,
  Branch,
  UserFormSchema,
} from '@/lib/schema/schema';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  Plus,
  Pencil,
  UserPlus,
  Mail,
  Phone,
  UserX,
  Building,
} from 'lucide-react';
import Image from 'next/image';
import { GitBranch as GitBranchIcon } from 'lucide-react';

// Define a user type specific to this component's needs
type ChainAdminUser = {
  hospitalChainId: string;
  // include other user properties if needed
};

const CreateBranchWithAdminSchema = BranchSchema.extend({
  createAdmin: z.boolean().default(false),
  adminName: z.string().optional(),
  adminEmail: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().email({ message: 'Invalid email address.' }).optional(),
  ),
  adminPhone: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().length(10, { message: 'Phone must be 10 digits.' }).optional(),
  ),
}).refine(
  (data) =>
    !data.createAdmin ||
    (!!data.adminName && !!data.adminEmail && !!data.adminPhone),
  {
    message: 'Admin details are required when the box is checked.',
    path: ['adminName'],
  },
);
type CreateBranchWithAdminData = z.infer<typeof CreateBranchWithAdminSchema>;

const addAdminFormSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email(),
  phone: z.string().length(10),
});
type AddAdminFormData = z.infer<typeof addAdminFormSchema>;

//================================================================//
// CHILD COMPONENT: Dialog to add a new Branch Admin              //
//================================================================//
const AddBranchAdminDialog = ({
  open,
  onOpenChange,
  branch,
  onAdminAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch;
  onAdminAdded: () => void;
}) => {
  const form = useForm<AddAdminFormData>({
    resolver: zodResolver(addAdminFormSchema),
    defaultValues: { name: '', email: '', phone: '' },
  });

  const onSubmit = async (data: AddAdminFormData) => {
    try {
      const payload: z.infer<typeof UserFormSchema> = {
        ...data,
        role: 'BRANCH_ADMIN',
        hospitalChainId: branch.hospitalChainId,
        branchId: branch.id,
      };
      await UserService.create(payload);
      toast.success(`Admin '${data.name}' added to ${branch.name}!`);
      onAdminAdded();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error('Failed to add branch admin.');
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Admin to {branch.name}</DialogTitle>
          <DialogDescription>
            This user will have administrative privileges over this specific
            branch.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
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
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="cursor-pointer"
              >
                {form.formState.isSubmitting ? 'Adding...' : 'Add Admin'}
                <ArrowRight />
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

//================================================================//
// CHILD COMPONENT: The main "View/Manage" Dialog for a Branch    //
//================================================================//
const ManageBranchDialog = ({
  open,
  onOpenChange,
  branch,
  allAdmins,
  isLoadingAdmins,
  onAdminAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch | null;
  allAdmins: User[] | undefined;
  isLoadingAdmins: boolean;
  onAdminAdded: () => void;
}) => {
  const [isAddAdminOpen, setAddAdminOpen] = useState(false);

  const filteredAdmins = useMemo(() => {
    if (!allAdmins || !branch) return [];
    return allAdmins.filter((admin) => admin.branchId === branch.id);
  }, [allAdmins, branch]);

  if (!branch) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90vw] sm:max-w-lg md:max-w-2xl lg:max-w-2xl rounded-lg max-h-[70vh] md:h-[450px] flex flex-col">
          <DialogHeader>
            <DialogTitle>{branch.name}</DialogTitle>
            <DialogDescription>
              Branch of {branch.hospitalChain?.name || 'your chain'}. View
              details and manage administrators.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto -mr-6 pr-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details" className="cursor-pointer">
                  Branch Details
                </TabsTrigger>
                <TabsTrigger value="admins" className="cursor-pointer">
                  Manage Admins
                </TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-sm">
                  <div>
                    <p className="font-semibold text-slate-500 text-xs">
                      Phone
                    </p>
                    <p>{branch.phone}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500 text-xs">
                      Email
                    </p>
                    <p>{branch.email}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="font-semibold text-slate-500 text-xs">
                      Street
                    </p>
                    <p>{branch.street}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500 text-xs">City</p>
                    <p>{branch.city}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500 text-xs">
                      State
                    </p>
                    <p>{branch.state}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500 text-xs">
                      PIN Code
                    </p>
                    <p>{branch.pinCode}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500 text-xs">
                      Country
                    </p>
                    <p>{branch.country}</p>
                  </div>
                </div>
                {/* QR Code Section */}
                {branch.qrCode && (
                  <div className="flex flex-col items-center gap-2 mt-6">
                    <p className="font-semibold text-slate-500 text-xs mb-1">
                      Branch QR Code
                    </p>
                    <Image
                      src={branch.qrCode}
                      alt="Branch QR Code"
                      width={180}
                      height={180}
                      className="border rounded bg-white"
                    />
                    <Button
                      variant="default"
                      className="mt-2 cursor-pointer"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = branch.qrCode!;
                        link.download = `${branch.name}-qrcode.png`;
                        link.click();
                      }}
                    >
                      Download QR Code
                    </Button>
                  </div>
                )}
                <DialogFooter className="pt-4">
                  <Button variant="outline" className="cursor-pointer">
                    <Pencil className="mr-2 h-4 w-4" /> Edit Details
                  </Button>
                </DialogFooter>
              </TabsContent>
              <TabsContent value="admins" className="mt-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                  <p className="text-sm text-muted-foreground text-center sm:text-left">
                    Administrators assigned to this branch.
                  </p>
                  <Button
                    onClick={() => setAddAdminOpen(true)}
                    className="w-full sm:w-auto cursor-pointer"
                  >
                    <UserPlus className="mr-2 h-4 w-4" /> Add New Admin
                  </Button>
                </div>
                <div className="space-y-4">
                  {isLoadingAdmins ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="border rounded-lg p-4">
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ))
                  ) : filteredAdmins.length > 0 ? (
                    filteredAdmins.map((admin) => (
                      <div
                        key={admin.id}
                        className="border rounded-lg p-3 text-sm space-y-2"
                      >
                        <div className="flex justify-between items-center font-semibold">
                          <p>{admin.name}</p>
                          <Badge
                            variant={admin.isActive ? 'default' : 'destructive'}
                          >
                            {admin.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <span>{admin.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            <span>{admin.phone}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-10 border rounded-lg flex flex-col items-center justify-center gap-4">
                      <UserX className="h-10 w-10 text-muted-foreground/50" />
                      <div className="space-y-1">
                        <p className="font-semibold">No Administrators Found</p>
                        <p className="text-sm">
                          Click &apos;Add New Admin&apos; to assign one to this
                          branch.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
      {branch && (
        <AddBranchAdminDialog
          open={isAddAdminOpen}
          onOpenChange={setAddAdminOpen}
          branch={branch}
          onAdminAdded={onAdminAdded}
        />
      )}
    </>
  );
};

//================================================================//
// MAIN PAGE COMPONENT                                            //
//================================================================//
export function ChainAdminBranches({ user }: { user: ChainAdminUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('name');
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const chainId = user.hospitalChainId;

  const {
    data: branches,
    isLoading: isLoadingBranches,
    mutate: mutateBranches,
  } = useSWR<Branch[]>(chainId ? `/api/chain/${chainId}/branches` : null, () =>
    BranchService.getAll(chainId),
  );

  const {
    data: allBranchAdmins,
    isLoading: isLoadingAdmins,
    mutate: mutateAdmins,
  } = useSWR<User[]>(
    chainId ? `/api/users?role=BRANCH_ADMIN&chainId=${chainId}` : null,
    () => UserService.getAll({ role: 'BRANCH_ADMIN' }),
  );

  const form = useForm({
    resolver: zodResolver(CreateBranchWithAdminSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      pinCode: '',
      country: '',
      createAdmin: false,
      adminName: '',
      adminEmail: '',
      adminPhone: '',
    },
  });
  const watchCreateAdmin = form.watch('createAdmin');

  const filteredBranches = useMemo(() => {
    if (!branches) return [];
    const query = searchQuery.toLowerCase();
    if (!query) return branches;
    return branches.filter((branch) => {
      switch (searchFilter) {
        case 'name':
          return branch.name.toLowerCase().includes(query);
        case 'city':
          return branch.city.toLowerCase().includes(query);
        case 'phone':
          return branch.phone.includes(query);
        case 'pinCode':
          return branch.pinCode.includes(query);
        default:
          return branch.name.toLowerCase().includes(query);
      }
    });
  }, [branches, searchQuery, searchFilter]);

  const onSubmit = async (data: CreateBranchWithAdminData) => {
    const { adminName, adminEmail, adminPhone, createAdmin, ...branchData } =
      data;
    try {
      const newBranch = await BranchService.create(chainId, branchData);
      toast.success(`Branch '${newBranch.name}' created successfully!`);

      if (createAdmin) {
        toast.info('Creating initial branch admin...');
        const payload: z.infer<typeof UserFormSchema> = {
          name: adminName!,
          email: adminEmail!,
          phone: adminPhone!,
          role: 'BRANCH_ADMIN',
          hospitalChainId: chainId,
          branchId: newBranch.id,
        };
        await UserService.create(payload);
        toast.success('Initial branch admin created!');
        await mutateAdmins();
      }

      await mutateBranches();
      form.reset();
      setAddDialogOpen(false);
    } catch (error: unknown) {
      if (error instanceof Error) {
        // If it's an Axios error or similar, you can narrow further:
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        toast.error(axiosError.response?.data?.message || error.message);
      } else {
        toast.error('Failed to add branch.');
      }
      console.error(error);
    }
  };

  return (
    <>
      <div className="space-y-6 p-4 md:p-6 lg:p-8 pb-4 lg:pb-8 w-full min-h-screen max-w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
              <GitBranchIcon className="h-6 w-6 text-white" />
            </div>
            Manage Branches
          </h1>
          <p className="text-slate-600 text-base md:text-lg">
            Manage all branches within your hospital chain
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Input
              placeholder={`Search by ${searchFilter}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64"
            />
            <Select value={searchFilter} onValueChange={setSearchFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Branch Name</SelectItem>
                <SelectItem value="city">City</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="pinCode">PIN Code</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto cursor-pointer">
                <Plus className="mr-2 h-4 w-4" /> Add New Branch
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Branch</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new branch in your chain.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[48vh] overflow-y-auto -mr-6 pr-6 mt-4">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Branch Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Downtown General"
                                {...field}
                              />
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
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="e.g., contact@branch.com"
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
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="e.g., 1234567890"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="street"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 123 Main St"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Metropolis"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., California"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pinCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PIN Code</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 90210" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., USA" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="space-y-4 rounded-md border p-4">
                      <FormField
                        control={form.control}
                        name="createAdmin"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Create an initial branch administrator
                              </FormLabel>
                              <DialogDescription className="text-xs">
                                Optional: Create a primary admin for this branch
                                now.
                              </DialogDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      {watchCreateAdmin && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          <FormField
                            control={form.control}
                            name="adminName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Admin Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="adminPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Admin Phone</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    value={
                                      typeof field.value === 'string'
                                        ? field.value
                                        : ''
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="adminEmail"
                            render={({ field }) => (
                              <FormItem className="sm:col-span-2">
                                <FormLabel>Admin Email</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    value={
                                      typeof field.value === 'string'
                                        ? field.value
                                        : ''
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                    <DialogFooter className="pt-4 sticky bottom-0 bg-background py-4 -mx-1 px-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          form.reset();
                          setAddDialogOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={form.formState.isSubmitting}
                        className="cursor-pointer"
                      >
                        {form.formState.isSubmitting
                          ? 'Saving...'
                          : 'Save Branch'}{' '}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoadingBranches ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* Responsive Desktop Table View */}
            <div className="rounded-md border hidden md:block overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[5%]">Sl.No</TableHead>
                    <TableHead className="w-[25%]">Branch</TableHead>
                    <TableHead className="w-[40%]">Address</TableHead>
                    <TableHead className="w-[30%]">Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBranches.length > 0 ? (
                    filteredBranches.map((branch, index) => (
                      <TableRow
                        key={branch.id}
                        onClick={() => setSelectedBranch(branch)}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium truncate">
                              {branch.name}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {branch.city}, {branch.state}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="truncate">{branch.street}</span>
                            <span className="text-xs text-muted-foreground">
                              {branch.pinCode}, {branch.country}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="truncate">{branch.email}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {branch.phone}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <Building className="h-10 w-10 text-muted-foreground/50" />
                          <div>
                            <p className="font-semibold">No Branches Found</p>
                            <p className="text-sm">
                              Click &apos;+ Add New Branch&apos; to create one
                              for your chain.
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="space-y-4 md:hidden">
              {filteredBranches.length > 0 ? (
                filteredBranches.map((branch) => (
                  <div
                    key={branch.id}
                    className="border rounded-lg p-4 text-sm space-y-2 cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedBranch(branch)}
                  >
                    <p className="font-semibold text-base">{branch.name}</p>
                    <div className="border-t my-2"></div>
                    <div className="text-muted-foreground space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <Building className="h-3 w-3 mt-0.5" />
                        <span>{`${branch.street}, ${branch.city}, ${branch.state} - ${branch.pinCode}`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span>{branch.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{branch.phone}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-10 border rounded-lg flex flex-col items-center justify-center gap-4 h-64">
                  <Building className="h-10 w-10 text-muted-foreground/50" />
                  <div>
                    <p className="font-semibold">No Branches Found</p>
                    <p className="text-sm">
                      Click &apos;+ Add New Branch&apos; to create one for your
                      chain.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ManageBranchDialog
        open={!!selectedBranch}
        onOpenChange={(open) => !open && setSelectedBranch(null)}
        branch={selectedBranch}
        allAdmins={allBranchAdmins}
        isLoadingAdmins={isLoadingAdmins}
        onAdminAdded={mutateAdmins}
      />
    </>
  );
}
