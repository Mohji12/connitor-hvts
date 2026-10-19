import { AuthShell } from '@/src/components/AuthShell';
import { webPaths } from '@/src/config/webApp';

export default function DeliveryRegisterScreen() {
  return (
    <AuthShell
      title="Create delivery profile"
      subtitle="Apply as a distributor partner on Conninter."
      mode="register"
      webLoginPath={webPaths.deliveryLogin}
      webRegisterPath={webPaths.deliveryRegister}
      identifierLabel="Email"
      identifierPlaceholder="partner@company.com"
    />
  );
}
