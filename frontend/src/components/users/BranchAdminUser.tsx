'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import useSWR from 'swr';
import { z } from 'zod';

// API Services
import { UserService } from '@/lib/services/userService';

// Schemas and Types
import {
  User,
  UserFormSchema,
  Departments,
  UserTypes,
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowRight, MoreHorizontal, Plus, UserPlus } from 'lucide-react';

type BranchAdminUserProps = {
  user: {
    hospitalChainId: string;
    branchId: string;
  };
};

// Helper function to format enum values for display in the dropdown
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
  loggedInUser,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit: User | null;
  onUserSaved: () => void;
  loggedInUser: BranchAdminUserProps['user'];
}) => {
  const form = useForm<z.infer<typeof UserFormSchema>>({
    resolver: zodResolver(UserFormSchema),
    // UPDATE: Default values for dropdowns should be undefined
    defaultValues: {
      hospitalChainId: loggedInUser.hospitalChainId,
      branchId: loggedInUser.branchId,
      name: '',
      email: '',
      phone: '',
      role: undefined,
      department: undefined,
      userType: undefined,
      location: '',
    },
  });

  const watchRole = form.watch('role');
  const isEditMode = !!userToEdit;

  useEffect(() => {
    if (!open) return;

    if (isEditMode && userToEdit) {
      // Use a switch statement to help TypeScript narrow the type for the discriminated union
      switch (userToEdit.role) {
        case 'STAFF':
          form.reset({
            role: 'STAFF',
            name: userToEdit.name,
            email: userToEdit.email,
            phone: userToEdit.phone,
            hospitalChainId: userToEdit.hospitalChainId!,
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
            hospitalChainId: userToEdit.hospitalChainId!,
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
            hospitalChainId: userToEdit.hospitalChainId!,
            branchId: userToEdit.branchId!,
            location: userToEdit.location ?? '',
          });
          break;
        default:
          // Handle other roles or do nothing if a branch admin shouldn't edit them
          break;
      }
    } else {
      // In create mode, reset to a clean state with pre-filled IDs
      form.reset({
        name: '',
        email: '',
        phone: '',
        role: undefined,
        hospitalChainId: loggedInUser.hospitalChainId,
        branchId: loggedInUser.branchId,
        department: undefined,
        userType: undefined,
        location: '',
      });
    }
  }, [userToEdit, open, form, loggedInUser, isEditMode]);

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
            Fill in the details for the user. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto -mr-6 pr-6 mt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter user's full name" {...field} />
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
                        <Input
                          type="email"
                          placeholder="user@example.com"
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
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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

              {watchRole === 'STAFF' && (
                <div className="space-y-4 pt-4 border-t mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* START: UPDATED DEPARTMENT DROPDOWN */}
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
                    {/* END: UPDATED DEPARTMENT DROPDOWN */}

                    {/* START: UPDATED USER TYPE DROPDOWN */}
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
                    {/* END: UPDATED USER TYPE DROPDOWN */}
                  </div>
                </div>
              )}

              {watchRole === 'STAFF' && (
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location / Room No.</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Front Gate, Ward 5"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(watchRole === 'SECURITY' ||
                watchRole === 'SECURITY_SUPERVISOR') && (
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location / Room No. (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Front Gate, Ward 5"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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

//================================================================//
// CHILD COMPONENT: Dialog for deactivation confirmation          //
//================================================================//
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
}: {
  users: User[];
  isLoading: boolean;
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
}) => {
  return (
    <div>
      {/* Desktop Table View */}
      <div className="border rounded-lg hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">{user.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'destructive'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeactivate(user)}
                          className="text-destructive"
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
                <TableCell colSpan={5} className="h-64 text-center">
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

      {/* Mobile Card View */}
      <div className="space-y-4 md:hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-20 w-full" />
            </div>
          ))
        ) : users.length > 0 ? (
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
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDeactivate(user)}
                      className="text-destructive"
                    >
                      Deactivate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="border-t my-2"></div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Role:</span>
                <Badge variant="outline" className="text-xs">
                  {user.role}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-xs mt-2">
                <span className="text-muted-foreground">Status:</span>
                <Badge
                  variant={user.isActive ? 'default' : 'destructive'}
                  className="h-5"
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <div className="border rounded-lg h-64 flex flex-col items-center justify-center gap-4 text-center">
            <UserPlus className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <p className="font-semibold">No Users Assigned Yet</p>
              <p className="text-sm text-muted-foreground">
                Click the &apos;+ Add User&apos; button to assign a new user.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

//================================================================//
// MAIN PAGE COMPONENT                                            //
//================================================================//
export function BranchAdminUser({ user }: BranchAdminUserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);

  // Define the correct type for the filter object
  type UserFilter = {
    hospitalChainId: string;
    branchId: string;
    role?: string;
    isActive?: boolean;
    department?: string;
  };

  const {
    data: users,
    isLoading: isLoadingUsers,
    mutate: mutateUsers,
  } = useSWR<User[]>(
    `/api/users?chainId=${user.hospitalChainId}&branchId=${user.branchId}`,
    () =>
      UserService.getAll({
        hospitalChainId: user.hospitalChainId,
        branchId: user.branchId,
      } as UserFilter),
  );

  const handleEdit = (user: User) => {
    setUserToEdit(user);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setUserToEdit(null);
    setDialogOpen(true);
  };

  const handleDeactivateRequest = (user: User) => {
    setUserToDeactivate(user);
  };

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
    if (!users) return [];

    // Branch Admins should not see other admins, only staff-level users
    let filtered = users.filter((user) =>
      ['STAFF', 'SECURITY', 'SECURITY_SUPERVISOR'].includes(user.role),
    );

    if (searchQuery) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.phone.includes(searchQuery),
      );
    }
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }
    return filtered;
  }, [users, searchQuery, roleFilter]);

  return (
    <>
      <div className="space-y-6 p-4 md:p-6 lg:p-8 pb-4 lg:pb-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              Branch User Management
            </h1>
            <p className="text-slate-600 text-base md:text-lg">
              Manage all staff and security users within your branch
            </p>
          </div>
          <Button
            onClick={handleAddNew}
            className="w-full md:w-auto cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>

        {/* Filters and Table */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:max-w-xs"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="STAFF">Staff</SelectItem>
                <SelectItem value="SECURITY_SUPERVISOR">
                  Security Supervisor
                </SelectItem>
                <SelectItem value="SECURITY">Security</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <UsersTable
            users={filteredUsers}
            isLoading={isLoadingUsers}
            onEdit={handleEdit}
            onDeactivate={handleDeactivateRequest}
          />
        </div>
      </div>

      <AddEditUserDialog
        open={isDialogOpen}
        onOpenChange={setDialogOpen}
        userToEdit={userToEdit}
        onUserSaved={mutateUsers}
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
