import '../global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { colors } from '@/src/theme/colors';

export { ErrorBoundary } from 'expo-router';

// Keep native splash visible until /splash mounts and hides it (avoids a light flash).
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.white }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.white },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="splash" />
        <Stack.Screen
          name="onboarding/index"
          options={{ contentStyle: { backgroundColor: colors.canvas } }}
        />
        <Stack.Screen
          name="roles/index"
          options={{ contentStyle: { backgroundColor: colors.canvas } }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
