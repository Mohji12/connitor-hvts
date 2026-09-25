'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { getDashboardPathForRole } from '@/lib/auth-routing';
import { clearStoredAuthToken } from '@/lib/auth-storage';
import { getDemoHomePath, getStoredAuthToken, shouldUseDemoIdentity } from '@/lib/demo-config';
import { useDemoRole } from '@/contexts/DemoRoleContext';

interface UseAuthSessionOptions {
  requiredRole?: string;
  redirectTo?: string;
}

export function useAuthSession<T extends object = { role?: string }>(
  options: UseAuthSessionOptions = {},
) {
  const { requiredRole, redirectTo = '/auth/login' } = options;
  const [user, setUser] = useState<T | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const { demoUser } = useDemoRole();

  useEffect(() => {
    const onSessionCleared = () => {
      setUser(null);
      setReady(false);
    };

    window.addEventListener('auth-session-cleared', onSessionCleared);
    return () => window.removeEventListener('auth-session-cleared', onSessionCleared);
  }, []);

  useEffect(() => {
    const token = getStoredAuthToken();

    if (token) {
      try {
        const decodedUser = jwtDecode<T & { role?: string }>(token);
        const role = decodedUser.role;

        if (requiredRole && role !== requiredRole) {
          router.replace(getDashboardPathForRole(role ?? ''));
          setReady(true);
          return;
        }

        setUser(decodedUser as T);
        setReady(true);
        return;
      } catch (error) {
        console.error('Failed to decode token:', error);
        clearStoredAuthToken();
        router.push(redirectTo);
        setReady(true);
        return;
      }
    }

    if (shouldUseDemoIdentity()) {
      if (requiredRole && demoUser.role !== requiredRole) {
        router.replace(getDemoHomePath(demoUser.role));
        setReady(true);
        return;
      }
      setUser(demoUser as unknown as T);
      setReady(true);
      return;
    }

    router.push(redirectTo);
    setReady(true);
  }, [router, requiredRole, redirectTo, demoUser]);

  if (!ready) {
    return null;
  }

  return user;
}
