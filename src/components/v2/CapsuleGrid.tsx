import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { TextV2 } from '@app/components/v2/TextV2';

// closed = Ember · closedToday = Ember, the one closed today (it pops) ·
// today = ringed, the next to close (it breathes) · open = faint ring.
export type CapsuleCellState = 'closed' | 'closedToday' | 'today' | 'open';

export type CapsuleGridProps = {
  states: CapsuleCellState[];
  columns?: number;
  // "Día 1" · "Día 33" under the grid.
  showEnds?: boolean;
  // Surface under the grid: 'dark' (Core 33 scenes) or 'light'.
  tone?: 'dark' | 'light';
};

const GAP = 3;

function Cell({
  state,
  size,
  tone,
}: {
  state: CapsuleCellState;
  size: number;
  tone: 'dark' | 'light';
}) {
  const level = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(level);
    if (state === 'today') {
      level.value = withRepeat(
        withSequence(
          withTiming(0.55, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      );
    } else if (state === 'closedToday') {
      level.value = 0.6;
      level.value = withTiming(1, { duration: 500 });
    } else {
      level.value = 1;
    }
  }, [level, state]);

  const animated = useAnimatedStyle(() => ({ opacity: level.value }));
  const dark = tone === 'dark';
  const ring = dark ? 'rgba(255,255,255,.18)' : '#D9D6CF';
  const base =
    state === 'closed' || state === 'closedToday'
      ? { backgroundColor: '#FF5B1F' }
      : state === 'today'
      ? { boxShadow: `inset 0 0 0 2px ${dark ? '#FFFFFF' : '#121212'}` }
      : {
          backgroundColor: dark ? 'rgba(255,255,255,.06)' : 'transparent',
          boxShadow: `inset 0 0 0 1px ${ring}`,
        };

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: Math.max(6, size * 0.3) },
        base,
        animated,
      ]}
    />
  );
}

// The 33 days of Core 33: rounded cells in rows of `columns`, filled with
// Ember as days are closed.
export function CapsuleGrid({
  states,
  columns = 11,
  showEnds = false,
  tone = 'dark',
}: CapsuleGridProps) {
  const [width, setWidth] = useState(0);
  const size = width > 0 ? (width - GAP * (columns - 1)) / columns : 0;
  const rows: CapsuleCellState[][] = [];
  for (let index = 0; index < states.length; index += columns) {
    rows.push(states.slice(index, index + columns));
  }

  return (
    <View
      onLayout={(event: LayoutChangeEvent) =>
        setWidth(event.nativeEvent.layout.width)
      }
      accessibilityLabel={`${states.filter(s => s === 'closed' || s === 'closedToday').length} de ${states.length} días cerrados`}
      accessible
    >
      {size > 0 ? (
        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((state, columnIndex) => (
                <Cell
                  key={rowIndex * columns + columnIndex}
                  state={state}
                  size={size}
                  tone={tone}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}
      {showEnds ? (
        <View style={styles.ends}>
          <TextV2 variant="caption" color={tone === 'dark' ? '#A8A6A1' : undefined} tone={tone === 'dark' ? undefined : 'secondary'}>
            Día 1
          </TextV2>
          <TextV2 variant="caption" color={tone === 'dark' ? '#A8A6A1' : undefined} tone={tone === 'dark' ? undefined : 'secondary'}>
            Día 33
          </TextV2>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
  ends: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
});
