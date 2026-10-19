import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'hasCompletedOnboarding';
/** Bump when slide content/images change so users see the new onboarding once. */
const VERSION_KEY = 'onboardingVersion';
const ONBOARDING_VERSION = '3';

export async function getHasCompletedOnboarding(): Promise<boolean> {
  try {
    const storedVersion = await AsyncStorage.getItem(VERSION_KEY);
    if (storedVersion !== ONBOARDING_VERSION) {
      await AsyncStorage.multiRemove([KEY]);
      await AsyncStorage.setItem(VERSION_KEY, ONBOARDING_VERSION);
      return false;
    }
    const value = await AsyncStorage.getItem(KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setHasCompletedOnboarding(done: boolean): Promise<void> {
  await AsyncStorage.setItem(VERSION_KEY, ONBOARDING_VERSION);
  await AsyncStorage.setItem(KEY, done ? 'true' : 'false');
}

/** Clears the flag so the 3 image sliders show again after splash. */
export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
