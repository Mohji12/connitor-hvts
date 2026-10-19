'use client';

import * as React from 'react';
import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CameraOrUploadPicker } from '@/components/visitors/shared/CameraOrUploadPicker';

export const GOVT_ID_OPTIONS = [
  { value: 'AADHAAR', label: 'Aadhaar' },
  { value: 'PAN', label: 'PAN card' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving licence' },
  { value: 'VOTER_ID', label: 'Voter ID' },
] as const;

const MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ID_TYPES = [...PHOTO_TYPES, 'application/pdf'];

export interface BookingDocumentsValue {
  photo: File | null;
  idDocument: File | null;
  idType: string;
}

export interface BookingIdentityDocumentsProps {
  value: BookingDocumentsValue;
  onChange: (value: BookingDocumentsValue) => void;
  photoOnFileUrl: string | null;
  idOnFileType: string | null;
  disabled?: boolean;
}

function idLabel(type: string | null): string {
  return GOVT_ID_OPTIONS.find((o) => o.value === type)?.label ?? type ?? 'ID';
}

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

export function BookingIdentityDocuments({
  value,
  onChange,
  photoOnFileUrl,
  idOnFileType,
  disabled = false,
}: BookingIdentityDocumentsProps): React.ReactElement {
  const [error, setError] = React.useState('');
  const [replacingPhoto, setReplacingPhoto] = React.useState(false);
  const [replacingId, setReplacingId] = React.useState(false);
  const photoPreview = useObjectUrl(value.photo);
  const idPreview = useObjectUrl(value.idDocument?.type.startsWith('image/') ? value.idDocument : null);

  const accept = (file: File, allowed: string[], label: string): boolean => {
    if (!allowed.includes(file.type)) {
      setError(`${label}: use a JPG, PNG or WebP image${allowed.includes('application/pdf') ? ', or a PDF' : ''}.`);
      return false;
    }
    if (file.size > MAX_BYTES) {
      setError(`${label} must be 5 MB or smaller.`);
      return false;
    }
    setError('');
    return true;
  };

  const showPhotoPicker = !value.photo && (!photoOnFileUrl || replacingPhoto);
  const showIdPicker = !value.idDocument && (!idOnFileType || replacingId);

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Photo &amp; ID</p>
        <p className="text-xs text-muted-foreground">
          Security matches your photo at the gate. Take a live photo or upload one.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Your photo{photoOnFileUrl ? '' : ' *'}</Label>
        {value.photo && photoPreview ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="New photo" className="h-16 w-16 rounded-full border object-cover" />
            <span className="text-sm text-emerald-700">New photo ready</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange({ ...value, photo: null })}
            >
              <X className="mr-1 h-4 w-4" /> Remove
            </Button>
          </div>
        ) : null}
        {!value.photo && photoOnFileUrl && !replacingPhoto ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoOnFileUrl} alt="Photo on file" className="h-16 w-16 rounded-full border object-cover" />
            <span className="text-sm text-muted-foreground">Photo on file</span>
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setReplacingPhoto(true)}>
              Replace
            </Button>
          </div>
        ) : null}
        {showPhotoPicker ? (
          <CameraOrUploadPicker
            inputId="booking-photo-input"
            inputAriaLabel="Upload your photo"
            accept={PHOTO_TYPES.join(',')}
            facingMode="user"
            fileNamePrefix="visitor-photo"
            disabled={disabled}
            onFile={(file) => {
              if (accept(file, PHOTO_TYPES, 'Photo')) onChange({ ...value, photo: file });
            }}
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-id-type">ID document (optional)</Label>
        {value.idDocument ? (
          <div className="flex items-center gap-3">
            {idPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={idPreview} alt="New ID" className="h-14 w-20 rounded border object-cover" />
            ) : (
              <FileText className="h-8 w-8 text-primary" />
            )}
            <span className="min-w-0 truncate text-sm text-emerald-700">
              {idLabel(value.idType)} ready
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange({ ...value, idDocument: null })}
            >
              <X className="mr-1 h-4 w-4" /> Remove
            </Button>
          </div>
        ) : null}
        {!value.idDocument && idOnFileType && !replacingId ? (
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{idLabel(idOnFileType)} on file</span>
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setReplacingId(true)}>
              Replace
            </Button>
          </div>
        ) : null}
        {showIdPicker ? (
          <>
            <select
              id="booking-id-type"
              value={value.idType}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, idType: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {GOVT_ID_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <CameraOrUploadPicker
              inputId="booking-id-input"
              inputAriaLabel="Upload your ID document"
              accept={ID_TYPES.join(',')}
              facingMode="environment"
              fileNamePrefix="government-id"
              captureLabel="Take live photo of ID"
              disabled={disabled}
              onFile={(file) => {
                if (accept(file, ID_TYPES, 'ID document')) onChange({ ...value, idDocument: file });
              }}
            />
          </>
        ) : null}
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
