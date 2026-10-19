import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type SplashParticleProps = {
  startX: number;
  startY: number;
  delay: number;
  size: number;
  color: string;
  flyMs: number;
  mergeMs: number;
  mergeAt: number;
};

export function SplashParticle({
  startX,
  startY,
  delay,
  size,
  color,
  flyMs,
  mergeMs,
  mergeAt,
}: SplashParticleProps) {
  const x = useSharedValue(startX);
  const y = useSharedValue(startY);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.4);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    const flyDur = Math.max(flyMs - delay, 180);
    const holdBeforeMerge = Math.max(mergeAt - delay - 160, 0);

    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 160, easing: ease }),
        withDelay(holdBeforeMerge, withTiming(0, { duration: mergeMs, easing: ease })),
      ),
    );
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: flyDur, easing: ease }),
        withTiming(0.15, { duration: mergeMs, easing: ease }),
      ),
    );
    x.value = withDelay(delay, withTiming(0, { duration: flyDur, easing: ease }));
    y.value = withDelay(delay, withTiming(0, { duration: flyDur, easing: ease }));
  }, [delay, flyMs, mergeAt, mergeMs, opacity, scale, startX, startY, x, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));

  const half = size / 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          marginLeft: -half,
          marginTop: -half,
          borderRadius: half,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
