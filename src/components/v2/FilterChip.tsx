import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { X, type LucideIcon } from 'lucide-react-native';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type FilterChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: LucideIcon;
  // Active filter with ×: tapping removes it.
  removable?: boolean;
  // 38 (Rutinas chips) · 36 (picker / favourites) · 40 (filters sheet) · 32
  // (removable filters of a list).
  size?: 32 | 36 | 38 | 40;
  style?: StyleProp<ViewStyle>;
};

// Filter chip (handoff §5 "Filter"): pill; selected = ink (marfil in Dark)
// with inverted content; idle = raised surface with a hairline ring.
export function FilterChip({
  label,
  selected = false,
  onPress,
  icon: Icon,
  removable = false,
  size = 38,
  style,
}: FilterChipProps) {
  const { colors, mode } = useThemeV2();
  const on = selected || removable;
  const small = size === 32;
  const fg = on ? colors.cta.primaryText : colors.text.primary;
  const ring = mode === 'light' ? colors.divider : colors.outline.strong;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={removable ? `Quitar filtro ${label}` : label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          height: size,
          paddingLeft: small ? 12 : size === 36 ? 14 : size === 40 ? 16 : 15,
          paddingRight: removable
            ? 8
            : small
            ? 12
            : size === 36
            ? 14
            : size === 40
            ? 16
            : 15,
          backgroundColor: on ? colors.cta.primary : colors.surface.raised,
          borderColor: on ? colors.cta.primary : ring,
        },
        style,
      ]}
    >
      {Icon ? <Icon size={small ? 13 : 14} color={fg} strokeWidth={2} /> : null}
      <TextV2
        variant={small ? 'meta' : size === 36 ? 'label' : 'body'}
        color={fg}
        style={styles.label}
        numberOfLines={1}
      >
        {label}
      </TextV2>
      {removable ? (
        <View style={styles.remove}>
          <X size={14} color={fg} strokeWidth={2} />
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    fontWeight: '500',
  },
  remove: {
    opacity: 0.7,
  },
});
