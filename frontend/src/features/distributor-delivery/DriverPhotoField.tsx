'use client';

import * as React from 'react';
import { Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const MAX_BYTES = 5 * 1024 * 1024;

type DriverPhotoFieldProps = {
  previewUrl: string | null;
  onPhoto: (file: File, previewUrl: string) => void;
  onClear?: () => void;
};

export function DriverPhotoField({
  previewUrl,
  onPhoto,
  onClear,
}: DriverPhotoFieldProps): React.ReactElement {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [cameraOn, setCameraOn] = React.useState(false);

  const stopCamera = React.useCallback(() => {
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  React.useEffect(() => () => stopCamera(), [stopCamera]);

  const acceptFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Driver photo must be 5 MB or smaller.');
      return;
    }
    onPhoto(file, URL.createObjectURL(file));
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraOn(true);
      }
    } catch {
      toast.error('Camera access is needed for a live photo. You can upload an image instead.');
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `driver-live-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onPhoto(file, canvas.toDataURL('image/jpeg', 0.85));
        stopCamera();
      },
      'image/jpeg',
      0.85,
    );
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div>
        <p className="text-sm font-medium text-slate-800">Driver photo</p>
        <p className="text-xs text-muted-foreground">
          Optional. Take a live photo or upload one. It is printed on the delivery pass.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Driver"
            className="h-16 w-16 rounded-full border object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-white text-xs text-muted-foreground">
            None
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void startCamera()}>
            <Camera className="mr-1 h-4 w-4" />
            Live photo
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" />
            Upload
          </Button>
          {previewUrl && onClear ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              Remove
            </Button>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) acceptFile(file);
          }}
        />
      </div>
      {cameraOn ? (
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={capture}>
            Capture
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={stopCamera}>
            Cancel
          </Button>
        </div>
      ) : null}
      <video
        ref={videoRef}
        className={cameraOn ? 'max-h-64 w-full rounded-md bg-black object-cover' : 'hidden'}
        playsInline
        muted
      />
    </div>
  );
}
