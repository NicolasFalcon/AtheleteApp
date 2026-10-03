import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import {
  IconButton,
  Segmented,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import {
  recommendRoutines,
  type RoutineChip,
} from '@app/features/workouts/workoutsModel';
import { ExercisesView } from '@app/features/workouts/v2/ExercisesView';
import { RoutinesView } from '@app/features/workouts/v2/RoutinesView';
import { useAuth } from '@app/hooks/useAuth';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { useFavoriteWorkouts } from '@app/hooks/useFavoriteWorkouts';
import { useTabBarMetrics } from '@app/hooks/useTabBarMetrics';
import { useTabBarMotion } from '@app/hooks/useTabBarMotion';
import { useWorkoutLibrary } from '@app/hooks/useWorkoutLibrary';
import type { TabScreenProps } from '@app/types/navigation';

type Props = TabScreenProps<'Workouts'>;
type Segment = 'routines' | 'exercises';

// Entrenos v2 (Workouts.dc.html · WORKOUTS_01–03): root header with "+",
// segmented Rutinas / Ejercicios. The whole library is loaded once (the same
// query as Inicio and the routine detail) and filtered on the device, so
// counts per type, zone and equipment are real.
export function WorkoutsScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const tabBarMotion = useTabBarMotion();
  const { bottomClearance } = useTabBarMetrics();
  const { profile } = useAuth();
  const workoutsQuery = useWorkoutLibrary();
  const exercisesQuery = useExerciseLibrary();
  const favorites = useFavoriteWorkouts();
  const [segment, setSegment] = useState<Segment>(
    route.params?.segment ?? 'routines',
  );
  const [chip, setChip] = useState<RoutineChip>(
    route.params?.favoritesOnly ? 'favorites' : 'all',
  );
  const scrollRef = useRef<ScrollView>(null);

  // Tab params (dev screen cycler, deep links).
  useEffect(() => {
    if (route.params?.segment) {
      setSegment(route.params.segment);
    }
    if (route.params?.favoritesOnly !== undefined) {
      setChip(route.params.favoritesOnly ? 'favorites' : 'all');
    }
  }, [route.params]);

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      workoutsQuery.refetch().catch(() => {});
      // refetch is stable.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const workouts = useMemo(
    () => workoutsQuery.data ?? [],
    [workoutsQuery.data],
  );
  const nextSession = useMemo(
    () => recommendRoutines(workouts, profile?.goal, 1)[0] ?? null,
    [profile?.goal, workouts],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <ScrollView
        ref={scrollRef}
        onScroll={tabBarMotion.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 8,
            paddingHorizontal: layout.gutter,
            paddingBottom: bottomClearance,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <TextV2 variant="title28" accessibilityRole="header">
              Entrenos
            </TextV2>
            <IconButton
              icon={Plus}
              variant="solid"
              accessibilityLabel="Crear rutina"
              onPress={() => navigation.navigate(APP_ROUTES.CreateRoutine)}
            />
          </View>
          <Segmented
            options={[
              { key: 'routines', label: 'Rutinas' },
              { key: 'exercises', label: 'Ejercicios' },
            ]}
            value={segment}
            onChange={key => {
              setSegment(key);
              scrollRef.current?.scrollTo({ y: 0, animated: false });
            }}
          />
        </View>

        {segment === 'routines' ? (
          <RoutinesView
            workouts={workouts}
            nextSession={nextSession}
            loading={workoutsQuery.isLoading || !favorites.loaded}
            error={Boolean(workoutsQuery.error)}
            onRetry={() => {
              workoutsQuery.refetch().catch(() => {});
            }}
            userId={profile?.id}
            chip={chip}
            onChipChange={setChip}
            favoriteIds={favorites.favoriteWorkoutIds}
            onToggleFavorite={id => {
              favorites.toggleWorkoutFavorite(id).catch(() => {});
            }}
            onOpenWorkout={workoutId =>
              navigation.navigate(APP_ROUTES.WorkoutDetail, { workoutId })
            }
          />
        ) : (
          <ExercisesView
            exercises={exercisesQuery.data ?? []}
            loading={exercisesQuery.isLoading}
            error={Boolean(exercisesQuery.error)}
            onRetry={() => {
              exercisesQuery.refetch().catch(() => {});
            }}
            onSearch={() =>
              navigation.navigate(APP_ROUTES.ExerciseList, {
                focusSearch: true,
              })
            }
            onOpenFilters={() =>
              navigation.navigate(APP_ROUTES.ExerciseList, {
                openFilters: true,
              })
            }
            onOpenZone={zone =>
              navigation.navigate(APP_ROUTES.ExerciseList, { zone })
            }
            onOpenEquipment={equipment =>
              navigation.navigate(APP_ROUTES.ExerciseList, { equipment })
            }
            onOpenAll={() => navigation.navigate(APP_ROUTES.ExerciseList)}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: 20,
  },
  header: {
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
