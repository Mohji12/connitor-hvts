import type { DeviceEnrollment, LocalGateEvent, SignedManifest } from './types';

const DEVICE_KEY = 'conninter.gate.device';
const VAULT_KEY = 'conninter.gate.vault';
const VAULT_JSON_KEY = 'conninter.gate.vault.json';

type Vault = {
  manifest: SignedManifest | null;
  events: LocalGateEvent[];
};

async function readRaw(key: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    if ((window as Window & { Capacitor?: unknown }).Capacitor) {
      const { Preferences } = await import('@capacitor/preferences');
      const result = await Preferences.get({ key });
      if (result.value) return result.value;
    }
  } catch {
    // fall through
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function writeRaw(key: string, value: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if ((window as Window & { Capacitor?: unknown }).Capacitor) {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value });
    }
  } catch {
    // still write localStorage
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

async function encryptVault(secret: string, vault: Vault): Promise<string> {
  const payload = JSON.stringify(vault);
  if (!globalThis.crypto?.subtle) {
    return payload;
  }
  const keyBytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  const cryptoKey = await globalThis.crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const cipher = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, new TextEncoder().encode(payload));
  const packed = new Uint8Array(iv.length + cipher.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...packed));
}

async function decryptVault(secret: string, raw: string): Promise<Vault> {
  try {
    const parsed = JSON.parse(raw) as Vault;
    if (parsed && Array.isArray(parsed.events)) return parsed;
  } catch {
    // encrypted
  }
  if (!globalThis.crypto?.subtle) {
    return { manifest: null, events: [] };
  }
  const binary = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  const iv = binary.slice(0, 12);
  const data = binary.slice(12);
  const keyBytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  const cryptoKey = await globalThis.crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const plain = await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, data);
  return JSON.parse(new TextDecoder().decode(plain)) as Vault;
}

export async function loadDeviceEnrollment(): Promise<DeviceEnrollment | null> {
  const raw = await readRaw(DEVICE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DeviceEnrollment;
  } catch {
    return null;
  }
}

export async function saveDeviceEnrollment(device: DeviceEnrollment): Promise<void> {
  await writeRaw(DEVICE_KEY, JSON.stringify(device));
}

export async function clearGateStore(): Promise<void> {
  await writeRaw(DEVICE_KEY, '');
  await writeRaw(VAULT_KEY, '');
  try {
    localStorage.removeItem(DEVICE_KEY);
    localStorage.removeItem(VAULT_KEY);
  } catch {
    // ignore
  }
}

export async function loadVault(): Promise<Vault> {
  const device = await loadDeviceEnrollment();
  const jsonRaw = await readRaw(VAULT_JSON_KEY);
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as Vault;
      if (parsed && Array.isArray(parsed.events)) return parsed;
    } catch {
      // try encrypted
    }
  }
  const raw = await readRaw(VAULT_KEY);
  if (!raw || !device) return { manifest: null, events: [] };
  try {
    return await decryptVault(device.deviceSecret, raw);
  } catch {
    return { manifest: null, events: [] };
  }
}

export async function saveManifest(manifest: SignedManifest): Promise<void> {
  const device = await loadDeviceEnrollment();
  if (!device) throw new Error('Gate device is not enrolled on this phone.');
  const vault = await loadVault();
  vault.manifest = manifest;
  await writeRaw(VAULT_KEY, await encryptVault(device.deviceSecret, vault));
  await writeRaw(VAULT_JSON_KEY, JSON.stringify(vault));
}

export async function appendLocalEvent(event: LocalGateEvent): Promise<void> {
  const device = await loadDeviceEnrollment();
  if (!device) throw new Error('Gate device is not enrolled on this phone.');
  const vault = await loadVault();
  if (vault.events.some((row) => row.eventId === event.eventId)) return;
  vault.events.push(event);
  await writeRaw(VAULT_KEY, await encryptVault(device.deviceSecret, vault));
  await writeRaw(VAULT_JSON_KEY, JSON.stringify(vault));
}

export async function markEventsAcked(eventIds: string[]): Promise<void> {
  const device = await loadDeviceEnrollment();
  if (!device) return;
  const vault = await loadVault();
  const acked = new Set(eventIds);
  vault.events = vault.events.map((row) =>
    acked.has(row.eventId) ? { ...row, syncStatus: 'ACKED' as const } : row,
  );
  await writeRaw(VAULT_KEY, await encryptVault(device.deviceSecret, vault));
  await writeRaw(VAULT_JSON_KEY, JSON.stringify(vault));
}

export function pendingEvents(events: LocalGateEvent[]): LocalGateEvent[] {
  return events.filter((row) => row.syncStatus === 'PENDING');
}
