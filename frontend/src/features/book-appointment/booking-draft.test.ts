import {
  bookingResumeHref,
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
  type BookingDraft,
} from './booking-draft';

const draft: BookingDraft = {
  branchId: 'branch-1',
  branchName: 'Ovum Hospital — Kalyan Nagar',
  departmentId: 'dept-1',
  subDepartmentId: 'sub-1',
  doctorId: 'doc-1',
  selectedDoctor: null,
  appointmentDate: '2026-10-20',
  slotId: 'slot-1',
  requestCustomSlot: false,
  preferredTime: '10:00',
  purpose: 'Follow-up consultation',
  itemsCarrying: 'Nothing',
  appointmentMode: 'IN_PERSON',
  visitorType: 'GENERAL',
  companyName: '',
  companyEmail: '',
  firstName: 'Asha',
  lastName: 'K',
  phone: '9876543210',
  email: 'asha@example.com',
  profileCreatedHere: true,
};

describe('booking draft', () => {
  afterEach(() => clearBookingDraft());

  it('keeps the booking across a page change and clears it after use', () => {
    saveBookingDraft(draft);
    expect(loadBookingDraft()).toEqual(draft);

    clearBookingDraft();
    expect(loadBookingDraft()).toBeNull();
  });

  it('builds a resume link that keeps the current query', () => {
    window.history.replaceState(null, '', '/book-appointment/?branch=ovum-hospital-kalyan-nagar');
    expect(bookingResumeHref()).toBe(
      '/book-appointment/?branch=ovum-hospital-kalyan-nagar&resume=1',
    );
  });
});
