import { AuthShell } from '@/src/components/AuthShell';
import { webPaths } from '@/src/config/webApp';

export default function VisitorRegisterScreen() {
  return (
    <AuthShell
      title="Create visitor profile"
      subtitle="Set up your Conninter visitor account."
      mode="register"
      webLoginPath={webPaths.visitorLogin}
      webRegisterPath={webPaths.visitorRegister}
      identifierLabel="Phone or email"
      identifierPlaceholder="10-digit mobile or email"
    />
  );
}
