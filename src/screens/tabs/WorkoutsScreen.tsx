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
  UnderlineTabs,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { ExercisesView } from '@app/features/workouts/v2/ExercisesView';
import { RoutinesView } from '@app/features/workouts/v2/RoutinesView';
import { useCoachText } from '@app/features/coach/coachCopy';
import { useIsCoach } from '@app/features/coach/useCoach';
import { CoachStudentsView } from '@app/features/coach/v2/CoachStudentsView';
import { isCoachDay } from '@app/features/week/weekModel';
import { useWeekPlan } from '@app/hooks/useWeekPlan';
import { useAuth } from '@app/hooks/useAuth';
import { useCatalogTotal } from '@app/hooks/useCatalog';
import { useFavoriteWorkouts } from '@app/hooks/useFavoriteWorkouts';
import { useRoutineCategories, useRoutineList, useTodaySuggestion } from '@app/hooks/useRoutines';
import type { TabScreenProps } from '@app/types/navigation';

type Props = TabScreenProps<'Workouts'>;
type Segment = 'routines' | 'exercises';
type Area = 'mine' | 'students';

// Entrenos v2 (Workouts.dc.html · WORKOUTS_01–03): root header with "+",
// segmented Rutinas / Ejercicios. Rutinas: every visible routine through
// list_routines (paginated; collection counts need them all), the category
// catalog and today's
// suggestion as the hero. Ejercicios: the catalog total only; each zone,
// equipment or search opens its server list.
export function WorkoutsScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const routinesQuery = useRoutineList('all', { exhaust: true });
  const categoriesQuery = useRoutineCategories();
  const suggestionQuery = useTodaySuggestion();
  const catalogTotal = useCatalogTotal();
  const favorites = useFavoriteWorkouts();
  const [segment, setSegment] = useState<Segment>(
    route.params?.segment ?? 'routines',
  );
  // Coach (v2.20): Mis entrenos (this screen as always) · Mis alumnos.
  const isCoach = useIsCoach();
  const { t } = useCoachText();
  const [area, setArea] = useState<Area>(route.params?.area ?? 'mine');
  // The coach's assignment takes "Tu próxima sesión" with the COACH label
  // (get_week_plan, source 'coach'; §30.2.1).
  const weekQuery = useWeekPlan();
  const todayDay =
    weekQuery.data?.days.find(day => day.date === weekQuery.data?.today) ?? null;
  const coachSession =
    todayDay && isCoachDay(todayDay) && todayDay.routine && todayDay.status !== 'done'
      ? { routine: todayDay.routine, minutes: todayDay.minutes, tag: t('coach.tag') }
      : null;
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.setValue(event.nativeEvent.contentOffset.y);
    },
    [scrollY],
  );

  // Tab params (deep links).
  useEffect(() => {
    if (route.params?.segment) {
      setSegment(route.params.segment);
    }
    if (route.params?.area) {
      setArea(route.params.area);
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
      weekQuery.refetch().catch(() => {});
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
            // The tab's own safe area includes the system tab bar.
            paddingBottom: insets.bottom + 16,
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
          {isCoach ? (
            <UnderlineTabs
              options={[
                { key: 'mine', label: t('coach.tabs.mine') },
                { key: 'students', label: t('coach.tabs.students') },
              ]}
              value={area}
              onChange={key => {
                setArea(key);
                scrollRef.current?.scrollTo({ y: 0, animated: false });
                scrollY.setValue(0);
              }}
            />
          ) : null}
          {!isCoach || area === 'mine' ? (
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
          ) : null}
        </View>

        {isCoach && area === 'students' ? (
          <CoachStudentsView
            showTitle={false}
            onOpenStudent={student =>
              navigation.navigate(APP_ROUTES.CoachStudent, {
                linkId: student.linkId,
                name: student.name,
              })
            }
          />
        ) : segment === 'routines' ? (
          <RoutinesView
            workouts={workouts}
            categories={categoriesQuery.data ?? []}
            suggestion={suggestionQuery.data?.suggestion ?? null}
            coachSession={coachSession}
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
            onCreateRoutine={() => navigation.navigate(APP_ROUTES.CreateRoutine)}
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
