import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerShown: true }} />
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <Text className="mb-4 text-xl font-bold text-navy">Screen not found</Text>
        <Link href="/roles" className="text-base font-semibold text-accent">
          Back to roles
        </Link>
      </View>
    </>
  );
}
