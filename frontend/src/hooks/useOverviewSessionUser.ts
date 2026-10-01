'use client';

import { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getStoredAuthToken, shouldUseDemoIdentity } from '@/lib/demo-config';
import { useDemoRole } from '@/contexts/DemoRoleContext';

export function useOverviewSessionUser<T>() {
  const { demoUser, selectedPersonaId } = useDemoRole();
  const [user, setUser] = useState<T | null>(null);

  useEffect(() => {
    const token = getStoredAuthToken();

    if (token) {
      try {
        setUser(jwtDecode<T>(token));
      } catch {
        setUser(null);
      }
      return;
    }

    if (shouldUseDemoIdentity()) {
      setUser(demoUser as T);
      return;
    }

    setUser(null);
  }, [demoUser, selectedPersonaId]);

  return user;
}
