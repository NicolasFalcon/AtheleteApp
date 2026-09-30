import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { PressableScale } from '@app/components/v2/PressableScale';
import { Eyebrow, TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type SectionHeaderProps = {
  title: string;
  action?: { label: string; onPress: () => void };
  variant?: 'title' | 'eyebrow';
  style?: StyleProp<ViewStyle>;
};

// 20 pt section title (or 11 pt eyebrow) with an optional text action.
export function SectionHeader({
  title,
  action,
  variant = 'title',
  style,
}: SectionHeaderProps) {
  const { colors } = useThemeV2();

  return (
    <View style={[styles.row, style]}>
      {variant === 'eyebrow' ? (
        <Eyebrow style={styles.title}>{title}</Eyebrow>
      ) : (
        <TextV2
          variant="section"
          style={styles.title}
          accessibilityRole="header"
        >
          {title}
        </TextV2>
      )}
      {action ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={12}
          onPress={action.onPress}
          style={styles.action}
        >
          <TextV2 variant="metaStrong" tone="secondary">
            {action.label}
          </TextV2>
          <ChevronRight
            color={colors.text.secondary}
            size={14}
            strokeWidth={2.2}
          />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
