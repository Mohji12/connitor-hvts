import { AuthShell } from '@/src/components/AuthShell';
import { webPaths } from '@/src/config/webApp';

export default function StaffLoginScreen() {
  return (
    <AuthShell
      title="Staff sign in"
      subtitle="Hospital admin, clinical staff, and security."
      mode="login"
      webLoginPath={webPaths.staffLogin}
      webRegisterPath={webPaths.staffRegister}
      identifierLabel="Work email"
      identifierPlaceholder="you@hospital.com"
    />
  );
}
