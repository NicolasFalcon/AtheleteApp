import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, SlidersHorizontal } from 'lucide-react-native';
import {
  BackButton,
  Button,
  ExerciseRow,
  FilterChip,
  GlassHeader,
  IconButton,
  SearchField,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import { exerciseThumbnail } from '@app/features/workouts/workoutAssets';
import {
  activeFilterCount,
  equipmentLabel,
  filterExercises,
  LEVEL_LABELS,
  levelBars,
  levelLabel,
  NO_EXERCISE_FILTERS,
  plural,
  primaryMuscle,
  zoneLabel,
  type EquipmentKey,
  type ExerciseFilters,
  type ZoneKey,
} from '@app/features/workouts/workoutsModel';
import { ExerciseFiltersSheet } from '@app/features/workouts/v2/ExerciseFiltersSheet';
import { EQUIPMENT_ICONS } from '@app/features/workouts/v2/workoutIcons';
import { useExerciseBrowse, useExercises } from '@app/hooks/useCatalog';
import { useDebouncedValue } from '@app/hooks/useDebouncedValue';
import { useFavoriteExercises } from '@app/hooks/useFavoriteExercises';
import { catalogPerf } from '@app/lib/perf/catalogPerf';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { LibraryExercise } from '@app/shared';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'ExerciseList'>;

// Entrenos · lista filtrada (WORKOUTS_04) + Filtros (WORKOUTS_05).
// list_exercises page by page (30, infinite scroll), zone / equipment / level
// and the search on the server (search waits 300 ms of typing). "Solo
// favoritos" reads the favourite exercises one by one (get_exercise, kept on
// the phone) and filters them here.
export function ExerciseListScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const params = route.params ?? {};
  const zone = (params.zone as ZoneKey | undefined) ?? null;
  const favorites = useFavoriteExercises();
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(Boolean(params.openFilters));
  const [filters, setFilters] = useState<ExerciseFilters>({
    ...NO_EXERCISE_FILTERS,
    bodyPart: zone,
    equipment: params.equipment ? [params.equipment as EquipmentKey] : [],
  });

  const title = zone
    ? zoneLabel(zone)
    : params.equipment
    ? equipmentLabel(params.equipment)
    : 'Todos los ejercicios';

  const debouncedQuery = useDebouncedValue(query, 300);
  const browse = useExerciseBrowse(
    {
      zone: filters.bodyPart,
      equipment: filters.equipment,
      level: filters.level,
      q: debouncedQuery,
    },
    { enabled: !filters.favoritesOnly },
  );
  const favoriteDetails = useExercises(
    filters.favoritesOnly ? favorites.favoriteExerciseIds : [],
  );
  const favoriteList = useMemo(
    () =>
      filterExercises(Object.values(favoriteDetails.byId), filters, {
        query,
        favoriteIds: favorites.favoriteExerciseIds,
      }).sort((a, b) => a.name.localeCompare(b.name)),
    [favoriteDetails.byId, favorites.favoriteExerciseIds, filters, query],
  );
  const exercisesQuery = filters.favoritesOnly
    ? {
        isLoading: favoriteDetails.isLoading,
        error: favoriteDetails.error,
        refetch: favoriteDetails.refetch,
      }
    : browse;
  const visible = filters.favoritesOnly ? favoriteList : browse.items;
  const searching = query !== debouncedQuery;

  // [perf] (dev only): time until the first page is on screen.
  useEffect(() => {
    catalogPerf.screenOpened();
  }, []);
  useEffect(() => {
    catalogPerf.firstPageShown(visible.length);
  }, [visible.length]);
  const filterCount = activeFilterCount(filters);
  const countLine = [
    filters.favoritesOnly || !browse.hasNextPage
      ? plural(visible.length, 'ejercicio', 'ejercicios')
      : `${visible.length}+ ejercicios`,
    filterCount > 0 ? plural(filterCount, 'filtro', 'filtros') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const removeEquipment = (key: EquipmentKey) =>
    setFilters(current => ({
      ...current,
      equipment: current.equipment.filter(item => item !== key),
    }));

  const renderRow = ({ item }: { item: LibraryExercise }) => (
    <ExerciseRow
      title={item.name}
      muscle={primaryMuscle(item)}
      equipment={equipmentLabel(item.equipment)}
      levelLabel={LEVEL_LABELS[item.level] ?? levelLabel(item.level)}
      levelBars={levelBars(item.level)}
      thumbnail={{
        mediaKey: item.thumbKey,
        fallback: exerciseThumbnail(item.bodyPart),
      }}
      favorite={favorites.isExerciseFavorite(item.id)}
      onPress={() =>
        navigation.navigate(APP_ROUTES.ExerciseDetail, { exerciseId: item.id })
      }
      onToggleFavorite={() => {
        favorites.toggleExerciseFavorite(item.id).catch(() => {});
      }}
    />
  );

  const header = (
    <View style={styles.header}>
      <SearchField
        placeholder={`Buscar en ${title}`}
        value={query}
        onChangeText={setQuery}
        autoFocus={Boolean(params.focusSearch)}
      />
      <View style={styles.filterRow}>
        {filters.equipment.map(key => (
          <FilterChip
            key={key}
            size={32}
            removable
            icon={EQUIPMENT_ICONS[key]}
            label={equipmentLabel(key)}
            onPress={() => removeEquipment(key)}
          />
        ))}
        {filters.level ? (
          <FilterChip
            size={32}
            removable
            label={LEVEL_LABELS[filters.level]}
            onPress={() => setFilters(current => ({ ...current, level: null }))}
          />
        ) : null}
        {filters.favoritesOnly ? (
          <FilterChip
            size={32}
            removable
            icon={Heart}
            label="Favoritos"
            onPress={() =>
              setFilters(current => ({ ...current, favoritesOnly: false }))
            }
          />
        ) : null}
        <TextV2
          variant="meta"
          tone="secondary"
          style={styles.flex}
          numberOfLines={1}
        >
          {exercisesQuery.isLoading || searching ? 'Cargando…' : countLine}
        </TextV2>
        <TextV2 variant="metaStrong">A–Z</TextV2>
      </View>
    </View>
  );

  const body = exercisesQuery.error ? (
    <View style={{ paddingHorizontal: layout.gutter }}>
      {header}
      <BlockError
        message="No pudimos cargar los ejercicios."
        onRetry={() => {
          exercisesQuery.refetch().catch(() => {});
        }}
      />
    </View>
  ) : exercisesQuery.isLoading || !favorites.loaded ? (
    <View style={{ paddingHorizontal: layout.gutter }}>
      {header}
      <SkeletonGroup>
        {[0, 1, 2, 3].map(index => (
          <View key={index} style={styles.skeletonRow}>
            <Skeleton width={76} height={76} radius={20} />
            <View style={styles.flexGap}>
              <Skeleton width="70%" height={16} />
              <Skeleton width="50%" height={12} />
            </View>
          </View>
        ))}
      </SkeletonGroup>
    </View>
  ) : (
    <FlatList
      data={visible}
      keyExtractor={item => item.id}
      renderItem={renderRow}
      ListHeaderComponent={header}
      onEndReachedThreshold={0.6}
      onEndReached={() => {
        if (!filters.favoritesOnly && browse.hasNextPage && !browse.isFetchingNextPage) {
          browse.fetchNextPage().catch(() => {});
        }
      }}
      ListFooterComponent={
        browse.isFetchingNextPage ? (
          <SkeletonGroup>
            <View style={styles.skeletonRow}>
              <Skeleton width={76} height={76} radius={20} />
              <View style={styles.flexGap}>
                <Skeleton width="70%" height={16} />
                <Skeleton width="50%" height={12} />
              </View>
            </View>
          </SkeletonGroup>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <TextV2 variant="body" tone="secondary" align="center">
            {query.trim()
              ? `No encontramos “${query.trim()}” en ${title}.`
              : 'Ningún ejercicio coincide con estos filtros.'}
          </TextV2>
          {filterCount > 0 || query ? (
            <Button
              label="Quitar filtros"
              variant="secondary"
              size="md"
              onPress={() => {
                setQuery('');
                setFilters({ ...NO_EXERCISE_FILTERS, bodyPart: zone });
              }}
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
        right={
          <IconButton
            icon={SlidersHorizontal}
            accessibilityLabel="Filtros"
            onPress={() => setFiltersOpen(true)}
          />
        }
      />
      {body}
      <ExerciseFiltersSheet
        open={filtersOpen}
        filters={filters}
        onApply={next => {
          setFilters(next);
          setFiltersOpen(false);
        }}
        onClose={() => setFiltersOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    gap: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flex: {
    flex: 1,
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
});
