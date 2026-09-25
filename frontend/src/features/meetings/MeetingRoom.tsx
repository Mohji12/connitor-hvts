'use client';

import '@livekit/components-styles';
import './meetingRoom.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CarouselLayout,
  ConnectionStateToast,
  ControlBar,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  LiveKitRoom,
  ParticipantTile,
  PreJoin,
  RoomAudioRenderer,
  isTrackReference,
  useCreateLayoutContext,
  usePinnedTracks,
  useRoomContext,
  useTracks,
  type LocalUserChoices,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { RoomEvent, Track, type Room } from 'livekit-client';
import { AlertTriangle, CalendarClock, Clock, LinkIcon, PhoneOff, RefreshCw, Video } from 'lucide-react';
import { ConnitorLoader } from '@/components/ConnitorLoader';
import { ConninterWordmark } from '@/components/brand/ConninterWordmark';
import { Button } from '@/components/ui/button';
import { datetimeLocalToIstIso, formatIstDateTime } from '@/lib/datetime';
import {
  MeetingApi,
  toMeetingAccessError,
  type MeetingAccess,
  type MeetingAccessError,
} from '@/lib/services/meetingService';

type Phase =
  | { kind: 'loading' }
  | { kind: 'error'; error: MeetingAccessError }
  | { kind: 'prejoin'; access: MeetingAccess }
  | { kind: 'in-call'; access: MeetingAccess; choices: LocalUserChoices }
  | { kind: 'left'; access: MeetingAccess; reason: string };

declare global {
  interface Window {
    __lkRoom?: Room;
  }
}

function e2eHooksEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_E2E_HOOKS === 'true') return true;
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('e2e') === '1';
}

function istTimestamp(value: string): number {
  return new Date(datetimeLocalToIstIso(value)).getTime();
}

function sameTrackRef(a?: TrackReferenceOrPlaceholder, b?: TrackReferenceOrPlaceholder): boolean {
  if (!a || !b) return false;
  return (
    a.participant.identity === b.participant.identity &&
    a.source === b.source &&
    (a.publication?.trackSid ?? '') === (b.publication?.trackSid ?? '')
  );
}

function E2EHook() {
  const room = useRoomContext();
  useEffect(() => {
    if (!e2eHooksEnabled()) return;
    window.__lkRoom = room;
    return () => {
      delete window.__lkRoom;
    };
  }, [room]);
  return null;
}

/** VideoConference without chat: grid by default, auto-focus on screenshare. */
function ConsultationStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );
  const layoutContext = useCreateLayoutContext();
  const screenShareTracks = tracks
    .filter(isTrackReference)
    .filter((track) => track.publication.source === Track.Source.ScreenShare);
  const focusTrack = usePinnedTracks(layoutContext)?.[0];
  const carouselTracks = tracks.filter((track) => !sameTrackRef(track, focusTrack));
  const autoFocused = useRef<TrackReferenceOrPlaceholder | null>(null);

  const screenShareKey = screenShareTracks
    .map((track) => `${track.publication.trackSid}_${track.publication.isSubscribed}`)
    .join();

  useEffect(() => {
    const dispatch = layoutContext.pin.dispatch;
    if (screenShareTracks.some((track) => track.publication.isSubscribed) && autoFocused.current === null) {
      dispatch?.({ msg: 'set_pin', trackReference: screenShareTracks[0] });
      autoFocused.current = screenShareTracks[0];
    } else if (
      autoFocused.current &&
      !screenShareTracks.some(
        (track) => track.publication.trackSid === autoFocused.current?.publication?.trackSid,
      )
    ) {
      dispatch?.({ msg: 'clear_pin' });
      autoFocused.current = null;
    }
    if (focusTrack && !isTrackReference(focusTrack)) {
      const updated = tracks.find(
        (track) =>
          track.participant.identity === focusTrack.participant.identity &&
          track.source === focusTrack.source,
      );
      if (updated && updated !== focusTrack && isTrackReference(updated)) {
        dispatch?.({ msg: 'set_pin', trackReference: updated });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mirrors LiveKit's VideoConference prefab
  }, [screenShareKey, focusTrack?.publication?.trackSid, tracks]);

  return (
    <LayoutContextProvider value={layoutContext}>
      <div className="lk-video-conference" data-testid="meeting-stage">
        <div className="lk-video-conference-inner">
          {focusTrack ? (
            <div className="lk-focus-layout-wrapper" data-testid="meeting-focus-layout">
              <FocusLayoutContainer>
                <CarouselLayout tracks={carouselTracks}>
                  <ParticipantTile />
                </CarouselLayout>
                <FocusLayout trackRef={focusTrack} />
              </FocusLayoutContainer>
            </div>
          ) : (
            <div className="lk-grid-layout-wrapper" data-testid="meeting-grid-layout">
              <GridLayout tracks={tracks}>
                <ParticipantTile />
              </GridLayout>
            </div>
          )}
          <ControlBar controls={{ chat: false, settings: false }} saveUserChoices={false} />
        </div>
      </div>
    </LayoutContextProvider>
  );
}

function VisitHeader({ access }: { access: MeetingAccess }) {
  const { visit, role } = access;
  const counterpart = role === 'host' ? visit.visitorName : visit.doctorName;
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#001b71] px-4 py-3 text-white">
      <div className="flex items-center gap-3">
        <ConninterWordmark href={null} size="sm" className="text-white" />
        <span className="hidden h-5 w-px bg-white/20 sm:block" />
        <div className="text-sm leading-tight">
          <p className="font-semibold" data-testid="meeting-title">
            Online consultation{counterpart ? ` with ${counterpart}` : ''}
          </p>
          <p className="text-white/70">
            {visit.hospitalName ? `${visit.hospitalName} · ` : ''}
            {visit.appointmentDate ? formatIstDateTime(datetimeLocalToIstIso(visit.appointmentDate)) : ''}
          </p>
        </div>
      </div>
      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
        {role === 'host' ? 'Doctor (host)' : 'Patient'}
      </span>
    </header>
  );
}

function StatusCard({
  icon,
  title,
  children,
  testId,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  testId: string;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <div
        className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
        data-testid={testId}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eef5ff] text-[#001b71]">
          {icon}
        </div>
        <h1 className="text-xl font-semibold text-[#001b71]">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function Countdown({ opensAt, onOpen }: { opensAt: string; onOpen: () => void }) {
  const target = useMemo(() => istTimestamp(opensAt), [opensAt]);
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = Math.max(0, target - now);
  useEffect(() => {
    if (remaining === 0 && !fired.current) {
      fired.current = true;
      onOpen();
    }
  }, [remaining, onOpen]);

  const totalSeconds = Math.ceil(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <p className="font-mono text-3xl font-semibold text-[#001b71]" data-testid="meeting-countdown">
      {hours > 0 ? `${hours}:` : ''}
      {pad(minutes)}:{pad(seconds)}
    </p>
  );
}

function deviceErrorMessage(error: Error): string {
  const name = error.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera or microphone access was blocked. Allow access in your browser settings, then reload this page.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera or microphone was found. You can still join with them turned off.';
  }
  if (name === 'NotReadableError') {
    return 'Your camera or microphone is being used by another app. Close it and try again.';
  }
  return error.message || 'Could not access your camera or microphone.';
}

export function MeetingRoom({ joinToken }: { joinToken: string | null }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const loadAccess = useCallback(
    async (next: (access: MeetingAccess) => Phase = (access) => ({ kind: 'prejoin', access })) => {
      if (!joinToken) {
        setPhase({
          kind: 'error',
          error: { kind: 'invalid', message: 'This consultation link is incomplete. Open the link from your email or SMS again.' },
        });
        return;
      }
      setPhase({ kind: 'loading' });
      try {
        const access = await MeetingApi.getAccess(joinToken);
        setPhase(next(access));
      } catch (err) {
        setPhase({ kind: 'error', error: toMeetingAccessError(err) });
      }
    },
    [joinToken],
  );

  useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  const onPreJoinSubmit = useCallback(
    (choices: LocalUserChoices) => {
      if (phase.kind !== 'prejoin') return;
      setDeviceError(null);
      setPhase({ kind: 'in-call', access: phase.access, choices });
    },
    [phase],
  );

  const onDisconnected = useCallback(() => {
    setPhase((current) =>
      current.kind === 'in-call'
        ? { kind: 'left', access: current.access, reason: 'You left the consultation.' }
        : current,
    );
  }, []);

  if (phase.kind === 'loading') {
    return <ConnitorLoader variant="fullscreen" message="Preparing your consultation room…" />;
  }

  if (phase.kind === 'error') {
    const { error } = phase;
    if (error.kind === 'too-early') {
      return (
        <StatusCard icon={<CalendarClock className="h-7 w-7" />} title="The room isn't open yet" testId="meeting-too-early">
          <p className="text-sm text-slate-600">
            You can join from {formatIstDateTime(datetimeLocalToIstIso(error.opensAt))}. This page opens the room
            automatically.
          </p>
          <Countdown opensAt={error.opensAt} onOpen={() => void loadAccess()} />
        </StatusCard>
      );
    }
    if (error.kind === 'not-configured') {
      return (
        <StatusCard icon={<AlertTriangle className="h-7 w-7" />} title="Video consultations are unavailable" testId="meeting-not-configured">
          <p className="text-sm text-slate-600">
            The hospital hasn&apos;t finished setting up video consultations. Please contact the hospital to reschedule.
          </p>
        </StatusCard>
      );
    }
    if (error.kind === 'network') {
      return (
        <StatusCard icon={<AlertTriangle className="h-7 w-7" />} title="Can't reach the server" testId="meeting-network-error">
          <p className="text-sm text-slate-600">{error.message}</p>
          <Button onClick={() => void loadAccess()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Try again
          </Button>
        </StatusCard>
      );
    }
    return (
      <StatusCard icon={<LinkIcon className="h-7 w-7" />} title="This link can't be used" testId="meeting-invalid">
        <p className="text-sm text-slate-600">{error.message}</p>
      </StatusCard>
    );
  }

  if (phase.kind === 'left') {
    return (
      <div className="min-h-screen bg-slate-50">
        <VisitHeader access={phase.access} />
        <StatusCard icon={<PhoneOff className="h-7 w-7" />} title="You've left the consultation" testId="meeting-left">
          <p className="text-sm text-slate-600">
            If you left by mistake you can rejoin while the consultation window is open (until{' '}
            {formatIstDateTime(datetimeLocalToIstIso(phase.access.closesAt))}).
          </p>
          <Button onClick={() => void loadAccess()} data-testid="meeting-rejoin">
            <Video className="mr-2 h-4 w-4" /> Rejoin
          </Button>
        </StatusCard>
      </div>
    );
  }

  if (phase.kind === 'prejoin') {
    return (
      <div className="min-h-screen bg-slate-50">
        <VisitHeader access={phase.access} />
        <main className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-[#001b71]">Check your camera and microphone</h1>
            <p className="mt-1 text-sm text-slate-600">
              Joining as <strong>{phase.access.displayName}</strong>. You can change devices during the call.
            </p>
          </div>
          {deviceError && (
            <p className="w-full rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
              {deviceError}
            </p>
          )}
          <div className="conninter-prejoin w-full rounded-2xl bg-[#0b1437] p-4 shadow-lg" data-lk-theme="default" data-testid="meeting-prejoin">
            <PreJoin
              defaults={{ username: phase.access.displayName, videoEnabled: true, audioEnabled: true }}
              persistUserChoices={false}
              joinLabel="Join consultation"
              micLabel="Microphone"
              camLabel="Camera"
              onSubmit={onPreJoinSubmit}
              onError={(err) => setDeviceError(deviceErrorMessage(err))}
            />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" /> Room open until {formatIstDateTime(datetimeLocalToIstIso(phase.access.closesAt))}
          </p>
        </main>
      </div>
    );
  }

  const { access, choices } = phase;
  return (
    <div className="flex h-dvh flex-col bg-[#0b1437]">
      <VisitHeader access={access} />
      {deviceError && (
        <p className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-900" role="alert">
          {deviceError}
        </p>
      )}
      <LiveKitRoom
        serverUrl={access.serverUrl}
        token={access.participantToken}
        connect
        video={choices.videoEnabled ? { deviceId: choices.videoDeviceId || undefined } : false}
        audio={choices.audioEnabled ? { deviceId: choices.audioDeviceId || undefined } : false}
        options={{ adaptiveStream: true, dynacast: true }}
        onDisconnected={onDisconnected}
        onMediaDeviceFailure={(_failure, kind) =>
          setDeviceError(
            kind === 'videoinput'
              ? 'Your camera could not be started. Check permissions or pick another camera.'
              : 'Your microphone could not be started. Check permissions or pick another microphone.',
          )
        }
        onError={(err) => setDeviceError(err.message)}
        data-lk-theme="default"
        className="conninter-room min-h-0 flex-1"
        data-testid="meeting-room"
      >
        <ConsultationStage />
        <RoomAudioRenderer />
        <ConnectionStateToast />
        <E2EHook />
      </LiveKitRoom>
    </div>
  );
}
