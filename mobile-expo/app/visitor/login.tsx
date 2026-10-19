import { AuthShell } from '@/src/components/AuthShell';
import { webPaths } from '@/src/config/webApp';

export default function VisitorLoginScreen() {
  return (
    <AuthShell
      title="Visitor sign in"
      subtitle="Access your visits, wallet, and gate pass."
      mode="login"
      webLoginPath={webPaths.visitorLogin}
      webRegisterPath={webPaths.visitorRegister}
      identifierLabel="Phone or email"
      identifierPlaceholder="10-digit mobile or email"
    />
  );
}
