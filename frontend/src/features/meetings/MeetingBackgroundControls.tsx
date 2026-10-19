'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackgroundProcessor,
  supportsBackgroundProcessors,
  type BackgroundProcessorWrapper,
} from '@livekit/track-processors';
import type { LocalVideoTrack } from 'livekit-client';
import { ImagePlus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BLUR_RADIUS,
  MEETING_BG_PRESETS,
  loadMeetingBackgroundPreference,
  meetingBackgroundLabel,
  saveMeetingBackgroundPreference,
  type MeetingBackgroundMode,
} from '@/features/meetings/meetingBackground';

type MeetingBackgroundControlsProps = {
  /** When set, effects are applied to this local camera track. */
  videoTrack?: LocalVideoTrack | null;
  className?: string;
  /** Compact bar for in-call control strip. */
  compact?: boolean;
};

async function applyModeToTrack(
  track: LocalVideoTrack,
  mode: MeetingBackgroundMode,
  processorRef: { current: BackgroundProcessorWrapper | null },
): Promise<void> {
  if (mode.kind === 'none') {
    if (processorRef.current) {
      await processorRef.current.switchTo({ mode: 'disabled' });
    }
    await track.stopProcessor();
    processorRef.current = null;
    return;
  }

  const target =
    mode.kind === 'blur'
      ? { mode: 'background-blur' as const, blurRadius: BLUR_RADIUS[mode.strength] }
      : { mode: 'virtual-background' as const, imagePath: mode.imagePath };

  if (processorRef.current) {
    await processorRef.current.switchTo(target);
    return;
  }

  const processor = BackgroundProcessor(target);
  await track.setProcessor(processor);
  processorRef.current = processor;
}

/**
 * Blur / preset / custom virtual background picker.
 * Preference is stored in sessionStorage so PreJoin choices carry into the call.
 */
export function MeetingBackgroundControls({
  videoTrack,
  className,
  compact = false,
}: MeetingBackgroundControlsProps): React.ReactElement {
  const [mode, setMode] = useState<MeetingBackgroundMode>(() => loadMeetingBackgroundPreference());
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const processorRef = useRef<BackgroundProcessorWrapper | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const customUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setSupported(supportsBackgroundProcessors());
  }, []);

  const selectMode = useCallback(
    async (next: MeetingBackgroundMode) => {
      if (!supportsBackgroundProcessors()) {
        toast.error('Background effects are not supported in this browser.');
        setSupported(false);
        return;
      }
      setBusy(true);
      try {
        if (videoTrack) {
          await applyModeToTrack(videoTrack, next, processorRef);
        }
        setMode(next);
        saveMeetingBackgroundPreference(next);
      } catch (err) {
        console.error(err);
        toast.error('Could not apply the background effect. Try another option or browser.');
      } finally {
        setBusy(false);
      }
    },
    [videoTrack],
  );

  // Apply saved preference when the in-call camera track appears.
  useEffect(() => {
    if (!videoTrack || !supportsBackgroundProcessors()) return;
    const preferred = loadMeetingBackgroundPreference();
    if (preferred.kind === 'none') return;
    let cancelled = false;
    void (async () => {
      try {
        if (!cancelled) {
          await applyModeToTrack(videoTrack, preferred, processorRef);
          setMode(preferred);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          toast.error('Background effect could not start on your camera.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [videoTrack]);

  useEffect(() => {
    return () => {
      const url = customUrlRef.current;
      if (url) URL.revokeObjectURL(url);
      const track = videoTrack;
      const processor = processorRef.current;
      if (track && processor) {
        void track.stopProcessor().catch(() => undefined);
      }
      processorRef.current = null;
    };
    // Only clean up on unmount / track swap handled by stopProcessor on next apply
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPickCustom = async (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Choose an image file (JPG, PNG, or WebP).');
      return;
    }
    if (customUrlRef.current) URL.revokeObjectURL(customUrlRef.current);
    const url = URL.createObjectURL(file);
    customUrlRef.current = url;
    await selectMode({ kind: 'custom', imagePath: url });
    setOpen(false);
  };

  if (!supported) {
    return (
      <p className={cn('text-xs text-amber-200/90', className)} data-testid="meeting-bg-unsupported">
        Background blur and images need a newer browser (Chrome or Edge recommended).
      </p>
    );
  }

  return (
    <div className={cn('relative', className)} data-testid="meeting-bg-controls">
      <Button
        type="button"
        variant={compact ? 'secondary' : 'outline'}
        size={compact ? 'sm' : 'default'}
        className={cn(compact && 'h-9 gap-1.5 bg-white/10 text-white hover:bg-white/20')}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="meeting-bg-toggle"
      >
        <Sparkles className="h-4 w-4" />
        {compact ? 'Effects' : `Background: ${meetingBackgroundLabel(mode)}`}
      </Button>

      {open && (
        <div
          className={cn(
            'z-40 mt-2 rounded-xl border border-white/15 bg-[#111c4a] p-3 text-white shadow-xl',
            compact ? 'absolute bottom-full left-0 mb-2 w-72' : 'w-full max-w-md',
          )}
          data-testid="meeting-bg-panel"
        >
          <p className="mb-2 text-xs font-medium text-white/70">
            {videoTrack
              ? 'Applied to your camera for everyone in the call.'
              : 'Saved for when you join. You can change it during the call.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode.kind === 'none' ? 'default' : 'secondary'}
              disabled={busy}
              onClick={() => void selectMode({ kind: 'none' }).then(() => setOpen(false))}
            >
              None
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode.kind === 'blur' && mode.strength === 'soft' ? 'default' : 'secondary'}
              disabled={busy}
              onClick={() =>
                void selectMode({ kind: 'blur', strength: 'soft' }).then(() => setOpen(false))
              }
            >
              Soft blur
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode.kind === 'blur' && mode.strength === 'strong' ? 'default' : 'secondary'}
              disabled={busy}
              onClick={() =>
                void selectMode({ kind: 'blur', strength: 'strong' }).then(() => setOpen(false))
              }
            >
              Strong blur
            </Button>
          </div>

          <p className="mb-1.5 mt-3 text-xs font-medium text-white/70">Presets</p>
          <div className="grid grid-cols-2 gap-2">
            {MEETING_BG_PRESETS.map((preset) => {
              const selected = mode.kind === 'preset' && mode.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void selectMode({
                      kind: 'preset',
                      id: preset.id,
                      imagePath: preset.imagePath,
                    }).then(() => setOpen(false))
                  }
                  className={cn(
                    'overflow-hidden rounded-lg border text-left transition',
                    selected ? 'border-[#4a90e2] ring-2 ring-[#4a90e2]/40' : 'border-white/10',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preset.imagePath} alt="" className="h-16 w-full object-cover" />
                  <span className="block px-2 py-1 text-xs">{preset.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onPickCustom(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="mr-1.5 h-4 w-4" />
              Upload image
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
