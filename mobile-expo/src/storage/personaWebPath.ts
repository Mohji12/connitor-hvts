import AsyncStorage from '@react-native-async-storage/async-storage';

import { isAuthenticatedResumePath } from '@/src/lib/sessionResume';
import type { PersonaId } from '@/src/storage/persona';

const keyFor = (id: PersonaId): string => `conninterLastWebPath:${id}`;

/** Last in-app WebView path for a persona (pathname + search, e.g. `/visitor/dashboard/`). */
export async function getLastWebPath(id: PersonaId): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(keyFor(id));
    if (!value || !value.startsWith('/')) return null;
    return value;
  } catch {
    return null;
  }
}

export async function setLastWebPath(id: PersonaId, path: string): Promise<void> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!isAuthenticatedResumePath(normalized)) {
    // Do not keep login / welcome URLs as the resume target after an explicit sign-out.
    if (
      normalized.replace(/\/+$/, '') === '/app' ||
      normalized.includes('/login') ||
      normalized.includes('/forgot-password')
    ) {
      await AsyncStorage.removeItem(keyFor(id));
    }
    return;
  }
  await AsyncStorage.setItem(keyFor(id), normalized);
}

export async function clearLastWebPath(id: PersonaId): Promise<void> {
  await AsyncStorage.removeItem(keyFor(id));
}
