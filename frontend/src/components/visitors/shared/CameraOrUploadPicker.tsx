'use client';

import * as React from 'react';
import { Camera, Upload } from 'lucide-react';
import { LiveCamera } from '@/components/camera/LiveCamera';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CameraOrUploadPickerProps {
  /** Id of the hidden upload input (used by form labels and tests). */
  inputId: string;
  inputAriaLabel: string;
  /** MIME types accepted by "Upload from device", e.g. "image/jpeg,image/png,application/pdf". */
  accept: string;
  /** Camera to open first: "user" for a selfie, "environment" for photographing a document. */
  facingMode: 'user' | 'environment';
  /** Prefix for the captured file name, e.g. "visitor-photo". */
  fileNamePrefix: string;
  captureLabel?: string;
  uploadLabel?: string;
  disabled?: boolean;
  /** Tailwind classes for the two buttons, to match the surrounding form's colour. */
  buttonClassName?: string;
  onFile: (file: File) => void;
}

export function CameraOrUploadPicker({
  inputId,
  inputAriaLabel,
  accept,
  facingMode,
  fileNamePrefix,
  captureLabel = 'Take live photo',
  uploadLabel = 'Upload from device',
  disabled = false,
  buttonClassName,
  onFile,
}: CameraOrUploadPickerProps): React.ReactElement {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const fallbackRef = React.useRef<HTMLInputElement>(null);
  const [cameraOn, setCameraOn] = React.useState(false);

  const startCamera = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      fallbackRef.current?.click();
      return;
    }
    setCameraOn(true);
  };

  const pickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onFile(file);
  };

  return (
    <div className="space-y-3">
      {cameraOn ? (
        <LiveCamera
          initialFacing={facingMode}
          fileNamePrefix={fileNamePrefix}
          onCapture={(file) => {
            setCameraOn(false);
            onFile(file);
          }}
          onCancel={() => setCameraOn(false)}
        />
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={startCamera}
            disabled={disabled}
            className={cn('min-h-[48px]', buttonClassName)}
          >
            <Camera className="mr-2 h-5 w-5" />
            {captureLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            className={cn('min-h-[48px]', buttonClassName)}
          >
            <Upload className="mr-2 h-5 w-5" />
            {uploadLabel}
          </Button>
        </div>
      )}

      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept={accept}
        onChange={pickFile}
        disabled={disabled}
        className="hidden"
        aria-label={inputAriaLabel}
      />
      <input
        ref={fallbackRef}
        type="file"
        accept="image/*"
        capture={facingMode}
        onChange={pickFile}
        disabled={disabled}
        className="hidden"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
