import { UserResponseSchema } from '@/lib/schema/schema';
import { UserService } from './userService';
import apiClient from '@/lib/api';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const mockedGet = apiClient.get as jest.Mock;

function staffRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'staff-1',
    name: 'Dr. Meera',
    phone: '9100500001',
    email: 'doctor@ovum.example',
    role: 'STAFF',
    isActive: true,
    hospitalChainId: 'chain-1',
    branchId: 'branch-1',
    departmentId: 'dept-1',
    subDepartmentId: 'sub-1',
    userType: 'DOCTOR',
    department: 'GENERAL_MEDICINE',
    location: 'Kalyan Nagar',
    createdAt: '2026-10-21T00:00:00',
    ...overrides,
  };
}

describe('UserService.getAll', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('keeps hospital staff when the branch also has a receptionist', async () => {
    mockedGet.mockResolvedValue({
      data: [
        staffRow(),
        staffRow({
          id: 'ward-1',
          name: 'Receptionist — Kalyan Nagar',
          email: 'reception@ovum.example',
          role: 'WARD_ADMIN',
          userType: null,
        }),
      ],
    });

    const users = await UserService.getAll();
    expect(users.map((user) => user.role)).toEqual(['STAFF', 'WARD_ADMIN']);
  });

  it('does not drop the staff list when one row has a messy phone', async () => {
    mockedGet.mockResolvedValue({
      data: [
        staffRow(),
        { ...staffRow({ id: 'bad-1', role: 'NOT_A_ROLE', phone: null }) },
      ],
    });

    const users = await UserService.getAll();
    expect(users).toHaveLength(1);
    expect(users[0]?.name).toBe('Dr. Meera');
  });
});

describe('UserResponseSchema', () => {
  it('accepts live hospital roles that the create form does not offer', () => {
    const parsed = UserResponseSchema.safeParse(
      staffRow({ role: 'WARD_ADMIN', phone: null, email: null, name: null }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.role).toBe('WARD_ADMIN');
      expect(parsed.data.name).toBe('');
    }
  });
});
