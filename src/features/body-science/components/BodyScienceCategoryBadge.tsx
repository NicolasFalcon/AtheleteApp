import {StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {categoryDisplayNames} from '@app/features/body-science/bodyScienceData';

type BodyScienceCategoryBadgeProps = {
  category: string;
  compact?: boolean;
};

export function BodyScienceCategoryBadge({
  category,
  compact = false,
}: BodyScienceCategoryBadgeProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      borderRadius: theme.radii.pill,
      paddingHorizontal: compact ? 9 : 11,
      paddingVertical: compact ? 4 : 6,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    label: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: compact ? 9 : 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
  });

  return (
    <View style={styles.badge}>
      <Text style={styles.label}>
        {categoryDisplayNames[category] || category}
      </Text>
    </View>
  );
}
