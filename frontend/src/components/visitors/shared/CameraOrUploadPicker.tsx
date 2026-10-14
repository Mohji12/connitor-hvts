'use client';

import * as React from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CameraOrUploadPickerProps {
  /** Id of the hidden upload input (used by form labels and tests). */
  inputId: string;
  inputAriaLabel: string;
  /** MIME types accepted by "Upload from device", e.g. "image/jpeg,image/png,application/pdf". */
  accept: string;
  /** "user" for a selfie, "environment" for photographing a document. */
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
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const fallbackRef = React.useRef<HTMLInputElement>(null);
  const [cameraOn, setCameraOn] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);

  const stopCamera = React.useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null | undefined;
    stream?.getTracks?.().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  React.useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      fallbackRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraOn(true);
      }
    } catch {
      setCameraError('Camera access was blocked. Allow camera access, or upload from your device instead.');
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onFile(new File([blob], `${fileNamePrefix}-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        stopCamera();
      },
      'image/jpeg',
      0.88,
    );
  };

  const pickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onFile(file);
  };

  return (
    <div className="space-y-3">
      {cameraOn ? null : (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => void startCamera()}
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

      {cameraError && <p className="text-xs text-red-600">{cameraError}</p>}

      <video
        ref={videoRef}
        className={cn(
          'w-full rounded-lg bg-black object-cover',
          facingMode === 'user' && '-scale-x-100',
          cameraOn ? 'max-h-72' : 'hidden',
        )}
        playsInline
        muted
      />
      {cameraOn && (
        <div className="flex justify-center gap-2">
          <Button type="button" onClick={capture} className="min-h-[44px]">
            <Camera className="mr-2 h-4 w-4" />
            Capture
          </Button>
          <Button type="button" variant="outline" onClick={stopCamera} className="min-h-[44px]">
            <X className="mr-2 h-4 w-4" />
            Cancel
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
