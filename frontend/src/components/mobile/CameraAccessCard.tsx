'use client';

import * as React from 'react';
import { Camera, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getStoredCameraAccess,
  probeCameraPermission,
  requestCameraAccess,
  type CameraAccessState,
} from '@/lib/camera-permission';
import { isNativeApp } from '@/lib/platform';
import { cn } from '@/lib/utils';

export function CameraAccessCard({
  className,
  alwaysShow = false,
}: {
  className?: string;
  /** When false, only the native app (Capacitor / Expo WebView) shows this card. */
  alwaysShow?: boolean;
}): React.ReactElement | null {
  const [visible, setVisible] = React.useState(alwaysShow);
  const [state, setState] = React.useState<CameraAccessState>('unknown');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (alwaysShow || isNativeApp()) {
      setVisible(true);
    }
    setState(getStoredCameraAccess());
    void probeCameraPermission().then(setState);
  }, [alwaysShow]);

  if (!visible) return null;

  const allow = async () => {
    setBusy(true);
    const next = await requestCameraAccess();
    setState(next);
    setBusy(false);
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#001B71]/10 text-[#001B71]">
          <Camera className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">Camera access</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Conninter uses the camera to scan gate QR codes and to take visitor, attendant, and
            driver photos.
          </p>
        </div>
      </div>
      {state === 'granted' ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Camera is allowed on this phone
        </p>
      ) : state === 'denied' ? (
        <p className="mt-3 flex items-start gap-2 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Camera is blocked. Allow it in phone Settings → Apps → Conninter → Permissions, then tap
          Allow camera again.
        </p>
      ) : null}
      <Button
        type="button"
        className="mt-3 h-11 w-full"
        variant={state === 'granted' ? 'outline' : 'default'}
        disabled={busy}
        onClick={() => void allow()}
      >
        <Camera className="mr-2 h-4 w-4" />
        {busy ? 'Asking…' : state === 'granted' ? 'Recheck camera' : 'Allow camera'}
      </Button>
    </div>
  );
}
