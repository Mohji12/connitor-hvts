import {
  cacheVisitorPasses,
  clearVisitorPassCache,
  getCachedVisitorPass,
} from './visitor-pass-cache';
import type { VisitorAppointment } from '@/lib/services/visitorPortalService';

function visit(overrides: Partial<VisitorAppointment>): VisitorAppointment {
  return {
    bookingId: 'b1',
    status: 'APPROVED',
    purpose: null,
    appointmentDate: '2026-10-21T10:00:00',
    doctorName: 'Priya',
    doctorFeedback: null,
    doctorFeedbackAt: null,
    rejectionReason: null,
    checkInTime: null,
    checkOutTime: null,
    totalDurationMinutes: null,
    branchName: 'Kalyan Nagar',
    departmentName: 'Cardiology',
    subDepartmentName: null,
    createdAt: null,
    checkInQrCode: 'data:image/png;base64,qr',
    checkInOtp: '123456',
    checkInOtpExpiry: null,
    ...overrides,
  };
}

describe('visitor-pass-cache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores an approved pass on the phone', () => {
    cacheVisitorPasses([visit({})]);
    const cached = getCachedVisitorPass('b1');
    expect(cached?.checkInQrCode).toBe('data:image/png;base64,qr');
    expect(cached?.doctorName).toBe('Priya');
  });

  it('keeps a previously saved QR if a later fetch omits it', () => {
    cacheVisitorPasses([visit({})]);
    cacheVisitorPasses([visit({ checkInQrCode: null })]);
    expect(getCachedVisitorPass('b1')?.checkInQrCode).toBe('data:image/png;base64,qr');
  });

  it('drops a pass after checkout', () => {
    cacheVisitorPasses([visit({})]);
    cacheVisitorPasses([visit({ status: 'CHECKED_OUT' })]);
    expect(getCachedVisitorPass('b1')).toBeNull();
  });

  it('clears the phone cache', () => {
    cacheVisitorPasses([visit({})]);
    clearVisitorPassCache();
    expect(getCachedVisitorPass('b1')).toBeNull();
  });

  it('is display-only and is not a gate authorization decision', () => {
    cacheVisitorPasses([visit({})]);
    const cached = getCachedVisitorPass('b1');
    expect(cached?.checkInQrCode).toBeTruthy();
    expect(cached).not.toHaveProperty('authorized');
    expect(cached).not.toHaveProperty('gateDecision');
  });
});
