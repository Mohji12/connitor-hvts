'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Pencil, Trash2 } from 'lucide-react';
import { DepartmentService } from '@/lib/services/departmentService';
import { DepartmentSchema, type Department } from '@/lib/schema/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const EditDepartmentSchema = DepartmentSchema.pick({
  name: true,
  code: true,
  description: true,
});

type Props = {
  department: Department;
  canEdit: boolean;
  canDelete: boolean;
  onChanged: () => void;
};

export function DepartmentRowActions({ department, canEdit, canDelete, onChanged }: Props) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const form = useForm<z.infer<typeof EditDepartmentSchema>>({
    resolver: zodResolver(EditDepartmentSchema),
    defaultValues: {
      name: department.name,
      code: department.code,
      description: department.description ?? '',
    },
  });

  React.useEffect(() => {
    if (editOpen) {
      form.reset({
        name: department.name,
        code: department.code,
        description: department.description ?? '',
      });
    }
  }, [editOpen, department, form]);

  const onUpdate = async (data: z.infer<typeof EditDepartmentSchema>) => {
    try {
      await DepartmentService.update(department.id, data);
      toast.success('Department updated');
      onChanged();
      setEditOpen(false);
    } catch {
      toast.error('Failed to update department');
    }
  };

  const onDelete = async () => {
    try {
      await DepartmentService.remove(department.id);
      toast.success('Department deactivated');
      onChanged();
      setDeleteOpen(false);
    } catch {
      toast.error('Failed to deactivate department');
    }
  };

  if (!canEdit && !canDelete) return null;

  return (
    <>
      <div className="flex gap-2 shrink-0">
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {canDelete && (
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdate)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate department?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate {department.name}. Existing users and visits are not removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
