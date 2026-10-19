import type { CapacitorConfig } from '@capacitor/cli';

const origin = (process.env.CAPACITOR_SERVER_URL ?? 'https://www.conninter.com').replace(/\/+$/, '');

/**
 * Start on local www/ (particle splash → onboarding slider), then navigate to
 * the live site at `${origin}/app/`. Do not set server.url or the shell is skipped.
 */
const config: CapacitorConfig = {
  appId: 'com.conninter.hvts',
  appName: 'Conninter',
  webDir: 'www',
  android: {
    allowMixedContent: false,
  },
  server: {
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: [
      'conninter.com',
      '*.conninter.com',
      origin.replace(/^https?:\/\//, ''),
      'accounts.google.com',
      'www.linkedin.com',
      'linkedin.com',
    ],
  },
};

export default config;
