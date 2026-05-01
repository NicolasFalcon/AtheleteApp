import {SlidersHorizontal} from 'lucide-react-native';
import {StyleSheet, Text, View} from 'react-native';
import {WorkoutSearchBar} from '@app/features/workouts/components/WorkoutSearchBar';
import {WorkoutSegmentedControl} from '@app/features/workouts/components/WorkoutSegmentedControl';
import {useAppTheme} from '@app/hooks/useAppTheme';

type ExerciseLibraryHeaderProps = {
  totalCount: number;
  visibleCount: number;
  viewMode: 'all' | 'favorites';
  activeFiltersCount: number;
  searchQuery: string;
  onViewModeChange: (value: 'all' | 'favorites') => void;
  onSearchChange: (value: string) => void;
};

export function ExerciseLibraryHeader({
  totalCount,
  visibleCount,
  viewMode,
  activeFiltersCount,
  searchQuery,
  onViewModeChange,
  onSearchChange,
}: ExerciseLibraryHeaderProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      borderRadius: 28,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: 16,
      gap: 14,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 20,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.6,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 19,
      marginTop: 6,
      maxWidth: 210,
    },
    badge: {
      borderRadius: theme.radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 14,
      paddingVertical: 10,
      minWidth: 92,
    },
    badgeTop: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.monoFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 2,
      textAlign: 'center',
    },
    badgeBottom: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 2.4,
      textAlign: 'center',
      textTransform: 'uppercase',
      marginTop: 2,
    },
    helperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    helperLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    helperLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Biblioteca de ejercicios</Text>
          <Text style={styles.subtitle}>
            Explora por equipo, zona y nivel para encontrar el ejercicio preciso.
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeTop}>{visibleCount}</Text>
          <Text style={styles.badgeBottom}>Ejercicios</Text>
        </View>
      </View>

      <WorkoutSegmentedControl
        value={viewMode}
        highlighted
        options={[
          {key: 'all', label: `Todos (${totalCount})`},
          {key: 'favorites', label: 'Favoritos'},
        ]}
        onChange={onViewModeChange}
      />

      <WorkoutSearchBar
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholder="Buscar ejercicios..."
      />

      <View style={styles.helperRow}>
        <View style={styles.helperLeft}>
          <SlidersHorizontal
            color={theme.colors.textSecondary}
            size={14}
            strokeWidth={2}
          />
          <Text style={styles.helperLabel}>
            {viewMode === 'favorites'
              ? 'Tus ejercicios guardados'
              : activeFiltersCount > 0
                ? `${activeFiltersCount} filtro${activeFiltersCount === 1 ? '' : 's'} activo${activeFiltersCount === 1 ? '' : 's'}`
                : 'Sin filtros activos'}
          </Text>
        </View>
        <Text style={styles.helperLabel}>
          {viewMode === 'favorites'
            ? `${visibleCount} favoritos`
            : `${visibleCount} ejercicios`}
        </Text>
      </View>
    </View>
  );
}
