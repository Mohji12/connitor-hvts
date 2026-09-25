'use client';

import * as React from 'react';
import { Pencil, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/schema/schema';

type Props = {
  user: User;
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
};

export function AdminUserRowActions({ user, onEdit, onDeactivate }: Props) {
  if (!user.isActive) {
    return <span className="text-xs text-muted-foreground">Inactive</span>;
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => onDeactivate(user)}>
        <UserX className="h-4 w-4" />
      </Button>
    </div>
  );
}
