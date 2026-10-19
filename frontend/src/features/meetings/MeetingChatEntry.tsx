'use client';

import type { ReceivedChatMessage } from '@livekit/components-core';
import { formatChatMessageLinks } from '@livekit/components-react';

type MeetingChatEntryProps = {
  /** Injected by LiveKit `<Chat>` when used as its child template. */
  entry?: ReceivedChatMessage;
};

/**
 * Chat bubble with sender name + local system time under the message (small font).
 */
export function MeetingChatEntry({ entry }: MeetingChatEntryProps): React.ReactElement | null {
  if (!entry) return null;

  const time = new Date(entry.timestamp);
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-IN';
  const name = entry.from?.name?.trim() || entry.from?.identity || 'Participant';
  const timeLabel = time.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const edited = !!entry.editTimestamp;

  return (
    <li
      className="lk-chat-entry conninter-chat-entry"
      title={time.toLocaleString(locale)}
      data-lk-message-origin={entry.from?.isLocal ? 'local' : 'remote'}
      data-testid="meeting-chat-entry"
    >
      <span className="lk-message-body">{formatChatMessageLinks(entry.message)}</span>
      <span className="conninter-chat-meta">
        <span className="conninter-chat-name">{name}</span>
        <span className="conninter-chat-meta-sep" aria-hidden>
          ·
        </span>
        <time className="conninter-chat-time" dateTime={time.toISOString()}>
          {edited ? 'edited ' : ''}
          {timeLabel}
        </time>
      </span>
    </li>
  );
}
