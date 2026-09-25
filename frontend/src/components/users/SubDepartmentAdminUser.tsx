'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import useSWR from 'swr';
import { z } from 'zod';
import { UserService } from '@/lib/services/userService';
import { User, UserFormSchema, Departments, UserTypes } from '@/lib/schema/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdminUserRowActions } from './AdminUserRowActions';

type Props = {
  user: {
    hospitalChainId: string;
    branchId: string;
    departmentId: string;
    subDepartmentId: string;
  };
};

const formatEnum = (v: string) =>
  v.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

function AddEditStaffDialog({
  open,
  onOpenChange,
  onSaved,
  scope,
  userToEdit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
  scope: Props['user'];
  userToEdit: User | null;
}) {
  const form = useForm<z.infer<typeof UserFormSchema> & { password?: string }>({
    resolver: zodResolver(UserFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      hospitalChainId: scope.hospitalChainId,
      branchId: scope.branchId,
      departmentId: scope.departmentId,
      subDepartmentId: scope.subDepartmentId,
    },
  });
  const watchRole = form.watch('role');
  const isEditMode = !!userToEdit;

  useEffect(() => {
    if (!open) return;
    if (isEditMode && userToEdit) {
      form.reset({
        name: userToEdit.name,
        email: userToEdit.email,
        phone: userToEdit.phone,
        role: userToEdit.role,
        hospitalChainId: scope.hospitalChainId,
        branchId: scope.branchId,
        departmentId: scope.departmentId,
        subDepartmentId: scope.subDepartmentId,
        userType: userToEdit.userType ?? undefined,
        department: userToEdit.department ?? undefined,
        location: userToEdit.location ?? '',
      } as z.infer<typeof UserFormSchema>);
      return;
    }
    form.reset({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: undefined,
      hospitalChainId: scope.hospitalChainId,
      branchId: scope.branchId,
      departmentId: scope.departmentId,
      subDepartmentId: scope.subDepartmentId,
    });
  }, [open, form, scope, isEditMode, userToEdit]);

  const onSubmit = async (data: z.infer<typeof UserFormSchema>) => {
    try {
      if (isEditMode && userToEdit) {
        await UserService.update(userToEdit.id, data);
        toast.success('Staff member updated');
      } else {
        const password = (data as z.infer<typeof UserFormSchema> & { password?: string }).password;
        if (!password || password.length < 8) {
          form.setError('password' as 'name', { message: 'Password must be at least 8 characters.' });
          return;
        }
        const result = await UserService.create({ ...data, password });
        if (result.credentialsEmailSent) {
          toast.success(`Staff member created. Login credentials sent to ${data.email}.`);
        } else {
          toast.warning(
            result.emailWarning ??
              'User created, but the credentials email could not be sent.',
          );
        }
      }
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save user');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update doctor, nurse, or security in your section.'
              : 'Create doctor, nurse, or security for your section.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Login ID (Email)</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            {!isEditMode && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" placeholder="Min. 8 characters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isEditMode}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="SECURITY">Security</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            {watchRole === 'STAFF' && (
              <>
                <FormField control={form.control} name="userType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {UserTypes.map((t) => (
                          <SelectItem key={t} value={t}>{formatEnum(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="department" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clinical Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Departments.map((d) => (
                          <SelectItem key={d} value={d}>{formatEnum(d)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
              </>
            )}
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function SubDepartmentAdminUser({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const { data: users, isLoading, mutate } = useSWR<User[]>(
    `/api/users/subdept-${user.subDepartmentId}`,
    () => UserService.getAll({ subDepartmentId: user.subDepartmentId })
  );

  const staff = useMemo(
    () => users?.filter((u) => ['STAFF', 'SECURITY', 'SECURITY_SUPERVISOR'].includes(u.role)) ?? [],
    [users]
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Section Staff Management
          </h1>
          <p className="text-muted-foreground">Manage staff in your sub-department</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Staff</Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5}><Skeleton className="h-8" /></TableCell></TableRow>
            ) : staff.length ? (
              staff.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell><div className="text-sm">{u.email}</div><div className="text-xs text-muted-foreground">{u.phone}</div></TableCell>
                  <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                  <TableCell><Badge>{u.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <AdminUserRowActions
                      user={u}
                      onEdit={(target) => { setUserToEdit(target); setOpen(true); }}
                      onDeactivate={setUserToDeactivate}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No staff yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <AddEditStaffDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setUserToEdit(null);
        }}
        onSaved={() => mutate()}
        scope={user}
        userToEdit={userToEdit}
      />
      <AlertDialog
        open={!!userToDeactivate}
        onOpenChange={(o) => { if (!o) setUserToDeactivate(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate {userToDeactivate?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!userToDeactivate) return;
                await UserService.delete(userToDeactivate.id);
                toast.success('Staff member deactivated');
                setUserToDeactivate(null);
                mutate();
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
