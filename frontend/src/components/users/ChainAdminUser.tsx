'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  User,
  Branch,
  UserFormSchema,
  UserTypes,
  Departments,
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
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowRight, MoreHorizontal, Plus, UserPlus, Users } from 'lucide-react';

type ChainAdminUser = {
  hospitalChainId: string;
};

const formatEnumValue = (value: string) => {
  if (!value) return '';
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

//================================================================//
// CHILD COMPONENT: Dialog to Add or Edit a User                  //
//================================================================//
const AddEditUserDialog = ({
  open,
  onOpenChange,
  userToEdit,
  onUserSaved,
  branches,
  loggedInUser,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit: User | null;
  onUserSaved: () => void;
  branches: Branch[] | undefined;
  loggedInUser: ChainAdminUser;
}) => {
  const form = useForm<z.infer<typeof UserFormSchema>>({
    resolver: zodResolver(UserFormSchema),
    defaultValues: {
      hospitalChainId: loggedInUser.hospitalChainId,
      name: '',
      email: '',
      phone: '',
      role: undefined,
      branchId: undefined,
      userType: undefined,
      department: undefined,
      location: undefined,
    },
  });

  const watchRole = form.watch('role');
  const isEditMode = !!userToEdit;

  useEffect(() => {
    if (!open) return;

    if (isEditMode && userToEdit) {
      switch (userToEdit.role) {
        case 'BRANCH_ADMIN':
          form.reset({
            role: 'BRANCH_ADMIN',
            name: userToEdit.name,
            email: userToEdit.email,
            phone: userToEdit.phone,
            hospitalChainId: loggedInUser.hospitalChainId,
            branchId: userToEdit.branchId!,
          });
          break;
        case 'STAFF':
          form.reset({
            role: 'STAFF',
            name: userToEdit.name,
            email: userToEdit.email,
            phone: userToEdit.phone,
            hospitalChainId: loggedInUser.hospitalChainId,
            branchId: userToEdit.branchId!,
            department: userToEdit.department ?? undefined,
            userType: userToEdit.userType ?? undefined,
            location: userToEdit.location ?? '',
          });
          break;
        case 'SECURITY':
          form.reset({
            role: 'SECURITY',
            name: userToEdit.name,
            email: userToEdit.email,
            phone: userToEdit.phone,
            hospitalChainId: loggedInUser.hospitalChainId,
            branchId: userToEdit.branchId!,
            location: userToEdit.location ?? '',
          });
          break;
        case 'SECURITY_SUPERVISOR':
          form.reset({
            role: 'SECURITY_SUPERVISOR',
            name: userToEdit.name,
            email: userToEdit.email,
            phone: userToEdit.phone,
            hospitalChainId: loggedInUser.hospitalChainId,
            branchId: userToEdit.branchId!,
            location: userToEdit.location ?? '',
          });
          break;
        default:
          console.error('Unhandled role for form reset:', userToEdit.role);
          return;
      }
    } else if (!isEditMode) {
      form.reset({
        name: '',
        email: '',
        phone: '',
        role: undefined,
        hospitalChainId: loggedInUser.hospitalChainId,
        branchId: undefined,
        userType: undefined,
        department: undefined,
        location: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userToEdit, open, isEditMode, loggedInUser.hospitalChainId]);
  const onSubmit = async (data: z.infer<typeof UserFormSchema>) => {
    toast.promise(
      async () => {
        if (isEditMode && userToEdit) {
          await UserService.update(userToEdit.id, data);
        } else {
          await UserService.create(data);
        }
        onUserSaved();
        onOpenChange(false);
      },
      {
        loading: isEditMode ? 'Updating user...' : 'Creating user...',
        success: `User ${isEditMode ? 'updated' : 'created'} successfully!`,
        error: (err: unknown) => {
          if (err && typeof err === 'object' && 'message' in err) {
            return (
              (err as { message?: string }).message ||
              `Failed to ${isEditMode ? 'update' : 'create'} user.`
            );
          }
          return `Failed to ${isEditMode ? 'update' : 'create'} user.`;
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            Fill in the details below. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[48vh] overflow-y-auto -mr-6 pr-6 mt-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
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
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isEditMode}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BRANCH_ADMIN">
                            Branch Admin
                          </SelectItem>
                          <SelectItem value="STAFF">Staff</SelectItem>
                          <SelectItem value="SECURITY_SUPERVISOR">
                            Security Supervisor
                          </SelectItem>
                          <SelectItem value="SECURITY">Security</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={String(field.value ?? '')}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches?.map((branch) => (
                            <SelectItem
                              key={branch.id}
                              value={String(branch.id)}
                            >
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {(watchRole === 'STAFF' ||
                watchRole === 'SECURITY' ||
                watchRole === 'SECURITY_SUPERVISOR') && (
                <div className="space-y-4 pt-2 border-t mt-4">
                  {watchRole === 'STAFF' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a department" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
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
                        name="userType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>User Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a user type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
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
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location / Post</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <DialogFooter className="pt-4 sticky bottom-0 bg-background py-4 -mx-1 px-1">
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
                  {form.formState.isSubmitting ? 'Saving...' : 'Save User'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ✨ NEW: A dedicated dialog component for the deactivation confirmation step.
const DeactivateUserDialog = ({
  user,
  onConfirm,
  onCancel,
  open,
}: {
  user: User | null;
  onConfirm: () => void;
  onCancel: () => void;
  open: boolean;
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  if (!user) return null;

  const isConfirmationMatch = confirmationText === user.name;

  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will deactivate the user{' '}
            <span className="font-bold text-primary">{user.name}</span>. They
            will lose all access to the system.
            <br />
            <br />
            To confirm, please type the user&apos;s full name below.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={confirmationText}
          onChange={(e) => setConfirmationText(e.target.value)}
          placeholder={`Type "${user.name}" to confirm`}
        />
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setConfirmationText('');
              onCancel();
            }}
            className="cursor-pointer"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!isConfirmationMatch}
            className="bg-destructive hover:bg-destructive/90 cursor-pointer"
          >
            Deactivate User
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

//================================================================//
// CHILD COMPONENT: A reusable table to display users             //
//================================================================//
const UsersTable = ({
  users,
  isLoading,
  onEdit,
  onDeactivate,
  userType,
  branches,
}: {
  users: User[];
  isLoading: boolean;
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
  userType: 'admins' | 'staff';
  branches: Branch[] | undefined;
}) => {
  const colSpan = userType === 'staff' ? 5 : 4;

  return (
    <div>
      {/* Desktop Table View */}
      <div className="border rounded-lg hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Details</TableHead>
              <TableHead>Assigned Branch</TableHead>
              {userType === 'staff' && <TableHead>Role</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={colSpan}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="truncate max-w-[250px]">
                    <div className="font-medium truncate">{user.name}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    {branches?.find(
                      (b) => String(b.id) === String(user.branchId),
                    )?.name || 'N/A'}
                  </TableCell>
                  {userType === 'staff' && (
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'destructive'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onEdit(user)}
                          className="cursor-pointer"
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeactivate(user)}
                          className="text-destructive cursor-pointer"
                        >
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={colSpan} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <UserPlus className="h-12 w-12 text-muted-foreground/50" />
                    <div>
                      <p className="font-semibold">No Users Assigned Yet</p>
                      <p className="text-sm text-muted-foreground">
                        Click the &apos;+ Add User&apos; button to assign a new
                        user.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View (No changes here, it already handles the empty state correctly) */}
      <div className="space-y-4 md:hidden">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="border rounded-lg h-64 flex flex-col items-center justify-center gap-4 text-center">
            <UserPlus className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <p className="font-semibold">No Users Assigned Yet</p>
              <p className="text-sm text-muted-foreground">
                Click the &apos;+ Add User&apos; button to assign a new user.
              </p>
            </div>
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="border rounded-lg p-4 text-sm">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.phone}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0 cursor-pointer"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onEdit(user)}
                      className="cursor-pointer"
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDeactivate(user)}
                      className="text-destructive cursor-pointer"
                    >
                      Deactivate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="border-t my-2"></div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Branch:</span>
                  <span className="font-medium text-right">
                    {branches?.find(
                      (b) => String(b.id) === String(user.branchId),
                    )?.name || 'N/A'}
                  </span>
                </div>
                {userType === 'staff' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role:</span>
                    <Badge variant="outline" className="text-xs">
                      {user.role}
                    </Badge>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant={user.isActive ? 'default' : 'destructive'}
                    className="h-5"
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

//================================================================//
// MAIN PAGE COMPONENT                                            //
//================================================================//
export function ChainAdminUser({ user }: { user: ChainAdminUser }) {
  const [activeTab, setActiveTab] = useState('admins');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // ✨ NEW: State to manage the deactivation dialog
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);

  type UserFilter = {
    hospitalChainId: string;
    branchId?: string; // optional for chain-level queries
    role?: string;
    isActive?: boolean;
    department?: string;
  };

  const chainId = user.hospitalChainId;

  const {
    data: users,
    isLoading: isLoadingUsers,
    mutate: mutateUsers,
  } = useSWR<User[]>(chainId ? `/api/users?chainId=${chainId}` : null, () =>
    UserService.getAll({ hospitalChainId: chainId } as UserFilter),
  );

  const { data: branches } = useSWR<Branch[]>(
    chainId ? `/api/chain/${chainId}/branches` : null,
    () => BranchService.getAll(chainId),
  );

  const handleEdit = (user: User) => {
    setUserToEdit(user);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setUserToEdit(null);
    setDialogOpen(true);
  };

  // ✨ CHANGE: This now opens the confirmation dialog instead of deleting directly.
  const handleDeactivateRequest = (user: User) => {
    setUserToDeactivate(user);
  };

  // ✨ NEW: This function performs the actual deletion after confirmation.
  const handleDeactivateConfirm = () => {
    if (!userToDeactivate) return;

    toast.promise(UserService.delete(userToDeactivate.id), {
      loading: 'Deactivating user...',
      success: () => {
        mutateUsers();
        setUserToDeactivate(null); // Close the dialog
        return `User ${userToDeactivate.name} deactivated.`;
      },
      error: 'Failed to deactivate user.',
    });
  };

  const filteredUsers = useMemo(() => {
    if (!users) return { branchAdmins: [], otherUsers: [] };
    let filtered = users;
    if (searchQuery) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.phone.includes(searchQuery),
      );
    }
    if (branchFilter !== 'all') {
      filtered = filtered.filter((u) => u.branchId === String(branchFilter));
    }
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }
    const branchAdmins = filtered.filter((u) => u.role === 'BRANCH_ADMIN');
    const otherUsers = filtered.filter(
      (u) =>
        u.role === 'STAFF' ||
        u.role === 'SECURITY' ||
        u.role === 'SECURITY_SUPERVISOR',
    );
    return { branchAdmins, otherUsers };
  }, [users, searchQuery, branchFilter, roleFilter]);

  return (
    <>
      <div className="space-y-6 p-4 md:p-6 lg:p-8 pb-4 lg:pb-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                <Users className="h-6 w-6 text-white" />
              </div>
              User Management
            </h1>
            <p className="text-slate-600 text-base md:text-lg">
              Manage all users within your hospital chain
            </p>
          </div>
          <Button
            onClick={handleAddNew}
            className="w-full md:w-auto cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:max-w-xs"
          />
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches?.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="BRANCH_ADMIN">Branch Admin</SelectItem>
              <SelectItem value="STAFF">Staff</SelectItem>
              <SelectItem value="SECURITY_SUPERVISOR">
                Security Supervisor
              </SelectItem>
              <SelectItem value="SECURITY">Security</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          defaultValue="admins"
        >
          <TabsList>
            <TabsTrigger value="admins" className="cursor-pointer">
              Manage Branch Admins
            </TabsTrigger>
            <TabsTrigger value="staff" className="cursor-pointer">
              Manage Staff & Security
            </TabsTrigger>
          </TabsList>
          <TabsContent value="admins" className="mt-4">
            <UsersTable
              users={filteredUsers.branchAdmins}
              isLoading={isLoadingUsers}
              onEdit={handleEdit}
              onDeactivate={handleDeactivateRequest}
              userType="admins"
              branches={branches}
            />
          </TabsContent>
          <TabsContent value="staff" className="mt-4">
            <UsersTable
              users={filteredUsers.otherUsers}
              isLoading={isLoadingUsers}
              onEdit={handleEdit}
              onDeactivate={handleDeactivateRequest}
              userType="staff"
              branches={branches}
            />
          </TabsContent>
        </Tabs>
      </div>

      <AddEditUserDialog
        open={isDialogOpen}
        onOpenChange={setDialogOpen}
        userToEdit={userToEdit}
        onUserSaved={mutateUsers}
        branches={branches}
        loggedInUser={user}
      />

      <DeactivateUserDialog
        open={!!userToDeactivate}
        user={userToDeactivate}
        onConfirm={handleDeactivateConfirm}
        onCancel={() => setUserToDeactivate(null)}
      />
    </>
  );
}
