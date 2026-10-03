import { useMemo, useState } from 'react';
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
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { useFavoriteExercises } from '@app/hooks/useFavoriteExercises';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { LibraryExercise } from '@app/shared';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'ExerciseList'>;

// Entrenos · lista filtrada (WORKOUTS_04) + Filtros (WORKOUTS_05). Real
// library, filtered on the device (the same list that feeds the zone and
// equipment counts of Ejercicios).
export function ExerciseListScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const params = route.params ?? {};
  const zone = (params.zone as ZoneKey | undefined) ?? null;
  const exercisesQuery = useExerciseLibrary();
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

  const all = useMemo(() => exercisesQuery.data ?? [], [exercisesQuery.data]);
  const visible = useMemo(
    () =>
      filterExercises(all, filters, {
        query,
        favoriteIds: favorites.favoriteExerciseIds,
      }),
    [all, favorites.favoriteExerciseIds, filters, query],
  );
  const filterCount = activeFilterCount(filters);
  const countLine = [
    plural(visible.length, 'ejercicio', 'ejercicios'),
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
      thumbnail={exerciseThumbnail(item.bodyPart)}
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
          {exercisesQuery.isLoading ? 'Cargando…' : countLine}
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
        countFor={draft =>
          filterExercises(all, draft, {
            query,
            favoriteIds: favorites.favoriteExerciseIds,
          }).length
        }
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
