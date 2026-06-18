import { ArrowLeft, SlidersHorizontal } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WorkoutSearchBar } from '@app/features/workouts/components/WorkoutSearchBar';
import { useAppTheme } from '@app/hooks/useAppTheme';

type ExerciseLibraryHeaderProps = {
  totalCount: number;
  visibleCount: number;
  viewMode: 'all' | 'favorites';
  activeFiltersCount: number;
  searchQuery: string;
  title: string;
  subtitle: string;
  onBack: () => void;
  onSearchChange: (value: string) => void;
  onOpenFilters: () => void;
};

export function ExerciseLibraryHeader({
  visibleCount,
  viewMode,
  activeFiltersCount,
  searchQuery,
  title,
  subtitle,
  onBack,
  onSearchChange,
  onOpenFilters,
}: ExerciseLibraryHeaderProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      gap: 11,
    },
    backButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingVertical: 2,
    },
    backLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    titleWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 22,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.6,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      marginTop: 1,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    filterButton: {
      minHeight: 40,
      borderRadius: theme.radii.pill,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 13,
      backgroundColor: theme.colors.accent,
    },
    filterLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
    },
    filterCount: {
      minWidth: 19,
      height: 19,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.16)',
    },
    filterCountLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.bold,
    },
    status: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      textAlign: 'right',
    },
  });

  const appliedCount = activeFiltersCount + (viewMode === 'favorites' ? 1 : 0);

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <ArrowLeft color={theme.colors.textSecondary} size={16} />
        <Text style={styles.backLabel}>Volver a explorar</Text>
      </Pressable>
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
      </View>

      <WorkoutSearchBar
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholder="Buscar ejercicios..."
      />

      <View style={styles.controls}>
        <Pressable onPress={onOpenFilters} style={styles.filterButton}>
          <SlidersHorizontal
            color={theme.colors.accentContrast}
            size={15}
            strokeWidth={2}
          />
          <Text style={styles.filterLabel}>Filtros</Text>
          {appliedCount > 0 ? (
            <View style={styles.filterCount}>
              <Text style={styles.filterCountLabel}>{appliedCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <Text style={styles.status}>
          {appliedCount > 0
            ? `${appliedCount} filtro${
                appliedCount === 1 ? '' : 's'
              } · ${visibleCount} cargados`
            : `${visibleCount} cargados`}
        </Text>
      </View>
    </View>
  );
}
