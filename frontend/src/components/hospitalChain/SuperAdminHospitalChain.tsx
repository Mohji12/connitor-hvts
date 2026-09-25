'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import useSWR from 'swr';
import { z } from 'zod';

// API Services
import { HospitalChainService } from '@/lib/services/hospitalChainService';
import { UserService } from '@/lib/services/userService';

// Schemas and Types
import {
  HospitalChainSchema,
  User,
  HospitalChain,
  HospitalChainFormData,
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Pencil,
  ArrowRight,
  UserPlus,
  Mail,
  Phone,
  UserX,
  Hospital,
  Building2,
} from 'lucide-react';

// Form Schema for the "Add Chain with Admin" modal
const CreateChainWithAdminSchema = HospitalChainSchema.extend({
  createAdmin: z.boolean().default(false),
  adminName: z.string().optional(),
  adminEmail: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().email({ message: 'Invalid email format.' }).optional(),
  ),
  adminPhone: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().length(10, { message: 'Phone must be 10 digits.' }).optional(),
  ),
}).refine(
  (data) => {
    if (data.createAdmin) {
      return !!data.adminName && !!data.adminEmail && !!data.adminPhone;
    }
    return true;
  },
  {
    message: 'Admin details are required when the box is checked.',
    path: ['adminName'],
  },
);
type CreateChainWithAdminData = z.infer<typeof CreateChainWithAdminSchema>;

//================================================================//
// CHILD COMPONENT: Dialog to add a new admin to an *existing* chain //
//================================================================//
const AddChainAdminDialog = ({
  open,
  onOpenChange,
  hospitalChain,
  onAdminAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitalChain: HospitalChain;
  onAdminAdded: () => void;
}) => {
  const form = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string().min(1, 'Name is required.'),
        email: z.string().email(),
        phone: z.string().length(10),
      }),
    ),
    defaultValues: { name: '', email: '', phone: '' },
  });

  const onSubmit = async (data: {
    name: string;
    email: string;
    phone: string;
  }) => {
    try {
      await UserService.create({
        ...data,
        role: 'CHAIN_ADMIN',
        hospitalChainId: hospitalChain.id,
      });
      toast.success(`Admin '${data.name}' added to ${hospitalChain.name}!`);
      onAdminAdded();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error('Failed to add admin.');
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Admin to {hospitalChain.name}</DialogTitle>
          <DialogDescription>
            This user will have administrative privileges over this entire
            hospital chain.
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
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
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
                {form.formState.isSubmitting ? 'Adding...' : 'Add Admin'}
                <ArrowRight />{' '}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

//================================================================//
// CHILD COMPONENT: The main "View/Manage" Dialog with Tabs       //
//================================================================//
const ManageChainDialog = ({
  open,
  onOpenChange,
  chain,
  allAdmins,
  isLoadingAdmins,
  onAdminAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chain: HospitalChain | null;
  allAdmins: User[] | undefined;
  isLoadingAdmins: boolean;
  onAdminAdded: () => void;
}) => {
  const [isAddAdminOpen, setAddAdminOpen] = useState(false);

  const filteredAdmins = useMemo(() => {
    if (!allAdmins || !chain) return [];
    return allAdmins.filter((admin) => admin.hospitalChainId === chain.id);
  }, [allAdmins, chain]);

  if (!chain) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90vw] sm:max-w-lg md:max-w-2xl lg:max-w-2xl rounded-lg max-h-[70vh] md:h-[450px] flex flex-col">
          <DialogHeader>
            <DialogTitle>{chain.name}</DialogTitle>
            <DialogDescription>
              View details and manage administrators for this chain.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto -mr-6 pr-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2 ">
                <TabsTrigger value="details" className="cursor-pointer">
                  Chain Details
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
                    <p>{chain.phone}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500 text-xs">
                      Email
                    </p>
                    <p>{chain.email}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="font-semibold text-slate-500 text-xs">
                      Street
                    </p>
                    <p>{chain.street}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500 text-xs">City</p>
                    <p>{chain.city}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500 text-xs">
                      State
                    </p>
                    <p>{chain.state}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500 text-xs">
                      PIN Code
                    </p>
                    <p>{chain.pinCode}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500 text-xs">
                      Country
                    </p>
                    <p>{chain.country}</p>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button variant="outline" className="cursor-pointer">
                    <Pencil className="mr-2 h-4 w-4" /> Edit Details
                  </Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="admins" className="mt-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                  <p className="text-sm text-muted-foreground text-center sm:text-left">
                    Administrators assigned to this chain.
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
                          Hospital Chain.
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
      <AddChainAdminDialog
        open={isAddAdminOpen}
        onOpenChange={setAddAdminOpen}
        hospitalChain={chain}
        onAdminAdded={onAdminAdded}
      />
    </>
  );
};

//================================================================//
// MAIN COMPONENT: The page orchestrator                          //
//================================================================//
export default function SuperAdminHospitalChain() {
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isManageModalOpen, setManageModalOpen] = useState(false);
  const [selectedChain, setSelectedChain] = useState<HospitalChain | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: chains,
    isLoading: isLoadingChains,
    mutate: mutateChains,
  } = useSWR<HospitalChain[]>(
    '/api/hospital-chains',
    HospitalChainService.getAll,
  );
  const {
    data: allChainAdmins,
    isLoading: isLoadingAdmins,
    mutate: mutateAdmins,
  } = useSWR<User[]>('/api/users?role=CHAIN_ADMIN', () =>
    UserService.getAll({ role: 'CHAIN_ADMIN' }),
  );

  const form = useForm({
    resolver: zodResolver(CreateChainWithAdminSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
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

  const handleRowClick = (chain: HospitalChain) => {
    setSelectedChain(chain);
    setManageModalOpen(true);
  };

  const onSubmit = async (data: CreateChainWithAdminData) => {
    try {
      const chainData: HospitalChainFormData = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        street: data.street,
        city: data.city,
        state: data.state,
        pinCode: data.pinCode,
        country: data.country,
      };
      const newChain = await HospitalChainService.create(chainData);
      toast.success(`Hospital chain '${newChain.name}' added successfully!`);

      if (data.createAdmin) {
        toast.info('Creating initial chain admin...');
        await UserService.create({
          name: data.adminName!,
          email: data.adminEmail!,
          phone: data.adminPhone!,
          role: 'CHAIN_ADMIN',
          hospitalChainId: newChain.id,
        });
        toast.success('Initial chain admin created successfully!');
        await mutateAdmins();
      }

      await mutateChains();
      setAddModalOpen(false);
      form.reset();
    } catch (error) {
      let errorMessage = 'Failed to add hospital chain.';
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (
          error as { response?: { data?: { message?: string } } }
        ).response;
        if (response?.data?.message) {
          errorMessage = response.data.message;
        }
      }
      toast.error(errorMessage);
      console.error('Failed to add hospital chain:', error);
    }
  };

  const filteredChains = useMemo(() => {
    if (!chains) return [];
    return chains.filter(
      (chain) =>
        chain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chain.phone.includes(searchQuery),
    );
  }, [chains, searchQuery]);

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-4 lg:pb-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          Hospital Chains
        </h1>
        <p className="text-slate-600 text-base md:text-lg">
          Manage all hospital chains in the system
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <Input
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Button
          onClick={() => setAddModalOpen(true)}
          className="w-full sm:w-auto cursor-pointer"
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Chain
        </Button>
      </div>

      {/* Desktop Table View (hidden on mobile) */}
      <div className="rounded-md border hidden md:block overflow-x-auto max-w-full">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[5%]">#</TableHead>
              <TableHead className="w-[20%]">Name</TableHead>
              <TableHead className="w-[30%]">Address</TableHead>
              <TableHead className="w-[20%]">Phone</TableHead>
              <TableHead className="w-[25%]">Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingChains ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredChains.length > 0 ? (
              filteredChains.map((chain, index) => (
                <TableRow
                  key={chain.id}
                  onClick={() => handleRowClick(chain)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="truncate font-medium" title={chain.name}>
                      {chain.name}
                    </div>
                    <div
                      className="text-xs text-muted-foreground truncate"
                      title={`${chain.city}, ${chain.state}`}
                    >
                      {chain.city}, {chain.state}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="truncate" title={chain.street}>
                      {chain.street}
                    </div>
                    <div
                      className="text-xs text-muted-foreground truncate"
                      title={`${chain.pinCode}, ${chain.country}`}
                    >
                      {chain.pinCode}, {chain.country}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="truncate" title={chain.phone}>
                      {chain.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="truncate" title={chain.email}>
                      {chain.email}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  <div className="text-center text-muted-foreground py-10 border rounded-lg flex flex-col items-center justify-center gap-4">
                    <Hospital className="h-10 w-10 text-muted-foreground/50" />
                    <div className="space-y-1">
                      <p className="font-semibold">No Hospital Chain Found</p>
                      <p className="text-sm">
                        Click &apos;+ Add New Chain&apos; to assign one new
                        Hospital Chain.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View (visible only on mobile) */}
      <div className="block md:hidden space-y-2">
        {isLoadingChains ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 shadow-sm">
              <Skeleton className="h-20 w-full" />
            </div>
          ))
        ) : filteredChains.length > 0 ? (
          filteredChains.map((chain) => (
            <div
              key={chain.id}
              className="border rounded-lg p-4 shadow-sm cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(chain)}
            >
              <div className="font-semibold mb-1">{chain.name}</div>

              <div className="text-sm mb-1">{chain.phone}</div>
              <div className="text-sm text-muted-foreground mb-1">
                {chain.email}
              </div>
              <div className="text-xs text-muted-foreground">
                {`${chain.street}, ${chain.city}, ${chain.state}`}
              </div>
            </div>
          ))
        ) : (
          <div className="border rounded-lg p-6 shadow-sm flex flex-col items-center justify-center text-center text-muted-foreground gap-4">
            <Hospital className="h-10 w-10 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="font-semibold">No Hospital Chain Found</p>
              <p className="text-sm">
                Click &apos;+ Add New Chain&apos; to assign one new Hospital
                Chain.
              </p>
            </div>
          </div>
        )}
      </div>

      <ManageChainDialog
        open={isManageModalOpen}
        onOpenChange={setManageModalOpen}
        chain={selectedChain}
        allAdmins={allChainAdmins}
        isLoadingAdmins={isLoadingAdmins}
        onAdminAdded={mutateAdmins}
      />

      <Dialog open={isAddModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Hospital Chain</DialogTitle>
            <DialogDescription>
              Enter the details below to create a new hospital chain.
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
                        <FormLabel>Chain Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>Street</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Input {...field} />
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
                          <Input {...field} />
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
                          <Input {...field} />
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
                          <Input {...field} />
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
                            Create an initial chain administrator
                          </FormLabel>
                          <DialogDescription className="text-xs">
                            Optional: Create a primary admin user for this chain
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
                      setAddModalOpen(false);
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
                    {form.formState.isSubmitting ? 'Saving...' : 'Save Chain'}{' '}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
