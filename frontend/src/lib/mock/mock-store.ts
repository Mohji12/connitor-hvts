import { DEFAULT_DEMO_USER_ID } from '@/lib/demo-config';
import {
  buildSeedNotifications,
  buildSeedVisits,
  MockBranch,
  MockChain,
  MockDepartment,
  MockNotification,
  MockSubDepartment,
  MockUser,
  MockVisit,
  MockVisitor,
  seedBranches,
  seedChains,
  seedDepartments,
  seedSubDepartments,
  seedUsers,
  seedVisitors,
  visitorFullName,
} from './seed-data';
import { USER_IDS } from './ids';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class MockStore {
  chains: MockChain[] = clone(seedChains);
  branches: MockBranch[] = clone(seedBranches);
  departments: MockDepartment[] = clone(seedDepartments);
  subDepartments: MockSubDepartment[] = clone(seedSubDepartments);
  users: MockUser[] = clone(seedUsers);
  visitors: MockVisitor[] = clone(seedVisitors);
  visits: MockVisit[] = buildSeedVisits();
  notifications: MockNotification[] = buildSeedNotifications();

  reset() {
    this.chains = clone(seedChains);
    this.branches = clone(seedBranches);
    this.departments = clone(seedDepartments);
    this.subDepartments = clone(seedSubDepartments);
    this.users = clone(seedUsers);
    this.visitors = clone(seedVisitors);
    this.visits = buildSeedVisits();
    this.notifications = buildSeedNotifications();
  }

  getUserById(id: string): MockUser | undefined {
    return this.users.find((user) => user.id === id);
  }

  getCurrentUser(headerUserId?: string): MockUser {
    const id = headerUserId || DEFAULT_DEMO_USER_ID;
    return this.getUserById(id) ?? this.users[0];
  }

  getVisitorById(id: string): MockVisitor | undefined {
    return this.visitors.find((visitor) => visitor.id === id);
  }

  getBranchById(id: string): MockBranch | undefined {
    return this.branches.find((branch) => branch.id === id);
  }

  getChainById(id: string): MockChain | undefined {
    return this.chains.find((chain) => chain.id === id);
  }

  getDepartmentById(id: string): MockDepartment | undefined {
    return this.departments.find((dept) => dept.id === id);
  }

  getSubDepartmentById(id: string): MockSubDepartment | undefined {
    return this.subDepartments.find((sub) => sub.id === id);
  }

  filterDepartments(
    params: Record<string, string | undefined>,
    currentUser: MockUser,
  ): MockDepartment[] {
    let result = this.departments.filter((dept) => dept.isActive);
    if (currentUser.role === 'HOSPITAL_ADMIN' && currentUser.branchId) {
      result = result.filter((dept) => dept.branchId === currentUser.branchId);
    } else if (currentUser.role === 'DEPARTMENT_ADMIN' && currentUser.departmentId) {
      result = result.filter((dept) => dept.id === currentUser.departmentId);
    } else if (currentUser.role === 'SUB_DEPARTMENT_ADMIN' && currentUser.departmentId) {
      result = result.filter((dept) => dept.id === currentUser.departmentId);
    }
    if (params.branchId) {
      result = result.filter((dept) => dept.branchId === params.branchId);
    }
    if (params.chainId) {
      result = result.filter((dept) => dept.hospitalChainId === params.chainId);
    }
    return result;
  }

  filterSubDepartments(
    params: Record<string, string | undefined>,
    currentUser: MockUser,
  ): MockSubDepartment[] {
    let result = this.subDepartments.filter((sub) => sub.isActive);
    if (currentUser.role === 'HOSPITAL_ADMIN' && currentUser.branchId) {
      result = result.filter((sub) => sub.branchId === currentUser.branchId);
    } else if (currentUser.role === 'DEPARTMENT_ADMIN' && currentUser.departmentId) {
      result = result.filter((sub) => sub.departmentId === currentUser.departmentId);
    } else if (currentUser.role === 'SUB_DEPARTMENT_ADMIN' && currentUser.subDepartmentId) {
      result = result.filter((sub) => sub.id === currentUser.subDepartmentId);
    }
    if (params.departmentId) {
      result = result.filter((sub) => sub.departmentId === params.departmentId);
    }
    if (params.branchId) {
      result = result.filter((sub) => sub.branchId === params.branchId);
    }
    return result;
  }

  createDepartment(data: Record<string, unknown>): MockDepartment {
    const dept: MockDepartment = {
      id: crypto.randomUUID(),
      name: String(data.name ?? 'Department'),
      code: String(data.code ?? 'DEPT'),
      description: (data.description as string) ?? null,
      branchId: String(data.branchId ?? ''),
      hospitalChainId: String(data.hospitalChainId ?? ''),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.departments.push(dept);
    return dept;
  }

  updateDepartment(id: string, data: Record<string, unknown>): MockDepartment | null {
    const dept = this.getDepartmentById(id);
    if (!dept) return null;
    Object.assign(dept, data);
    return dept;
  }

  deactivateDepartment(id: string): MockDepartment | null {
    const dept = this.getDepartmentById(id);
    if (!dept) return null;
    dept.isActive = false;
    return dept;
  }

  createSubDepartment(data: Record<string, unknown>): MockSubDepartment {
    const dept = this.getDepartmentById(String(data.departmentId ?? ''));
    const sub: MockSubDepartment = {
      id: crypto.randomUUID(),
      name: String(data.name ?? 'Section'),
      code: String(data.code ?? 'SUB'),
      description: (data.description as string) ?? null,
      departmentId: String(data.departmentId ?? ''),
      branchId: dept?.branchId ?? String(data.branchId ?? ''),
      hospitalChainId: dept?.hospitalChainId ?? String(data.hospitalChainId ?? ''),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.subDepartments.push(sub);
    return sub;
  }

  updateSubDepartment(id: string, data: Record<string, unknown>): MockSubDepartment | null {
    const sub = this.getSubDepartmentById(id);
    if (!sub) return null;
    Object.assign(sub, data);
    return sub;
  }

  deactivateSubDepartment(id: string): MockSubDepartment | null {
    const sub = this.getSubDepartmentById(id);
    if (!sub) return null;
    sub.isActive = false;
    return sub;
  }

  getVisitById(id: string): MockVisit | undefined {
    return this.visits.find((visit) => visit.id === id);
  }

  filterUsers(params: Record<string, string | undefined>): MockUser[] {
    let result = [...this.users];

    if (params.role) {
      result = result.filter((user) => user.role === params.role);
    }
    if (params.branchId) {
      result = result.filter((user) => user.branchId === params.branchId);
    }
    if (params.chainId) {
      result = result.filter((user) => user.hospitalChainId === params.chainId);
    }
    if (params.departmentId) {
      result = result.filter((user) => user.departmentId === params.departmentId);
    }
    if (params.subDepartmentId) {
      result = result.filter((user) => user.subDepartmentId === params.subDepartmentId);
    }
    if (params.isActive === 'true') {
      result = result.filter((user) => user.isActive);
    }
    if (params.isActive === 'false') {
      result = result.filter((user) => !user.isActive);
    }

    return result;
  }

  visitsForBranch(branchId: string): MockVisit[] {
    return this.visits.filter((visit) => visit.branchId === branchId);
  }

  visitsForChain(chainId: string): MockVisit[] {
    const branchIds = this.branches
      .filter((branch) => branch.hospitalChainId === chainId)
      .map((branch) => branch.id);
    return this.visits.filter((visit) => branchIds.includes(visit.branchId));
  }

  toSummaryRow(visit: MockVisit) {
    const visitor = this.getVisitorById(visit.visitorId);
    return {
      id: visit.id,
      visitorName: visitor ? visitorFullName(visitor) : 'Unknown Visitor',
      visitorPhone: visitor?.phone ?? '',
      visitorPhoto: null,
      personToMeet: visit.staffName ?? 'N/A',
      purpose: visit.purpose ?? visit.deliveryPlatform ?? 'Visit',
      status: visit.status,
      checkInTime: visit.checkInTime ?? null,
      checkOutTime: visit.checkOutTime ?? null,
      visitorEmail: visitor?.email ?? null,
      checkedInLocation: visit.checkedInLocation ?? null,
      rejectionReason: visit.rejectionReason ?? null,
      visitCode: visit.visitCode ?? null,
      department: visit.department ?? null,
      createdAt: visit.createdAt,
    };
  }

  toVisitorProfile(visit: MockVisit) {
    const visitor = this.getVisitorById(visit.visitorId);
    return {
      id: visit.id,
      visitorName: visitor ? visitorFullName(visitor) : 'Unknown Visitor',
      visitorPhone: visitor?.phone ?? '',
      visitorEmail: visitor?.email ?? null,
      visitorPhoto: null,
      visitType: visit.visitCategory,
      status: visit.status,
      personToMeet: visit.staffName,
      purpose: visit.purpose ?? visit.deliveryPlatform,
      checkInTime: visit.checkInTime ?? null,
      checkOutTime: visit.checkOutTime ?? null,
    };
  }

  toStaffVisit(visit: MockVisit) {
    const visitor = this.getVisitorById(visit.visitorId);
    return {
      id: visit.id,
      purpose: visit.purpose ?? visit.deliveryPlatform ?? 'Visit',
      status: visit.status,
      rejectionReason: visit.rejectionReason ?? null,
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt,
      durationMinutes: visit.durationMinutes ?? null,
      checkInTime: visit.checkInTime ?? null,
      checkOutTime: visit.checkOutTime ?? null,
      visitCode: visit.visitCode ?? null,
      visitQRCode: null,
      appointmentDate: visit.appointmentDate ?? null,
      department: visit.department ?? null,
      staffName: visit.staffName ?? null,
      staffPhone: visit.staffPhone ?? null,
      visitingCardPhoto: null,
      branchId: visit.branchId,
      visitor: {
        firstName: visitor?.firstName ?? 'Unknown',
        middleName: visitor?.middleName ?? null,
        lastName: visitor?.lastName ?? 'Visitor',
        phone: visitor?.phone ?? '',
      },
    };
  }

  getSecurityCounts(branchId: string) {
    const visits = this.visitsForBranch(branchId);
    return {
      pending: visits.filter((v) =>
        ['PENDING', 'REQUEST_SENT'].includes(v.status),
      ).length,
      approved: visits.filter((v) => v.status === 'APPROVED').length,
      checkedIn: visits.filter((v) => v.status === 'CHECKED_IN').length,
      checkedOut: visits.filter((v) => v.status === 'CHECKED_OUT').length,
      rejected: visits.filter((v) => v.status === 'REJECTED').length,
    };
  }

  getStaffPendingVisits(userId: string) {
    const user = this.getUserById(userId);
    if (!user) return [];

    return this.visits
      .filter(
        (visit) =>
          visit.staffId === userId &&
          ['PENDING', 'REQUEST_SENT'].includes(visit.status),
      )
      .map((visit) => this.toStaffVisit(visit));
  }

  getStaffHistory(userId: string) {
    const user = this.getUserById(userId);
    if (!user) return [];

    return this.visits
      .filter(
        (visit) =>
          visit.staffId === userId &&
          !['PENDING', 'REQUEST_SENT'].includes(visit.status),
      )
      .map((visit) => this.toStaffVisit(visit));
  }

  getUnreadNotifications(userId: string) {
    return this.notifications.filter(
      (notification) => notification.recipientId === userId && !notification.read,
    );
  }

  markNotificationRead(id: string) {
    const notification = this.notifications.find((item) => item.id === id);
    if (notification) notification.read = true;
  }

  approveVisit(visitId: string, doctorFeedback?: string) {
    const visit = this.getVisitById(visitId);
    if (!visit) return null;
    visit.status = 'APPROVED';
    visit.doctorFeedback =
      doctorFeedback?.trim() ||
      'Your appointment has been approved. Please arrive 15 minutes early with your ID.';
    visit.doctorFeedbackAt = new Date().toISOString();
    visit.visitCode = visit.visitCode ?? String(Math.floor(100000 + Math.random() * 900000));
    visit.checkInOtp = visit.checkInOtp ?? '123456';
    visit.checkInOtpExpiry = new Date(Date.now() + 3600000).toISOString();
    visit.gatePassGeneratedAt = new Date().toISOString();
    visit.updatedAt = new Date().toISOString();

    if (visit.appointmentDate) {
      this._notifyAdminsOnAppointmentApproval(visit);
    }

    return visit;
  }

  private _notifyAdminsOnAppointmentApproval(visit: MockVisit) {
    const visitor = this.getVisitorById(visit.visitorId);
    const visitorName = visitor
      ? `${visitor.firstName} ${visitor.lastName}`
      : 'Visitor';
    const doctorName = visit.staffName ?? 'Doctor';
    const message = `Appointment approved: ${visitorName} with ${doctorName}.`;

    const recipientIds = new Set<string>();
    this.users
      .filter((user) => user.role === 'SUPER_ADMIN' && user.isActive)
      .forEach((user) => recipientIds.add(user.id));
    if (visit.departmentId) {
      this.users
        .filter(
          (user) =>
            user.role === 'DEPARTMENT_ADMIN' &&
            user.departmentId === visit.departmentId &&
            user.isActive,
        )
        .forEach((user) => recipientIds.add(user.id));
    }
    if (visit.subDepartmentId) {
      this.users
        .filter(
          (user) =>
            user.role === 'SUB_DEPARTMENT_ADMIN' &&
            user.subDepartmentId === visit.subDepartmentId &&
            user.isActive,
        )
        .forEach((user) => recipientIds.add(user.id));
    }
    this.users
      .filter(
        (user) =>
          user.branchId === visit.branchId &&
          user.role === 'SECURITY' &&
          user.isActive,
      )
      .forEach((user) => recipientIds.add(user.id));

    recipientIds.forEach((recipientId) => {
      this.notifications.push({
        id: crypto.randomUUID(),
        message,
        read: false,
        recipientId,
        visitId: visit.id,
        createdAt: new Date().toISOString(),
      });
    });
  }

  listPublicHospitals() {
    return this.branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      city: branch.city,
      state: branch.state,
      hospitalChainId: branch.hospitalChainId,
    }));
  }

  listPublicDepartments(branchId: string) {
    return this.departments.filter(
      (dept) => dept.branchId === branchId && dept.isActive,
    );
  }

  listPublicSubDepartments(departmentId: string) {
    return this.subDepartments.filter(
      (sub) => sub.departmentId === departmentId && sub.isActive,
    );
  }

  listPublicDoctors(subDepartmentId: string) {
    return this.users
      .filter(
        (user) =>
          user.subDepartmentId === subDepartmentId &&
          user.role === 'STAFF' &&
          user.userType === 'DOCTOR' &&
          user.isActive,
      )
      .map((user) => ({
        id: user.id,
        name: user.name,
        department: user.department,
        location: user.location,
      }));
  }

  bookAppointment(data: Record<string, unknown>) {
    const branchId = String(data.branchId ?? '');
    const departmentId = String(data.departmentId ?? '');
    const subDepartmentId = String(data.subDepartmentId ?? '');
    const doctorId = String(data.doctorId ?? '');
    const phone = String(data.phone ?? '');

    const dept = this.getDepartmentById(departmentId);
    const sub = this.getSubDepartmentById(subDepartmentId);
    const doctor = this.getUserById(doctorId);
    const branch = this.getBranchById(branchId);

    if (!branch || !dept || !sub || !doctor || doctor.userType !== 'DOCTOR') {
      throw new Error('Invalid booking selection');
    }

    let visitor = this.visitors.find(
      (item) => item.phone === phone && item.branchId === branchId,
    );
    if (!visitor) {
      visitor = {
        id: crypto.randomUUID(),
        firstName: String(data.firstName ?? 'Guest'),
        lastName: String(data.lastName ?? 'Visitor'),
        phone,
        email: (data.email as string) ?? null,
        branchId,
        phoneVerified: false,
      };
      this.visitors.push(visitor);
    } else {
      visitor.firstName = String(data.firstName ?? visitor.firstName);
      visitor.lastName = String(data.lastName ?? visitor.lastName);
      if (data.email) visitor.email = String(data.email);
    }

    const visit: MockVisit = {
      id: crypto.randomUUID(),
      visitorId: visitor.id,
      branchId,
      staffId: doctor.id,
      staffName: doctor.name,
      staffPhone: doctor.phone,
      status: 'REQUEST_SENT',
      visitCategory: 'MEETING',
      purpose: String(data.purpose ?? 'Appointment'),
      department: dept.code,
      departmentId,
      subDepartmentId,
      appointmentDate: String(data.appointmentDate ?? new Date().toISOString()),
      smsApprovalCode: String(Math.floor(100000 + Math.random() * 900000)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.visits.push(visit);

    this.notifications.push({
      id: crypto.randomUUID(),
      message: `You have a new appointment request from ${visitor.firstName} ${visitor.lastName}. Please review.`,
      read: false,
      recipientId: doctor.id,
      visitId: visit.id,
      createdAt: new Date().toISOString(),
    });
    this.users
      .filter(
        (user) =>
          user.branchId === branchId && user.role === 'SECURITY' && user.isActive,
      )
      .forEach((security) => {
        this.notifications.push({
          id: crypto.randomUUID(),
          message: `New appointment from ${visitor.firstName} ${visitor.lastName} with ${doctor.name}. Pending doctor approval.`,
          read: false,
          recipientId: security.id,
          visitId: visit.id,
          createdAt: new Date().toISOString(),
        });
      });

    return {
      bookingId: visit.id,
      status: visit.status,
      message: 'Appointment booked successfully. Awaiting doctor approval.',
      appointmentDate: visit.appointmentDate,
      doctorName: doctor.name,
      departmentName: dept.name,
      subDepartmentName: sub.name,
    };
  }

  getBookingStatus(bookingId: string, phone: string) {
    const visit = this.getVisitById(bookingId);
    const visitor = visit ? this.getVisitorById(visit.visitorId) : undefined;
    if (!visit || !visitor || visitor.phone !== phone) {
      throw new Error('Booking not found');
    }
    return {
      bookingId: visit.id,
      status: visit.status,
      appointmentDate: visit.appointmentDate ?? null,
      doctorName: visit.staffName,
      purpose: visit.purpose,
      checkInTime: visit.checkInTime ?? null,
      checkOutTime: visit.checkOutTime ?? null,
      totalDurationMinutes: visit.durationMinutes ?? null,
      rejectionReason: visit.rejectionReason ?? null,
      doctorFeedback: visit.doctorFeedback ?? null,
      doctorFeedbackAt: visit.doctorFeedbackAt ?? null,
    };
  }

  getWhatsappSimulation(bookingId: string, phone: string) {
    const visit = this.getVisitById(bookingId);
    const visitor = visit ? this.getVisitorById(visit.visitorId) : undefined;
    if (!visit || !visitor || visitor.phone !== phone) {
      throw new Error('Booking not found');
    }
    const visitorName = `${visitor.firstName} ${visitor.lastName}`.trim();
    const appt = visit.appointmentDate
      ? new Date(visit.appointmentDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      : 'scheduled time';
    const code = visit.smsApprovalCode ?? '000000';
    return {
      bookingId: visit.id,
      status: visit.status,
      visitorName,
      doctorName: visit.staffName ?? 'Doctor',
      doctorPhone: visit.staffPhone ?? '',
      appointmentLabel: appt,
      approvalCode: code,
      centralWhatsAppNumber: '8625877312',
      supportsInteractiveButtons: false,
      outboundMessage: `Conninter: New request from ${visitorName} on ${appt}. Reply YES ${code} to approve or NO ${code} to reject on WhatsApp. Or review in My Visitors.`,
    };
  }

  simulateWhatsAppDoctorReply(params: {
    fromPhone: string;
    buttonId?: string;
    body?: string;
  }): { message: string } {
    const { fromPhone, buttonId, body } = params;
    let action: 'approve' | 'reject' | null = null;
    let code = '';

    if (buttonId) {
      const match = buttonId.match(/^(yes|no)_(\d{6})$/i);
      if (match) {
        action = match[1].toLowerCase() === 'yes' ? 'approve' : 'reject';
        code = match[2];
      }
    } else if (body) {
      const match = body.trim().match(/^(YES|NO|Y|N)\s*(\d{6})$/i);
      if (match) {
        action = ['YES', 'Y'].includes(match[1].toUpperCase()) ? 'approve' : 'reject';
        code = match[2];
      }
    }

    if (!action || !code) {
      return { message: 'Unrecognized reply. Tap Yes or No on the appointment message.' };
    }

    const visit = this.visits.find(
      (item) =>
        item.smsApprovalCode === code &&
        item.status === 'REQUEST_SENT' &&
        item.staffPhone === fromPhone,
    );
    if (!visit) {
      return { message: `No pending appointment found for code ${code}.` };
    }

    const visitor = this.getVisitorById(visit.visitorId);
    const visitorName = visitor
      ? `${visitor.firstName} ${visitor.lastName}`.trim()
      : 'the visitor';

    if (action === 'approve') {
      this.approveVisit(visit.id);
      return { message: `Approved. ${visitorName} has been notified with appointment details.` };
    }

    this.rejectVisit(visit.id, 'Declined via WhatsApp');
    return { message: 'Rejected. The visitor has been notified.' };
  }

  requestVisitorPortalOtp(email: string) {
    const normalized = email.trim().toLowerCase();
    const hasBookings = this.visitors.some(
      (visitor) =>
        visitor.email?.toLowerCase() === normalized &&
        this.visits.some(
          (visit) => visit.visitorId === visitor.id && visit.appointmentDate,
        ),
    );
    if (!hasBookings) {
      throw new Error('No bookings found for this email.');
    }
    return {
      message: `OTP sent to ${normalized.replace(/^(.{2}).*(@.*)$/, '$1***$2')}.`,
      testOtp: '123456',
    };
  }

  verifyVisitorPortalOtp(email: string, otp: string) {
    const normalized = email.trim().toLowerCase();
    if (otp !== '123456' && otp !== '000000') {
      throw new Error('Invalid OTP');
    }
    const visitor = this.visitors.find((item) => item.email?.toLowerCase() === normalized);
    if (!visitor) {
      throw new Error('No bookings found for this email.');
    }
    const name = `${visitor.firstName} ${visitor.lastName}`.trim();
    const tokenPayload = typeof btoa !== 'undefined' ? btoa(normalized) : normalized;
    return {
      access_token: `visitor-mock-${tokenPayload}`,
      email: normalized,
      name,
    };
  }

  getVisitorPortalAppointments(email: string) {
    const normalized = email.trim().toLowerCase();
    const visitorIds = this.visitors
      .filter((visitor) => visitor.email?.toLowerCase() === normalized)
      .map((visitor) => visitor.id);
    const primary = this.visitors.find((item) => item.email?.toLowerCase() === normalized);
    if (!primary) {
      throw new Error('Unauthorized');
    }

    const appointments = this.visits
      .filter(
        (visit) => visitorIds.includes(visit.visitorId) && visit.appointmentDate,
      )
      .sort(
        (a, b) =>
          new Date(b.appointmentDate ?? 0).getTime() -
          new Date(a.appointmentDate ?? 0).getTime(),
      )
      .map((visit) => {
        const branch = this.branches.find((item) => item.id === visit.branchId);
        const dept = visit.departmentId
          ? this.departments.find((item) => item.id === visit.departmentId)
          : undefined;
        const sub = visit.subDepartmentId
          ? this.subDepartments.find((item) => item.id === visit.subDepartmentId)
          : undefined;
        return {
          bookingId: visit.id,
          status: visit.status,
          purpose: visit.purpose ?? null,
          appointmentDate: visit.appointmentDate ?? null,
          doctorName: visit.staffName ?? null,
          doctorFeedback: visit.doctorFeedback ?? null,
          doctorFeedbackAt: visit.doctorFeedbackAt ?? null,
          rejectionReason: visit.rejectionReason ?? null,
          checkInTime: visit.checkInTime ?? null,
          checkOutTime: visit.checkOutTime ?? null,
          totalDurationMinutes: visit.totalDurationMinutes ?? visit.durationMinutes ?? null,
          branchName: branch?.name ?? null,
          departmentName: dept?.name ?? visit.department ?? null,
          subDepartmentName: sub?.name ?? null,
          createdAt: visit.createdAt,
        };
      });

    return {
      phone: primary.phone,
      visitorName: `${primary.firstName} ${primary.lastName}`.trim(),
      email: primary.email ?? null,
      totalAppointments: appointments.length,
      appointments,
    };
  }

  filterAppointments(
    params: Record<string, string | undefined>,
    currentUser: MockUser,
  ) {
    let result = this.visits.filter((visit) => !!visit.appointmentDate);

    if (currentUser.role === 'HOSPITAL_ADMIN' && currentUser.branchId) {
      result = result.filter((visit) => visit.branchId === currentUser.branchId);
    } else if (currentUser.role === 'DEPARTMENT_ADMIN' && currentUser.departmentId) {
      result = result.filter((visit) => visit.departmentId === currentUser.departmentId);
    } else if (
      currentUser.role === 'SUB_DEPARTMENT_ADMIN' &&
      currentUser.subDepartmentId
    ) {
      result = result.filter(
        (visit) => visit.subDepartmentId === currentUser.subDepartmentId,
      );
    } else if (currentUser.role === 'STAFF') {
      result = result.filter((visit) => visit.staffId === currentUser.id);
    } else if (
      currentUser.role === 'SECURITY' ||
      currentUser.role === 'SECURITY_SUPERVISOR'
    ) {
      result = result.filter((visit) => visit.branchId === currentUser.branchId);
    }

    if (params.status) {
      result = result.filter((visit) => visit.status === params.status);
    }
    if (params.branchId) {
      result = result.filter((visit) => visit.branchId === params.branchId);
    }

    return result
      .sort(
        (a, b) =>
          new Date(b.appointmentDate ?? b.createdAt).getTime() -
          new Date(a.appointmentDate ?? a.createdAt).getTime(),
      )
      .slice(0, 100)
      .map((visit) => {
        const visitor = this.getVisitorById(visit.visitorId);
        return {
          id: visit.id,
          status: visit.status,
          appointmentDate: visit.appointmentDate ?? null,
          purpose: visit.purpose ?? null,
          staffName: visit.staffName ?? null,
          departmentId: visit.departmentId ?? null,
          subDepartmentId: visit.subDepartmentId ?? null,
          checkInTime: visit.checkInTime ?? null,
          checkOutTime: visit.checkOutTime ?? null,
          totalDurationMinutes: visit.durationMinutes ?? null,
          visitor: visitor
            ? {
                firstName: visitor.firstName,
                lastName: visitor.lastName,
                phone: visitor.phone,
              }
            : undefined,
        };
      });
  }

  rejectVisit(visitId: string, reason?: string) {
    const visit = this.getVisitById(visitId);
    if (!visit) return null;
    visit.status = 'REJECTED';
    visit.rejectionReason = reason ?? 'Rejected';
    visit.doctorFeedback = visit.rejectionReason;
    visit.doctorFeedbackAt = new Date().toISOString();
    visit.updatedAt = new Date().toISOString();
    return visit;
  }

  checkInVisit(visitId: string, securityUserId?: string) {
    const visit = this.getVisitById(visitId);
    if (!visit) return { error: 'VISIT_NOT_FOUND' as const };
    if (visit.status !== 'APPROVED') {
      if (visit.status === 'CHECKED_IN') return { error: 'ALREADY_CHECKED_IN' as const };
      return { error: 'VISIT_NOT_APPROVED' as const };
    }
    if (visit.appointmentDate && !visit.idProofVerified) {
      return { error: 'ID_PROOF_NOT_VERIFIED' as const };
    }
    visit.status = 'CHECKED_IN';
    visit.checkInTime = new Date().toISOString();
    visit.updatedAt = visit.checkInTime;
    visit.checkedInById = securityUserId ?? visit.checkedInById;

    if (visit.appointmentDate && visit.staffId) {
      visit.doctorNotifiedAt = visit.checkInTime;
      const visitor = this.getVisitorById(visit.visitorId);
      const doctor = this.getUserById(visit.staffId);
      const visitorName = visitor
        ? `${visitor.firstName} ${visitor.lastName}`
        : 'Visitor';
      if (doctor) {
        this.notifications.push({
          id: crypto.randomUUID(),
          message: `Your patient, ${visitorName}, has checked in and is on their way.`,
          read: false,
          recipientId: doctor.id,
          visitId: visit.id,
          createdAt: new Date().toISOString(),
        });
      }
      this._notifyAdminsOnCheckIn(visit, visitorName);
    }

    return { visit };
  }

  private _notifyAdminsOnCheckIn(visit: MockVisit, visitorName: string) {
    const doctorName = visit.staffName ?? 'Doctor';
    const message = `Check-in: ${visitorName} arrived for appointment with ${doctorName}.`;
    const recipientIds = new Set<string>();
    this.users
      .filter((user) => user.role === 'SUPER_ADMIN' && user.isActive)
      .forEach((user) => recipientIds.add(user.id));
    if (visit.departmentId) {
      this.users
        .filter(
          (user) =>
            user.role === 'DEPARTMENT_ADMIN' &&
            user.departmentId === visit.departmentId &&
            user.isActive,
        )
        .forEach((user) => recipientIds.add(user.id));
    }
    if (visit.subDepartmentId) {
      this.users
        .filter(
          (user) =>
            user.role === 'SUB_DEPARTMENT_ADMIN' &&
            user.subDepartmentId === visit.subDepartmentId &&
            user.isActive,
        )
        .forEach((user) => recipientIds.add(user.id));
    }
    recipientIds.forEach((recipientId) => {
      this.notifications.push({
        id: crypto.randomUUID(),
        message,
        read: false,
        recipientId,
        visitId: visit.id,
        createdAt: new Date().toISOString(),
      });
    });
  }

  checkOutVisit(visitId: string) {
    const visit = this.getVisitById(visitId);
    if (!visit || visit.status !== 'CHECKED_IN') return null;
    const checkOutTime = new Date().toISOString();
    let duration: number | null = null;
    if (visit.checkInTime) {
      duration = Math.max(
        1,
        Math.round(
          (new Date(checkOutTime).getTime() - new Date(visit.checkInTime).getTime()) / 60_000,
        ),
      );
    }
    visit.status = 'CHECKED_OUT';
    visit.checkOutTime = checkOutTime;
    visit.updatedAt = checkOutTime;
    visit.durationMinutes = duration ?? undefined;
    visit.totalDurationMinutes = duration;

    const visitor = this.getVisitorById(visit.visitorId);
    const visitorName = visitor
      ? `${visitor.firstName} ${visitor.lastName}`
      : 'Visitor';
    const durText = duration != null ? `${duration} minutes` : 'unknown duration';
    const message = `Check-out: ${visitorName} left after ${durText}.`;
    this.users
      .filter((user) => user.role === 'SUPER_ADMIN' && user.isActive)
      .forEach((user) => {
        this.notifications.push({
          id: crypto.randomUUID(),
          message,
          read: false,
          recipientId: user.id,
          visitId: visit.id,
          createdAt: checkOutTime,
        });
      });

    return {
      success: true,
      durationMinutes: duration,
      totalDurationMinutes: duration,
    };
  }

  verifyIdProof(
    visitId: string,
    securityUserId: string,
    idProofType: string,
    idProofNumber: string,
  ) {
    const visit = this.getVisitById(visitId);
    if (!visit) throw new Error('Visit not found');
    if (visit.status !== 'APPROVED') throw new Error('Visit must be approved');
    visit.idProofVerified = true;
    visit.idProofType = idProofType;
    visit.idProofNumber = idProofNumber;
    visit.verifiedBySecurityId = securityUserId;
    visit.updatedAt = new Date().toISOString();
    return visit;
  }

  getPendingAppointments(branchId: string) {
    const appointments = this.visits
      .filter(
        (visit) =>
          visit.branchId === branchId &&
          visit.appointmentDate &&
          visit.status === 'REQUEST_SENT',
      )
      .sort(
        (a, b) =>
          new Date(a.appointmentDate!).getTime() - new Date(b.appointmentDate!).getTime(),
      )
      .map((visit) => {
        const visitor = this.getVisitorById(visit.visitorId);
        return {
          visitId: visit.id,
          visitorName: visitor
            ? `${visitor.firstName} ${visitor.lastName}`
            : 'Visitor',
          visitorPhone: visitor?.phone ?? '',
          doctorName: visit.staffName ?? null,
          appointmentDate: visit.appointmentDate ?? null,
          status: visit.status,
          idProofVerified: visit.idProofVerified ?? false,
          purpose: visit.purpose ?? null,
          doctorConfirmed: false,
        };
      });

    return { appointments, total: appointments.length };
  }

  getTodayAppointments(branchId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const appointments = this.visits
      .filter((visit) => {
        if (!visit.appointmentDate || visit.branchId !== branchId) return false;
        const appt = new Date(visit.appointmentDate);
        if (appt < start || appt > end) return false;
        return ['APPROVED', 'CHECKED_IN', 'CHECKED_OUT'].includes(visit.status);
      })
      .sort(
        (a, b) =>
          new Date(a.appointmentDate!).getTime() - new Date(b.appointmentDate!).getTime(),
      )
      .map((visit) => {
        const visitor = this.getVisitorById(visit.visitorId);
        return {
          visitId: visit.id,
          visitorName: visitor
            ? `${visitor.firstName} ${visitor.lastName}`
            : 'Visitor',
          visitorPhone: visitor?.phone ?? '',
          doctorName: visit.staffName ?? null,
          appointmentDate: visit.appointmentDate ?? null,
          status: visit.status,
          idProofVerified: visit.idProofVerified ?? false,
          purpose: visit.purpose ?? null,
        };
      });

    return { appointments, total: appointments.length };
  }

  buildVerifyOtpResponse(visit: MockVisit, branchId: string) {
    const visitor = this.getVisitorById(visit.visitorId);
    if (!visitor || visit.branchId !== branchId) return null;
    const otp = visit.checkInOtp ?? visit.visitCode ?? '';
    return {
      success: true,
      visitId: visit.id,
      visitorId: visitor.id,
      visitor: {
        id: visitor.id,
        firstName: visitor.firstName,
        lastName: visitor.lastName,
        phone: visitor.phone,
        email: visitor.email ?? null,
        photo: null,
        company: visitor.company ?? null,
      },
      visit: {
        id: visit.id,
        visitCategory: visit.visitCategory as 'MEETING' | 'DELIVERY',
        visitSubType: visit.visitSubType ?? null,
        status: visit.status,
        checkInOtp: otp,
        checkInOtpExpiry:
          visit.checkInOtpExpiry ?? new Date(Date.now() + 3600000).toISOString(),
        purpose: visit.purpose ?? null,
        department: visit.department ?? null,
        deliveryPlatform: visit.deliveryPlatform ?? null,
        deliveryRecipient: visit.deliveryRecipient ?? null,
        orderReference: visit.orderReference ?? null,
        staffName: visit.staffName ?? null,
        staffPhone: visit.staffPhone ?? null,
        appointmentDate: visit.appointmentDate ?? null,
        idProofVerified: visit.idProofVerified ?? false,
        idProofType: visit.idProofType ?? null,
      },
      canCheckIn: visit.status === 'APPROVED',
    };
  }

  getBranchInfo(branchId: string) {
    const branch = this.getBranchById(branchId);
    if (!branch) return null;

    const staff = this.users.filter(
      (user) => user.branchId === branchId && user.role === 'STAFF' && user.isActive,
    );

    return {
      id: branch.id,
      name: branch.name,
      users: staff.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        department: user.department ?? 'GENERAL_MEDICINE',
      })),
    };
  }

  getVisitStatusPayload(visitId: string) {
    const visit = this.getVisitById(visitId);
    const visitor = visit ? this.getVisitorById(visit.visitorId) : undefined;
    const branch = visit ? this.getBranchById(visit.branchId) : undefined;

    if (!visit || !visitor || !branch) {
      return {
        success: false,
        data: null,
        error: { code: 'VISIT_NOT_FOUND', message: 'Visit not found' },
      };
    }

    const data: Record<string, unknown> = {
      visitId: visit.id,
      status: visit.status,
      visitor: {
        id: visitor.id,
        firstName: visitor.firstName,
        lastName: visitor.lastName,
        fullName: visitorFullName(visitor),
        phone: visitor.phone,
      },
      visitCategory: visit.visitCategory,
      submittedAt: visit.createdAt,
      branch: {
        id: branch.id,
        name: branch.name,
        phone: branch.phone,
      },
    };

    if (visit.visitCategory === 'MEETING') {
      data.meetingDetails = {
        purpose: visit.purpose,
        department: visit.department,
        staffName: visit.staffName,
      };
    }

    if (visit.visitCategory === 'DELIVERY') {
      data.deliveryDetails = {
        platform: visit.deliveryPlatform,
        recipient: visit.deliveryRecipient,
        orderReference: visit.orderReference,
      };
    }

    if (visit.status === 'APPROVED' && visit.checkInOtp) {
      data.approvedAt = visit.gatePassGeneratedAt ?? visit.updatedAt;
      data.gatePass = {
        checkInOtp: visit.checkInOtp,
        validUntil: visit.checkInOtpExpiry ?? new Date(Date.now() + 3600000).toISOString(),
        generatedAt: visit.gatePassGeneratedAt ?? new Date().toISOString(),
        sentViaWhatsApp: true,
      };
    }

    if (visit.status === 'REJECTED') {
      data.rejectedAt = visit.updatedAt;
      data.rejectionReason = visit.rejectionReason;
    }

    return { success: true, data };
  }

  getAnalyticsOverview() {
    const staffCount = this.users.filter((user) => user.role === 'STAFF').length;
    const activeVisits = this.visits.filter((visit) => visit.status === 'CHECKED_IN').length;
    const today = new Date().toISOString().slice(0, 10);
    const todayVisits = this.visits.filter((visit) =>
      visit.createdAt.startsWith(today),
    ).length;

    return {
      totalChains: this.chains.length,
      totalBranches: this.branches.length,
      totalDepartments: this.departments.filter((d) => d.isActive).length,
      totalSubDepartments: this.subDepartments.filter((s) => s.isActive).length,
      totalStaff: staffCount,
      totalVisitors: this.visitors.length,
      activeVisits,
      todayVisits: todayVisits || this.visits.length,
    };
  }

  getTrendData(period = 'weekly') {
    const labels =
      period === 'hourly'
        ? ['8AM', '10AM', '12PM', '2PM', '4PM', '6PM']
        : period === 'daily'
          ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          : period === 'monthly'
            ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
            : period === 'yearly'
              ? ['2021', '2022', '2023', '2024', '2025', '2026']
              : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

    return {
      period,
      data: labels.map((label, index) => ({
        label,
        visits: 8 + index * 3 + (index % 2),
        checkIns: 5 + index * 2,
        checkOuts: 4 + index * 2,
      })),
    };
  }

  getStatusDistribution() {
    const statuses = ['PENDING', 'REQUEST_SENT', 'APPROVED', 'CHECKED_IN', 'CHECKED_OUT', 'REJECTED'];
    return statuses.map((status) => ({
      status,
      count: this.visits.filter((visit) => visit.status === status).length,
    }));
  }

  getCategoryDistribution() {
    return ['MEETING', 'DELIVERY'].map((category) => ({
      category,
      count: this.visits.filter((visit) => visit.visitCategory === category).length,
    }));
  }

  getRoleDistribution() {
    const roles = [
      'SUPER_ADMIN',
      'HOSPITAL_ADMIN',
      'DEPARTMENT_ADMIN',
      'SUB_DEPARTMENT_ADMIN',
      'CHAIN_ADMIN',
      'BRANCH_ADMIN',
      'STAFF',
      'SECURITY',
    ];
    return roles.map((role) => ({
      role,
      count: this.users.filter((user) => user.role === role).length,
    }));
  }

  private _appointmentVisitsForDepartment(departmentId: string) {
    return this.visits.filter(
      (visit) => visit.departmentId === departmentId && visit.appointmentDate,
    );
  }

  private _appointmentVisitsForSubDepartment(subDepartmentId: string) {
    return this.visits.filter(
      (visit) => visit.subDepartmentId === subDepartmentId && visit.appointmentDate,
    );
  }

  private _isToday(isoDate: string) {
    const d = new Date(isoDate);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  private _statusBreakdown(visits: MockVisit[]) {
    const statuses = ['REQUEST_SENT', 'APPROVED', 'CHECKED_IN', 'CHECKED_OUT', 'REJECTED'];
    return Object.fromEntries(
      statuses.map((status) => [
        status,
        visits.filter((visit) => visit.status === status).length,
      ]),
    ) as Record<string, number>;
  }

  private _durationSummary(visits: MockVisit[]) {
    const completed = visits.filter(
      (visit) =>
        visit.status === 'CHECKED_OUT' &&
        (visit.totalDurationMinutes != null || visit.durationMinutes != null),
    );
    if (!completed.length) {
      return { avgMinutes: 0, minMinutes: 0, maxMinutes: 0, count: 0 };
    }
    const durations = completed.map(
      (visit) => visit.totalDurationMinutes ?? visit.durationMinutes ?? 0,
    );
    return {
      avgMinutes: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      minMinutes: Math.min(...durations),
      maxMinutes: Math.max(...durations),
      count: durations.length,
    };
  }

  getDepartmentOverview(departmentId: string) {
    const dept = this.getDepartmentById(departmentId);
    const appts = this._appointmentVisitsForDepartment(departmentId);
    return {
      departmentId,
      departmentName: dept?.name ?? 'Department',
      subDepartmentCount: this.subDepartments.filter(
        (sub) => sub.departmentId === departmentId && sub.isActive,
      ).length,
      staffCount: this.users.filter(
        (user) =>
          user.departmentId === departmentId &&
          user.role === 'STAFF' &&
          user.isActive,
      ).length,
      todayAppointments: appts.filter((visit) => this._isToday(visit.appointmentDate!)).length,
      pendingAppointments: appts.filter((visit) => visit.status === 'REQUEST_SENT').length,
      activeVisits: appts.filter((visit) => visit.status === 'CHECKED_IN').length,
      completedAppointments: appts.filter((visit) => visit.status === 'CHECKED_OUT').length,
      statusBreakdown: this._statusBreakdown(appts),
      visitDuration: this._durationSummary(appts),
    };
  }

  getSubDepartmentOverview(subDepartmentId: string) {
    const sub = this.getSubDepartmentById(subDepartmentId);
    const appts = this._appointmentVisitsForSubDepartment(subDepartmentId);
    return {
      subDepartmentId,
      subDepartmentName: sub?.name ?? 'Sub-Department',
      staffCount: this.users.filter(
        (user) => user.subDepartmentId === subDepartmentId && user.isActive,
      ).length,
      doctorCount: this.users.filter(
        (user) =>
          user.subDepartmentId === subDepartmentId &&
          user.role === 'STAFF' &&
          user.userType === 'DOCTOR' &&
          user.isActive,
      ).length,
      todayAppointments: appts.filter((visit) => this._isToday(visit.appointmentDate!)).length,
      pendingAppointments: appts.filter((visit) => visit.status === 'REQUEST_SENT').length,
      activeVisits: appts.filter((visit) => visit.status === 'CHECKED_IN').length,
      completedAppointments: appts.filter((visit) => visit.status === 'CHECKED_OUT').length,
      statusBreakdown: this._statusBreakdown(appts),
      visitDuration: this._durationSummary(appts),
    };
  }

  getVisitDurationStats(user: MockUser) {
    let visits = this.visits.filter(
      (visit) =>
        visit.appointmentDate &&
        visit.status === 'CHECKED_OUT' &&
        (visit.totalDurationMinutes != null || visit.durationMinutes != null),
    );
    if (user.role === 'DEPARTMENT_ADMIN' && user.departmentId) {
      visits = visits.filter((visit) => visit.departmentId === user.departmentId);
    } else if (user.role === 'SUB_DEPARTMENT_ADMIN' && user.subDepartmentId) {
      visits = visits.filter((visit) => visit.subDepartmentId === user.subDepartmentId);
    }
    return this._durationSummary(visits);
  }

  getSuperAdminDashboard(period = 'weekly') {
    return {
      chains: this.chains,
      branches: this.branches.map((branch) => ({
        ...branch,
        hospitalChain: this.getChainById(branch.hospitalChainId)
          ? {
              id: branch.hospitalChainId,
              name: this.getChainById(branch.hospitalChainId)!.name,
            }
          : null,
      })),
      staff: this.users.filter((user) => user.role === 'STAFF'),
      overview: this.getAnalyticsOverview(),
      visitorTrends: this.getTrendData(period),
      visitStatusDistribution: this.getStatusDistribution(),
      visitCategoryDistribution: this.getCategoryDistribution(),
      userRoleDistribution: this.getRoleDistribution(),
      chainStats: this.chains.map((chain) => this.getChainStats(chain.id)),
    };
  }

  getChainStats(chainId: string) {
    const chain = this.getChainById(chainId);
    const branches = this.branches.filter((branch) => branch.hospitalChainId === chainId);
    const visits = this.visitsForChain(chainId);
    const staff = this.users.filter(
      (user) => user.hospitalChainId === chainId && user.role === 'STAFF',
    );

    return {
      chainId,
      chainName: chain?.name ?? 'Hospital Chain',
      totalBranches: branches.length,
      totalStaff: staff.length,
      totalVisitors: this.visitors.filter((visitor) =>
        branches.some((branch) => branch.id === visitor.branchId),
      ).length,
      activeVisits: visits.filter((visit) => visit.status === 'CHECKED_IN').length,
      todayVisits: visits.length,
    };
  }

  getBranchStats(branchId: string) {
    const branch = this.getBranchById(branchId);
    const visits = this.visitsForBranch(branchId);
    const staff = this.users.filter(
      (user) => user.branchId === branchId && user.role === 'STAFF',
    );

    return {
      branchId,
      branchName: branch?.name ?? 'Branch',
      totalStaff: staff.length,
      totalVisitors: this.visitors.filter((visitor) => visitor.branchId === branchId).length,
      activeVisits: visits.filter((visit) => visit.status === 'CHECKED_IN').length,
      todayVisits: visits.length,
    };
  }

  getDepartmentStatsForBranch(branchId: string) {
    return this.departments
      .filter((dept) => dept.isActive && dept.branchId === branchId)
      .map((dept) => this.getDepartmentOverview(dept.id));
  }

  getGrowthData(type: 'chains' | 'branches') {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const base = type === 'chains' ? this.chains.length : this.branches.length;
    return {
      period: 'monthly',
      data: labels.map((label, index) => ({
        label,
        count: Math.max(1, base - (labels.length - index - 1)),
      })),
    };
  }

  createUser(data: Record<string, unknown>) {
    const user: MockUser = {
      id: crypto.randomUUID(),
      name: String(data.name ?? 'New User'),
      phone: String(data.phone ?? '9999999999'),
      email: String(data.email ?? 'user@example.com'),
      role: String(data.role ?? 'STAFF'),
      isActive: true,
      hospitalChainId: (data.hospitalChainId as string) ?? null,
      branchId: (data.branchId as string) ?? null,
      departmentId: (data.departmentId as string) ?? null,
      subDepartmentId: (data.subDepartmentId as string) ?? null,
      userType: (data.userType as string) ?? null,
      department: (data.department as string) ?? null,
      location: (data.location as string) ?? null,
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    return { ...user, credentialsEmailSent: true };
  }

  updateUser(id: string, data: Record<string, unknown>) {
    const user = this.getUserById(id);
    if (!user) return null;
    Object.assign(user, data);
    return user;
  }

  deactivateUser(id: string) {
    const user = this.getUserById(id);
    if (!user) return null;
    user.isActive = false;
    return user;
  }

  getStaffByBranch(branchId: string) {
    return this.users.filter(
      (user) =>
        user.branchId === branchId && user.role === 'STAFF' && user.isActive,
    );
  }

  getDepartmentsByBranch(branchId: string) {
    const departments = new Set(
      this.users
        .filter((user) => user.branchId === branchId && user.department)
        .map((user) => user.department as string),
    );
    return Array.from(departments);
  }

  getStaffByDepartment(branchId: string, department: string) {
    return this.users.filter(
      (user) =>
        user.branchId === branchId &&
        user.role === 'STAFF' &&
        user.department === department &&
        user.isActive,
    );
  }

  verifyPhone(phone: string, branchId: string, otp: string) {
    const visitor = this.visitors.find(
      (item) => item.phone === phone && item.branchId === branchId,
    );

    if (otp !== '123456' && otp !== '000000') {
      throw new Error('Invalid OTP');
    }

    if (visitor) {
      return {
        verified: true,
        isExistingVisitor: true,
        visitorData: {
          id: visitor.id,
          firstName: visitor.firstName,
          middleName: visitor.middleName ?? null,
          lastName: visitor.lastName,
          phone: visitor.phone,
          email: visitor.email ?? null,
          company: visitor.company ?? null,
          designation: visitor.designation ?? null,
          phoneVerified: true,
        },
      };
    }

    return {
      verified: true,
      isExistingVisitor: false,
      visitorData: {
        id: crypto.randomUUID(),
        firstName: 'Guest',
        middleName: null,
        lastName: 'Visitor',
        phone,
        email: null,
        company: null,
        designation: null,
        phoneVerified: true,
      },
    };
  }

  sendOtp(phone: string, branchId: string) {
    const existing = this.visitors.some(
      (visitor) => visitor.phone === phone && visitor.branchId === branchId,
    );
    return {
      success: true,
      message: 'OTP sent successfully',
      isNewVisitor: !existing,
      testOtp: '123456',
    };
  }
}

export const mockStore = new MockStore();

export { USER_IDS };
