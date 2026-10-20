import { router } from 'expo-router';

import { openWebApp } from '@/src/lib/openWebApp';
import { isAuthenticatedResumePath } from '@/src/lib/sessionResume';
import { getLastPersona } from '@/src/storage/persona';
import { getLastWebPath } from '@/src/storage/personaWebPath';

/**
 * Reopen the last signed-in role/screen after splash.
 * Returns true when navigation was started.
 */
export async function resumeLastSession(): Promise<boolean> {
  const persona = await getLastPersona();
  if (!persona) return false;

  const saved = await getLastWebPath(persona);
  if (persona === 'attendant') {
    if (saved && isAuthenticatedResumePath(saved) && saved.startsWith('/attendant-pass')) {
      openWebApp(saved, { persona, replace: true });
      return true;
    }
    router.replace('/attendant/scan');
    return true;
  }

  if (!saved || !isAuthenticatedResumePath(saved)) {
    return false;
  }

  openWebApp(saved, { persona, replace: true });
  return true;
}
