'use client';

import * as React from 'react';
import { EmptyState, ListSkeleton } from '@/components/mobile/EmptyState';
import { MobileListCard } from '@/components/mobile/MobileListCard';
import { StatusChip } from '@/components/mobile/StatusChip';
import type { User } from '@/lib/schema/schema';
import { cn } from '@/lib/utils';
import { AdminUserRowActions } from './AdminUserRowActions';

type Props = {
  users: User[];
  isLoading: boolean;
  emptyTitle?: string;
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
  className?: string;
};

/** Phone card list for the admin user tables (shown below `lg`). */
export function AdminUserMobileList({
  users,
  isLoading,
  emptyTitle = 'No users found',
  onEdit,
  onDeactivate,
  className,
}: Props): React.ReactElement {
  if (isLoading) return <ListSkeleton rows={4} className={className} />;
  if (!users.length) return <EmptyState title={emptyTitle} className={className} />;

  return (
    <ul className={cn('space-y-2', className)}>
      {users.map((u) => (
        <li key={u.id}>
          <MobileListCard
            title={u.name}
            subtitle={u.email}
            status={<StatusChip status={u.isActive ? 'ACTIVE' : 'INACTIVE'} label={u.isActive ? 'Active' : 'Inactive'} tone={u.isActive ? 'success' : 'neutral'} />}
            meta={[
              { label: 'Role', value: u.role },
              { label: 'Phone', value: u.phone || '—' },
            ]}
            actions={
              u.isActive ? (
                <AdminUserRowActions user={u} onEdit={onEdit} onDeactivate={onDeactivate} />
              ) : undefined
            }
          />
        </li>
      ))}
    </ul>
  );
}
