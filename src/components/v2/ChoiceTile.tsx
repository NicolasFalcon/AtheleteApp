import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Check, type LucideIcon } from 'lucide-react-native';
import { haptics } from '@app/components/v2/haptics';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type ChoiceTileProps = {
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  // 'radio' for single choice, 'checkbox' for multi choice.
  role?: 'radio' | 'checkbox';
  height: number;
  radius?: number;
  // Ember check in the top-right corner when selected (multi choice).
  showCheck?: boolean;
  children: (contentColor: string) => ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Selectable tile of the onboarding grids (equipment, session length).
// Selected = filled with the primary ink and inverted content; idle = raised
// surface with a 1 pt divider ring (handoff §13 "Selected").
export function ChoiceTile({
  selected,
  onPress,
  accessibilityLabel,
  role = 'radio',
  height,
  radius = 20,
  showCheck = false,
  children,
  style,
}: ChoiceTileProps) {
  const { colors } = useThemeV2();
  const contentColor = selected ? colors.cta.primaryText : colors.text.primary;

  return (
    <PressableScale
      accessibilityRole={role}
      accessibilityState={
        role === 'radio' ? { selected } : { checked: selected }
      }
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={[
        styles.tile,
        {
          height,
          borderRadius: radius,
          backgroundColor: selected
            ? colors.cta.primary
            : colors.surface.raised,
          borderWidth: selected ? 0 : 1,
          borderColor: colors.divider,
        },
        style,
      ]}
    >
      {children(contentColor)}
      {showCheck && selected ? (
        <Animated.View
          entering={ZoomIn.duration(350)}
          style={[styles.check, { backgroundColor: colors.ember.base }]}
        >
          <Check color={colors.ember.onText} size={12} strokeWidth={3} />
        </Animated.View>
      ) : null}
    </PressableScale>
  );
}

// Content for equipment tiles: icon on top, label at the bottom.
export function IconChoiceContent({
  icon: Icon,
  label,
  color,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.iconContent}>
      <Icon color={color} size={22} strokeWidth={2} />
      <TextV2 variant="bodyStrong" color={color}>
        {label}
      </TextV2>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    overflow: 'hidden',
  },
  check: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
});
