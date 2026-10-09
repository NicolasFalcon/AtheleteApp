import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type UnderlineTabOption<T extends string> = {
  key: T;
  label: string;
  // Counter (invitations, requests): an Ember badge next to the label.
  badge?: number;
};

const INDICATOR_WIDTH = 36;

// Tabs of Comunidad (v2.12 §22.5): text at 16/700, a hairline underneath and
// an Ember indicator of 36 × 3 pt that slides to the active tab. Replaces the
// segmented control there.
export function UnderlineTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: UnderlineTabOption<T>[];
  value: T;
  onChange: (key: T) => void;
}) {
  const { colors } = useThemeV2();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex(option => option.key === value));
  const column = options.length > 0 ? width / options.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    const target = index * column + (column - INDICATOR_WIDTH) / 2;
    x.value = reduceMotion || width === 0
      ? target
      : withTiming(target, { duration: 250, easing: Easing.out(Easing.cubic) });
  }, [column, index, reduceMotion, width, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.root, { borderBottomColor: colors.divider }]}
    >
      <View style={styles.row}>
        {options.map(option => {
          const active = option.key === value;
          return (
            <PressableScale
              key={option.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={
                option.badge ? `${option.label}, ${option.badge} pendientes` : option.label
              }
              onPress={() => onChange(option.key)}
              style={styles.tab}
            >
              <TextV2
                style={styles.label}
                color={active ? colors.text.primary : colors.text.secondary}
              >
                {option.label}
              </TextV2>
              {option.badge ? (
                <View style={[styles.badge, { backgroundColor: colors.ember.base }]}>
                  <TextV2 style={styles.badgeText}>{String(option.badge)}</TextV2>
                </View>
              ) : null}
            </PressableScale>
          );
        })}
      </View>
      <Animated.View
        pointerEvents="none"
        style={[styles.indicator, { backgroundColor: colors.ember.base }, indicator]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row' },
  tab: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  label: { fontSize: 16, fontWeight: '700' },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  indicator: {
    position: 'absolute',
    left: 0,
    bottom: -1,
    width: INDICATOR_WIDTH,
    height: 3,
    borderRadius: 2,
  },
});
