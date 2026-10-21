'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { CameraAccessCard } from '@/components/mobile/CameraAccessCard';
import { QrCheckInScanner } from '@/components/security/QrCheckInScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_HOME_PATH, useRegisterTopBar } from '@/lib/app-back';
import { parseAttendantQr } from '@/lib/parse-attendant-qr';

/**
 * Public attendant entry: scan the hospital branch QR, then open apply.
 * Used from the Welcome screen Attendant card (native app + web).
 */
export default function AttendantScanPage(): React.ReactElement {
  const router = useRouter();
  useRegisterTopBar();
  const [error, setError] = React.useState<string | null>(null);
  const [manualSlug, setManualSlug] = React.useState('');
  const locked = React.useRef(false);

  const openApply = React.useCallback(
    (slug: string) => {
      locked.current = true;
      setError(null);
      localStorage.setItem('conninterPersona', 'attendant');
      router.replace(`/attendant-pass/${encodeURIComponent(slug)}/`);
    },
    [router],
  );

  const onScan = React.useCallback(
    async (payload: string) => {
      if (locked.current) return;
      const slug = parseAttendantQr(payload);
      if (!slug) {
        setError(
          'Not a Conninter attendant QR. Use the hospital link at reception or the gate, or enter the branch code below.',
        );
        return;
      }
      openApply(slug);
    },
    [openApply],
  );

  const submitManual = () => {
    const cleaned = manualSlug.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
    const fromPaste = parseAttendantQr(cleaned) ?? parseAttendantQr(`/${cleaned}`);
    const slug =
      fromPaste ??
      (cleaned.includes('/')
        ? parseAttendantQr(cleaned)
        : cleaned.replace(/[^a-z0-9-_]/g, '') || null);
    if (!slug) {
      setError('Enter the branch code from the hospital (letters, numbers, hyphens).');
      return;
    }
    openApply(slug);
  };

  return (
    <div className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-lg flex-col bg-[#F7F9FC] px-4 py-4">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={APP_HOME_PATH}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Welcome
          </Link>
        </Button>
      </div>

      <h1 className="text-xl font-bold text-[#001B71]">Scan attendant QR</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Point the camera at the hospital QR at reception or the security gate.
      </p>

      <CameraAccessCard className="mt-4" alwaysShow />

      <div className="mt-4 overflow-hidden rounded-2xl border bg-white">
        <QrCheckInScanner
          onScan={onScan}
          hint="Align the hospital QR in the frame"
          buttonLabel="Start camera"
          readerId="attendant-welcome-qr"
          autoStart
        />
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-6 space-y-2">
        <Label htmlFor="branch-code">Or enter branch code</Label>
        <div className="flex gap-2">
          <Input
            id="branch-code"
            value={manualSlug}
            onChange={(e) => setManualSlug(e.target.value)}
            placeholder="e.g. kauvery-electronic-city"
            className="min-h-11"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <Button type="button" className="shrink-0" onClick={submitManual}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
