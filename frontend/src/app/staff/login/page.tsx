import { redirect } from 'next/navigation';

import { PORTAL_HOSPITAL_STAFF_LOGIN_PATH } from '@/lib/role-portals';

export default function StaffLoginPage() {
  redirect(PORTAL_HOSPITAL_STAFF_LOGIN_PATH);
}
