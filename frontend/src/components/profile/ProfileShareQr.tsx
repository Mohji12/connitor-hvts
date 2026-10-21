'use client';

import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DOWNLOAD_SIZE = 720;

export function ProfileShareQr({
  token,
  cardUrl,
}: {
  token?: string | null;
  cardUrl?: string | null;
}): React.ReactElement | null {
  const svgWrapRef = React.useRef<HTMLDivElement>(null);
  const href = React.useMemo(() => {
    if (cardUrl) return cardUrl;
    if (!token || typeof window === 'undefined') return '';
    return `${window.location.origin}/card/${token}/`;
  }, [cardUrl, token]);

  if (!token || !href) return null;

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
      link.download = 'conninter-contact-qr.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('QR code downloaded');
    } catch {
      toast.error('Could not download the QR code');
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>Share my contact</CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={() => void downloadQr()}>
            <Download className="mr-2 h-4 w-4" />
            Download QR
          </Button>
          <Button type="button" variant="outline" onClick={() => void copyLink()}>
            <Copy className="mr-2 h-4 w-4" />
            Copy link
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 text-center">
        <div ref={svgWrapRef} className="rounded-2xl border bg-white p-3">
          <QRCodeSVG value={href} size={180} includeMargin level="M" />
        </div>
        <p className="text-sm text-muted-foreground">
          Scan to save my contact. The other person does not need a Conninter login.
        </p>
      </CardContent>
    </Card>
  );
}
