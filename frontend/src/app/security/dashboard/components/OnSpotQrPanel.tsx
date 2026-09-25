'use client';

import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export interface OnSpotQrPanelProps {
  branchId: string;
  branchName?: string;
  className?: string;
}

export function OnSpotQrPanel({ branchId, branchName, className }: OnSpotQrPanelProps) {
  const [copied, setCopied] = React.useState(false);
  const [onsiteUrl, setOnsiteUrl] = React.useState('');

  React.useEffect(() => {
    const params = new URLSearchParams({ branchId });
    if (branchName) params.set('name', branchName);
    setOnsiteUrl(`${window.location.origin}/visit/on-spot?${params.toString()}`);
  }, [branchId, branchName]);

  const copyLink = async () => {
    if (!onsiteUrl) return;
    try {
      await navigator.clipboard.writeText(onsiteUrl);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  if (!onsiteUrl) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" aria-hidden="true" />
          <CardTitle className="text-lg">Visitor check-in QR</CardTitle>
        </div>
        <CardDescription>
          Ask walk-in visitors to scan this code on their phone — they create a profile, book a
          doctor slot, and return with their approval QR after the doctor confirms.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="rounded-lg border bg-white p-3 shadow-sm">
          <QRCodeSVG value={onsiteUrl} size={160} level="M" includeMargin />
        </div>
        <div className="flex-1 space-y-3 text-sm w-full">
          {branchName && (
            <p>
              <span className="font-medium">Location:</span> {branchName}
            </p>
          )}
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Visitor scans QR on their phone</li>
            <li>Creates profile or signs in</li>
            <li>Books doctor + time slot</li>
            <li>After approval, scan visitor QR in Check-In tab</li>
          </ol>
          <Button type="button" variant="outline" size="sm" onClick={copyLink}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
