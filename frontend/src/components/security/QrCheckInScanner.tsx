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

/** Wait for React to paint the reader element before html5-qrcode measures it. */
function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
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
  const scannerRef = React.useRef<{ stop: () => Promise<void> } | null>(null);
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
        await waitForLayout();
        if (cancelled) return;

        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (handledRef.current) return;
            handledRef.current = true;
            await stopScanner();
            await onScanRef.current(decodedText);
          },
          () => {
            // ignore per-frame scan misses
          },
        );

        if (!cancelled) {
          setActive(true);
        }
      } catch {
        if (!cancelled) {
          setError(permissionErrorHint);
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
              '[&_video]:!block [&_video]:!h-full [&_video]:!max-h-[360px] [&_video]:!w-full [&_video]:object-cover',
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
          <AlertDescription>{error}</AlertDescription>
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
