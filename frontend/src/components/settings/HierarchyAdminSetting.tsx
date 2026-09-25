'use client';

type Props = {
  role: 'DEPARTMENT_ADMIN' | 'SUB_DEPARTMENT_ADMIN';
};

export default function HierarchyAdminSetting({ role }: Props) {
  const title =
    role === 'DEPARTMENT_ADMIN'
      ? 'Department Admin Settings'
      : 'Sub-Department Admin Settings';

  return (
    <div className="page-shell">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <p className="text-muted-foreground">
        Manage your profile and department preferences. Additional settings will be
        available in a future update.
      </p>
    </div>
  );
}
