'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Pencil, Trash2 } from 'lucide-react';
import { SubDepartmentService } from '@/lib/services/departmentService';
import { SubDepartmentSchema, type SubDepartment } from '@/lib/schema/schema';
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

const EditSubDepartmentSchema = SubDepartmentSchema.pick({
  name: true,
  code: true,
  description: true,
});

type Props = {
  subDepartment: SubDepartment;
  canEdit: boolean;
  canDelete: boolean;
  onChanged: () => void;
};

export function SubDepartmentRowActions({
  subDepartment,
  canEdit,
  canDelete,
  onChanged,
}: Props) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const form = useForm<z.infer<typeof EditSubDepartmentSchema>>({
    resolver: zodResolver(EditSubDepartmentSchema),
    defaultValues: {
      name: subDepartment.name,
      code: subDepartment.code,
      description: subDepartment.description ?? '',
    },
  });

  React.useEffect(() => {
    if (editOpen) {
      form.reset({
        name: subDepartment.name,
        code: subDepartment.code,
        description: subDepartment.description ?? '',
      });
    }
  }, [editOpen, subDepartment, form]);

  const onUpdate = async (data: z.infer<typeof EditSubDepartmentSchema>) => {
    try {
      await SubDepartmentService.update(subDepartment.id, data);
      toast.success('Sub-department updated');
      onChanged();
      setEditOpen(false);
    } catch {
      toast.error('Failed to update sub-department');
    }
  };

  const onDelete = async () => {
    try {
      await SubDepartmentService.remove(subDepartment.id);
      toast.success('Sub-department deactivated');
      onChanged();
      setDeleteOpen(false);
    } catch {
      toast.error('Failed to deactivate sub-department');
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
            <DialogTitle>Edit Sub-Department</DialogTitle>
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
            <AlertDialogTitle>Deactivate section?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate {subDepartment.name}.
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
