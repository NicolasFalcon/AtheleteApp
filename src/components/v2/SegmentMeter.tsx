import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

// done = answered right · missed = answered wrong · current = the one being
// played · idle = still to come.
export type SegmentState = 'done' | 'missed' | 'current' | 'idle';

export type SegmentMeterProps = {
  segments: SegmentState[];
  // Ember halo around the bar (a streak is on).
  hot?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

function Segment({ state }: { state: SegmentState }) {
  const { colors } = useThemeV2();
  const scale = useSharedValue(state === 'done' || state === 'missed' ? 1 : 0.6);
  const lit = state === 'done' || state === 'missed';

  useEffect(() => {
    scale.value = withTiming(lit ? 1 : 0.6, { duration: 300 });
  }, [lit, scale]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }));

  const backgroundColor =
    state === 'done'
      ? colors.ember.base
      : state === 'missed'
      ? 'rgba(255,255,255,.35)'
      : state === 'current'
      ? 'rgba(255,255,255,.7)'
      : 'rgba(255,255,255,.1)';

  return <Animated.View style={[styles.segment, { backgroundColor }, animated]} />;
}

// Segmented bar of a round (Quiz · ronda): one 10 pt segment per question on
// a faint track, Ember for the hits, and a halo while the streak is on
// (handoff · "barra y fondo se encienden").
export function SegmentMeter({
  segments,
  hot = false,
  accessibilityLabel,
  style,
}: SegmentMeterProps) {
  const { colors } = useThemeV2();
  const answered = segments.filter(
    state => state === 'done' || state === 'missed',
  ).length;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: segments.length, now: answered }}
      style={[
        styles.track,
        hot && {
          boxShadow: `0 0 0 1px rgba(255,91,31,.5), 0 0 24px ${colors.ember.glow[4]}`,
        },
        style,
      ]}
    >
      {segments.map((state, index) => (
        <Segment key={index} state={state} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,.06)',
  },
  segment: { flex: 1, height: 10, borderRadius: 5 },
});
