'use client';

import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { useDemoRole } from '@/contexts/DemoRoleContext';
import { getDemoHomePath, hasRealAuthSession, IS_DEMO_MODE, type DemoPersona } from '@/lib/demo-config';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const HIERARCHY_GROUPS: { label: string; roles: DemoPersona['role'][] }[] = [
  { label: 'Hospital administration', roles: ['SUPER_ADMIN'] },
  {
    label: 'Department level',
    roles: ['DEPARTMENT_ADMIN', 'SUB_DEPARTMENT_ADMIN'],
  },
  { label: 'Staff', roles: ['SECURITY', 'STAFF'] },
];

export function DemoRoleSwitcher() {
  const router = useRouter();
  const { personas, selectedPersonaId, setPersonaId } = useDemoRole();

  if (!IS_DEMO_MODE || hasRealAuthSession()) {
    return null;
  }

  const handleChange = (id: string) => {
    const persona = personas.find((item) => item.id === id);
    if (!persona) return;

    setPersonaId(id);
    router.push(getDemoHomePath(persona.role));
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2 mr-1 sm:mr-2 min-w-0 max-w-[45vw] sm:max-w-none">
      <Users className="hidden sm:block h-4 w-4 text-amber-600 shrink-0" aria-hidden="true" />
      <Select value={selectedPersonaId} onValueChange={handleChange}>
        <SelectTrigger
          className="w-full min-w-[7.5rem] max-w-[9.5rem] sm:max-w-[12.5rem] h-9 border-amber-300 bg-amber-50 text-amber-950 text-xs sm:text-sm"
          aria-label="Switch demo role"
        >
          <SelectValue placeholder="Demo role" />
        </SelectTrigger>
        <SelectContent>
          {HIERARCHY_GROUPS.map((group) => (
            <SelectGroup key={group.label}>
              <SelectLabel>{group.label}</SelectLabel>
              {personas
                .filter((persona) => group.roles.includes(persona.role))
                .map((persona) => (
                  <SelectItem key={persona.id} value={persona.id}>
                    {persona.label}
                  </SelectItem>
                ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
