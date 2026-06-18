import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Chip, HorizontalItemRail } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

type FilterOption = {
  key: string;
  label: string;
};

type ExerciseFilterGroupProps = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  activeKey: string;
  filters: FilterOption[];
  onChange: (key: string) => void;
};

export function ExerciseFilterGroup({
  title,
  subtitle,
  icon: Icon,
  activeKey,
  filters,
  onChange,
}: ExerciseFilterGroupProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: 10,
      gap: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      marginTop: 0,
    },
    row: {
      gap: 6,
      paddingRight: theme.spacing.sm,
    },
    chip: {
      minHeight: 28,
      paddingHorizontal: 11,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    chipSelected: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    label: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    labelSelected: {
      color: theme.colors.accentContrast,
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Icon color={theme.colors.textSecondary} size={15} strokeWidth={2} />
        </View>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <HorizontalItemRail contentStyle={styles.row}>
        {filters.map(filter => {
          const active = filter.key === activeKey;

          return (
            <Chip
              key={filter.key}
              selected={active}
              onPress={() => onChange(filter.key)}
              style={[styles.chip, active ? styles.chipSelected : null]}
            >
              <Text
                style={[styles.label, active ? styles.labelSelected : null]}
              >
                {filter.label}
              </Text>
            </Chip>
          );
        })}
      </HorizontalItemRail>
    </View>
  );
}
