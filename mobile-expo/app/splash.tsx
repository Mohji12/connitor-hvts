import { router } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef } from 'react';
import { StatusBar, View } from 'react-native';

import { SplashAssembly } from '@/src/components/splash/SplashAssembly';
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
    // Release builds still skip once the user has completed onboarding.
    const done = __DEV__ ? false : await getHasCompletedOnboarding();
    router.replace(done ? '/roles' : '/onboarding');
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <SplashAssembly onComplete={() => void goNext()} />
    </View>
  );
}
