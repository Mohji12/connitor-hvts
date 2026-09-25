import { redirect } from 'next/navigation';

import { PORTAL_DELIVERY_DRIVER_LOGIN_PATH } from '@/lib/role-portals';

export default function DriverLoginRedirectPage() {
  redirect(PORTAL_DELIVERY_DRIVER_LOGIN_PATH);
}
