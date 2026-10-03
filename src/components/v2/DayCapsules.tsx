import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type DayCapsuleState = 'empty' | 'soft' | 'full';

export type DayCapsulesProps = {
  // One entry per day (Core 33: 33). Rendered in rows of `columns`.
  days: DayCapsuleState[];
  columns?: number;
  // Index of a day that breathes (e.g. "Día 1" of an invitation).
  breathingIndex?: number;
  // "Día 1" · "Día 33" under the grid.
  showEnds?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Grid of day capsules (Core 33): 14 pt, radius 5, gap 4, 11 per row.
// full = Ember, soft = Ember at .34, empty = hairline ring.
export function DayCapsules({
  days,
  columns = 11,
  breathingIndex,
  showEnds = false,
  style,
}: DayCapsulesProps) {
  const rows: DayCapsuleState[][] = [];
  for (let index = 0; index < days.length; index += columns) {
    rows.push(days.slice(index, index + columns));
  }

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((state, columnIndex) => {
              const index = rowIndex * columns + columnIndex;
              return (
                <Capsule
                  key={index}
                  state={state}
                  breathing={index === breathingIndex}
                />
              );
            })}
            {/* keep the last row aligned to the grid */}
            {Array.from({ length: columns - row.length }, (_, i) => (
              <View key={`pad-${i}`} style={styles.cell} />
            ))}
          </View>
        ))}
      </View>
      {showEnds ? (
        <View style={styles.ends}>
          <TextV2 variant="eyebrow" style={styles.endText} tone="tertiary">
            Día 1
          </TextV2>
          <TextV2 variant="eyebrow" style={styles.endText} tone="tertiary">
            {`Día ${days.length}`}
          </TextV2>
        </View>
      ) : null}
    </View>
  );
}

function Capsule({
  state,
  breathing,
}: {
  state: DayCapsuleState;
  breathing: boolean;
}) {
  const { colors, mode, motion } = useThemeV2();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!breathing) {
      return;
    }
    pulse.value = withRepeat(
      withTiming(motion.breath.opacity, {
        duration: motion.breath.duration / 2,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [breathing, motion.breath, pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const onDark = mode !== 'light';

  return (
    <Animated.View
      style={[
        styles.cell,
        styles.capsule,
        state === 'full' && { backgroundColor: colors.ember.base },
        state === 'soft' && styles.soft,
        state === 'empty' && [
          styles.empty,
          {
            borderColor: onDark
              ? 'rgba(255,255,255,.18)'
              : colors.outline.strong,
          },
        ],
        breathing && animated,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  grid: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    flex: 1,
    height: 14,
  },
  capsule: {
    borderRadius: 5,
  },
  soft: {
    backgroundColor: 'rgba(255,91,31,.34)',
  },
  empty: {
    borderWidth: 1,
  },
  ends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  endText: {
    textTransform: 'none',
    letterSpacing: 0,
    fontWeight: '400',
  },
});
