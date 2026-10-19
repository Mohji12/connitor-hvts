import { Redirect } from 'expo-router';

/** Every cold start begins with splash (animation), then onboarding or Welcome. */
export default function IndexGate() {
  return <Redirect href="/splash" />;
}
