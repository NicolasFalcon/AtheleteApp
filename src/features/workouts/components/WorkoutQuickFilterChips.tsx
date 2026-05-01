import {Star} from 'lucide-react-native';
import {StyleSheet, Text, View} from 'react-native';
import {Chip, HorizontalItemRail} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';

type WorkoutQuickFilterChipsProps = {
  favoritesOnly: boolean;
  onToggleFavorites: () => void;
  options: readonly string[];
  activeFilter: string;
  onSelectFilter: (value: string) => void;
};

export function WorkoutQuickFilterChips({
  favoritesOnly,
  onToggleFavorites,
  options,
  activeFilter,
  onSelectFilter,
}: WorkoutQuickFilterChipsProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    row: {
      gap: 8,
      paddingRight: theme.spacing.sm,
    },
    chip: {
      minHeight: 32,
      paddingHorizontal: 14,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    chipSelected: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    chipLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
    },
    chipLabelSelected: {
      color: theme.colors.accentContrast,
    },
    favoriteContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
  });

  return (
    <HorizontalItemRail contentStyle={styles.row}>
      <Chip
        selected={favoritesOnly}
        onPress={onToggleFavorites}
        style={[styles.chip, favoritesOnly ? styles.chipSelected : null]}>
        <View style={styles.favoriteContent}>
          <Star
            color={
              favoritesOnly ? theme.colors.accentContrast : theme.colors.textSecondary
            }
            size={12}
            strokeWidth={2}
          />
          <Text
            style={[
              styles.chipLabel,
              favoritesOnly ? styles.chipLabelSelected : null,
            ]}>
            Solo favoritos
          </Text>
        </View>
      </Chip>
      {options.map(option => (
        <Chip
          key={option}
          selected={activeFilter === option}
          onPress={() => onSelectFilter(option)}
          style={[
            styles.chip,
            activeFilter === option ? styles.chipSelected : null,
          ]}>
          <Text
            style={[
              styles.chipLabel,
              activeFilter === option ? styles.chipLabelSelected : null,
            ]}>
            {option}
          </Text>
        </Chip>
      ))}
    </HorizontalItemRail>
  );
}
