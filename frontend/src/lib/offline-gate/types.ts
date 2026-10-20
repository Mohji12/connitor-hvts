export type OfflinePassType = 'visitor' | 'delivery' | 'attendant';

export type OfflinePass = {
  passId: string;
  passType: OfflinePassType;
  validFrom: string;
  validUntil: string;
  status: string;
  oneTime: boolean;
  aliases?: string[];
};

export type SignedManifest = {
  manifestId: string;
  version: number;
  gateId: string;
  branchId: string;
  issuedAt: string;
  expiresAt: string;
  keyId: string;
  algorithm: string;
  offlineAcceptance: boolean;
  serverTime: string;
  passes: OfflinePass[];
  revocations: { passId: string; revokedAt: string }[];
  signature: string;
  verifyKey?: string;
};

export type LocalGateEvent = {
  eventId: string;
  passId: string;
  passType: OfflinePassType;
  eventType: 'ACCEPT' | 'REJECT' | 'UNCERTAIN';
  reasonCode: string;
  occurredAt: string;
  decisionMode: 'ONLINE' | 'OFFLINE';
  syncStatus: 'PENDING' | 'ACKED';
};

export type DeviceEnrollment = {
  devicePublicId: string;
  deviceSecret: string;
  gateId: string;
  branchId: string;
  verifyKey: string;
  offlineEnabled: boolean;
};

export type LocalVerifyResult = {
  decision: 'ACCEPT' | 'REJECT' | 'UNCERTAIN';
  reasonCode: string;
  passId: string | null;
  passType: OfflinePassType | null;
  event?: LocalGateEvent;
};
