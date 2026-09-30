import {
  createContext,
  useContext,
  useEffect,
  type PropsWithChildren,
} from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

const PulseContext = createContext<SharedValue<number> | null>(null);

function usePulse(): SharedValue<number> {
  const { motion } = useThemeV2();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(motion.skeleton.minOpacity, {
        duration: motion.skeleton.duration / 2,
      }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [motion.skeleton.duration, motion.skeleton.minOpacity, opacity]);

  return opacity;
}

// Shares one pulse between every Skeleton inside, so blocks breathe together.
export function SkeletonGroup({ children }: PropsWithChildren) {
  const pulse = usePulse();

  return (
    <PulseContext.Provider value={pulse}>{children}</PulseContext.Provider>
  );
}

export type SkeletonProps = {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

function SkeletonShape({
  pulse,
  width = '100%',
  height,
  radius = 8,
  style,
}: SkeletonProps & { pulse: SharedValue<number> }) {
  const { colors, mode } = useThemeV2();
  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius,
          // Scenes keep their dark background and show discreet strokes.
          backgroundColor:
            mode === 'scene'
              ? colors.border.onDarkStrong
              : colors.surface.skeleton,
        },
        style,
        animatedStyle,
      ]}
    />
  );
}

function StandaloneSkeleton(props: SkeletonProps) {
  const pulse = usePulse();
  return <SkeletonShape {...props} pulse={pulse} />;
}

// Real-shape placeholder with a slow opacity pulse (1.4 s, D-25). No spinner.
export function Skeleton(props: SkeletonProps) {
  const groupPulse = useContext(PulseContext);

  return groupPulse ? (
    <SkeletonShape {...props} pulse={groupPulse} />
  ) : (
    <StandaloneSkeleton {...props} />
  );
}
