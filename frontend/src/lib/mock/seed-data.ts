import {
  BRANCH_IDS,
  CHAIN_IDS,
  DEPARTMENT_IDS,
  SUB_DEPARTMENT_IDS,
  USER_IDS,
  VISIT_IDS,
  VISITOR_IDS,
} from './ids';

export interface MockChain {
  id: string;
  name: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  createdAt: string;
}

export interface MockBranch {
  id: string;
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  hospitalChainId: string;
  qrCode?: string | null;
  createdAt: string;
}

export interface MockDepartment {
  id: string;
  name: string;
  code: string;
  description: string | null;
  branchId: string;
  hospitalChainId: string;
  isActive: boolean;
  createdAt: string;
}

export interface MockSubDepartment {
  id: string;
  name: string;
  code: string;
  description: string | null;
  departmentId: string;
  branchId: string;
  hospitalChainId: string;
  isActive: boolean;
  createdAt: string;
}

export interface MockUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  isActive: boolean;
  hospitalChainId: string | null;
  branchId: string | null;
  departmentId: string | null;
  subDepartmentId: string | null;
  userType: string | null;
  department: string | null;
  location: string | null;
  createdAt: string;
}

export interface MockVisitor {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  designation?: string | null;
  branchId: string;
  phoneVerified: boolean;
}

export interface MockVisit {
  id: string;
  visitorId: string;
  branchId: string;
  staffId?: string;
  staffName?: string;
  staffPhone?: string;
  status: string;
  visitCategory: string;
  visitSubType?: string;
  purpose?: string;
  department?: string;
  deliveryPlatform?: string;
  deliveryRecipient?: string;
  orderReference?: string;
  visitCode?: string;
  checkInOtp?: string;
  checkInOtpExpiry?: string;
  gatePassGeneratedAt?: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkedInById?: string;
  checkedOutById?: string;
  checkedInLocation?: string;
  checkedOutLocation?: string;
  durationMinutes?: number;
  rejectionReason?: string;
  doctorFeedback?: string | null;
  doctorFeedbackAt?: string | null;
  appointmentDate?: string | null;
  departmentId?: string | null;
  subDepartmentId?: string | null;
  smsApprovalCode?: string | null;
  idProofVerified?: boolean;
  idProofType?: string | null;
  idProofNumber?: string | null;
  verifiedBySecurityId?: string | null;
  doctorNotifiedAt?: string | null;
  totalDurationMinutes?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockNotification {
  id: string;
  message: string;
  read: boolean;
  recipientId: string;
  visitId?: string;
  createdAt: string;
}

const iso = (date: Date) => date.toISOString();
const minutesAgo = (m: number) => iso(new Date(Date.now() - m * 60_000));
const hoursAgo = (h: number) => iso(new Date(Date.now() - h * 3_600_000));
const daysAgo = (d: number) => iso(new Date(Date.now() - d * 86_400_000));
const daysFromNow = (d: number) => iso(new Date(Date.now() + d * 86_400_000));
const todayAt = (hour: number, minute = 0) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return iso(d);
};

export const seedChains: MockChain[] = [
  {
    id: CHAIN_IDS.APOLLO,
    name: 'Apollo Hospitals',
    phone: '0331111111',
    email: 'info@apollohospitals.com',
    street: '21 Greams Lane, Off Greams Road',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pinCode: '600006',
    country: 'India',
    createdAt: daysAgo(365),
  },
  {
    id: CHAIN_IDS.FORTIS,
    name: 'Fortis Healthcare',
    phone: '0331111112',
    email: 'info@fortishealthcare.com',
    street: 'Sector 62, Phase VIII',
    city: 'Mohali',
    state: 'Punjab',
    pinCode: '160062',
    country: 'India',
    createdAt: daysAgo(300),
  },
  {
    id: CHAIN_IDS.MAX,
    name: 'Max Healthcare',
    phone: '0331111113',
    email: 'info@maxhealthcare.com',
    street: 'Press Enclave Road, Saket',
    city: 'New Delhi',
    state: 'Delhi',
    pinCode: '110017',
    country: 'India',
    createdAt: daysAgo(250),
  },
];

export const seedBranches: MockBranch[] = [
  {
    id: BRANCH_IDS.CHENNAI,
    name: 'Apollo Hospitals (Chennai)',
    email: 'chennai@apollohospitals.com',
    phone: '0332222221',
    street: '21 Greams Lane, Off Greams Road',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pinCode: '600006',
    country: 'India',
    hospitalChainId: CHAIN_IDS.APOLLO,
    createdAt: daysAgo(300),
  },
  {
    id: BRANCH_IDS.BANGALORE,
    name: 'Apollo Hospitals (Bangalore)',
    email: 'bangalore@apollohospitals.com',
    phone: '0332222222',
    street: '154/11, Bannerghatta Road',
    city: 'Bangalore',
    state: 'Karnataka',
    pinCode: '560076',
    country: 'India',
    hospitalChainId: CHAIN_IDS.APOLLO,
    createdAt: daysAgo(280),
  },
  {
    id: BRANCH_IDS.MOHALI,
    name: 'Fortis Hospital (Mohali)',
    email: 'mohali@fortishealthcare.com',
    phone: '0332222223',
    street: 'Sector 62, Phase VIII',
    city: 'Mohali',
    state: 'Punjab',
    pinCode: '160062',
    country: 'India',
    hospitalChainId: CHAIN_IDS.FORTIS,
    createdAt: daysAgo(200),
  },
  {
    id: BRANCH_IDS.GURGAON_FORTIS,
    name: 'Fortis Hospital (Gurgaon)',
    email: 'gurgaon@fortishealthcare.com',
    phone: '0332222224',
    street: 'Sector 62, Golf Course Road',
    city: 'Gurgaon',
    state: 'Haryana',
    pinCode: '122002',
    country: 'India',
    hospitalChainId: CHAIN_IDS.FORTIS,
    createdAt: daysAgo(180),
  },
  {
    id: BRANCH_IDS.SAKET,
    name: 'Max Hospital (Saket)',
    email: 'saket@maxhealthcare.com',
    phone: '0332222225',
    street: 'Press Enclave Road, Saket',
    city: 'New Delhi',
    state: 'Delhi',
    pinCode: '110017',
    country: 'India',
    hospitalChainId: CHAIN_IDS.MAX,
    createdAt: daysAgo(150),
  },
  {
    id: BRANCH_IDS.GURGAON_MAX,
    name: 'Max Hospital (Gurgaon)',
    email: 'gurgaon@maxhealthcare.com',
    phone: '0332222226',
    street: 'Sector 38B, Chandigarh Road',
    city: 'Gurgaon',
    state: 'Haryana',
    pinCode: '122001',
    country: 'India',
    hospitalChainId: CHAIN_IDS.MAX,
    createdAt: daysAgo(120),
  },
];

export const seedDepartments: MockDepartment[] = [
  {
    id: DEPARTMENT_IDS.CARDIOLOGY_CHENNAI,
    name: 'Cardiology',
    code: 'CARDIO',
    description: 'Heart and vascular care',
    branchId: BRANCH_IDS.CHENNAI,
    hospitalChainId: CHAIN_IDS.APOLLO,
    isActive: true,
    createdAt: daysAgo(100),
  },
];

export const seedSubDepartments: MockSubDepartment[] = [
  {
    id: SUB_DEPARTMENT_IDS.ICU_CARDIOLOGY,
    name: 'ICU Cardiology',
    code: 'ICU-CARD',
    description: 'Intensive cardiac care unit',
    departmentId: DEPARTMENT_IDS.CARDIOLOGY_CHENNAI,
    branchId: BRANCH_IDS.CHENNAI,
    hospitalChainId: CHAIN_IDS.APOLLO,
    isActive: true,
    createdAt: daysAgo(90),
  },
];

export const seedUsers: MockUser[] = [
  {
    id: USER_IDS.SUPER_ADMIN,
    name: 'Sushobhit Kundra',
    phone: '6987456321',
    email: 'superadmin@hvts.com',
    role: 'SUPER_ADMIN',
    isActive: true,
    hospitalChainId: null,
    branchId: null,
    departmentId: null,
    subDepartmentId: null,
    userType: null,
    department: null,
    location: null,
    createdAt: daysAgo(400),
  },
  {
    id: USER_IDS.HOSPITAL_ADMIN_CHENNAI,
    name: 'Priya Sharma',
    phone: '9123456780',
    email: 'hospital.admin@apollochennai.com',
    role: 'HOSPITAL_ADMIN',
    isActive: true,
    hospitalChainId: CHAIN_IDS.APOLLO,
    branchId: BRANCH_IDS.CHENNAI,
    departmentId: null,
    subDepartmentId: null,
    userType: null,
    department: null,
    location: null,
    createdAt: daysAgo(250),
  },
  {
    id: USER_IDS.DEPARTMENT_ADMIN_CARDIOLOGY,
    name: 'Rajesh Kumar',
    phone: '8482022111',
    email: 'rajesh.kumar@apollohospitals.com',
    role: 'DEPARTMENT_ADMIN',
    isActive: true,
    hospitalChainId: CHAIN_IDS.APOLLO,
    branchId: BRANCH_IDS.CHENNAI,
    departmentId: DEPARTMENT_IDS.CARDIOLOGY_CHENNAI,
    subDepartmentId: null,
    userType: null,
    department: null,
    location: null,
    createdAt: daysAgo(200),
  },
  {
    id: USER_IDS.SUB_DEPARTMENT_ADMIN_ICU,
    name: 'Anil Patel',
    phone: '7980427511',
    email: 'anil.patel@apollochennai.com',
    role: 'SUB_DEPARTMENT_ADMIN',
    isActive: true,
    hospitalChainId: CHAIN_IDS.APOLLO,
    branchId: BRANCH_IDS.CHENNAI,
    departmentId: DEPARTMENT_IDS.CARDIOLOGY_CHENNAI,
    subDepartmentId: SUB_DEPARTMENT_IDS.ICU_CARDIOLOGY,
    userType: null,
    department: null,
    location: null,
    createdAt: daysAgo(190),
  },
  {
    id: USER_IDS.CHAIN_ADMIN_APOLLO_2,
    name: 'Priya Sharma',
    phone: '8482022112',
    email: 'priya.sharma@apollohospitals.com',
    role: 'CHAIN_ADMIN',
    isActive: true,
    hospitalChainId: CHAIN_IDS.APOLLO,
    branchId: null,
    departmentId: null,
    subDepartmentId: null,
    userType: null,
    department: null,
    location: null,
    createdAt: daysAgo(180),
  },
  {
    id: USER_IDS.BRANCH_ADMIN_CHENNAI,
    name: 'Vikram Iyer',
    phone: '7980427599',
    email: 'vikram.iyer@apollochennai.com',
    role: 'BRANCH_ADMIN',
    isActive: true,
    hospitalChainId: CHAIN_IDS.APOLLO,
    branchId: BRANCH_IDS.CHENNAI,
    departmentId: null,
    subDepartmentId: null,
    userType: null,
    department: null,
    location: null,
    createdAt: daysAgo(150),
  },
  {
    id: USER_IDS.BRANCH_ADMIN_BANGALORE,
    name: 'Sneha Reddy',
    phone: '7980427512',
    email: 'sneha.reddy@apollobangalore.com',
    role: 'BRANCH_ADMIN',
    isActive: true,
    hospitalChainId: CHAIN_IDS.APOLLO,
    branchId: BRANCH_IDS.BANGALORE,
    departmentId: null,
    subDepartmentId: null,
    userType: null,
    department: null,
    location: null,
    createdAt: daysAgo(140),
  },
  {
    id: USER_IDS.CHAIN_ADMIN_FORTIS_1,
    name: 'Vikram Singh',
    phone: '8482022113',
    email: 'vikram.singh@fortishealthcare.com',
    role: 'CHAIN_ADMIN',
    isActive: true,
    hospitalChainId: CHAIN_IDS.FORTIS,
    branchId: null,
    departmentId: null,
    subDepartmentId: null,
    userType: null,
    department: null,
    location: null,
    createdAt: daysAgo(160),
  },
  {
    id: USER_IDS.CHAIN_ADMIN_FORTIS_2,
    name: 'Meera Gupta',
    phone: '8482022114',
    email: 'meera.gupta@fortishealthcare.com',
    role: 'CHAIN_ADMIN',
    isActive: true,
    hospitalChainId: CHAIN_IDS.FORTIS,
    branchId: null,
    departmentId: null,
    subDepartmentId: null,
    userType: null,
    department: null,
    location: null,
    createdAt: daysAgo(155),
  },
  {
    id: USER_IDS.BRANCH_ADMIN_MOHALI,
    name: 'Rahul Malhotra',
    phone: '7980427513',
    email: 'rahul.malhotra@fortismohali.com',
    role: 'BRANCH_ADMIN',
    isActive: true,
    hospitalChainId: CHAIN_IDS.FORTIS,
    branchId: BRANCH_IDS.MOHALI,
    departmentId: null,
    subDepartmentId: null,
    userType: null,
    department: null,
    location: null,
    createdAt: daysAgo(130),
  },
  {
    id: USER_IDS.BRANCH_ADMIN_GURGAON_FORTIS,
    name: 'Neha Kapoor',
    phone: '7980427514',
    email: 'neha.kapoor@fortisgurgaon.com',
    role: 'BRANCH_ADMIN',
    isActive: true,
    hospitalChainId: CHAIN_IDS.FORTIS,
    branchId: BRANCH_IDS.GURGAON_FORTIS,
    departmentId: null,
    subDepartmentId: null,
    userType: null,
    department: null,
    location: null,
    createdAt: daysAgo(125),
  },
  {
    id: USER_IDS.CHAIN_ADMIN_MAX_1,
    name: 'Amit Verma',
    phone: '8482022115',
    email: 'amit.verma@maxhealthcare.com',
    role: 'CHAIN_ADMIN',
    isActive: true,
    hospitalChainId: CHAIN_IDS.MAX,
    branchId: null,
    departmentId: null,
    subDepartmentId: null,
    userType: null,
    department: null,
    location: null,
    createdAt: daysAgo(110),
  },
  {
    id: USER_IDS.CHAIN_ADMIN_MAX_2,
    name: 'Divya Joshi',
    phone: '8482022116',
    email: 'divya.joshi@maxhealthcare.com',
    role: 'CHAIN_ADMIN',
    isActive: true,
    hospitalChainId: CHAIN_IDS.MAX,
    branchId: null,
    departmentId: null,
    subDepartmentId: null,
    userType: null,
    department: null,
    location: null,
    createdAt: daysAgo(105),
  },
  {
    id: USER_IDS.BRANCH_ADMIN_SAKET,
    name: 'Sanjay Mehta',
    phone: '7980427515',
    email: 'sanjay.mehta@maxsaket.com',
    role: 'BRANCH_ADMIN',
    isActive: true,
    hospitalChainId: CHAIN_IDS.MAX,
    branchId: BRANCH_IDS.SAKET,
    departmentId: null,
    subDepartmentId: null,
    userType: null,
    department: null,
    location: null,
    createdAt: daysAgo(100),
  },
  {
    id: USER_IDS.BRANCH_ADMIN_GURGAON_MAX,
    name: 'Kavita Singh',
    phone: '7980427516',
    email: 'kavita.singh@maxgurgaon.com',
    role: 'BRANCH_ADMIN',
    isActive: true,
    hospitalChainId: CHAIN_IDS.MAX,
    branchId: BRANCH_IDS.GURGAON_MAX,
    departmentId: null,
    subDepartmentId: null,
    userType: null,
    department: null,
    location: null,
    createdAt: daysAgo(95),
  },
  {
    id: USER_IDS.STAFF_DOCTOR,
    name: 'Dr. Arjun Desai',
    phone: '7003636111',
    email: 'arjun.desai@apollochennai.com',
    role: 'STAFF',
    userType: 'DOCTOR',
    department: 'CARDIOLOGY',
    location: 'Room 101',
    isActive: true,
    branchId: BRANCH_IDS.CHENNAI,
    hospitalChainId: CHAIN_IDS.APOLLO,
    departmentId: DEPARTMENT_IDS.CARDIOLOGY_CHENNAI,
    subDepartmentId: SUB_DEPARTMENT_IDS.ICU_CARDIOLOGY,
    createdAt: daysAgo(90),
  },
  {
    id: USER_IDS.STAFF_NURSE,
    name: 'Sunita Rao',
    phone: '7003636112',
    email: 'sunita.rao@apollochennai.com',
    role: 'STAFF',
    userType: 'DOCTOR',
    department: 'GENERAL_MEDICINE',
    location: 'Room 205',
    isActive: true,
    branchId: BRANCH_IDS.CHENNAI,
    hospitalChainId: CHAIN_IDS.APOLLO,
    departmentId: DEPARTMENT_IDS.CARDIOLOGY_CHENNAI,
    subDepartmentId: null,
    createdAt: daysAgo(85),
  },
  {
    id: USER_IDS.SECURITY,
    name: 'Rameshwar Tiwari',
    phone: '9883578111',
    email: 'rameshwar.tiwari@apollochennai.com',
    role: 'SECURITY',
    isActive: true,
    branchId: BRANCH_IDS.CHENNAI,
    hospitalChainId: CHAIN_IDS.APOLLO,
    departmentId: DEPARTMENT_IDS.CARDIOLOGY_CHENNAI,
    subDepartmentId: SUB_DEPARTMENT_IDS.ICU_CARDIOLOGY,
    userType: null,
    department: null,
    location: 'Main Gate A',
    createdAt: daysAgo(80),
  },
  {
    id: USER_IDS.SECURITY_2,
    name: 'Ravi Shankar',
    phone: '9883578112',
    email: 'ravi.shankar@apollochennai.com',
    role: 'SECURITY',
    isActive: true,
    branchId: BRANCH_IDS.CHENNAI,
    hospitalChainId: CHAIN_IDS.APOLLO,
    departmentId: DEPARTMENT_IDS.CARDIOLOGY_CHENNAI,
    subDepartmentId: null,
    userType: null,
    department: null,
    location: 'Service Gate B',
    createdAt: daysAgo(75),
  },
];

export const seedVisitors: MockVisitor[] = [
  {
    id: VISITOR_IDS.RAHUL_MEHTA,
    firstName: 'Rahul',
    lastName: 'Mehta',
    phone: '9123456701',
    email: 'rahul.mehta@techcorp.in',
    company: 'TechCorp India',
    designation: 'Account Manager',
    branchId: BRANCH_IDS.CHENNAI,
    phoneVerified: true,
  },
  {
    id: VISITOR_IDS.PRIYA_NAIR,
    firstName: 'Priya',
    lastName: 'Nair',
    phone: '9123456702',
    email: 'priya.nair@healthplus.com',
    company: 'HealthPlus Solutions',
    designation: 'Product Specialist',
    branchId: BRANCH_IDS.CHENNAI,
    phoneVerified: true,
  },
  {
    id: VISITOR_IDS.VIKRAM_SHAH,
    firstName: 'Vikram',
    lastName: 'Shah',
    phone: '9123456703',
    email: 'vikram.shah@medsupply.com',
    company: 'MedSupply Co.',
    designation: 'Sales Director',
    branchId: BRANCH_IDS.CHENNAI,
    phoneVerified: true,
  },
  {
    id: VISITOR_IDS.ANANYA_IYER,
    firstName: 'Ananya',
    lastName: 'Iyer',
    phone: '9123456704',
    email: 'ananya.iyer@gmail.com',
    company: 'Self',
    designation: 'Family Member',
    branchId: BRANCH_IDS.CHENNAI,
    phoneVerified: true,
  },
  {
    id: VISITOR_IDS.KARAN_SINGH,
    firstName: 'Karan',
    lastName: 'Singh',
    phone: '9123456705',
    email: 'karan.singh@consulting.in',
    company: 'Singh Consulting',
    designation: 'Consultant',
    branchId: BRANCH_IDS.CHENNAI,
    phoneVerified: true,
  },
  {
    id: VISITOR_IDS.MEERA_JOSHI,
    firstName: 'Meera',
    lastName: 'Joshi',
    phone: '9123456706',
    email: 'meera.joshi@pharma.in',
    company: 'PharmaLink',
    designation: 'Medical Representative',
    branchId: BRANCH_IDS.CHENNAI,
    phoneVerified: true,
  },
  {
    id: VISITOR_IDS.DELIVERY_AMAZON,
    firstName: 'Suresh',
    lastName: 'Kumar',
    phone: '9123456707',
    company: 'Amazon Logistics',
    branchId: BRANCH_IDS.CHENNAI,
    phoneVerified: true,
  },
  {
    id: VISITOR_IDS.DELIVERY_FLIPKART,
    firstName: 'Arun',
    lastName: 'Pandey',
    phone: '9123456708',
    company: 'Flipkart Express',
    branchId: BRANCH_IDS.CHENNAI,
    phoneVerified: true,
  },
  {
    id: VISITOR_IDS.BANGALORE_GUEST,
    firstName: 'Deepak',
    lastName: 'Reddy',
    phone: '9123456709',
    email: 'deepak.reddy@example.com',
    company: 'Infosys',
    designation: 'Vendor',
    branchId: BRANCH_IDS.BANGALORE,
    phoneVerified: true,
  },
];

const staff = {
  id: USER_IDS.STAFF_DOCTOR,
  name: 'Dr. Arjun Desai',
  phone: '7003636111',
};

export function buildSeedVisits(): MockVisit[] {
  return [
    {
      id: VISIT_IDS.RAHUL_PENDING,
      visitorId: VISITOR_IDS.RAHUL_MEHTA,
      branchId: BRANCH_IDS.CHENNAI,
      staffId: staff.id,
      staffName: staff.name,
      staffPhone: staff.phone,
      status: 'PENDING',
      visitCategory: 'MEETING',
      visitSubType: 'SALES_MARKETING',
      purpose: 'Discuss new medical equipment partnership',
      department: 'CARDIOLOGY',
      createdAt: minutesAgo(20),
      updatedAt: minutesAgo(20),
    },
    {
      id: VISIT_IDS.PRIYA_REQUEST_SENT,
      visitorId: VISITOR_IDS.PRIYA_NAIR,
      branchId: BRANCH_IDS.CHENNAI,
      staffId: staff.id,
      staffName: staff.name,
      staffPhone: staff.phone,
      status: 'REQUEST_SENT',
      visitCategory: 'MEETING',
      visitSubType: 'VENDOR',
      purpose: 'Software demo for patient records system',
      department: 'GENERAL_MEDICINE',
      createdAt: minutesAgo(45),
      updatedAt: minutesAgo(45),
    },
    {
      id: VISIT_IDS.VIKRAM_REQUEST_SENT,
      visitorId: VISITOR_IDS.VIKRAM_SHAH,
      branchId: BRANCH_IDS.CHENNAI,
      staffId: staff.id,
      staffName: staff.name,
      staffPhone: staff.phone,
      status: 'REQUEST_SENT',
      visitCategory: 'MEETING',
      visitSubType: 'SALES_MARKETING',
      purpose: 'Quarterly supply contract review',
      department: 'PHARMACY',
      createdAt: hoursAgo(2),
      updatedAt: hoursAgo(2),
    },
    {
      id: VISIT_IDS.ANANYA_APPROVED,
      visitorId: VISITOR_IDS.ANANYA_IYER,
      branchId: BRANCH_IDS.CHENNAI,
      staffId: staff.id,
      staffName: staff.name,
      staffPhone: staff.phone,
      status: 'APPROVED',
      visitCategory: 'MEETING',
      visitSubType: 'PATIENT_FAMILY',
      purpose: 'Cardiology follow-up appointment',
      department: 'CARDIOLOGY',
      departmentId: DEPARTMENT_IDS.CARDIOLOGY_CHENNAI,
      subDepartmentId: SUB_DEPARTMENT_IDS.ICU_CARDIOLOGY,
      appointmentDate: todayAt(14, 30),
      idProofVerified: false,
      visitCode: '481256',
      checkInOtp: '481256',
      checkInOtpExpiry: hoursAgo(-2),
      gatePassGeneratedAt: minutesAgo(30),
      createdAt: hoursAgo(3),
      updatedAt: minutesAgo(30),
    },
    {
      id: VISIT_IDS.VIKRAM_APPROVED,
      visitorId: VISITOR_IDS.VIKRAM_SHAH,
      branchId: BRANCH_IDS.CHENNAI,
      staffId: staff.id,
      staffName: staff.name,
      staffPhone: staff.phone,
      status: 'APPROVED',
      visitCategory: 'MEETING',
      visitSubType: 'VENDOR',
      purpose: 'Deliver product samples',
      department: 'PHARMACY',
      visitCode: '592367',
      checkInOtp: '112233',
      checkInOtpExpiry: hoursAgo(-2),
      gatePassGeneratedAt: hoursAgo(1),
      createdAt: hoursAgo(4),
      updatedAt: hoursAgo(1),
    },
    {
      id: VISIT_IDS.KARAN_CHECKED_IN,
      visitorId: VISITOR_IDS.KARAN_SINGH,
      branchId: BRANCH_IDS.CHENNAI,
      staffId: staff.id,
      staffName: staff.name,
      staffPhone: staff.phone,
      status: 'CHECKED_IN',
      visitCategory: 'MEETING',
      visitSubType: 'CONSULTATION',
      purpose: 'Scheduled cardiology appointment',
      department: 'CARDIOLOGY',
      departmentId: DEPARTMENT_IDS.CARDIOLOGY_CHENNAI,
      subDepartmentId: SUB_DEPARTMENT_IDS.ICU_CARDIOLOGY,
      appointmentDate: todayAt(10, 0),
      idProofVerified: true,
      idProofType: 'AADHAAR',
      visitCode: '703418',
      checkInTime: minutesAgo(55),
      checkedInById: USER_IDS.SECURITY,
      checkedInLocation: 'Main Gate A',
      doctorNotifiedAt: minutesAgo(55),
      createdAt: hoursAgo(5),
      updatedAt: minutesAgo(55),
    },
    {
      id: VISIT_IDS.DELIVERY_CHECKED_IN,
      visitorId: VISITOR_IDS.DELIVERY_AMAZON,
      branchId: BRANCH_IDS.CHENNAI,
      status: 'CHECKED_IN',
      visitCategory: 'DELIVERY',
      deliveryPlatform: 'Amazon',
      deliveryRecipient: 'Pharmacy Store',
      orderReference: 'AMZ-2026-44821',
      visitCode: '814529',
      checkInTime: minutesAgo(15),
      checkedInById: USER_IDS.SECURITY,
      checkedInLocation: 'Service Gate B',
      createdAt: minutesAgo(25),
      updatedAt: minutesAgo(15),
    },
    {
      id: VISIT_IDS.MEERA_CHECKED_OUT,
      visitorId: VISITOR_IDS.MEERA_JOSHI,
      branchId: BRANCH_IDS.CHENNAI,
      staffId: staff.id,
      staffName: staff.name,
      staffPhone: staff.phone,
      status: 'CHECKED_OUT',
      visitCategory: 'MEETING',
      visitSubType: 'VENDOR',
      purpose: 'Pharmaceutical product briefing',
      department: 'PHARMACY',
      visitCode: '925630',
      checkInTime: hoursAgo(4),
      checkOutTime: hoursAgo(2),
      checkedInById: USER_IDS.SECURITY,
      checkedOutById: USER_IDS.SECURITY,
      checkedInLocation: 'Main Gate A',
      checkedOutLocation: 'Main Gate A',
      durationMinutes: 120,
      createdAt: hoursAgo(6),
      updatedAt: hoursAgo(2),
    },
    {
      id: VISIT_IDS.PRIYA_CHECKED_OUT,
      visitorId: VISITOR_IDS.PRIYA_NAIR,
      branchId: BRANCH_IDS.CHENNAI,
      staffId: staff.id,
      staffName: staff.name,
      staffPhone: staff.phone,
      status: 'CHECKED_OUT',
      visitCategory: 'MEETING',
      visitSubType: 'VENDOR',
      purpose: 'Follow-up demo session',
      department: 'IT_SUPPORT',
      visitCode: '036741',
      checkInTime: hoursAgo(8),
      checkOutTime: hoursAgo(6),
      checkedInById: USER_IDS.SECURITY,
      checkedOutById: USER_IDS.SECURITY_2,
      checkedInLocation: 'Main Gate A',
      checkedOutLocation: 'Main Gate A',
      durationMinutes: 90,
      createdAt: daysAgo(1),
      updatedAt: hoursAgo(6),
    },
    {
      id: VISIT_IDS.RAHUL_REJECTED,
      visitorId: VISITOR_IDS.RAHUL_MEHTA,
      branchId: BRANCH_IDS.CHENNAI,
      staffId: staff.id,
      staffName: staff.name,
      staffPhone: staff.phone,
      status: 'REJECTED',
      visitCategory: 'MEETING',
      visitSubType: 'SALES_MARKETING',
      purpose: 'Unscheduled sales visit',
      department: 'ADMINISTRATION',
      rejectionReason: 'Staff unavailable today',
      createdAt: hoursAgo(7),
      updatedAt: hoursAgo(6),
    },
    {
      id: VISIT_IDS.DELIVERY_REQUEST_SENT,
      visitorId: VISITOR_IDS.DELIVERY_FLIPKART,
      branchId: BRANCH_IDS.CHENNAI,
      status: 'REQUEST_SENT',
      visitCategory: 'DELIVERY',
      deliveryPlatform: 'Flipkart',
      deliveryRecipient: 'Admin Office',
      orderReference: 'FK-2026-99102',
      createdAt: minutesAgo(10),
      updatedAt: minutesAgo(10),
    },
    {
      id: VISIT_IDS.APPOINTMENT_REQUEST,
      visitorId: VISITOR_IDS.RAHUL_MEHTA,
      branchId: BRANCH_IDS.CHENNAI,
      staffId: staff.id,
      staffName: staff.name,
      staffPhone: staff.phone,
      status: 'REQUEST_SENT',
      visitCategory: 'MEETING',
      purpose: 'Cardiology follow-up consultation',
      department: 'CARDIOLOGY',
      departmentId: DEPARTMENT_IDS.CARDIOLOGY_CHENNAI,
      subDepartmentId: SUB_DEPARTMENT_IDS.ICU_CARDIOLOGY,
      appointmentDate: daysFromNow(2),
      createdAt: minutesAgo(15),
      updatedAt: minutesAgo(15),
    },
    {
      id: VISIT_IDS.BANGALORE_VISIT,
      visitorId: VISITOR_IDS.BANGALORE_GUEST,
      branchId: BRANCH_IDS.BANGALORE,
      status: 'CHECKED_IN',
      visitCategory: 'MEETING',
      visitSubType: 'VENDOR',
      purpose: 'IT infrastructure review',
      department: 'IT_SUPPORT',
      visitCode: '147852',
      checkInTime: hoursAgo(1),
      createdAt: hoursAgo(3),
      updatedAt: hoursAgo(1),
    },
  ];
}

export function buildSeedNotifications(): MockNotification[] {
  return [
    {
      id: '30000001-0000-4000-8000-000000000001',
      recipientId: USER_IDS.STAFF_DOCTOR,
      visitId: VISIT_IDS.PRIYA_REQUEST_SENT,
      read: false,
      message: 'You have a new visit request from Priya Nair. Please review.',
      createdAt: minutesAgo(40),
    },
    {
      id: '30000002-0000-4000-8000-000000000002',
      recipientId: USER_IDS.STAFF_DOCTOR,
      visitId: VISIT_IDS.VIKRAM_REQUEST_SENT,
      read: false,
      message:
        'New visit request from Vikram Shah to meet Dr. Arjun Desai. Status: Pending staff approval.',
      createdAt: hoursAgo(2),
    },
    {
      id: '30000003-0000-4000-8000-000000000003',
      recipientId: USER_IDS.STAFF_DOCTOR,
      visitId: VISIT_IDS.RAHUL_PENDING,
      read: false,
      message: 'You have a new visit request from Rahul Mehta. Please review.',
      createdAt: minutesAgo(15),
    },
    {
      id: '30000004-0000-4000-8000-000000000004',
      recipientId: USER_IDS.STAFF_DOCTOR,
      visitId: VISIT_IDS.ANANYA_APPROVED,
      read: true,
      message:
        'Visit for Ananya Iyer to meet Dr. Arjun Desai has been approved. Please prepare for check-in.',
      createdAt: hoursAgo(3),
    },
    {
      id: '30000005-0000-4000-8000-000000000005',
      recipientId: USER_IDS.BRANCH_ADMIN_CHENNAI,
      visitId: VISIT_IDS.KARAN_CHECKED_IN,
      read: false,
      message: 'Visitor Karan Singh has checked in at Main Gate A.',
      createdAt: minutesAgo(50),
    },
    {
      id: '30000006-0000-4000-8000-000000000006',
      recipientId: USER_IDS.SECURITY,
      visitId: VISIT_IDS.DELIVERY_REQUEST_SENT,
      read: false,
      message: 'New delivery visit from Arun Pandey pending security approval.',
      createdAt: minutesAgo(8),
    },
    {
      id: '30000007-0000-4000-8000-000000000007',
      recipientId: USER_IDS.DEPARTMENT_ADMIN_CARDIOLOGY,
      visitId: VISIT_IDS.MEERA_CHECKED_OUT,
      read: true,
      message: 'Visit for Meera Joshi at Apollo Chennai has been checked out.',
      createdAt: hoursAgo(2),
    },
  ];
}

export function visitorFullName(visitor: MockVisitor): string {
  return [visitor.firstName, visitor.middleName, visitor.lastName]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
