'use client';

import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import {
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
import type {
  Branch,
  Department,
  HospitalChain,
  SubDepartment,
  UserFormSchema,
} from '@/lib/schema/schema';

type FormValues = z.infer<typeof UserFormSchema>;

interface DepartmentHierarchyFieldsProps {
  form: UseFormReturn<FormValues>;
  watchRole: FormValues['role'] | undefined;
  watchChain: string | undefined;
  watchBranch: string | undefined;
  watchDepartment: string | undefined;
  hospitalChains?: HospitalChain[];
  branches?: Branch[];
  departments?: Department[];
  subDepartments?: SubDepartment[];
  lockChainId?: string;
  lockBranchId?: string;
  lockDepartmentId?: string;
  lockSubDepartmentId?: string;
}

export function DepartmentHierarchyFields({
  form,
  watchRole,
  watchChain,
  watchBranch,
  watchDepartment,
  hospitalChains,
  branches,
  departments,
  subDepartments,
  lockChainId,
  lockBranchId,
  lockDepartmentId,
  lockSubDepartmentId,
}: DepartmentHierarchyFieldsProps) {
  const filteredBranches = branches?.filter(
    (b) => !watchChain || b.hospitalChainId === watchChain
  );
  const filteredDepartments = departments?.filter(
    (d) => !watchBranch || d.branchId === watchBranch
  );
  const filteredSubDepartments = subDepartments?.filter(
    (s) => !watchDepartment || s.departmentId === watchDepartment
  );

  const needsChain =
    watchRole &&
    watchRole !== 'SUPER_ADMIN' &&
    !lockChainId;
  const needsBranch =
    watchRole &&
    !['SUPER_ADMIN', 'CHAIN_ADMIN'].includes(watchRole) &&
    !lockBranchId;
  const needsDepartment =
    watchRole &&
    [
      'DEPARTMENT_ADMIN',
      'SUB_DEPARTMENT_ADMIN',
      'STAFF',
      'SECURITY',
      'SECURITY_SUPERVISOR',
    ].includes(watchRole) &&
    !lockDepartmentId;
  const needsSubDepartment =
    watchRole &&
    ['SUB_DEPARTMENT_ADMIN', 'STAFF', 'SECURITY', 'SECURITY_SUPERVISOR'].includes(
      watchRole
    ) &&
    !lockSubDepartmentId;

  return (
    <>
      {needsChain && (
        <FormField
          control={form.control}
          name="hospitalChainId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hospital Chain</FormLabel>
              <Select onValueChange={field.onChange} value={String(field.value ?? '')}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a chain" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {hospitalChains?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {needsBranch && (
        <FormField
          control={form.control}
          name="branchId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hospital Location (Branch)</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={String(field.value ?? '')}
                disabled={!watchChain && !lockChainId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredBranches?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {needsDepartment && (
        <FormField
          control={form.control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={String(field.value ?? '')}
                disabled={!watchBranch && !lockBranchId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredDepartments?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {needsSubDepartment && (
        <FormField
          control={form.control}
          name="subDepartmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sub-Department (Section)</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={String(field.value ?? '')}
                disabled={!watchDepartment && !lockDepartmentId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a section" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredSubDepartments?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
