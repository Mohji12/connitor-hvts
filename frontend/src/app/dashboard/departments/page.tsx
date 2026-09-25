'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import useSWR from 'swr';
import { toast } from 'sonner';
import { z } from 'zod';
import { DepartmentService } from '@/lib/services/departmentService';
import { BranchService } from '@/lib/services/branchService';
import { HospitalChainService } from '@/lib/services/hospitalChainService';
import { DepartmentSchema, type Department, type Branch, type HospitalChain } from '@/lib/schema/schema';
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
import { Plus, Layers } from 'lucide-react';
import { DepartmentRowActions } from '@/components/departments/DepartmentRowActions';

const CreateDepartmentSchema = DepartmentSchema;
type CreateDepartmentForm = z.infer<typeof CreateDepartmentSchema>;

export default function DepartmentsPage() {
  const user = useAuthSession<{ role: string; hospitalChainId?: string | null; branchId?: string | null }>();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isHospitalAdmin = user?.role === 'HOSPITAL_ADMIN';
  const isDeptAdmin = user?.role === 'DEPARTMENT_ADMIN';
  const canManageDepartments = isSuperAdmin || isHospitalAdmin;
  const [open, setOpen] = React.useState(false);

  const { data: departments, isLoading, mutate } = useSWR<Department[]>(
    '/api/departments',
    () => DepartmentService.list()
  );
  const { data: branches } = useSWR<Branch[]>(
    '/api/branches/all-branches',
    BranchService.getAllBranches
  );
  const { data: chains } = useSWR<HospitalChain[]>(
    '/api/hospital-chains',
    HospitalChainService.getAll
  );

  const form = useForm<CreateDepartmentForm>({
    resolver: zodResolver(CreateDepartmentSchema),
  });
  const watchChain = form.watch('hospitalChainId');
  const filteredBranches = branches?.filter((b) => b.hospitalChainId === watchChain);

  const onSubmit = async (data: CreateDepartmentForm) => {
    try {
      const payload =
        isHospitalAdmin && user?.hospitalChainId && user?.branchId
          ? {
              ...data,
              hospitalChainId: user.hospitalChainId,
              branchId: user.branchId,
            }
          : data;
      await DepartmentService.create(payload);
      toast.success('Department created');
      mutate();
      setOpen(false);
      form.reset();
    } catch {
      toast.error('Failed to create department');
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" /> Departments
          </h1>
          <p className="text-muted-foreground">
            Hospital departments (e.g. Cardiology, Orthopedics)
          </p>
        </div>
        {canManageDepartments && (
          <Button
            onClick={() => {
              if (isHospitalAdmin && user?.hospitalChainId && user?.branchId) {
                form.reset({
                  name: '',
                  code: '',
                  description: '',
                  hospitalChainId: user.hospitalChainId,
                  branchId: user.branchId,
                });
              }
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Department
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Departments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!isLoading && !departments?.length && (
            <p className="text-sm text-muted-foreground">No departments yet.</p>
          )}
          <ul className="space-y-2">
            {departments?.map((d) => (
              <li
                key={d.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 gap-2"
              >
                <div>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.description ?? d.code}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground">
                    {branches?.find((b) => b.id === d.branchId)?.name ?? d.branchId}
                  </div>
                  <DepartmentRowActions
                    department={d}
                    canEdit={isSuperAdmin || isHospitalAdmin || isDeptAdmin}
                    canDelete={canManageDepartments}
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
            <DialogTitle>Create Department</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!isHospitalAdmin && (
              <FormField
                control={form.control}
                name="hospitalChainId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hospital Chain</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {chains?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              )}
              {!isHospitalAdmin && (
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!watchChain}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredBranches?.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              )}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="CARDIO" {...field} /></FormControl><FormMessage /></FormItem>
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
