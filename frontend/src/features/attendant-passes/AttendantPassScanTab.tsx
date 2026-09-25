'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Camera, CheckCircle2, IdCard, Loader2, Upload } from 'lucide-react';
import { AttendantPassService } from '@/lib/services/attendantPassService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { parseQrScanText, QrCheckInScanner } from '@/components/security/QrCheckInScanner';

interface AttendantPassScanTabProps {
  branchId: string;
}

type ScanResult = {
  valid?: boolean;
  passNumber?: string;
  scanType?: string;
  isInside?: boolean;
  enteredAt?: string | null;
  exitedAt?: string | null;
  durationMinutes?: number | null;
  govtIdImageUrl?: string;
  emailsSent?: number;
  emailRecipients?: string[];
  checkoutQrEmailed?: boolean;
  outsideVisitingHours?: boolean;
  visitingHoursSummary?: string | null;
  attendant?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    relationship?: string;
    status?: string;
  };
  admission?: {
    wardName?: string | null;
    roomNumber?: string | null;
    patient?: { name?: string; mrn?: string } | null;
  };
};

export function AttendantPassScanTab({ branchId }: AttendantPassScanTabProps): React.ReactElement {
  const [qrText, setQrText] = React.useState('');
  const [signature, setSignature] = React.useState('');
  const [govtIdType, setGovtIdType] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [manualOpen, setManualOpen] = React.useState(false);
  const [idMode, setIdMode] = React.useState<'camera' | 'upload'>('camera');
  const [idStreaming, setIdStreaming] = React.useState(false);
  const [idCameraError, setIdCameraError] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const stopIdCamera = React.useCallback(() => {
    const video = videoRef.current;
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (video) video.srcObject = null;
    setIdStreaming(false);
  }, []);

  React.useEffect(() => {
    return () => {
      stopIdCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [stopIdCamera, previewUrl]);

  const setCapturedFile = (next: File | null, preview?: string | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    if (preview) {
      setPreviewUrl(preview);
    } else if (next && next.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(next));
    } else {
      setPreviewUrl(null);
    }
  };

  const startIdCamera = async () => {
    setIdCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIdStreaming(true);
      }
    } catch {
      setIdCameraError('Could not open camera. Allow permission or upload a photo instead.');
      setIdMode('upload');
    }
  };

  const captureIdPhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const captured = new File([blob], `govt-id-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setCapturedFile(captured, canvas.toDataURL('image/jpeg', 0.9));
        stopIdCamera();
        toast.success('Government ID photo captured');
      },
      'image/jpeg',
      0.9,
    );
  };

  const applyDecodedQr = (decoded: string) => {
    setQrText(decoded);
    const parsed = parseQrScanText(decoded);
    if (parsed) {
      setSignature(parsed.signature);
      const isExit = parsed.qrPayload.startsWith('PASS-EXIT:');
      toast.success(
        isExit
          ? 'Checkout QR scanned — validate to check out'
          : 'Check-in QR scanned — capture government ID, then validate',
      );
    } else {
      setManualOpen(true);
      toast.message('QR scanned — enter signature if not included');
    }
  };

  const handleScan = async () => {
    setError(null);
    setResult(null);
    let payload = qrText.trim();
    let sig = signature.trim();
    const parsed = parseQrScanText(qrText);
    if (parsed) {
      payload = parsed.qrPayload;
      sig = parsed.signature;
    }
    if (!payload || !sig) {
      setError('QR payload and signature are required');
      return;
    }
    const isExitQr = payload.startsWith('PASS-EXIT:');
    if (!isExitQr && !file) {
      setError('Government ID photo is required for entry — use camera or upload');
      return;
    }

    const form = new FormData();
    form.append('qrPayload', payload);
    form.append('signature', sig);
    form.append('scanType', isExitQr ? 'EXIT' : 'ENTRY');
    if (file) form.append('govtIdImage', file);
    if (govtIdType.trim()) form.append('govtIdType', govtIdType.trim());

    setLoading(true);
    try {
      const res = (await AttendantPassService.scanPass(form)) as ScanResult;
      setResult(res);
      if (res.scanType === 'EXIT') {
        const emailed = Number(res.emailsSent ?? 0);
        toast.success(
          emailed > 0
            ? `Checked out — visit summary emailed to attendant`
            : res.durationMinutes != null
              ? `Checked out — ${res.durationMinutes} min inside`
              : 'Checked out',
        );
      } else if (res.outsideVisitingHours) {
        toast.warning(
          res.visitingHoursSummary
            ? `Entry recorded outside visiting hours (${res.visitingHoursSummary}). Checkout QR emailed.`
            : 'Entry recorded outside visiting hours. Checkout QR emailed.',
        );
      } else {
        toast.success(
          res.checkoutQrEmailed
            ? 'Entry recorded — checkout QR emailed to the attendant'
            : 'Entry recorded — checkout QR will be emailed when an address is on file',
        );
      }
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      setError(detail || 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const attendant = result?.attendant;
  const admission = result?.admission;
  const patientName = admission?.patient?.name;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Scan attendant visit pass</CardTitle>
          <p className="text-sm text-muted-foreground">
            Branch {branchId}. Scan the check-in QR for entry (with government ID). After check-in,
            a checkout QR is emailed — scan that QR to check out.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <QrCheckInScanner
            readerId="attendant-qr-reader"
            onScan={async (decoded) => applyDecodedQr(decoded)}
            hint="Show the check-in or checkout QR from the attendant's email."
            buttonLabel="Open camera"
          />

          <Button
            type="button"
            variant="ghost"
            className="h-auto px-0 text-sm text-muted-foreground"
            onClick={() => setManualOpen((v) => !v)}
          >
            {manualOpen ? 'Hide manual entry' : 'Paste QR manually'}
          </Button>

          {manualOpen && (
            <div className="space-y-3 rounded-lg border border-dashed p-3">
              <div>
                <Label>QR (JSON or payload)</Label>
                <Input
                  placeholder='Paste QR JSON {"qrPayload":"...","signature":"..."} or payload'
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                />
              </div>
              <div>
                <Label>Signature (if not in JSON)</Label>
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} />
              </div>
            </div>
          )}

          {(qrText || signature) && !manualOpen && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              QR captured{signature ? ' with signature' : ''}.
              {qrText.includes('PASS-EXIT:') ||
              (parseQrScanText(qrText)?.qrPayload ?? '').startsWith('PASS-EXIT:')
                ? ' Checkout QR — validate to check out (ID photo optional).'
                : ' Check-in QR — capture government ID below, then validate.'}
            </p>
          )}

          <div>
            <Label>ID type (optional)</Label>
            <Input
              placeholder="Aadhaar / Driving Licence / Passport"
              value={govtIdType}
              onChange={(e) => setGovtIdType(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Government ID photo</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={idMode === 'camera' ? 'default' : 'outline'}
                  onClick={() => {
                    setIdMode('camera');
                    void startIdCamera();
                  }}
                >
                  <Camera className="mr-1 h-3.5 w-3.5" />
                  Camera
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={idMode === 'upload' ? 'default' : 'outline'}
                  onClick={() => {
                    stopIdCamera();
                    setIdMode('upload');
                  }}
                >
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  Upload
                </Button>
              </div>
            </div>

            {idMode === 'camera' && (
              <div className="space-y-2">
                <div className="relative aspect-video overflow-hidden rounded-lg border bg-black">
                  <video
                    ref={videoRef}
                    className="h-full w-full object-cover"
                    playsInline
                    muted
                  />
                  {!idStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                      <Button type="button" variant="secondary" onClick={() => void startIdCamera()}>
                        <Camera className="mr-2 h-4 w-4" />
                        Start ID camera
                      </Button>
                    </div>
                  )}
                </div>
                {idStreaming && (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={captureIdPhoto}>
                      <Camera className="mr-2 h-4 w-4" />
                      Capture ID photo
                    </Button>
                    <Button type="button" variant="outline" onClick={stopIdCamera}>
                      Stop camera
                    </Button>
                  </div>
                )}
                {idCameraError && <p className="text-sm text-destructive">{idCameraError}</p>}
              </div>
            )}

            {idMode === 'upload' && (
              <Input
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                onChange={(e) => setCapturedFile(e.target.files?.[0] ?? null)}
              />
            )}

            {previewUrl && (
              <div className="overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Government ID preview"
                  className="max-h-48 w-full object-contain"
                />
                <p className="truncate border-t px-3 py-1.5 text-xs text-muted-foreground">
                  {file?.name ?? 'Captured ID'}
                </p>
              </div>
            )}
            {file && !previewUrl && (
              <p className="text-sm text-muted-foreground">Selected: {file.name}</p>
            )}
          </div>

          <Button disabled={loading} onClick={() => void handleScan()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating…
              </>
            ) : (
              'Validate QR'
            )}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                {result.scanType === 'EXIT' ? 'Exit recorded' : 'Entry recorded'}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.scanType === 'EXIT'
                  ? Number(result.emailsSent ?? 0) > 0
                    ? 'Visit complete. Summary emailed to the attendant, ward, and security.'
                    : 'Visit complete. Duration recorded (email skipped if no address on file).'
                  : result.checkoutQrEmailed
                    ? 'Attendant is inside. A checkout QR was emailed — scan that QR when they leave.'
                    : 'Attendant is inside. Checkout QR will be emailed when an address is on file.'}
              </p>
            </div>
            <Badge className="bg-emerald-600 hover:bg-emerald-600">
              {result.scanType ?? 'ENTRY'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-teal-900">
                <IdCard className="h-4 w-4" />
                Gate pass
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold tracking-wide text-slate-900">
                {result.passNumber ?? '—'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Scan type: {result.scanType ?? 'ENTRY'}
                {govtIdType ? ` · ID: ${govtIdType}` : ''}
              </p>
              {result.durationMinutes != null && (
                <p className="mt-2 font-semibold text-teal-900">
                  Time inside: {result.durationMinutes} min
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-white p-4 text-sm">
                <p className="font-medium text-slate-900">Attendant</p>
                <dl className="mt-2 space-y-1.5 text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <dt>Name</dt>
                    <dd className="text-right font-medium text-slate-800">
                      {attendant?.name ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Relationship</dt>
                    <dd className="text-right">{attendant?.relationship ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Phone</dt>
                    <dd className="text-right">{attendant?.phone ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Email</dt>
                    <dd className="break-all text-right">{attendant?.email ?? '—'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border bg-white p-4 text-sm">
                <p className="font-medium text-slate-900">Patient / ward</p>
                <dl className="mt-2 space-y-1.5 text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <dt>Patient</dt>
                    <dd className="text-right font-medium text-slate-800">
                      {patientName ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>MRN</dt>
                    <dd className="text-right">{admission?.patient?.mrn ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Ward</dt>
                    <dd className="text-right">{admission?.wardName ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Room</dt>
                    <dd className="text-right">{admission?.roomNumber ?? '—'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
