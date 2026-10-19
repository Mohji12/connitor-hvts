import { AuthShell } from '@/src/components/AuthShell';
import { webPaths } from '@/src/config/webApp';

export default function DeliveryLoginScreen() {
  return (
    <AuthShell
      title="Delivery partner sign in"
      subtitle="Manage bookings, wallet, and fleet."
      mode="login"
      webLoginPath={webPaths.deliveryLogin}
      webRegisterPath={webPaths.deliveryRegister}
      identifierLabel="Email"
      identifierPlaceholder="partner@company.com"
    />
  );
}
