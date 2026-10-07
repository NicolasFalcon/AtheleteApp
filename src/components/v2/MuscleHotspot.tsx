import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type MuscleHotspotProps = {
  // Center of the dot, in percent of the parent card.
  top: number;
  left: number;
  // Start offset of the animation, so neighbouring cards do not pulse together.
  delay?: number;
};

const SIZE = 6;
const RING_FINAL_SIZE = 33;
const RING_SCALE = RING_FINAL_SIZE / SIZE;
const RING_OPACITY = 0.6;
const RING_DURATION = 1900;
const BREATH_DURATION = RING_DURATION / 2;

function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (mounted) {
          setReduced(value);
        }
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

function Ring({
  progress,
  color,
  offset,
}: {
  progress: SharedValue<number>;
  color: string;
  offset: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = (progress.value + offset) % 1;
    return {
      opacity: interpolate(p, [0, 1], [RING_OPACITY, 0]),
      transform: [{ scale: interpolate(p, [0, 1], [1, RING_SCALE]) }],
    };
  });

  return (
    <Animated.View
      style={[styles.circle, styles.ring, { borderColor: color }, style]}
    />
  );
}

// Ember "location" point over the muscle: a breathing core with two radar
// rings expanding behind it. Static when Reduce Motion is on.
export function MuscleHotspot({ top, left, delay = 0 }: MuscleHotspotProps) {
  const { colors } = useThemeV2();
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);
  const breath = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      return undefined;
    }
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration: RING_DURATION,
          easing: Easing.out(Easing.cubic),
        }),
        -1,
        false,
      ),
    );
    breath.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.15, { duration: BREATH_DURATION }),
          withTiming(1, { duration: BREATH_DURATION }),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(progress);
      cancelAnimation(breath);
      progress.value = 0;
      breath.value = 1;
    };
  }, [breath, delay, progress, reduceMotion]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[styles.anchor, { top: `${top}%`, left: `${left}%` }]}
    >
      {reduceMotion ? (
        <View
          style={[
            styles.circle,
            styles.halo,
            { backgroundColor: colors.ember.glow[2] },
          ]}
        />
      ) : (
        <>
          <Ring progress={progress} color={colors.ember.base} offset={0} />
          <Ring progress={progress} color={colors.ember.base} offset={0.5} />
        </>
      )}
      <Animated.View
        style={[
          styles.circle,
          { backgroundColor: colors.ember.base },
          coreStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Zero-size anchor at the point; children are centered on it.
  anchor: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    left: -SIZE / 2,
    top: -SIZE / 2,
  },
  ring: {
    borderWidth: 1.5,
  },
  halo: {
    transform: [{ scale: 2.2 }],
  },
});
