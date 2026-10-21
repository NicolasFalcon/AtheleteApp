import { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { getWorkoutThumbnail } from '@app/lib/workoutThumbnails';
import LinearGradient from 'react-native-linear-gradient';
import {
  Heart,
  LayoutList,
  Play,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import {
  PressableScale,
  SearchField,
  Skeleton,
  SkeletonGroup,
  TextV2,
  WorkoutHero,
  useThemeV2,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  COLLECTION_LABELS,
  COLLECTION_TILES,
  countByCollection,
  LEVEL_LABELS,
  groupOf,
  plural,
  type RoutineCollection,
} from '@app/features/workouts/workoutsModel';
import type { RoutineLibraryCategory, RoutineSuggestion } from '@app/services/routines/routinesService';
import type { Workout } from '@app/shared';

export type RoutinesViewProps = {
  workouts: Workout[];
  categories: RoutineLibraryCategory[];
  imageToken?: string;
  // get_today_suggestion (null: none today → no hero).
  suggestion: RoutineSuggestion | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  userId?: string;
  favoriteIds: string[];
  onOpenWorkout: (id: string) => void;
  onOpenCategory: (category: string) => void;
  onOpenCollection: (collection: RoutineCollection) => void;
  onSearch: () => void;
};

const COLLECTION_ICONS: Record<RoutineCollection, LucideIcon> = {
  favorites: Heart,
  mine: UserRound,
  all: LayoutList,
};

// Entrenos · Rutinas (WORKOUTS_01, D-46): the root explores, like
// Ejercicios. Recommended hero, search (opens the full list) and cards for
// API category cards plus Favoritas / Tus rutinas / Todas; lists live in RoutineList.
export function RoutinesView({
  workouts,
  categories,
  imageToken,
  suggestion,
  loading,
  error,
  onRetry,
  userId,
  favoriteIds,
  onOpenWorkout,
  onOpenCategory,
  onOpenCollection,
  onSearch,
}: RoutinesViewProps) {
  const { layout } = useThemeV2();

  if (error) {
    return (
      <BlockError message="No pudimos cargar las rutinas." onRetry={onRetry} />
    );
  }

  if (loading) {
    return <RoutinesSkeleton />;
  }

  const collections = countByCollection(workouts, { favoriteIds, userId });

  return (
    <>
      {suggestion ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Tu próxima sesión: ${suggestion.title}. ${suggestion.reason}`}
          onPress={() => onOpenWorkout(suggestion.routineId)}
          style={{ marginHorizontal: -layout.gutter }}
        >
          <WorkoutHero
            image={suggestionImage(suggestion)}
            height={300}
            eyebrow="Tu próxima sesión"
            title={suggestion.title}
            meta={suggestionMeta(suggestion)}
            metaTrailing={<PlayDisc />}
          />
        </PressableScale>
      ) : null}

      <SearchField
        placeholder={`Buscar entre ${plural(workouts.length, 'rutina', 'rutinas')}`}
        onPress={onSearch}
      />

      <View style={styles.section}>
        <TextV2 variant="section">Por tipo</TextV2>
        <View style={styles.typeGrid}>
          {categories.map(category => (
            <Tile
              key={`${category.slug}:${category.imageUrl ?? ''}`}
              label={category.name}
              count={category.routineCount}
              image={category.imageUrl && imageToken
                ? { uri: category.imageUrl, headers: { Authorization: `Bearer ${imageToken}` } }
                : undefined}
              onPress={() => onOpenCategory(category.slug)}
            />
          ))}
          {COLLECTION_TILES.map(collection => (
            <Tile
              key={collection}
              label={COLLECTION_LABELS[collection]}
              count={collections[collection]}
              icon={COLLECTION_ICONS[collection]}
              onPress={() => onOpenCollection(collection)}
            />
          ))}
        </View>
      </View>
    </>
  );
}

// Photo of the suggested routine (local, by its group and zone).
export function suggestionImage(suggestion: RoutineSuggestion): ImageSourcePropType {
  return getWorkoutThumbnail(
    groupOf(suggestion) ?? undefined,
    suggestion.zone ? [suggestion.zone] : [],
    suggestion.title,
  );
}

// "45 min · Intermedio · Ayer hiciste tren superior"
export function suggestionMeta(suggestion: RoutineSuggestion): string {
  return [
    `${suggestion.duration} min`,
    LEVEL_LABELS[suggestion.difficulty],
    suggestion.reason,
  ]
    .filter(Boolean)
    .join(' · ');
}

function PlayDisc() {
  const { scene } = useThemeV2();
  return (
    <View style={[styles.play, { backgroundColor: scene.cta.onScene }]}>
      <Play size={16} color={scene.cta.onSceneText} strokeWidth={2} />
    </View>
  );
}

// Photo card (type) or icon over a dark scene (collection); same size and
// label treatment. No selected state: each card opens its list.
function Tile({
  label,
  count,
  image,
  icon: Icon,
  onPress,
}: {
  label: string;
  count: number;
  image?: ImageSourcePropType;
  icon?: LucideIcon;
  onPress: () => void;
}) {
  const { scene, mode } = useThemeV2();
  const [brokenImage, setBrokenImage] = useState(false);
  const visibleImage = image && !brokenImage ? image : undefined;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${plural(count, 'rutina', 'rutinas')}`}
      onPress={onPress}
      // Dark: the scene card sits on a near-black background; an inner
      // border separates it (D-15 criterion instead of a glow).
      style={[styles.typeTile, !visibleImage && mode === 'dark' && styles.tileBorder]}
    >
      <View style={styles.typeClip}>
        {visibleImage ? (
          <>
            <Image source={visibleImage} resizeMode="cover" style={styles.fill} onError={() => setBrokenImage(true)} />
            <LinearGradient
              colors={['rgba(20,19,18,.8)', 'rgba(20,19,18,.1)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </>
        ) : (
          <LinearGradient
            colors={['#2A2724', '#141312']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>
      {Icon ? (
        <View style={[styles.tileIcon, { backgroundColor: scene.dotRing }]}>
          <Icon size={17} color="#FFFFFF" strokeWidth={2} />
        </View>
      ) : null}
      <View style={styles.typeLabels}>
        <TextV2
          variant="cta"
          color="#FFFFFF"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {label}
        </TextV2>
        <TextV2 variant="caption" color="#D8D6D1">
          {plural(count, 'rutina', 'rutinas')}
        </TextV2>
      </View>
    </PressableScale>
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
  tileBorder: {
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)',
  },
  tileIcon: {
    position: 'absolute',
    top: 12,
    left: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabels: {
    position: 'absolute',
    left: 14,
    bottom: 12,
  },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
