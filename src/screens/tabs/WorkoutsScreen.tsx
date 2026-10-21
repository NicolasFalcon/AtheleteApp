import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import {
  IconButton,
  Segmented,
  StatusBarShield,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { ExercisesView } from '@app/features/workouts/v2/ExercisesView';
import { RoutinesView } from '@app/features/workouts/v2/RoutinesView';
import { useAuth } from '@app/hooks/useAuth';
import { useCatalogTotal } from '@app/hooks/useCatalog';
import { useFavoriteWorkouts } from '@app/hooks/useFavoriteWorkouts';
import { useRoutineCategories, useRoutineList, useTodaySuggestion } from '@app/hooks/useRoutines';
import { useTabBarMetrics } from '@app/hooks/useTabBarMetrics';
import { useTabBarMotion } from '@app/hooks/useTabBarMotion';
import type { TabScreenProps } from '@app/types/navigation';

type Props = TabScreenProps<'Workouts'>;
type Segment = 'routines' | 'exercises';

// Entrenos v2 (Workouts.dc.html · WORKOUTS_01–03): root header with "+",
// segmented Rutinas / Ejercicios. Rutinas: every visible routine through
// list_routines (paginated; collection counts need them all), the category
// catalog and today's
// suggestion as the hero. Ejercicios: the catalog total only; each zone,
// equipment or search opens its server list.
export function WorkoutsScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const tabBarMotion = useTabBarMotion();
  const { bottomClearance } = useTabBarMetrics();
  const { profile, session } = useAuth();
  const routinesQuery = useRoutineList('all', { exhaust: true });
  const categoriesQuery = useRoutineCategories();
  const suggestionQuery = useTodaySuggestion();
  const catalogTotal = useCatalogTotal();
  const favorites = useFavoriteWorkouts();
  const [segment, setSegment] = useState<Segment>(
    route.params?.segment ?? 'routines',
  );
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.setValue(event.nativeEvent.contentOffset.y);
      tabBarMotion.onScroll(event);
    },
    [scrollY, tabBarMotion],
  );

  // Tab params (deep links).
  useEffect(() => {
    if (route.params?.segment) {
      setSegment(route.params.segment);
    }
  }, [route.params]);

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      routinesQuery.refetch().catch(() => {});
      categoriesQuery.refetch().catch(() => {});
      // refetch is stable.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const workouts = routinesQuery.items;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
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
              scrollY.setValue(0);
            }}
          />
        </View>

        {segment === 'routines' ? (
          <RoutinesView
            workouts={workouts}
            categories={categoriesQuery.data ?? []}
            imageToken={session?.access_token}
            suggestion={suggestionQuery.data?.suggestion ?? null}
            loading={routinesQuery.isLoading || categoriesQuery.isLoading || !favorites.loaded}
            error={Boolean(routinesQuery.error || categoriesQuery.error)}
            onRetry={() => {
              routinesQuery.refetch().catch(() => {});
              categoriesQuery.refetch().catch(() => {});
            }}
            userId={profile?.id}
            favoriteIds={favorites.favoriteWorkoutIds}
            onOpenWorkout={workoutId =>
              navigation.navigate(APP_ROUTES.WorkoutDetail, { workoutId })
            }
            onOpenCategory={category =>
              navigation.navigate(APP_ROUTES.RoutineList, { category })
            }
            onOpenCollection={collection =>
              navigation.navigate(APP_ROUTES.RoutineList, { collection })
            }
            onSearch={() =>
              navigation.navigate(APP_ROUTES.RoutineList, {
                collection: 'all',
                focusSearch: true,
              })
            }
          />
        ) : (
          <ExercisesView
            total={catalogTotal}
            loading={false}
            error={false}
            onRetry={() => {}}
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
            onScan={() => navigation.navigate(APP_ROUTES.MachineScan)}
            onOpenAll={() => navigation.navigate(APP_ROUTES.ExerciseList)}
          />
        )}
      </ScrollView>
      <StatusBarShield scrollY={scrollY} />
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
