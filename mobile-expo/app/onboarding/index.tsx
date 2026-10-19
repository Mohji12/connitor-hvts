import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingSlide, type OnboardingSlideData } from '@/src/components/OnboardingSlide';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { setHasCompletedOnboarding } from '@/src/storage/onboarding';

const SLIDES: OnboardingSlideData[] = [
  {
    id: 'visitor',
    title: 'Make hospital visits easy',
    image: require('../../assets/onboarding/hero-meeting.png'),
    bullets: [
      'Find your doctor and pick an available slot',
      'Pay the visit fee from wallet or online',
      'Doctor confirms — then show your gate QR to check in and out',
    ],
  },
  {
    id: 'delivery',
    title: 'Deliveries without the queue',
    image: require('../../assets/onboarding/hero-delivery.png'),
    bullets: [
      'Book an unload window that fits your vehicle',
      'Pay from the distributor wallet',
      'Driver gets a WhatsApp pass — security scans for entry and exit',
    ],
  },
  {
    id: 'attendant',
    title: 'Family visit passes at the gate',
    image: require('../../assets/onboarding/hero-attendant.png'),
    bullets: [
      'Scan the hospital QR at reception or the security gate',
      'Primary attendant approves on WhatsApp',
      'Get today’s pass — security scans the QR at the gate',
    ],
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<OnboardingSlideData>>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const finish = async () => {
    await setHasCompletedOnboarding(true);
    router.replace('/roles');
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index && next >= 0 && next < SLIDES.length) {
      setIndex(next);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="flex-row items-center justify-end px-6 pt-2">
        {!last ? (
          <Text
            onPress={() => void finish()}
            className="py-2 text-sm font-semibold text-accent"
            accessibilityRole="button"
          >
            Skip
          </Text>
        ) : (
          <View className="h-8" />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => <OnboardingSlide slide={item} />}
      />

      <View className="px-6 pb-6">
        <View className="mb-6 flex-row items-center justify-center gap-2">
          {SLIDES.map((slide, i) => (
            <View
              key={slide.id}
              className={`h-2 rounded-full ${i === index ? 'w-6 bg-accent' : 'w-2 bg-slate-300'}`}
            />
          ))}
        </View>

        <PrimaryButton
          label={last ? 'Continue' : 'Next'}
          onPress={() => {
            if (last) {
              void finish();
              return;
            }
            const next = index + 1;
            listRef.current?.scrollToIndex({ index: next, animated: true });
            setIndex(next);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
