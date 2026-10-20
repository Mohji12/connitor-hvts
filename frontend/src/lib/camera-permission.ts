const STORAGE_KEY = 'conninterCameraAccess';

export type CameraAccessState = 'unknown' | 'granted' | 'denied';

function write(state: CameraAccessState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, state);
  } catch {
    // ignore
  }
}

export function getStoredCameraAccess(): CameraAccessState {
  if (typeof window === 'undefined') return 'unknown';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'granted' || raw === 'denied') return raw;
  } catch {
    // ignore
  }
  return 'unknown';
}

/** Ask the OS for camera access and remember the result on this phone. */
export async function requestCameraAccess(): Promise<CameraAccessState> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    write('denied');
    return 'denied';
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    stream.getTracks().forEach((track) => track.stop());
    write('granted');
    return 'granted';
  } catch {
    write('denied');
    return 'denied';
  }
}

export async function probeCameraPermission(): Promise<CameraAccessState> {
  if (typeof navigator === 'undefined') return 'unknown';
  try {
    const permissions = navigator.permissions;
    if (permissions?.query) {
      const status = await permissions.query({ name: 'camera' as PermissionName });
      if (status.state === 'granted') {
        write('granted');
        return 'granted';
      }
      if (status.state === 'denied') {
        write('denied');
        return 'denied';
      }
    }
  } catch {
    // Safari / WebView may not support Permissions API for camera.
  }
  return getStoredCameraAccess();
}
