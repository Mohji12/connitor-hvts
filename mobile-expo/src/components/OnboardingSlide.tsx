import { Image, ImageSourcePropType, Text, View, useWindowDimensions } from 'react-native';

export type OnboardingSlideData = {
  id: string;
  title: string;
  bullets: string[];
  image: ImageSourcePropType;
};

type OnboardingSlideProps = {
  slide: OnboardingSlideData;
};

export function OnboardingSlide({ slide }: OnboardingSlideProps) {
  const { width, height } = useWindowDimensions();
  // Hero dominates the slide (about half the screen).
  const imageHeight = Math.min(height * 0.42, width * 0.95);

  return (
    <View style={{ width }} className="flex-1 justify-start px-5 pt-1">
      <View
        className="overflow-hidden rounded-3xl bg-slate-100"
        style={{ width: '100%', height: imageHeight }}
      >
        <Image
          source={slide.image}
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
          accessibilityLabel={slide.title}
        />
      </View>

      <Text className="mt-5 text-center text-2xl font-bold leading-8 text-navy">
        {slide.title}
      </Text>

      <View className="mt-4 gap-3 px-1">
        {slide.bullets.map((bullet, index) => (
          <View key={bullet} className="flex-row items-start gap-3">
            <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-accent/15">
              <Text className="text-xs font-bold text-accent">{index + 1}</Text>
            </View>
            <Text className="flex-1 text-[15px] leading-6 text-slate-600">{bullet}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
