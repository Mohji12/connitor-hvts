'use client';

import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Copy, Download, RefreshCw, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BranchService } from '@/lib/services/branchService';
import { hospitalGatePath } from '@/lib/static-export-route';
import { androidGateIntent, iosGateDeepLink, gateWebUrl } from '@/lib/gate-deeplink';

const DOWNLOAD_SIZE = 720;

export function BranchGateQr({
  branchId,
  branchName,
  chainId,
  canRefresh = false,
}: {
  branchId: string;
  branchName?: string | null;
  chainId?: string | null;
  canRefresh?: boolean;
}): React.ReactElement | null {
  const svgWrapRef = React.useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const href = React.useMemo(() => {
    if (!branchId || typeof window === 'undefined') return '';
    const web = gateWebUrl(branchId, window.location.origin);
    // Use Android intent URL — Chrome on Android opens the app directly;
    // iOS Safari ignores intent:// but handles conninter:// custom scheme.
    // The QR value is always the Android intent because it has a built-in
    // browser_fallback_url for users who do not have the app installed.
    return androidGateIntent(branchId, web);
  }, [branchId]);

  if (!branchId || !href) return null;

  const fileBase = (branchName || 'hospital').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'hospital';

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(href);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  }

  async function downloadQr(): Promise<void> {
    const svg = svgWrapRef.current?.querySelector('svg');
    if (!svg) {
      toast.error('Could not download the QR code');
      return;
    }
    try {
      const xml = new XMLSerializer().serializeToString(svg);
      const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('qr image'));
        image.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = DOWNLOAD_SIZE;
      canvas.height = DOWNLOAD_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, DOWNLOAD_SIZE, DOWNLOAD_SIZE);
      ctx.drawImage(image, 0, 0, DOWNLOAD_SIZE, DOWNLOAD_SIZE);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${fileBase}-gate-qr.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('QR code downloaded');
    } catch {
      toast.error('Could not download the QR code');
    }
  }

  async function refreshQr(): Promise<void> {
    if (!chainId) {
      toast.error('Could not refresh this QR code');
      return;
    }
    setRefreshing(true);
    try {
      await BranchService.generateQR(chainId, branchId);
      toast.success('Gate QR refreshed');
    } catch {
      toast.error('Could not refresh the QR code');
    } finally {
      setRefreshing(false);
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Hospital desk QR for ${branchName || 'this hospital'}: ${href}`,
  )}`;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>Hospital desk QR</CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" onClick={() => void downloadQr()}>
            <Download className="mr-2 h-4 w-4" />
            Download QR
          </Button>
          <Button type="button" variant="outline" onClick={() => void copyLink()}>
            <Copy className="mr-2 h-4 w-4" />
            Copy link
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              <Share2 className="mr-2 h-4 w-4" />
              Share on WhatsApp
            </a>
          </Button>
          {canRefresh && chainId ? (
            <Button type="button" variant="outline" disabled={refreshing} onClick={() => void refreshQr()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {refreshing ? 'Refreshing…' : 'Refresh QR'}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 text-center">
        <div ref={svgWrapRef} className="rounded-2xl border bg-white p-3">
          <QRCodeSVG value={href} size={180} includeMargin level="M" />
        </div>
        {branchName ? <p className="text-sm font-medium">{branchName}</p> : null}
        <p className="text-sm text-muted-foreground">
          Security can print this at the desk. Scanning it lets someone book a visit, book a delivery, or
          apply for a secondary attendant pass at this hospital.
        </p>
      </CardContent>
    </Card>
  );
}
