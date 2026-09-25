import { redirect } from 'next/navigation';

import { PORTAL_DELIVERY_LOGIN_PATH } from '@/lib/role-portals';

export default function DeliveryLoginPage() {
  redirect(PORTAL_DELIVERY_LOGIN_PATH);
}
