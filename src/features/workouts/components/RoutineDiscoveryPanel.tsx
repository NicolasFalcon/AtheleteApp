import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { EmptyState, Loader } from '@app/components/ui';
import { CreateRoutineCard } from '@app/features/workouts/components/CreateRoutineCard';
import { RoutineDiscoverySection } from '@app/features/workouts/components/RoutineDiscoverySection';
import { RoutineHeroCard } from '@app/features/workouts/components/RoutineHeroCard';
import { WorkoutQuickFilterChips } from '@app/features/workouts/components/WorkoutQuickFilterChips';
import { WorkoutSearchBar } from '@app/features/workouts/components/WorkoutSearchBar';
import { WorkoutsHeader } from '@app/features/workouts/components/WorkoutsHeader';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { Workout } from '@app/shared';

type DiscoveryData = {
  recommended: Workout[];
  strength: Workout[];
  cardio: Workout[];
  hiit: Workout[];
  mobility: Workout[];
  ellie: Workout[];
  mine: Workout[];
};

type RoutineDiscoveryPanelProps = {
  modeControl: ReactNode;
  data?: DiscoveryData;
  loading: boolean;
  error: boolean;
  bottomInset: number;
  searchQuery: string;
  filterOptions: readonly string[];
  favoriteWorkoutIds: string[];
  onSearchChange: (value: string) => void;
  onSelectFilter: (value: string) => void;
  onShowFavorites: () => void;
  onToggleFavorite: (workoutId: string) => void;
  onSelectWorkout: (workoutId: string) => void;
  onViewAll: (source: 'library' | 'ellie' | 'mine', filter: string) => void;
  onCreateRoutine: () => void;
  onRetry: () => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

export function RoutineDiscoveryPanel({
  modeControl,
  data,
  loading,
  error,
  bottomInset,
  searchQuery,
  filterOptions,
  favoriteWorkoutIds,
  onSearchChange,
  onSelectFilter,
  onShowFavorites,
  onToggleFavorite,
  onSelectWorkout,
  onViewAll,
  onCreateRoutine,
  onRetry,
  onScroll,
}: RoutineDiscoveryPanelProps) {
  const { theme } = useAppTheme();
  const heroWorkout = data?.recommended[0];
  const recommendations = data?.recommended.slice(1) || [];

  const styles = StyleSheet.create({
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xs,
      paddingBottom: bottomInset + theme.spacing.lg,
      gap: 22,
    },
    tools: {
      gap: 10,
    },
    toolsTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.semibold,
    },
    toolsSubtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    personal: {
      gap: 12,
    },
  });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      {modeControl}
      <WorkoutsHeader onCreate={onCreateRoutine} />

      {loading ? <Loader label="Preparando tu biblioteca..." /> : null}

      {error ? (
        <EmptyState
          title="No pudimos preparar tus rutinas"
          description="Revisa tu conexión e inténtalo nuevamente."
          icon={
            <RefreshCw
              color={theme.colors.textSecondary}
              size={20}
              strokeWidth={2}
            />
          }
          actionLabel="Reintentar"
          onAction={onRetry}
        />
      ) : null}

      {!loading && !error && heroWorkout ? (
        <RoutineHeroCard
          workout={heroWorkout}
          onPress={() => onSelectWorkout(heroWorkout.id)}
        />
      ) : null}

      {!loading && !error ? (
        <View style={styles.tools}>
          <View>
            <Text style={styles.toolsTitle}>Encuentra tu rutina</Text>
            <Text style={styles.toolsSubtitle}>
              Busca por nombre o explora por tipo de entrenamiento.
            </Text>
          </View>
          <WorkoutSearchBar
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Buscar entreno"
          />
          <WorkoutQuickFilterChips
            favoritesOnly={false}
            onToggleFavorites={onShowFavorites}
            options={filterOptions}
            activeFilter="Todos"
            onSelectFilter={onSelectFilter}
          />
        </View>
      ) : null}

      {!loading && !error ? (
        <>
          <RoutineDiscoverySection
            title="Recomendadas para ti"
            subtitle="Una selección rápida para tu próxima sesión."
            workouts={recommendations}
            favoriteWorkoutIds={favoriteWorkoutIds}
            onToggleFavorite={onToggleFavorite}
            onSelectWorkout={onSelectWorkout}
            onViewAll={() => onViewAll('library', 'Todos')}
          />
          <RoutineDiscoverySection
            title="Fuerza"
            subtitle="Construye potencia y control."
            workouts={data?.strength || []}
            favoriteWorkoutIds={favoriteWorkoutIds}
            onToggleFavorite={onToggleFavorite}
            onSelectWorkout={onSelectWorkout}
            onViewAll={() => onViewAll('library', 'Fuerza')}
          />
          <RoutineDiscoverySection
            title="Cardio"
            subtitle="Sesiones para elevar tu capacidad."
            workouts={data?.cardio || []}
            favoriteWorkoutIds={favoriteWorkoutIds}
            onToggleFavorite={onToggleFavorite}
            onSelectWorkout={onSelectWorkout}
            onViewAll={() => onViewAll('library', 'Cardio')}
          />
          <RoutineDiscoverySection
            title="HIIT"
            subtitle="Intensidad concentrada en menos tiempo."
            workouts={data?.hiit || []}
            favoriteWorkoutIds={favoriteWorkoutIds}
            onToggleFavorite={onToggleFavorite}
            onSelectWorkout={onSelectWorkout}
            onViewAll={() => onViewAll('library', 'HIIT')}
          />
          <RoutineDiscoverySection
            title="Movilidad y recuperación"
            subtitle="Recupera rango, control y calidad de movimiento."
            workouts={data?.mobility || []}
            favoriteWorkoutIds={favoriteWorkoutIds}
            onToggleFavorite={onToggleFavorite}
            onSelectWorkout={onSelectWorkout}
            onViewAll={() => onViewAll('library', 'Movilidad')}
          />
          <RoutineDiscoverySection
            title="Rutinas de ELLIE"
            subtitle="Propuestas creadas para acompañar tu progreso."
            workouts={data?.ellie || []}
            favoriteWorkoutIds={favoriteWorkoutIds}
            onToggleFavorite={onToggleFavorite}
            onSelectWorkout={onSelectWorkout}
            onViewAll={() => onViewAll('ellie', 'Todos')}
          />
          <View style={styles.personal}>
            <RoutineDiscoverySection
              title="Tus rutinas"
              subtitle="Tu biblioteca personal, siempre a mano."
              workouts={data?.mine || []}
              favoriteWorkoutIds={favoriteWorkoutIds}
              onToggleFavorite={onToggleFavorite}
              onSelectWorkout={onSelectWorkout}
              onViewAll={() => onViewAll('mine', 'Todos')}
            />
            <CreateRoutineCard onPress={onCreateRoutine} />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
