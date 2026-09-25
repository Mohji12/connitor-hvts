'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import useSWR from 'swr';
import { toast } from 'sonner';
import { z } from 'zod';
import { DepartmentService, SubDepartmentService } from '@/lib/services/departmentService';
import { SubDepartmentSchema, type SubDepartment, type Department } from '@/lib/schema/schema';
import { useAuthSession } from '@/hooks/useAuthSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, GitBranch } from 'lucide-react';
import { SubDepartmentRowActions } from '@/components/departments/SubDepartmentRowActions';

type CreateSubDeptForm = z.infer<typeof SubDepartmentSchema>;

const emptySubDeptForm = {
  name: '',
  code: '',
  description: '',
  departmentId: '',
  branchId: '',
  hospitalChainId: '',
};

export default function SubDepartmentsPage() {
  const user = useAuthSession<{
    role: string;
    hospitalChainId?: string | null;
    branchId?: string | null;
    departmentId?: string | null;
  }>();
  const canCreate =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'HOSPITAL_ADMIN' ||
    user?.role === 'DEPARTMENT_ADMIN';
  const canEdit =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'HOSPITAL_ADMIN' ||
    user?.role === 'DEPARTMENT_ADMIN' ||
    user?.role === 'SUB_DEPARTMENT_ADMIN';
  const canDelete =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'HOSPITAL_ADMIN' ||
    user?.role === 'DEPARTMENT_ADMIN';
  const [open, setOpen] = React.useState(false);

  const { data: subDepartments, isLoading, mutate } = useSWR<SubDepartment[]>(
    '/api/sub-departments',
    () => SubDepartmentService.list()
  );
  const { data: departments } = useSWR<Department[]>(
    '/api/departments',
    () => DepartmentService.list()
  );

  const form = useForm<CreateSubDeptForm>({
    resolver: zodResolver(SubDepartmentSchema),
    defaultValues: emptySubDeptForm,
  });

  const isDepartmentAdmin = user?.role === 'DEPARTMENT_ADMIN';
  const lockedDepartmentId =
    (isDepartmentAdmin ? user?.departmentId : '') ||
    (isDepartmentAdmin && departments?.length === 1 ? departments[0].id : '') ||
    '';

  const availableDepartments = React.useMemo(() => {
    if (!departments) return [];
    if (isDepartmentAdmin && lockedDepartmentId) {
      return departments.filter((d) => d.id === lockedDepartmentId);
    }
    return departments;
  }, [departments, isDepartmentAdmin, lockedDepartmentId]);

  const lockedDepartmentName =
    availableDepartments.find((d) => d.id === lockedDepartmentId)?.name ??
    departments?.find((d) => d.id === lockedDepartmentId)?.name ??
    'Your department';

  const lockedDeptMeta = React.useMemo(() => {
    if (!lockedDepartmentId || !departments?.length) {
      return {
        branchId: user?.branchId ?? '',
        hospitalChainId: user?.hospitalChainId ?? '',
      };
    }
    const dept = departments.find((d) => d.id === lockedDepartmentId);
    return {
      branchId: dept?.branchId ?? user?.branchId ?? '',
      hospitalChainId: dept?.hospitalChainId ?? user?.hospitalChainId ?? '',
    };
  }, [
    lockedDepartmentId,
    departments,
    user?.branchId,
    user?.hospitalChainId,
  ]);

  const watchDept = form.watch('departmentId');

  React.useEffect(() => {
    if (!open) return;

    form.reset({
      ...emptySubDeptForm,
      departmentId: lockedDepartmentId,
      branchId: lockedDeptMeta.branchId,
      hospitalChainId: lockedDeptMeta.hospitalChainId,
    });
  }, [open, lockedDepartmentId, lockedDeptMeta.branchId, lockedDeptMeta.hospitalChainId, form]);

  React.useEffect(() => {
    if (isDepartmentAdmin || !watchDept || !departments?.length) return;

    const dept = departments.find((d) => d.id === watchDept);
    if (!dept) return;

    form.setValue('branchId', dept.branchId);
    form.setValue('hospitalChainId', dept.hospitalChainId);
  }, [watchDept, isDepartmentAdmin, departments, form]);

  const onSubmit = async (data: CreateSubDeptForm) => {
    try {
      const payload = isDepartmentAdmin
        ? {
            ...data,
            departmentId: lockedDepartmentId,
            branchId: lockedDeptMeta.branchId || data.branchId,
            hospitalChainId: lockedDeptMeta.hospitalChainId || data.hospitalChainId,
          }
        : data;

      if (!payload.departmentId) {
        toast.error('Parent department is required. Sign out and sign in again if this persists.');
        return;
      }

      await SubDepartmentService.create(payload);
      toast.success('Sub-department created');
      mutate();
      setOpen(false);
      form.reset({
        ...emptySubDeptForm,
        departmentId: lockedDepartmentId,
        branchId: lockedDeptMeta.branchId,
        hospitalChainId: lockedDeptMeta.hospitalChainId,
      });
    } catch {
      toast.error('Failed to create sub-department');
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6" /> Sub-Departments
          </h1>
          <p className="text-muted-foreground">
            Sections within a department (e.g. ICU Cardiology)
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)} disabled={isDepartmentAdmin && !lockedDepartmentId}>
            <Plus className="mr-2 h-4 w-4" /> Add Section
          </Button>
        )}
      </div>

      {isDepartmentAdmin && !lockedDepartmentId && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Your department could not be loaded. Sign out and sign in again, then retry.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!isLoading && !subDepartments?.length && (
            <p className="text-sm text-muted-foreground">No sub-departments yet.</p>
          )}
          <ul className="space-y-2">
            {subDepartments?.map((s) => (
              <li
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 gap-2"
              >
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.code}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground">
                    {departments?.find((d) => d.id === s.departmentId)?.name ?? '—'}
                  </div>
                  <SubDepartmentRowActions
                    subDepartment={s}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onChanged={() => mutate()}
                  />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sub-Department</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Department</FormLabel>
                    {isDepartmentAdmin ? (
                      <FormControl>
                        <Input
                          readOnly
                          disabled
                          value={lockedDepartmentName}
                          className="bg-muted"
                        />
                      </FormControl>
                    ) : (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableDepartments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="ICU-CARD" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
