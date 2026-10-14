import type { CapacitorConfig } from '@capacitor/cli';

const origin = (process.env.CAPACITOR_SERVER_URL ?? 'https://www.conninter.com').replace(/\/+$/, '');
// The app opens on the launch screen, not the marketing homepage.
const serverUrl = `${origin}/app/`;

const config: CapacitorConfig = {
  appId: 'com.conninter.hvts',
  appName: 'Conninter',
  webDir: 'www',
  android: {
    allowMixedContent: false,
  },
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: [
      'conninter.com',
      '*.conninter.com',
      'accounts.google.com',
      'www.linkedin.com',
      'linkedin.com',
    ],
  },
};

export default config;
