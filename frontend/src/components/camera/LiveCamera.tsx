'use client';

import * as React from 'react';
import { Camera, Loader2, SwitchCamera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CameraFacing = 'user' | 'environment';

export interface LiveCameraProps {
  /** Camera to open first: "user" (front/selfie) or "environment" (back). */
  initialFacing?: CameraFacing;
  /** Prefix for the captured file name. */
  fileNamePrefix?: string;
  onCapture: (file: File, previewUrl: string) => void;
  onCancel: () => void;
  /** Shown when the browser blocks or has no camera, e.g. to offer an upload instead. */
  onUnavailable?: () => void;
  className?: string;
}

function opposite(facing: CameraFacing): CameraFacing {
  return facing === 'user' ? 'environment' : 'user';
}

/** Live camera preview with capture and front/back switching. Opens on mount, stops on unmount. */
export function LiveCamera({
  initialFacing = 'user',
  fileNamePrefix = 'photo',
  onCapture,
  onCancel,
  onUnavailable,
  className,
}: LiveCameraProps): React.ReactElement {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [facing, setFacing] = React.useState<CameraFacing>(initialFacing);
  const [deviceId, setDeviceId] = React.useState<string | undefined>();
  const [cameraCount, setCameraCount] = React.useState(0);
  const [starting, setStarting] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const stop = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const open = React.useCallback(
    async (request: { facing: CameraFacing; deviceId?: string }): Promise<string | undefined> => {
      setStarting(true);
      setError(null);
      stop();
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: request.deviceId
            ? { deviceId: { exact: request.deviceId } }
            : { facingMode: { ideal: request.facing } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        const settings = stream.getVideoTracks()[0]?.getSettings() ?? {};
        const actualFacing = settings.facingMode;
        setFacing(actualFacing === 'user' || actualFacing === 'environment' ? actualFacing : request.facing);
        setDeviceId(settings.deviceId);
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        setCameraCount(devices.filter((d) => d.kind === 'videoinput').length);
        return settings.deviceId;
      } catch {
        setError('Camera access was blocked or no camera was found. Allow camera access, or upload a photo instead.');
        onUnavailable?.();
        return undefined;
      } finally {
        setStarting(false);
      }
    },
    [stop, onUnavailable],
  );

  React.useEffect(() => {
    void open({ facing: initialFacing });
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open the camera once on mount
  }, []);

  const switchCamera = async () => {
    const previous = deviceId;
    const target = opposite(facing);
    const opened = await open({ facing: target });
    // Laptops ignore facingMode and reopen the same camera, so step to the next device instead.
    if (opened && opened === previous && cameraCount > 1) {
      const cameras = (await navigator.mediaDevices.enumerateDevices()).filter(
        (d) => d.kind === 'videoinput',
      );
      const index = cameras.findIndex((d) => d.deviceId === previous);
      const next = cameras[(index + 1) % cameras.length];
      if (next) await open({ facing: target, deviceId: next.deviceId });
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const previewUrl = canvas.toDataURL('image/jpeg', 0.88);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stop();
        onCapture(new File([blob], `${fileNamePrefix}-${Date.now()}.jpg`, { type: 'image/jpeg' }), previewUrl);
      },
      'image/jpeg',
      0.88,
    );
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          className={cn('max-h-72 w-full object-cover', facing === 'user' && '-scale-x-100')}
          playsInline
          muted
          autoPlay
        />
        {starting ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opening camera…
          </div>
        ) : null}
        {cameraCount > 1 && !error ? (
          <button
            type="button"
            onClick={() => void switchCamera()}
            disabled={starting}
            className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/70 disabled:opacity-50"
            aria-label={facing === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
            title="Switch camera"
          >
            <SwitchCamera className="h-5 w-5" />
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={capture} disabled={starting || !!error} className="min-h-[44px]">
          <Camera className="mr-2 h-4 w-4" />
          Capture
        </Button>
        {cameraCount > 1 && !error ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void switchCamera()}
            disabled={starting}
            className="min-h-[44px]"
          >
            <SwitchCamera className="mr-2 h-4 w-4" />
            {facing === 'user' ? 'Back camera' : 'Front camera'}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            stop();
            onCancel();
          }}
          className="min-h-[44px]"
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
