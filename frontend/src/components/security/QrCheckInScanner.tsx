'use client';

import * as React from 'react';
import { AlertCircle, Camera, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  onScan: (payload: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  /** Unique DOM id when multiple scanners exist on one page */
  readerId?: string;
  hint?: string;
  buttonLabel?: string;
  permissionErrorHint?: string;
};

type Html5Scanner = {
  start: (
    cameraIdOrConfig: string | MediaTrackConstraints,
    config: Record<string, unknown>,
    onSuccess: (decodedText: string) => void,
    onFailure?: (error: string) => void,
  ) => Promise<null>;
  stop: () => Promise<void>;
  clear?: () => void;
  getRunningTrackCameraCapabilities?: () => {
    zoomFeature: () => {
      isSupported: () => boolean;
      min: () => number;
      max: () => number;
      apply: (value: number) => Promise<void>;
    };
  };
};

type Html5QrcodeCtor = (new (elementId: string) => Html5Scanner) & {
  getCameras?: () => Promise<Array<{ id: string; label: string }>>;
};

/** Wait for React to paint the reader element before html5-qrcode measures it. */
function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function cameraErrorMessage(error: unknown, fallback: string): string {
  const name =
    typeof error === 'object' && error && 'name' in error
      ? String((error as { name?: string }).name)
      : '';
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: string }).message)
      : typeof error === 'string'
        ? error
        : '';
  const combined = `${name} ${message}`.toLowerCase();

  if (
    name === 'NotAllowedError' ||
    combined.includes('permission') ||
    combined.includes('notallowed')
  ) {
    return 'Camera permission blocked. Allow camera for this site in the browser address bar, then try again.';
  }
  if (
    name === 'NotFoundError' ||
    combined.includes('requested device not found') ||
    combined.includes('no camera')
  ) {
    return 'No camera found on this device. Connect a webcam or paste the QR manually.';
  }
  if (
    name === 'NotReadableError' ||
    combined.includes('could not start video source') ||
    combined.includes('in use')
  ) {
    return 'Camera is busy (another app or tab may be using it). Close that, then try again.';
  }
  if (
    name === 'OverconstrainedError' ||
    combined.includes('overconstrained') ||
    combined.includes('constraint')
  ) {
    return 'This camera could not start with the requested settings. Tap Open camera again, or paste the QR manually.';
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'Camera needs HTTPS (or localhost). Open the site over a secure link, then try again.';
  }
  return fallback;
}

/** Prefer a light hardware zoom so the QR fills more of the frame. */
async function applyScannerZoom(scanner: Html5Scanner): Promise<void> {
  try {
    const zoom = scanner.getRunningTrackCameraCapabilities?.().zoomFeature();
    if (!zoom?.isSupported()) return;
    const min = zoom.min();
    const max = zoom.max();
    if (!(max > min)) return;
    // About 1.6× when the camera allows it — enough to lock faster without cropping too hard.
    const target = Math.min(max, Math.max(min, min + (max - min) * 0.35));
    await zoom.apply(Number(target.toFixed(2)));
  } catch {
    // Not every device exposes zoom; CSS scale below still helps.
  }
}

/**
 * Start with relaxed constraints. Rear camera + 1080p often fails on desktops
 * and some phones (OverconstrainedError / no environment camera).
 */
async function startScannerWithFallback(
  Html5Qrcode: Html5QrcodeCtor,
  elementId: string,
  onDecoded: (decodedText: string) => void,
): Promise<Html5Scanner> {
  const scanConfig = {
    fps: 15,
    qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
      const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
      return { width: edge, height: edge };
    },
  };

  const cameraAttempts: Array<string | MediaTrackConstraints> = [];

  let lastError: unknown;

  // Prefer enumerated cameras when the browser allows it (USB webcams at security desks).
  try {
    const devices = await Html5Qrcode.getCameras?.();
    if (Array.isArray(devices) && devices.length > 0) {
      const rear = devices.find((d) => /back|rear|environment/i.test(d.label));
      const ordered = rear
        ? [rear, ...devices.filter((d) => d.id !== rear.id)]
        : devices;
      for (const device of ordered) {
        cameraAttempts.push(device.id);
      }
    }
  } catch {
    // getCameras may require a prior permission prompt; facingMode attempts still run.
  }

  cameraAttempts.push(
    { facingMode: { ideal: 'environment' } },
    { facingMode: 'environment' },
    { facingMode: 'user' },
  );

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const uniqueAttempts = cameraAttempts.filter((attempt) => {
    const key = typeof attempt === 'string' ? `id:${attempt}` : JSON.stringify(attempt);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  for (const camera of uniqueAttempts) {
    const scanner = new Html5Qrcode(elementId);
    try {
      await scanner.start(camera, scanConfig, onDecoded, () => {
        // ignore per-frame scan misses
      });
      return scanner;
    } catch (error) {
      lastError = error;
      try {
        await scanner.stop();
      } catch {
        // ignore
      }
      try {
        scanner.clear?.();
      } catch {
        // ignore
      }
    }
  }

  throw lastError ?? new Error('Camera start failed');
}

export function QrCheckInScanner({
  onScan,
  disabled = false,
  className,
  readerId,
  hint = 'Ask the visitor to show the QR code from their approval email or visitor portal.',
  buttonLabel = 'Scan QR Code',
  permissionErrorHint = 'Could not access camera. Allow camera permission or paste the QR manually.',
}: Props) {
  const reactId = React.useId().replace(/:/g, '');
  const elementId = readerId ?? `qr-reader-${reactId}`;
  const [error, setError] = React.useState<string | null>(null);
  const [starting, setStarting] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const [shouldStart, setShouldStart] = React.useState(false);
  const scannerRef = React.useRef<Html5Scanner | null>(null);
  const handledRef = React.useRef(false);
  const onScanRef = React.useRef(onScan);
  onScanRef.current = onScan;

  const showReader = shouldStart || starting || active;

  const stopScanner = React.useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore stop errors when camera already closed
      }
      scannerRef.current = null;
    }
    setActive(false);
    setStarting(false);
    setShouldStart(false);
  }, []);

  React.useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  React.useEffect(() => {
    if (!shouldStart) return;

    let cancelled = false;

    void (async () => {
      setError(null);
      setStarting(true);
      handledRef.current = false;

      try {
        if (typeof window !== 'undefined' && !window.isSecureContext) {
          throw Object.assign(new Error('Insecure context'), { name: 'SecurityError' });
        }

        await waitForLayout();
        if (cancelled) return;

        const readerEl = document.getElementById(elementId);
        if (!readerEl) {
          throw new Error('Camera view is not ready. Tap Open camera again.');
        }

        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = await startScannerWithFallback(
          Html5Qrcode as Html5QrcodeCtor,
          elementId,
          async (decodedText) => {
            if (handledRef.current) return;
            handledRef.current = true;
            await stopScanner();
            await onScanRef.current(decodedText);
          },
        );

        if (cancelled) {
          try {
            await scanner.stop();
          } catch {
            // ignore
          }
          return;
        }

        scannerRef.current = scanner;
        await applyScannerZoom(scanner);
        setActive(true);
      } catch (error) {
        if (!cancelled) {
          setError(cameraErrorMessage(error, permissionErrorHint));
        }
        await stopScanner();
      } finally {
        if (!cancelled) {
          setStarting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldStart, stopScanner, elementId, permissionErrorHint]);

  const requestStart = () => {
    if (disabled || active || starting || shouldStart) return;
    setError(null);
    setShouldStart(true);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {showReader && (
        <div className="relative mx-auto w-full max-w-sm">
          <div
            id={elementId}
            className={cn(
              'min-h-[300px] w-full overflow-hidden rounded-lg border border-gray-200 bg-black',
              // Slight digital zoom so the QR fills more of the scan box on phones without optical zoom.
              '[&_video]:!block [&_video]:!h-full [&_video]:!max-h-[360px] [&_video]:!w-full [&_video]:scale-[1.35] [&_video]:object-cover',
              '[&_#qr-shaded-region]:!border-2 [&_#qr-shaded-region]:!border-emerald-400',
            )}
          />
          {starting && !active && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
              <Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden="true" />
              <span className="sr-only">Starting camera…</span>
            </div>
          )}
        </div>
      )}

      {!showReader && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <Camera className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-3 text-sm text-gray-600">{hint}</p>
          <Button
            type="button"
            className="mt-4 bg-emerald-600 hover:bg-emerald-700"
            onClick={requestStart}
            disabled={disabled}
          >
            <Camera className="mr-2 h-4 w-4" />
            {buttonLabel}
          </Button>
        </div>
      )}

      {active && (
        <Button type="button" variant="outline" className="w-full" onClick={stopScanner}>
          Stop scanner
        </Button>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p>{error}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-red-300 bg-white text-red-900 hover:bg-red-50"
              onClick={requestStart}
              disabled={disabled || starting || shouldStart}
            >
              Try camera again
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/** Parse emailed QR JSON or raw payload string into qrPayload + signature. */
export function parseQrScanText(raw: string): { qrPayload: string; signature: string } | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as { qrPayload?: string; signature?: string };
    if (parsed.qrPayload && parsed.signature) {
      return { qrPayload: parsed.qrPayload, signature: parsed.signature };
    }
  } catch {
    // not JSON
  }
  return null;
}
