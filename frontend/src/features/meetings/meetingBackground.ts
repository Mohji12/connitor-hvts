/** Shared preference + apply helpers for LiveKit virtual backgrounds. */

export type MeetingBackgroundMode =
  | { kind: 'none' }
  | { kind: 'blur'; strength: 'soft' | 'strong' }
  | { kind: 'preset'; id: string; imagePath: string }
  | { kind: 'custom'; imagePath: string };

export const MEETING_BG_PRESETS: Array<{ id: string; label: string; imagePath: string }> = [
  { id: 'soft-blue', label: 'Soft blue', imagePath: '/meeting-backgrounds/soft-blue.png' },
  { id: 'calm-teal', label: 'Calm teal', imagePath: '/meeting-backgrounds/calm-teal.png' },
  { id: 'warm-neutral', label: 'Warm neutral', imagePath: '/meeting-backgrounds/warm-neutral.png' },
  { id: 'deep-navy', label: 'Deep navy', imagePath: '/meeting-backgrounds/deep-navy.png' },
];

const STORAGE_KEY = 'conninter.meetingBackground';

export const BLUR_RADIUS = { soft: 8, strong: 20 } as const;

export function loadMeetingBackgroundPreference(): MeetingBackgroundMode {
  if (typeof window === 'undefined') return { kind: 'none' };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { kind: 'none' };
    const parsed = JSON.parse(raw) as MeetingBackgroundMode;
    if (!parsed || typeof parsed !== 'object' || !('kind' in parsed)) return { kind: 'none' };
    return parsed;
  } catch {
    return { kind: 'none' };
  }
}

export function saveMeetingBackgroundPreference(mode: MeetingBackgroundMode): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mode));
  } catch {
    /* private mode */
  }
}

export function meetingBackgroundLabel(mode: MeetingBackgroundMode): string {
  if (mode.kind === 'none') return 'None';
  if (mode.kind === 'blur') return mode.strength === 'soft' ? 'Soft blur' : 'Strong blur';
  if (mode.kind === 'preset') {
    return MEETING_BG_PRESETS.find((p) => p.id === mode.id)?.label ?? 'Background';
  }
  return 'Custom image';
}
