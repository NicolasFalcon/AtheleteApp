import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';
import {
  BackButton,
  Button,
  GlassHeader,
  RoutineRow,
  SearchField,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import { useRoutineImages } from '@app/features/workouts/v2/useRoutineImages';
import {
  filterRoutines,
  isMyRoutine,
  plural,
  routineEmptyText,
  routineMeta,
  routineScopeFrom,
  routineScopeTitle,
} from '@app/features/workouts/workoutsModel';
import { useAuth } from '@app/hooks/useAuth';
import { useFavoriteWorkouts } from '@app/hooks/useFavoriteWorkouts';
import { useWorkoutLibrary } from '@app/hooks/useWorkoutLibrary';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { Workout } from '@app/shared';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'RoutineList'>;

// Entrenos · lista de rutinas (D-46): a type ("Fuerza") or a collection
// ("Favoritas", "Tus rutinas", "Todas las rutinas"), like ExerciseList. Same
// library query as the root, filtered on the device.
export function RoutineListScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const workoutsQuery = useWorkoutLibrary();
  const favorites = useFavoriteWorkouts();
  const { imageFor, markBroken } = useRoutineImages();
  const [query, setQuery] = useState('');
  const scope = useMemo(() => routineScopeFrom(route.params), [route.params]);
  const title = routineScopeTitle(scope);
  const userId = profile?.id;

  // Back from a detail: a favourite or a new routine may have changed.
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

  const devEmpty = __DEV__ && Boolean(route.params?.devEmpty);
  const all = useMemo(
    () => (devEmpty ? [] : workoutsQuery.data ?? []),
    [devEmpty, workoutsQuery.data],
  );
  const visible = useMemo(
    () =>
      filterRoutines(all, {
        scope,
        query,
        favoriteIds: favorites.favoriteWorkoutIds,
        userId,
      }),
    [all, favorites.favoriteWorkoutIds, query, scope, userId],
  );
  const showAll = () =>
    navigation.replace(APP_ROUTES.RoutineList, { collection: 'all' });

  const header = (
    <View style={styles.header}>
      <SearchField
        placeholder={`Buscar en ${title}`}
        value={query}
        onChangeText={setQuery}
        autoFocus={Boolean(route.params?.focusSearch)}
      />
      <View style={styles.countRow}>
        <TextV2 variant="meta" tone="secondary" style={styles.flex}>
          {workoutsQuery.isLoading
            ? 'Cargando…'
            : plural(visible.length, 'rutina', 'rutinas')}
        </TextV2>
        <TextV2 variant="metaStrong">A–Z</TextV2>
      </View>
    </View>
  );

  const renderRow = ({ item }: { item: Workout }) => (
    <RoutineRow
      title={item.title}
      meta={routineMeta(item)}
      image={imageFor(item)}
      onImageError={() => markBroken(item.id)}
      mine={isMyRoutine(item, userId)}
      favorite={favorites.favoriteWorkoutIds.includes(item.id)}
      onPress={() =>
        navigation.navigate(APP_ROUTES.WorkoutDetail, { workoutId: item.id })
      }
      onToggleFavorite={() => {
        favorites.toggleWorkoutFavorite(item.id).catch(() => {});
      }}
    />
  );

  const padded = { paddingHorizontal: layout.gutter };
  let body: React.ReactNode;

  if (workoutsQuery.error) {
    body = (
      <View style={padded}>
        {header}
        <BlockError
          message="No pudimos cargar las rutinas."
          onRetry={() => {
            workoutsQuery.refetch().catch(() => {});
          }}
        />
      </View>
    );
  } else if (workoutsQuery.isLoading || !favorites.loaded) {
    // STATE_02: rows with the 76 × 92 photo.
    body = (
      <View style={padded}>
        {header}
        <SkeletonGroup>
          {[0, 1, 2, 3, 4].map(index => (
            <View key={index} style={styles.skeletonRow}>
              <Skeleton width={76} height={92} radius={18} />
              <View style={styles.flexGap}>
                <Skeleton width="72%" height={16} />
                <Skeleton width="48%" height={12} />
              </View>
            </View>
          ))}
        </SkeletonGroup>
      </View>
    );
  } else if (scope.collection === 'favorites' && visible.length === 0 && !query) {
    // STATE_06.
    body = <EmptyFavorites onShowAll={showAll} />;
  } else {
    body = (
      <FlatList
        data={visible}
        keyExtractor={item => item.id}
        renderItem={renderRow}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.empty}>
            <TextV2 variant="body" tone="secondary" align="center">
              {query.trim()
                ? `No encontramos “${query.trim()}” en ${title}.`
                : routineEmptyText(scope)}
            </TextV2>
            {query.trim() ? (
              <Button
                label="Borrar búsqueda"
                variant="secondary"
                size="md"
                onPress={() => setQuery('')}
              />
            ) : scope.collection !== 'all' ? (
              <Button
                label="Ver todas las rutinas"
                variant="secondary"
                size="md"
                onPress={showAll}
              />
            ) : null}
          </View>
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: insets.bottom + 40,
        }}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title={title}
        left={
          <BackButton
            onPress={() => safeGoBack(navigation, [ROOT_ROUTES.MainTabs])}
          />
        }
      />
      {body}
    </View>
  );
}

// STATE_06 · Favoritas without any favourite.
function EmptyFavorites({ onShowAll }: { onShowAll: () => void }) {
  const { colors } = useThemeV2();

  return (
    <View style={styles.favsEmpty}>
      <View
        style={[styles.favsIcon, { backgroundColor: colors.surface.muted }]}
      >
        <Heart size={28} color={colors.text.secondary} strokeWidth={2} />
      </View>
      <View style={styles.favsTexts}>
        <TextV2 variant="section" align="center">
          Sin favoritos todavía
        </TextV2>
        <TextV2
          variant="body"
          tone="secondary"
          align="center"
          style={styles.favsText}
        >
          Toca el corazón en cualquier rutina y la tendrás siempre aquí.
        </TextV2>
      </View>
      <Button
        label="Ver todas las rutinas"
        variant="secondary"
        size="md"
        onPress={onShowAll}
        style={styles.center}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    gap: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flexGap: {
    flex: 1,
    gap: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  empty: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  favsEmpty: {
    alignItems: 'center',
    gap: 18,
    paddingTop: 110,
    paddingHorizontal: 28,
  },
  favsIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favsTexts: {
    gap: 8,
    alignItems: 'center',
  },
  favsText: { maxWidth: 300 },
  center: { alignSelf: 'center' },
});
