import { useEffect, useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/src/components/LogoMark';
import { SplashParticle } from '@/src/components/splash/SplashParticle';
import { colors } from '@/src/theme/colors';

export const SPLASH_TIMING = {
  flyMs: 900,
  mergeMs: 300,
  holdMs: 700,
  moveMs: 900,
  settleMs: 300,
} as const;

const PARTICLE_COUNT = 40;

const PARTICLE_COLORS = [
  colors.navy,
  colors.accent,
  '#001B71',
  '#4A90E2',
  '#6BA8E8',
  '#0A2A8A',
  '#2E6FC4',
] as const;

export function splashTotalMs(): number {
  const { flyMs, mergeMs, holdMs, moveMs, settleMs } = SPLASH_TIMING;
  return flyMs + mergeMs + holdMs + moveMs + settleMs;
}

/** Deterministic pseudo-random in [0, 1) from an integer seed. */
function hash01(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type ParticleSpec = {
  id: number;
  startX: number;
  startY: number;
  delay: number;
  size: number;
  color: string;
};

type SplashAssemblyProps = {
  onComplete: () => void;
};

export function SplashAssembly({ onComplete }: SplashAssemblyProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const particles = useMemo((): ParticleSpec[] => {
    const radius = Math.max(width, height) * 0.72;
    const list: ParticleSpec[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      // Spread angles around a full circle with jitter so directions feel random.
      const baseAngle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const angleJitter = (hash01(i * 17 + 3) - 0.5) * 1.15;
      const angle = baseAngle + angleJitter;
      const dist = radius * (0.55 + hash01(i * 31 + 7) * 0.55);
      const startX = Math.cos(angle) * dist;
      const startY = Math.sin(angle) * dist;
      const delay = Math.floor(hash01(i * 53 + 11) * 420);
      const size = 4 + Math.floor(hash01(i * 71 + 19) * 7);
      const color = PARTICLE_COLORS[Math.floor(hash01(i * 97 + 23) * PARTICLE_COLORS.length)]!;

      list.push({ id: i, startX, startY, delay, size, color });
    }

    return list;
  }, [height, width]);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.72);
  const groupY = useSharedValue(0);
  const groupScale = useSharedValue(1);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    const { flyMs, mergeMs, holdMs, moveMs } = SPLASH_TIMING;
    const mergeAt = flyMs;
    const moveAt = flyMs + mergeMs + holdMs;
    const targetY = -(height / 2 - insets.top - 72);

    logoOpacity.value = withDelay(mergeAt, withTiming(1, { duration: mergeMs, easing: ease }));
    logoScale.value = withDelay(mergeAt, withTiming(1, { duration: mergeMs, easing: ease }));

    groupY.value = withDelay(moveAt, withTiming(targetY, { duration: moveMs, easing: ease }));
    groupScale.value = withDelay(moveAt, withTiming(0.72, { duration: moveMs, easing: ease }));

    const timer = setTimeout(onComplete, splashTotalMs());
    return () => clearTimeout(timer);
  }, [groupScale, groupY, height, insets.top, logoOpacity, logoScale, onComplete]);

  const groupStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: groupY.value }, { scale: groupScale.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const { flyMs, mergeMs } = SPLASH_TIMING;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, groupStyle]}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {particles.map((p) => (
            <SplashParticle
              key={p.id}
              startX={p.startX}
              startY={p.startY}
              delay={p.delay}
              size={p.size}
              color={p.color}
              flyMs={flyMs}
              mergeMs={mergeMs}
              mergeAt={flyMs}
            />
          ))}
        </View>
        <Animated.View style={logoStyle}>
          <LogoMark variant="splash" size="lg" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
