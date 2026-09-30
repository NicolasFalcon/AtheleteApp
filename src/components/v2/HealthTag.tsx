import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Heart } from 'lucide-react-native';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

// "♡ Salud" source indicator for Apple Health data (handoff §12).
// Never uses the Apple logo.
export function HealthTag({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useThemeV2();

  return (
    <View
      accessible
      accessibilityLabel="Dato de Salud"
      style={[styles.row, style]}
    >
      <Heart
        color={colors.text.secondary}
        size={10}
        strokeWidth={2}
        opacity={0.7}
      />
      <TextV2 variant="caption" tone="secondary" style={styles.label}>
        Salud
      </TextV2>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  },
});
