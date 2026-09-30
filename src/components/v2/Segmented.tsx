import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { haptics } from '@app/components/v2/haptics';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type SegmentedOption<K extends string> = {
  key: K;
  label: string;
  badge?: number;
};

export type SegmentedProps<K extends string> = {
  options: SegmentedOption<K>[];
  value: K;
  onChange: (key: K) => void;
  size?: 'md' | 'compact';
  style?: StyleProp<ViewStyle>;
};

const PADDING = 3;

// Pill track with a sliding filled indicator (~.32 s, soft bounce).
// `compact` (30 pt, Semana/Mes) only changes size and type.
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  size = 'md',
  style,
}: SegmentedProps<K>) {
  const theme = useThemeV2();
  const { colors, radius } = theme;
  const [trackWidth, setTrackWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex(option => option.key === value),
  );
  const segmentWidth =
    trackWidth > 0 ? (trackWidth - PADDING * 2) / options.length : 0;
  const offset = useSharedValue(0);
  const height = size === 'compact' ? 30 : 36;
  const compact = size === 'compact';

  useEffect(() => {
    offset.value = withSpring(index * segmentWidth, {
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    });
  }, [index, offset, segmentWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const handleLayout = (event: LayoutChangeEvent) =>
    setTrackWidth(event.nativeEvent.layout.width);

  return (
    <View
      accessibilityRole="tablist"
      onLayout={handleLayout}
      style={[
        styles.track,
        {
          padding: PADDING,
          borderRadius: radius.pill,
          backgroundColor: colors.surface.muted,
        },
        style,
      ]}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          style={[
            styles.indicator,
            {
              top: PADDING,
              left: PADDING,
              width: segmentWidth,
              height,
              borderRadius: radius.pill,
              // Same selected treatment in every size and mode: filled pill
              // with inverted content (D-34).
              backgroundColor: colors.cta.primary,
            },
            indicatorStyle,
          ]}
        />
      ) : null}
      {options.map(option => {
        const selected = option.key === value;
        const labelColor = selected
          ? colors.cta.primaryText
          : colors.text.primary;

        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => {
              if (!selected) {
                haptics.selection();
                onChange(option.key);
              }
            }}
            style={[styles.option, { height }]}
          >
            <TextV2
              variant={compact ? 'metaStrong' : 'label'}
              color={labelColor}
              style={{ opacity: selected ? 1 : 0.72 }}
              numberOfLines={1}
            >
              {option.label}
            </TextV2>
            {option.badge ? (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: selected
                      ? colors.ember.base
                      : colors.surface.track,
                  },
                ]}
              >
                <TextV2
                  variant="micro"
                  color={selected ? colors.ember.onText : colors.text.secondary}
                >
                  {option.badge}
                </TextV2>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
  },
  indicator: {
    position: 'absolute',
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
