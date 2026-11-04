import { ScrollView, StyleSheet, View } from 'react-native';
import {
  routineCoverSource,
  useRoutineCoverContext,
} from '@app/components/v2/RoutineCover';
import { routineFocusWord } from '@app/features/workouts/routineFocus';
import {
  ChevronRight,
  Heart,
  ListChecks,
  Play,
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
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  CATEGORY_CARD_WIDTH,
  CategoryCard,
} from '@app/features/workouts/v2/CategoryCard';
import { CATEGORY_COVERS } from '@app/features/workouts/workoutAssets';
import {
  countByCollection,
  groupLibraryCategories,
  LEVEL_LABELS,
  libraryCategoryKey,
  type LibraryCategoryGroup,
  type RoutineCollection,
} from '@app/features/workouts/workoutsModel';
import {
  hasWorkoutsCopy,
  routineCountText,
  workoutsText,
} from '@app/features/workouts/workoutsCopy';
import type { RoutineLibraryCategory, RoutineSuggestion } from '@app/services/routines/routinesService';
import type { Workout } from '@app/shared';

export type RoutinesViewProps = {
  workouts: Workout[];
  categories: RoutineLibraryCategory[];
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
  // "Mis rutinas" with no routines opens Nueva rutina.
  onCreateRoutine: () => void;
  onSearch: () => void;
};

const GROUP_TITLE_KEYS = {
  goal: 'workouts.byType.group.goal',
  format: 'workouts.byType.group.format',
} as const satisfies Record<LibraryCategoryGroup, string>;

// Entrenos · Rutinas (WORKOUTS_01, D-46, v2.19 §29): the root explores, like
// Ejercicios. Recommended hero, search (opens the full list), Favoritas /
// Todas quick access, category photo rows (Por objetivo, Por formato) and
// Mis rutinas; lists live in RoutineList.
export function RoutinesView({
  workouts,
  categories,
  suggestion,
  loading,
  error,
  onRetry,
  userId,
  favoriteIds,
  onOpenWorkout,
  onOpenCategory,
  onOpenCollection,
  onCreateRoutine,
  onSearch,
}: RoutinesViewProps) {
  const { layout } = useThemeV2();
  const cover = useRoutineCoverContext();
  const language = cover.language;

  if (error) {
    return (
      <BlockError message="No pudimos cargar las rutinas." onRetry={onRetry} />
    );
  }

  if (loading) {
    return <RoutinesSkeleton />;
  }

  const collections = countByCollection(workouts, { favoriteIds, userId });
  const groups = groupLibraryCategories(categories);
  const mineName = workoutsText(language, 'category.misrutinas');
  const mineMeta = collections.mine > 0
    ? routineCountText(language, collections.mine)
    : workoutsText(language, 'workouts.mine.empty');

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
            image={routineCoverSource(suggestion.routineFocus, cover.gender)}
            coverWord={routineFocusWord(suggestion, cover.language)}
            dim={false}
            height={300}
            eyebrow="Tu próxima sesión"
            title={suggestion.title}
            meta={suggestionMeta(suggestion)}
            metaTrailing={<PlayDisc />}
          />
        </PressableScale>
      ) : null}

      <View style={styles.searchBlock}>
        <SearchField
          placeholder={workoutsText(language, 'workouts.search.placeholder', { n: workouts.length })}
          onPress={onSearch}
        />
        <View style={styles.quickRow}>
          <QuickAccess
            label={workoutsText(language, 'workouts.quick.favorites')}
            count={collections.favorites}
            icon="favorites"
            onPress={() => onOpenCollection('favorites')}
          />
          <QuickAccess
            label={workoutsText(language, 'workouts.quick.all')}
            count={collections.all}
            icon="all"
            onPress={() => onOpenCollection('all')}
          />
        </View>
      </View>

      <View style={styles.groups}>
        {(Object.keys(GROUP_TITLE_KEYS) as LibraryCategoryGroup[]).map(group =>
          // A group with no cards is hidden (§29.5).
          groups[group].length > 0 ? (
            <View key={group} style={styles.section}>
              <TextV2 variant="section" accessibilityRole="header">
                {workoutsText(language, GROUP_TITLE_KEYS[group])}
              </TextV2>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={CATEGORY_CARD_WIDTH + 10}
                snapToAlignment="start"
                style={{ marginHorizontal: -layout.gutter }}
                contentContainerStyle={[styles.row, { paddingHorizontal: layout.gutter }]}
              >
                {groups[group].map(category => {
                  const name = categoryName(category, language);
                  const meta = routineCountText(language, category.routineCount);
                  return (
                    <CategoryCard
                      key={category.slug}
                      cover={CATEGORY_COVERS[libraryCategoryKey(category.slug)]}
                      name={name}
                      meta={meta}
                      accessibilityLabel={`${name}, ${meta}`}
                      onPress={() => onOpenCategory(category.slug)}
                    />
                  );
                })}
              </ScrollView>
            </View>
          ) : null,
        )}

        <View style={styles.section}>
          <TextV2 variant="section" accessibilityRole="header">
            {workoutsText(language, 'workouts.byType.group.yours')}
          </TextV2>
          <CategoryCard
            wide
            cover={CATEGORY_COVERS.misrutinas}
            name={mineName}
            meta={mineMeta}
            accessibilityLabel={`${mineName}, ${mineMeta}`}
            onPress={() =>
              collections.mine > 0 ? onOpenCollection('mine') : onCreateRoutine()
            }
          />
        </View>
      </View>
    </>
  );
}

// Name from the i18n keys (category.<key>); a category the handoff does not
// know keeps the server's name in the profile language.
function categoryName(
  category: RoutineLibraryCategory,
  language: EllieLanguage,
): string {
  const key = `category.${libraryCategoryKey(category.slug)}`;
  if (hasWorkoutsCopy(key)) {
    return workoutsText(language, key);
  }
  return (language === 'en' ? category.nameEn : category.nameEs) || category.name;
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

// Favoritas / Todas (§29.1): two equal buttons under the search. An empty
// Favoritas keeps the button with "0" in tertiary (§29.5).
function QuickAccess({
  label,
  count,
  icon,
  onPress,
}: {
  label: string;
  count: number;
  icon: 'favorites' | 'all';
  onPress: () => void;
}) {
  const { colors } = useThemeV2();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count}`}
      onPress={onPress}
      style={[
        styles.quick,
        { boxShadow: `inset 0 0 0 1px ${colors.border.card}` },
      ]}
    >
      {icon === 'favorites' ? (
        <Heart
          size={18}
          color={colors.text.primary}
          fill={colors.text.primary}
          strokeWidth={2}
        />
      ) : (
        <ListChecks size={18} color={colors.text.primary} strokeWidth={2} />
      )}
      <TextV2 variant="label" numberOfLines={1} style={styles.quickLabel}>
        {label}
      </TextV2>
      <TextV2 variant="caption" tone={count === 0 ? 'tertiary' : 'secondary'}>
        {count}
      </TextV2>
      {icon === 'all' ? (
        <ChevronRight size={16} color={colors.text.tertiary} strokeWidth={2} />
      ) : null}
    </PressableScale>
  );
}

// STATE_02 · Loading · Rutinas: hero block with three lines and the first
// category row.
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
        <Skeleton width={120} height={18} radius={9} />
        <View style={[styles.row, styles.skeletonRow]}>
          {[0, 1, 2].map(index => (
            <Skeleton
              key={index}
              width={CATEGORY_CARD_WIDTH}
              height={208}
              radius={20}
            />
          ))}
        </View>
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  searchBlock: {
    gap: 10,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quick: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickLabel: {
    flex: 1,
  },
  // 20 of the screen gap + 8 → 28 between groups.
  groups: {
    marginTop: 8,
    gap: 28,
  },
  section: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
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
  skeletonRow: {
    overflow: 'hidden',
  },
});
