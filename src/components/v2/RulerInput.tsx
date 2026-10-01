import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { haptics } from '@app/components/v2/haptics';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type RulerInputProps = {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  style?: StyleProp<ViewStyle>;
};

const TICK_SPACING = 12;
const TICK_WIDTH = 1.5;

// Sliding ruler from the onboarding (weight, height): label 15 secondary,
// value 64/600 with the unit at 20, and a 34 pt ruler with a tick every
// 12 pt under a fixed centre needle. Edges fade into the background with a
// gradient overlay instead of mask-image (D-30). One unit per tick.
export function RulerInput({
  label,
  unit,
  value,
  min,
  max,
  onChange,
  style,
}: RulerInputProps) {
  const { colors, type } = useThemeV2();
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const lastValue = useRef(value);
  const ticks = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, index) => min + index),
    [max, min],
  );

  // Positions the ruler on the current value once it has a width.
  useEffect(() => {
    if (width > 0) {
      scrollRef.current?.scrollTo({
        x: (lastValue.current - min) * TICK_SPACING,
        animated: false,
      });
    }
  }, [min, width]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(
      max,
      Math.max(
        min,
        min + Math.round(event.nativeEvent.contentOffset.x / TICK_SPACING),
      ),
    );

    if (next !== lastValue.current) {
      lastValue.current = next;
      haptics.selection();
      onChange(next);
    }
  };

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    lastValue.current = next;
    onChange(next);
    scrollRef.current?.scrollTo({
      x: (next - min) * TICK_SPACING,
      animated: true,
    });
  };

  const fadeFrom = colors.bg;
  const fadeTo = transparentOf(colors.bg);

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.header}>
        <TextV2 variant="body" tone="secondary">
          {label}
        </TextV2>
        <View style={styles.valueRow}>
          <TextV2
            style={[
              styles.value,
              {
                color: colors.text.primary,
                fontVariant: type.body.fontVariant,
              },
            ]}
          >
            {value}
          </TextV2>
          <TextV2 variant="section" tone="secondary" style={styles.unit}>
            {unit}
          </TextV2>
        </View>
      </View>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: `${value} ${unit}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={event =>
          step(event.nativeEvent.actionName === 'increment' ? 1 : -1)
        }
        onLayout={(event: LayoutChangeEvent) =>
          setWidth(event.nativeEvent.layout.width)
        }
        style={styles.ruler}
      >
        {width > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={TICK_SPACING}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={handleScroll}
            contentContainerStyle={{ paddingHorizontal: width / 2 }}
          >
            {ticks.map(tick => (
              <View key={tick} style={styles.tickSlot}>
                <View
                  style={[styles.tick, { backgroundColor: colors.divider }]}
                />
              </View>
            ))}
          </ScrollView>
        ) : null}
        <LinearGradient
          pointerEvents="none"
          colors={[fadeFrom, fadeTo, fadeTo, fadeFrom]}
          locations={[0, 0.22, 0.78, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[styles.needle, { backgroundColor: colors.text.primary }]}
        />
      </View>
    </View>
  );
}

function transparentOf(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0)`;
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontSize: 64,
    fontWeight: '600',
    letterSpacing: -0.045 * 64,
    lineHeight: 64,
  },
  unit: {
    fontWeight: '400',
  },
  ruler: {
    height: 34,
    justifyContent: 'center',
  },
  tickSlot: {
    width: TICK_SPACING,
    height: 34,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  tick: {
    width: TICK_WIDTH,
    height: 34,
  },
  needle: {
    position: 'absolute',
    left: '50%',
    top: -4,
    bottom: -4,
    width: 2.5,
    marginLeft: -1.25,
    borderRadius: 2,
  },
});
