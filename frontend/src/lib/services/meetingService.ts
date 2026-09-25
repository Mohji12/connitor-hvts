import axios from 'axios';
import apiClient from '@/lib/api';

export type MeetingRole = 'host' | 'guest';

export interface MeetingVisitSummary {
  visitId: string;
  doctorName: string | null;
  visitorName: string | null;
  hospitalName: string | null;
  appointmentDate: string | null;
  purpose: string | null;
  status: string;
}

export interface MeetingAccess {
  serverUrl: string;
  participantToken: string;
  roomName: string;
  role: MeetingRole;
  identity: string;
  displayName: string;
  opensAt: string;
  closesAt: string;
  visit: MeetingVisitSummary;
}

export type MeetingAccessError =
  | { kind: 'too-early'; message: string; opensAt: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'not-configured'; message: string }
  | { kind: 'network'; message: string };

export function toMeetingAccessError(err: unknown): MeetingAccessError {
  if (axios.isAxiosError(err) && err.response) {
    const data = (err.response.data ?? {}) as { message?: string; opensAt?: string };
    const message = data.message ?? 'This consultation link is invalid.';
    if (err.response.status === 425 && data.opensAt) {
      return { kind: 'too-early', message, opensAt: data.opensAt };
    }
    if (err.response.status === 503) {
      return { kind: 'not-configured', message };
    }
    if (err.response.status < 500) {
      return { kind: 'invalid', message };
    }
  }
  return {
    kind: 'network',
    message: 'Could not reach the consultation server. Check your connection and try again.',
  };
}

export const MeetingApi = {
  async getAccess(joinToken: string): Promise<MeetingAccess> {
    const response = await apiClient.post<MeetingAccess>('/api/public/meetings/token', {
      joinToken,
    });
    return response.data;
  },
};
