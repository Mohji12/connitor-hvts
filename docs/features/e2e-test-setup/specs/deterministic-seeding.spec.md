# Technical Specification: Deterministic Database Seeding (Task 3)

## 1. Overview
This specification details the transition from dynamic UUID generation to deterministic seeding for the Hospital Visitor Tracking System. By assigning fixed UUIDs to core entities (Super Admins, Chain Admins, Hospital Chains, etc.), we enable Playwright E2E tests to reference these entities directly without pre-test database lookups.

## 2. File Locations
- **Data Definitions:** `backend/prisma/data.ts`
- **Seeder Logic:** `backend/prisma/index.ts`
- **Prisma Schema:** `backend/prisma/schema.prisma`
- **Verification Script:** `backend/scripts/verify-seed.ts` (New file)

## 3. TypeScript Interface Updates
The existing interfaces in `backend/prisma/data.ts` must be updated to make the `id` field mandatory for entities used in E2E testing. Foreign key placeholders (currently numbers) must be updated to use `string` (UUIDs).

```typescript
// backend/prisma/data.ts

export interface HospitalChainData {
  id: string; // Mandatory
  name: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
  country?: string;
}

export interface BranchData {
  id: string; // Mandatory
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
  country?: string;
  hospitalChainId: string; // Changed from number
  qrCode?: string;
}

export interface UserData {
  id: string; // Mandatory for core users
  name: string;
  phone: string;
  email: string;
  role: Role;
  userType?: UserType;
  isActive?: boolean;
  department?: Department;
  location?: string;
  hospitalChainId?: string; // Changed from number?
  branchId?: string; // Changed from number?
}
```

## 4. Constant Definitions
Centralized constants for fixed UUIDs to ensure consistency across seed data and tests.

```typescript
// backend/prisma/data.ts

export const E2E_CHAIN_IDS = {
  APOLLO: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  FORTIS: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  MAX: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
} as const;

export const E2E_BRANCH_IDS = {
  CHENNAI: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  MOHALI: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  SAKET: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
} as const;

export const E2E_USER_IDS = {
  SUPER_ADMIN: '11111111-1111-1111-1111-111111111111',
  CHAIN_ADMIN_APOLLO: '22222222-2222-2222-2222-222222222222',
  BRANCH_ADMIN_CHENNAI: '33333333-3333-3333-3333-333333333333',
  STAFF_DOCTOR: '44444444-4444-4444-4444-444444444444',
  SECURITY: '55555555-5555-5555-5555-555555555555',
} as const;
```

## 5. Data Array Updates
The `hospitalChains`, `branches`, and `users` arrays in `backend/prisma/data.ts` must be updated to use these constants.

### 5.1 Hospital Chains
| Name | ID |
|------|----|
| Apollo Hospitals | `E2E_CHAIN_IDS.APOLLO` |
| Fortis Healthcare | `E2E_CHAIN_IDS.FORTIS` |
| Max Healthcare | `E2E_CHAIN_IDS.MAX` |

### 5.2 Users
| Role | ID | Phone |
|------|----|-------|
| Super Admin | `E2E_USER_IDS.SUPER_ADMIN` | `6987456321` |
| Chain Admin (Apollo) | `E2E_USER_IDS.CHAIN_ADMIN_APOLLO` | `8482022111` |
| Branch Admin (Chennai) | `E2E_USER_IDS.BRANCH_ADMIN_CHENNAI` | `7980427511` |
| Staff (Doctor) | `E2E_USER_IDS.STAFF_DOCTOR` | `7003636111` |
| Security | `E2E_USER_IDS.SECURITY` | `9883578111` |

## 6. Seeder Logic
The `seedDatabase` function in `backend/prisma/index.ts` should be refactored to use `upsert` or explicit `id` assignment.

### 6.1 Algorithm
1. **Cleanup:** Delete dependent records first (Notifications -> Visits -> Visitors -> Users -> Branches -> HospitalChains).
2. **Seed Chains:**
   ```typescript
   for (const chain of hospitalChains) {
     await prisma.hospitalChain.upsert({
       where: { id: chain.id },
       update: chain,
       create: chain,
     });
   }
   ```
3. **Seed Branches:**
   ```typescript
   for (const branch of branches) {
     const { hospitalChainId, ...data } = branch;
     await prisma.branch.upsert({
       where: { id: branch.id },
       update: { ...data, hospitalChain: { connect: { id: hospitalChainId } } },
       create: { ...data, hospitalChain: { connect: { id: hospitalChainId } } },
     });
   }
   ```
4. **Seed Users:**
   ```typescript
   for (const user of users) {
     const { hospitalChainId, branchId, ...data } = user;
     const connect: any = {};
     if (hospitalChainId) connect.hospitalChain = { connect: { id: hospitalChainId } };
     if (branchId) connect.branch = { connect: { id: branchId } };
     
     await prisma.user.upsert({
       where: { id: user.id },
       update: { ...data, ...connect },
       create: { ...data, ...connect },
     });
   }
   ```

## 7. UUID Format Constraints
All fixed IDs MUST follow the UUID v4 format.
- **Regex Pattern:** `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` (strict) or simply `^[0-9a-f-]{36}$` for validation.
- **Validation:** Interfaces should ideally use a branded type or at least include a comment indicating format.

## 8. Verification Script
Create a simple script `backend/scripts/verify-seed.ts` to verify deterministic IDs.

```typescript
async function verify() {
  const superAdmin = await prisma.user.findUnique({
    where: { id: '11111111-1111-1111-1111-111111111111' }
  });
  if (!superAdmin || superAdmin.phone !== '6987456321') {
    throw new Error('Deterministic seeding failed for Super Admin');
  }
  console.log('✅ Deterministic seeding verified');
}
```

## 9. Acceptance Criteria
- [ ] `npm run prisma:seed` executes without error.
- [ ] Database contains exactly the records defined in `data.ts`.
- [ ] Fixed UUIDs for Super Admin, Chain Admin, and Branch Admin match the specification.
- [ ] Relationships (User -> Branch -> Chain) are correctly established using the fixed UUIDs.
- [ ] No dynamic UUIDs are generated for the core entities listed in Section 5.
