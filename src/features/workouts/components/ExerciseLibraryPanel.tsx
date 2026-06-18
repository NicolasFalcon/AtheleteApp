import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { EmptyState, Loader } from '@app/components/ui';
import { ExerciseFiltersModal } from '@app/features/workouts/components/ExerciseFiltersModal';
import { ExerciseLibraryHeader } from '@app/features/workouts/components/ExerciseLibraryHeader';
import { ExerciseListItem } from '@app/features/workouts/components/ExerciseListItem';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { LibraryExercise } from '@app/shared';

function ListSeparator() {
  return <View style={separatorStyle.item} />;
}

const separatorStyle = StyleSheet.create({
  item: {
    height: 10,
  },
});

type ExerciseLibraryPanelProps = {
  exercises: LibraryExercise[];
  totalExercisesCount: number;
  favoriteExerciseIds: string[];
  loading: boolean;
  loadingMore: boolean;
  hasNextPage: boolean;
  bottomInset: number;
  viewMode: 'all' | 'favorites';
  searchQuery: string;
  equipmentFilter: string;
  bodyPartFilter: string;
  levelFilter: string;
  resultTitle: string;
  resultSubtitle: string;
  onBack: () => void;
  onViewModeChange: (value: 'all' | 'favorites') => void;
  onSearchChange: (value: string) => void;
  onEquipmentChange: (value: string) => void;
  onBodyPartChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onToggleFavorite: (exerciseId: string) => void;
  onSelectExercise: (exerciseId: string) => void;
  onLoadMore: () => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

export function ExerciseLibraryPanel({
  exercises,
  totalExercisesCount,
  favoriteExerciseIds,
  loading,
  loadingMore,
  hasNextPage,
  bottomInset,
  viewMode,
  searchQuery,
  equipmentFilter,
  bodyPartFilter,
  levelFilter,
  resultTitle,
  resultSubtitle,
  onBack,
  onViewModeChange,
  onSearchChange,
  onEquipmentChange,
  onBodyPartChange,
  onLevelChange,
  onToggleFavorite,
  onSelectExercise,
  onLoadMore,
  onScroll,
}: ExerciseLibraryPanelProps) {
  const { theme } = useAppTheme();
  const [filtersVisible, setFiltersVisible] = useState(false);
  const activeFiltersCount = [
    equipmentFilter,
    bodyPartFilter,
    levelFilter,
  ].filter(value => value !== 'all').length;
  const styles = StyleSheet.create({
    header: {
      gap: 20,
      marginBottom: theme.spacing.md,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: bottomInset + theme.spacing.md,
    },
    listHeading: {
      gap: 2,
      paddingTop: 2,
    },
    listTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 18,
      fontWeight: theme.typography.weights.semibold,
    },
    listSubtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
    footer: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  const header = (
    <View style={styles.header}>
      <ExerciseLibraryHeader
        totalCount={totalExercisesCount}
        visibleCount={exercises.length}
        viewMode={viewMode}
        activeFiltersCount={activeFiltersCount}
        searchQuery={searchQuery}
        title={resultTitle}
        subtitle={resultSubtitle}
        onBack={onBack}
        onSearchChange={onSearchChange}
        onOpenFilters={() => setFiltersVisible(true)}
      />

      <View style={styles.listHeading}>
        <Text style={styles.listTitle}>
          {viewMode === 'favorites'
            ? 'Tus favoritos'
            : searchQuery.trim()
            ? 'Resultados'
            : 'Todos los ejercicios'}
        </Text>
        <Text style={styles.listSubtitle}>
          {loading
            ? 'Actualizando biblioteca...'
            : `${exercises.length} cargados de ${totalExercisesCount}`}
        </Text>
      </View>

      {loading ? <Loader label="Cargando ejercicios..." /> : null}
    </View>
  );

  return (
    <>
      <FlatList
        data={loading ? [] : exercises}
        contentContainerStyle={styles.content}
        keyExtractor={exercise => exercise.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <ExerciseListItem
            exercise={item}
            isFavorite={favoriteExerciseIds.includes(item.id)}
            onToggleFavorite={() => onToggleFavorite(item.id)}
            onPress={() => onSelectExercise(item.id)}
          />
        )}
        ItemSeparatorComponent={ListSeparator}
        ListEmptyComponent={
          !loading && viewMode === 'favorites' ? (
            <EmptyState
              title="Sin ejercicios favoritos aún"
              description="Explora la biblioteca y guarda ejercicios para verlos aquí."
            />
          ) : !loading ? (
            <EmptyState
              title="No se encontraron ejercicios"
              description="Prueba con otra búsqueda o cambia los filtros activos."
            />
          ) : null
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {loadingMore ? (
              <ActivityIndicator color={theme.colors.textSecondary} />
            ) : null}
          </View>
        }
        onEndReached={() => {
          if (hasNextPage && !loadingMore) {
            onLoadMore();
          }
        }}
        onEndReachedThreshold={0.45}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />

      <ExerciseFiltersModal
        visible={filtersVisible}
        viewMode={viewMode}
        equipment={equipmentFilter}
        bodyPart={bodyPartFilter}
        level={levelFilter}
        onClose={() => setFiltersVisible(false)}
        onApply={filters => {
          onViewModeChange(filters.viewMode);
          onEquipmentChange(filters.equipment);
          onBodyPartChange(filters.bodyPart);
          onLevelChange(filters.level);
          setFiltersVisible(false);
        }}
      />
    </>
  );
}
