import { router } from 'expo-router';
import { Platform } from 'react-native';

import { personaDefaultPaths, webUrl } from '@/src/config/webApp';
import type { PersonaId } from '@/src/storage/persona';
import { getLastWebPath } from '@/src/storage/personaWebPath';

export type OpenWebAppOptions = {
  /** Associate navigation with a persona so the WebView can remember the last URL. */
  persona?: PersonaId;
  /** Prefer the last saved path for this persona when present. */
  resume?: boolean;
  /** Cold-start restore should replace splash so Back does not return there. */
  replace?: boolean;
};

/**
 * Open Conninter product UI inside the app.
 * - Native (phone/emulator): embedded WebView screen (`/app-web`)
 * - Expo web: same-tab navigation (iframes break API calls / storage for www.conninter.com)
 */
export function openWebApp(path: string, options?: OpenWebAppOptions): void {
  const normalized = path.startsWith('/') ? path : `/${path}`;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(webUrl(normalized));
    return;
  }

  const target = {
    pathname: '/app-web' as const,
    params: {
      path: normalized,
      ...(options?.persona ? { persona: options.persona } : {}),
    },
  };
  if (options?.replace) {
    router.replace(target);
    return;
  }
  router.push(target);
}

/** Open default or last-used path for a WebView persona (not attendant QR). */
export async function openPersonaWebApp(
  persona: Exclude<PersonaId, 'attendant'>,
  opts?: { resume?: boolean; replace?: boolean },
): Promise<void> {
  let path: string = personaDefaultPaths[persona];
  if (opts?.resume !== false) {
    const saved = await getLastWebPath(persona);
    if (saved) path = saved;
  }
  openWebApp(path, { persona, replace: opts?.replace });
}
