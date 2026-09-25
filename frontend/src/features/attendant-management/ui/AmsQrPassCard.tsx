'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AmsQrPassCard({
  passNumber,
  attendantName,
  patientName,
  ward,
  bed,
  validTo,
  status,
  qrPayload,
  qrSignature,
}: {
  passNumber: string;
  attendantName: string;
  patientName: string;
  ward?: string | null;
  bed?: string | null;
  validTo?: string | null;
  status: string;
  qrPayload?: string | null;
  qrSignature?: string | null;
}): React.ReactElement {
  const qrText = qrPayload && qrSignature ? `${qrPayload}|${qrSignature}` : passNumber;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrText)}`;

  const download = () => {
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `${passNumber}.png`;
    a.target = '_blank';
    a.click();
  };

  const printPass = () => {
    window.print();
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(
      `Attendant Pass ${passNumber}\n${attendantName} for ${patientName}\nValid until ${validTo ?? '—'}\nStatus: ${status}`,
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <Card className="rounded-xl border-[#0052CC]/20 print:border-0 print:shadow-none">
      <CardHeader>
        <CardTitle className="text-[#0052CC]">Attendant Pass</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt={`QR ${passNumber}`} className="mx-auto h-52 w-52 rounded-lg border" />
        <div className="space-y-1 text-sm">
          <p className="text-lg font-semibold">{attendantName}</p>
          <p>Patient: {patientName}</p>
          <p>
            Ward: {ward ?? '—'} · Bed: {bed ?? '—'}
          </p>
          <p>Pass ID: {passNumber}</p>
          <p>Validity: {validTo ? new Date(validTo).toLocaleString() : '—'}</p>
          <p className="font-medium text-emerald-700">Status: {status}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 print:hidden">
          <Button type="button" variant="outline" onClick={download}>
            Download
          </Button>
          <Button type="button" variant="outline" onClick={printPass}>
            Print
          </Button>
          <Button type="button" className="bg-[#0052CC] hover:bg-[#0041a3]" onClick={shareWhatsApp}>
            Send WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
