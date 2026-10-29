import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import { ANSWER_GREEN, ANSWER_RED } from '@app/components/v2/AnswerTile';

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
  const scale = useSharedValue(1);
  const lit = state === 'done' || state === 'missed';

  useEffect(() => {
    if (lit) {
      scale.value = withSequence(withTiming(1.18, { duration: 140 }), withTiming(1, { duration: 220 }));
    }
  }, [lit, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        styles.segment,
        {
          backgroundColor:
            state === 'done'
              ? ANSWER_GREEN
              : state === 'missed'
              ? ANSWER_RED
              : state === 'current'
              ? 'rgba(255,255,255,.14)'
              : 'rgba(255,255,255,.08)',
          boxShadow: state === 'current' ? 'inset 0 0 0 1.5px rgba(255,255,255,.85)' : undefined,
        },
        animated,
      ]}
    >
      {state === 'done' ? <Check size={10} color="#0B1A11" strokeWidth={3} /> : null}
      {state === 'missed' ? <X size={10} color="#FFFFFF" strokeWidth={3} /> : null}
    </Animated.View>
  );
}

// Segmented bar of a Play round (Quiz.dc.html): one 16 pt cell per question,
// green with a check for a hit, red with a cross for a miss, outlined for the
// current one, and an Ember halo while the streak is on.
export function SegmentMeter({ segments, hot = false, accessibilityLabel, style }: SegmentMeterProps) {
  const answered = segments.filter(state => state === 'done' || state === 'missed').length;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: segments.length, now: answered }}
      style={[styles.track, hot && styles.hot, style]}
    >
      {segments.map((state, index) => (
        <Segment key={index} state={state} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 4, borderRadius: 7 },
  hot: { boxShadow: '0 0 22px rgba(255,91,31,.35)' },
  segment: {
    flex: 1,
    height: 16,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
