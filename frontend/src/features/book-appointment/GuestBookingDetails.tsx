'use client';

import * as React from 'react';
import { CheckCircle2, FileText, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CameraOrUploadPicker } from '@/components/visitors/shared/CameraOrUploadPicker';
import { getApiErrorMessage } from '@/lib/api-errors';
import { GuestBookingService, type GuestVerification } from '@/lib/services/appointmentService';

export interface GuestDocuments {
  photo: File | null;
  governmentId: File | null;
}

const MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ID_TYPES = [...PHOTO_TYPES, 'application/pdf'];

interface GuestBookingDetailsProps {
  branchId: string;
  phone: string;
  onPhoneChange: (phone: string) => void;
  verification: GuestVerification | null;
  onVerified: (verification: GuestVerification | null) => void;
  documents: GuestDocuments;
  onDocumentsChange: (documents: GuestDocuments) => void;
}

function FilePreview({ file, onRemove, label }: { file: File; onRemove: () => void; label: string }) {
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file.type.startsWith('image/')) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="h-16 w-16 rounded-md object-cover" />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-md bg-white">
          <FileText className="h-7 w-7 text-emerald-700" />
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-sm text-slate-800">{file.name}</p>
      <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove ${label}`}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function GuestBookingDetails({
  branchId,
  phone,
  onPhoneChange,
  verification,
  onVerified,
  documents,
  onDocumentsChange,
}: GuestBookingDetailsProps): React.ReactElement {
  const [codeSent, setCodeSent] = React.useState(false);
  const [otp, setOtp] = React.useState('');
  const [busy, setBusy] = React.useState<'send' | 'verify' | null>(null);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [fileError, setFileError] = React.useState('');

  const sendCode = async () => {
    setError('');
    setMessage('');
    if (phone.length !== 10) {
      setError('Enter your 10-digit mobile number.');
      return;
    }
    setBusy('send');
    try {
      const res = await GuestBookingService.sendCode(phone, branchId);
      setCodeSent(true);
      setOtp('');
      setMessage(res.testOtp ? `${res.message} (Test code: ${res.testOtp})` : res.message);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Could not send the code. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    setError('');
    if (otp.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy('verify');
    try {
      onVerified(await GuestBookingService.verifyCode(phone, branchId, otp));
      setMessage('');
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Could not verify the code.'));
    } finally {
      setBusy(null);
    }
  };

  const changeNumber = () => {
    onVerified(null);
    setCodeSent(false);
    setOtp('');
    setMessage('');
  };

  const acceptFile = (file: File, allowed: string[], key: keyof GuestDocuments) => {
    setFileError('');
    if (!allowed.includes(file.type)) {
      setFileError(key === 'photo' ? 'Photo must be a JPG, PNG or WebP image.' : 'ID must be an image or a PDF.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError('Each file must be 5 MB or smaller.');
      return;
    }
    onDocumentsChange({ ...documents, [key]: file });
  };

  return (
    <div className="space-y-4 rounded-xl border border-[#001B71]/15 bg-[#F7F9FC] p-4">
      <div>
        <p className="text-sm font-semibold text-[#001B71]">Booking without a profile</p>
        <p className="text-xs text-muted-foreground">
          Verify your mobile number, then add your photo and a government ID. You&apos;ll pay online.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest-phone">Mobile number (WhatsApp)</Label>
        <div className="flex gap-2">
          <span className="flex h-10 items-center rounded-md border bg-white px-3 text-sm text-muted-foreground">
            +91
          </span>
          <Input
            id="guest-phone"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
            inputMode="numeric"
            maxLength={10}
            readOnly={Boolean(verification)}
            className={verification ? 'bg-muted/50' : undefined}
            placeholder="10-digit number"
          />
        </div>

        {verification ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Number verified.
            <button type="button" className="text-xs underline" onClick={changeNumber}>
              Change number
            </button>
          </p>
        ) : codeSent ? (
          <div className="space-y-2">
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              aria-label="WhatsApp code"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void verify()} disabled={busy !== null}>
                {busy === 'verify' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify code
              </Button>
              <Button type="button" variant="outline" onClick={() => void sendCode()} disabled={busy !== null}>
                Resend code
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={() => void sendCode()} disabled={busy !== null}>
            {busy === 'send' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send WhatsApp code
          </Button>
        )}
        {message && <p className="text-xs text-emerald-700">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {verification && (
        <>
          <div className="space-y-2">
            <Label>
              Your photo {verification.hasPhoto ? '(already on file — replace if needed)' : <span className="text-red-500">*</span>}
            </Label>
            {documents.photo ? (
              <FilePreview
                file={documents.photo}
                label="photo"
                onRemove={() => onDocumentsChange({ ...documents, photo: null })}
              />
            ) : (
              <CameraOrUploadPicker
                inputId="guest-photo-input"
                inputAriaLabel="Upload your photo"
                accept={PHOTO_TYPES.join(',')}
                facingMode="user"
                fileNamePrefix="guest-photo"
                onFile={(file) => acceptFile(file, PHOTO_TYPES, 'photo')}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Government ID {verification.hasGovernmentId ? '(already on file — replace if needed)' : <span className="text-red-500">*</span>}
            </Label>
            <p className="text-xs text-muted-foreground">Aadhaar, PAN, passport, driving licence or voter ID.</p>
            {documents.governmentId ? (
              <FilePreview
                file={documents.governmentId}
                label="government ID"
                onRemove={() => onDocumentsChange({ ...documents, governmentId: null })}
              />
            ) : (
              <CameraOrUploadPicker
                inputId="guest-government-id-input"
                inputAriaLabel="Upload government ID"
                accept={ID_TYPES.join(',')}
                facingMode="environment"
                fileNamePrefix="guest-government-id"
                captureLabel="Take live photo of ID"
                onFile={(file) => acceptFile(file, ID_TYPES, 'governmentId')}
              />
            )}
          </div>
          {fileError && <p className="text-sm text-destructive">{fileError}</p>}
        </>
      )}
    </div>
  );
}
