import { Image, Text, useWindowDimensions, View } from 'react-native';

type LogoMarkProps = {
  variant?: 'light' | 'dark' | 'splash';
  size?: 'sm' | 'md' | 'lg';
};

const heights = { sm: 40, md: 56, lg: 96 } as const;

export function LogoMark({ variant = 'dark', size = 'md' }: LogoMarkProps) {
  const { width } = useWindowDimensions();
  const height = heights[size];

  if (variant === 'splash') {
    // Large centered mark only — no white plate / card behind the logo.
    const logoWidth = Math.min(width * 0.78, 340);
    const logoHeight = logoWidth * 0.42;
    return (
      <Image
        source={require('../../assets/conninter-logo.png')}
        style={{ width: logoWidth, height: logoHeight, resizeMode: 'contain' }}
        accessibilityLabel="Conninter"
      />
    );
  }

  if (variant === 'light') {
    return (
      <View className="items-center">
        <Text
          className="text-center font-bold tracking-[3px] text-white"
          style={{ fontSize: size === 'lg' ? 28 : size === 'md' ? 22 : 18 }}
        >
          CONNINTER
        </Text>
        <Text className="mt-1 text-center text-xs tracking-wide text-white/70">
          Meetings Made Easy
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={require('../../assets/conninter-logo.png')}
      style={{ width: height * 3.4, height, resizeMode: 'contain' }}
      accessibilityLabel="Conninter"
    />
  );
}
