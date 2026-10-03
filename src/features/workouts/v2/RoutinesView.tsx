import { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowRight, Heart, Play } from 'lucide-react-native';
import {
  Button,
  FilterChip,
  PressableScale,
  RoutineRow,
  SearchField,
  Skeleton,
  SkeletonGroup,
  TextV2,
  WorkoutHero,
  useThemeV2,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { TYPE_IMAGES } from '@app/features/workouts/workoutAssets';
import {
  countByType,
  filterRoutines,
  plural,
  routineEmptyText,
  routineHeroMeta,
  routineListTitle,
  routineMeta,
  ROUTINE_CHIPS,
  TYPE_LABELS,
  TYPE_TILES,
  type RoutineChip,
} from '@app/features/workouts/workoutsModel';
import {
  DEFAULT_WORKOUT_THUMBNAIL,
  resolveWorkoutThumbnailSource,
} from '@app/lib/workoutThumbnails';
import { getWorkoutAccess, type Workout } from '@app/shared';

export type RoutinesViewProps = {
  workouts: Workout[];
  nextSession: Workout | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  userId?: string;
  chip: RoutineChip;
  onChipChange: (chip: RoutineChip) => void;
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
  onOpenWorkout: (id: string) => void;
};

function workoutImage(workout: Workout) {
  return resolveWorkoutThumbnailSource({
    imageUrl: workout.imageUrl,
    type: workout.type,
    targetMuscles: workout.targetMuscles,
    title: workout.title,
  });
}

// Entrenos · Rutinas (WORKOUTS_01 / 02, STATE_02 / 06).
export function RoutinesView({
  workouts,
  nextSession,
  loading,
  error,
  onRetry,
  userId,
  chip,
  onChipChange,
  favoriteIds,
  onToggleFavorite,
  onOpenWorkout,
}: RoutinesViewProps) {
  const { colors, layout } = useThemeV2();
  const [query, setQuery] = useState('');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  if (error) {
    return (
      <BlockError message="No pudimos cargar las rutinas." onRetry={onRetry} />
    );
  }

  if (loading) {
    return <RoutinesSkeleton />;
  }

  // STATE_06: "Solo favoritos" without any favourite.
  if (chip === 'favorites' && favoriteIds.length === 0) {
    return (
      <View style={styles.favsEmptyWrap}>
        <ChipsRow chip={chip} onChipChange={onChipChange} />
        <EmptyFavorites onShowAll={() => onChipChange('all')} />
      </View>
    );
  }

  const counts = countByType(workouts);
  const list = filterRoutines(workouts, { chip, query, favoriteIds });
  const imageFor = (workout: Workout) =>
    brokenImages[workout.id]
      ? DEFAULT_WORKOUT_THUMBNAIL
      : workoutImage(workout);

  return (
    <>
      {nextSession ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Tu próxima sesión: ${nextSession.title}`}
          onPress={() => onOpenWorkout(nextSession.id)}
          style={{ marginHorizontal: -layout.gutter }}
        >
          <WorkoutHero
            image={imageFor(nextSession)}
            onImageError={() =>
              setBrokenImages(current => ({
                ...current,
                [nextSession.id]: true,
              }))
            }
            height={300}
            eyebrow="Tu próxima sesión"
            title={nextSession.title}
            meta={routineHeroMeta(nextSession)}
            metaTrailing={<PlayDisc />}
          />
        </PressableScale>
      ) : null}

      <View style={styles.section}>
        <TextV2 variant="section">Por tipo</TextV2>
        <View style={styles.typeGrid}>
          {TYPE_TILES.map(type => (
            <TypeTile
              key={type}
              label={TYPE_LABELS[type]}
              count={counts[type]}
              image={TYPE_IMAGES[type]}
              selected={chip === type}
              onPress={() => onChipChange(chip === type ? 'all' : type)}
            />
          ))}
        </View>
      </View>

      <SearchField
        placeholder="Buscar entreno"
        value={query}
        onChangeText={setQuery}
      />

      <ChipsRow chip={chip} onChipChange={onChipChange} />

      <View style={styles.listSection}>
        <View style={styles.listHeader}>
          <TextV2 variant="section">{routineListTitle(chip)}</TextV2>
          <TextV2 variant="meta" tone="secondary">
            {plural(list.length, 'rutina', 'rutinas')}
          </TextV2>
        </View>
        {list.map(workout => (
          <RoutineRow
            key={workout.id}
            title={workout.title}
            meta={routineMeta(workout)}
            image={imageFor(workout)}
            onImageError={() =>
              setBrokenImages(current => ({ ...current, [workout.id]: true }))
            }
            mine={getWorkoutAccess(workout, userId).isOwnedByCurrentUser}
            favorite={favoriteIds.includes(workout.id)}
            onPress={() => onOpenWorkout(workout.id)}
            onToggleFavorite={() => onToggleFavorite(workout.id)}
          />
        ))}
        {list.length === 0 ? (
          <View style={styles.inlineEmpty}>
            <TextV2 variant="body" tone="secondary" align="center">
              {query.trim()
                ? `Ninguna rutina coincide con “${query.trim()}”.`
                : routineEmptyText(chip)}
            </TextV2>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Ver todas"
              onPress={() => {
                setQuery('');
                onChipChange('all');
              }}
              style={styles.inlineAction}
            >
              <TextV2 variant="bodyStrong">Ver todas</TextV2>
              <ArrowRight
                size={15}
                strokeWidth={2}
                color={colors.text.primary}
              />
            </PressableScale>
          </View>
        ) : null}
      </View>
    </>
  );
}

function ChipsRow({
  chip,
  onChipChange,
}: {
  chip: RoutineChip;
  onChipChange: (chip: RoutineChip) => void;
}) {
  const { layout } = useThemeV2();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -layout.gutter }}
      contentContainerStyle={[
        styles.chips,
        { paddingHorizontal: layout.gutter },
      ]}
    >
      {ROUTINE_CHIPS.map(item => (
        <FilterChip
          key={item.key}
          label={item.label}
          icon={
            item.key === 'favorites' && chip === 'favorites' ? Heart : undefined
          }
          selected={chip === item.key}
          onPress={() => onChipChange(item.key)}
        />
      ))}
    </ScrollView>
  );
}

function PlayDisc() {
  const { scene } = useThemeV2();
  return (
    <View style={[styles.play, { backgroundColor: scene.cta.onScene }]}>
      <Play size={16} color={scene.cta.onSceneText} strokeWidth={2} />
    </View>
  );
}

function TypeTile({
  label,
  count,
  image,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  image: ImageSourcePropType;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${plural(count, 'rutina', 'rutinas')}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.typeTile,
        selected && {
          boxShadow: `0 0 0 2px ${colors.bg}, 0 0 0 4px ${colors.text.primary}`,
        },
      ]}
    >
      <View style={styles.typeClip}>
        <Image source={image} resizeMode="cover" style={styles.fill} />
        <LinearGradient
          colors={['rgba(20,19,18,.8)', 'rgba(20,19,18,.1)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={styles.typeLabels}>
        <TextV2 variant="cta" color="#FFFFFF">
          {label}
        </TextV2>
        <TextV2 variant="caption" color="#D8D6D1">
          {plural(count, 'rutina', 'rutinas')}
        </TextV2>
      </View>
    </PressableScale>
  );
}

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
      />
    </View>
  );
}

// STATE_02 · Loading · Rutinas: hero block with three lines and the 2×2
// "Por tipo" tiles.
function RoutinesSkeleton() {
  const { colors, layout } = useThemeV2();

  return (
    <SkeletonGroup>
      <View
        style={[
          styles.skeletonHero,
          {
            marginHorizontal: -layout.gutter,
            backgroundColor: colors.surface.skeleton,
          },
        ]}
      >
        <View style={styles.skeletonHeroLines}>
          <Skeleton
            width={116}
            height={12}
            radius={6}
            style={styles.onSkeleton}
          />
          <Skeleton
            width={262}
            height={20}
            radius={10}
            style={styles.onSkeleton}
          />
          <Skeleton
            width={174}
            height={12}
            radius={6}
            style={styles.onSkeleton}
          />
        </View>
      </View>
      <View style={styles.section}>
        <Skeleton width={96} height={18} radius={9} />
        <View style={styles.typeGrid}>
          {[0, 1, 2, 3].map(index => (
            <Skeleton
              key={index}
              height={116}
              radius={20}
              style={styles.skeletonTile}
            />
          ))}
        </View>
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeTile: {
    width: '48.5%',
    flexGrow: 1,
    flexBasis: '45%',
    height: 96,
    borderRadius: 20,
    backgroundColor: '#1F1D1B',
  },
  typeClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  typeLabels: {
    position: 'absolute',
    left: 14,
    bottom: 12,
  },
  chips: {
    gap: 8,
  },
  listSection: {
    gap: 10,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  inlineEmpty: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favsEmptyWrap: {
    gap: 18,
    marginTop: -2,
  },
  favsEmpty: {
    alignItems: 'center',
    gap: 18,
    paddingTop: 70,
    paddingHorizontal: 8,
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
  favsText: {
    maxWidth: 300,
  },
  skeletonHero: {
    height: 316,
    justifyContent: 'flex-end',
  },
  skeletonHeroLines: {
    padding: 20,
    paddingBottom: 24,
    gap: 10,
  },
  onSkeleton: {
    opacity: 0.6,
  },
  skeletonTile: {
    width: '47%',
    flexGrow: 1,
  },
});
