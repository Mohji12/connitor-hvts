import apiClient from '@/lib/api';
import type { SignedManifest } from '@/lib/offline-gate/types';

export type GateOpsSummary = {
  offlineEnabled: boolean;
  devices: Array<{
    id: string;
    devicePublicId: string;
    label: string;
    gateId: string;
    branchId: string;
    status: string;
    offlineEnabled: boolean;
    registeredAt: string | null;
    lastSyncAt: string | null;
    revokedAt: string | null;
    manifestVersion: number | null;
    manifestExpiresAt: string | null;
  }>;
  events: Array<{
    eventId: string;
    deviceId: string;
    passId: string;
    passType: string;
    eventType: string;
    reasonCode: string;
    decisionMode: string;
    occurredAt: string | null;
    receivedAt: string | null;
    syncStatus: string;
  }>;
  counts: {
    devices: number;
    activeDevices: number;
    conflicts: number;
    offlineAccepts: number;
    rejectedSync: number;
  };
};

export type DeviceRegisterResponse = {
  id: string;
  devicePublicId: string;
  deviceSecret: string;
  gateId: string;
  branchId: string;
  offlineEnabled: boolean;
  verifyKey: string;
  keyId: string;
  algorithm: string;
};

export type SyncResult = {
  eventId: string;
  result: 'ACCEPTED' | 'DUPLICATE' | 'REJECTED' | 'CONFLICT';
  reasonCode: string;
  syncStatus: string;
  priorEventId?: string;
};

export const GateOfflineService = {
  async registerDevice(input: {
    label: string;
    branchId?: string;
    gateId?: string;
    offlineEnabled?: boolean;
  }): Promise<DeviceRegisterResponse> {
    const { data } = await apiClient.post<DeviceRegisterResponse>('/api/gate/devices/register', input);
    return data;
  },

  async revokeDevice(deviceId: string): Promise<void> {
    await apiClient.post(`/api/gate/devices/${deviceId}/revoke`);
  },

  async setOfflineEnabled(deviceId: string, offlineEnabled: boolean): Promise<void> {
    await apiClient.post(`/api/gate/devices/${deviceId}/offline`, { offlineEnabled });
  },

  async downloadManifest(devicePublicId: string, deviceSecret: string): Promise<SignedManifest> {
    const { data } = await apiClient.get<SignedManifest>('/api/gate/offline/manifest', {
      headers: {
        'X-Gate-Device-Id': devicePublicId,
        'X-Gate-Device-Secret': deviceSecret,
      },
    });
    return data;
  },

  async syncEvents(
    devicePublicId: string,
    deviceSecret: string,
    events: Array<{
      eventId: string;
      passId: string;
      passType: string;
      eventType: string;
      reasonCode: string;
      occurredAt: string;
      decisionMode: string;
    }>,
    manifestId?: string,
  ): Promise<{ results: SyncResult[] }> {
    const { data } = await apiClient.post<{ results: SyncResult[] }>(
      '/api/gate/offline/sync',
      { events, manifestId },
      {
        headers: {
          'X-Gate-Device-Id': devicePublicId,
          'X-Gate-Device-Secret': deviceSecret,
        },
      },
    );
    return data;
  },

  async verifyOnline(rawValue: string): Promise<{
    decision: 'ACCEPT' | 'REJECT' | 'UNCERTAIN';
    reasonCode: string;
    passId: string | null;
    passType: string | null;
    online: boolean;
  }> {
    const { data } = await apiClient.post('/api/gate/verify', { rawValue });
    return data;
  },

  async ops(): Promise<GateOpsSummary> {
    const { data } = await apiClient.get<GateOpsSummary>('/api/gate/offline/ops');
    return data;
  },
};
