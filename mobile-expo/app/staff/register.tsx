import { AuthShell } from '@/src/components/AuthShell';
import { webPaths } from '@/src/config/webApp';

export default function StaffRegisterScreen() {
  return (
    <AuthShell
      title="Create staff profile"
      subtitle="Register on Conninter when your hospital allows it."
      mode="register"
      webLoginPath={webPaths.staffLogin}
      webRegisterPath={webPaths.staffRegister}
      identifierLabel="Work email"
      identifierPlaceholder="you@hospital.com"
    />
  );
}
