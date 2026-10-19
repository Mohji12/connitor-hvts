import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { webPaths } from '@/src/config/webApp';
import { openWebApp } from '@/src/lib/openWebApp';

export default function AttendantApplyPlaceholder() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const branchSlug = typeof slug === 'string' ? decodeURIComponent(slug) : '';
  const opened = useRef(false);

  useEffect(() => {
    if (!branchSlug || opened.current) return;
    opened.current = true;
    openWebApp(webPaths.attendantApply(branchSlug), { persona: 'attendant' });
  }, [branchSlug]);

  return (
    <SafeAreaView className="flex-1 bg-canvas px-6">
      <View className="flex-1 justify-center">
        <Text className="text-sm font-semibold uppercase tracking-wide text-accent">
          Attendant apply
        </Text>
        <Text className="mt-2 text-2xl font-bold text-navy">Opening in app</Text>
        <Text className="mt-3 text-base leading-6 text-slate-600">
          Branch{' '}
          <Text className="font-semibold text-navy">{branchSlug || 'unknown'}</Text> — the
          attendant apply form loads inside Conninter (no external browser).
        </Text>

        <View className="mt-10 gap-3">
          <PrimaryButton
            label="Open apply form"
            onPress={() => {
              if (branchSlug) {
                openWebApp(webPaths.attendantApply(branchSlug), { persona: 'attendant' });
              }
            }}
          />
          <PrimaryButton
            label="Scan again"
            variant="secondary"
            onPress={() => router.replace('/attendant/scan')}
          />
          <PrimaryButton
            label="Back to roles"
            variant="ghost"
            onPress={() => router.replace('/roles')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
