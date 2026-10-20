import { router } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef } from 'react';
import { StatusBar, View } from 'react-native';

import { SplashAssembly } from '@/src/components/splash/SplashAssembly';
import { resumeLastSession } from '@/src/lib/resumeLastSession';
import { getHasCompletedOnboarding } from '@/src/storage/onboarding';
import { colors } from '@/src/theme/colors';

export default function SplashScreen() {
  const navigated = useRef(false);

  useEffect(() => {
    void ExpoSplashScreen.hideAsync();
  }, []);

  const goNext = useCallback(async () => {
    if (navigated.current) return;
    navigated.current = true;
    // Expo Go / Metro (__DEV__): always show the 3 onboarding sliders after splash.
    // Release builds skip onboarding once completed, and skip Welcome when a role is still signed in.
    const done = __DEV__ ? false : await getHasCompletedOnboarding();
    if (!done) {
      router.replace('/onboarding');
      return;
    }
    const resumed = await resumeLastSession();
    if (!resumed) {
      router.replace('/roles');
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <SplashAssembly onComplete={() => void goNext()} />
    </View>
  );
}
