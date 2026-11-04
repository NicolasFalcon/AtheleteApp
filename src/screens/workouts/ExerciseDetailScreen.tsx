import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, Heart, Plus, X } from 'lucide-react-native';
import {
  AppImage,
  Button,
  GlassSurface,
  IconButton,
  PressableScale,
  Segmented,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import { MoveKitPlayer } from '@app/features/workouts/movekit/MoveKitPlayer';
import {
  VISIBLE_STEPS,
  equipmentText,
  exerciseDetailCopy,
  historySummary,
  levelText,
  splitShortTitle,
  type ExerciseDetailCopy,
  type ExerciseHistorySummary,
} from '@app/features/workouts/exerciseDetailModel';
import { MEDIA_PLACEHOLDER_THUMB } from '@app/features/workouts/workoutAssets';
import { capitalize, levelBars } from '@app/features/workouts/workoutsModel';
import { useCatalogLocale, useExercise } from '@app/hooks/useCatalog';
import { useExerciseHistory } from '@app/hooks/useExerciseHistory';
import { useFavoriteExercises } from '@app/hooks/useFavoriteExercises';
import { useLatchedMediaUrl, useMediaUrl } from '@app/lib/media/mediaUrls';
import { usePersonalRecords } from '@app/hooks/usePersonalRecords';
import { safeGoBack } from '@app/navigation/safeGoBack';
import {
  routinesService,
  type ExerciseVariant,
} from '@app/services/routines/routinesService';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'ExerciseDetail'>;

type Tab = 'technique' | 'mistakes' | 'variants';

// The video takes ~55 % of the screen; the eyebrow and the title sit over
// its faded bottom (OVERLAP), the controls float just above them.
const HERO_SHARE = 0.55;
const OVERLAP = 128;
const TITLE_SIZE = 44;

// Exercise Detail · sport redesign. Full-bleed MoveKit video fading into the
// screen, Ember eyebrow and Anton title over it, quick facts (level,
// equipment), muscle chips, the user's history, Técnica · Errores ·
// Variantes tabs and the fixed "Agregar a rutina".
export function ExerciseDetailScreen({ navigation, route }: Props) {
  const { colors, display, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const locale = useCatalogLocale();
  const copy = exerciseDetailCopy(locale);
  const favorites = useFavoriteExercises();
  const exerciseId = route.params.exerciseId;
  // get_exercise (kept on the phone per catalog version). The poster and the
  // video are signed only here.
  const exercisesQuery = useExercise(exerciseId);
  const recordsQuery = usePersonalRecords(exerciseId);
  const historyQuery = useExerciseHistory(exerciseId);
  const variantsQuery = useQuery({
    queryKey: ['exercise-variants', exerciseId, locale],
    enabled: Boolean(exerciseId),
    staleTime: 5 * 60 * 1000,
    queryFn: () => routinesService.listExerciseVariants({ exerciseId, locale }),
  });
  const [fullscreen, setFullscreen] = useState(Boolean(route.params.fullscreen));
  const [tab, setTab] = useState<Tab>('technique');
  const [allSteps, setAllSteps] = useState(false);

  useEffect(() => {
    if (route.params.fullscreen !== undefined) {
      setFullscreen(route.params.fullscreen);
    }
  }, [route.params.fullscreen]);

  const exercise = exercisesQuery.data ?? null;
  const posterUrl = useMediaUrl(exercise?.posterKey);
  // The video keeps its first URL while the screen is open (no reload).
  const videoUrl = useLatchedMediaUrl(exercise?.videoKey);

  // Only with the user's own data on this exercise.
  const history = useMemo(
    () => historySummary(historyQuery.data ?? [], recordsQuery.records ?? []),
    [historyQuery.data, recordsQuery.records],
  );
  const variants = variantsQuery.data?.items ?? [];

  const heroHeight = Math.round(windowHeight * HERO_SHARE);
  const back = () => safeGoBack(navigation, [ROOT_ROUTES.MainTabs]);
  const backButton = (
    <IconButton icon={ArrowLeft} variant="studio" accessibilityLabel={copy.back} onPress={back} />
  );

  if (exercisesQuery.error) {
    return (
      <Shell top={insets.top} bg={colors.bg} backButton={backButton}>
        <BlockError
          message={copy.loadError}
          onRetry={() => {
            exercisesQuery.refetch().catch(() => {});
          }}
        />
      </Shell>
    );
  }

  if (exercisesQuery.isLoading || !favorites.loaded) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <StatusBarV2 />
        <SkeletonGroup>
          <Skeleton height={heroHeight} radius={0} />
          <View style={[styles.skeletonBody, { paddingHorizontal: layout.gutter + 4 }]}>
            <Skeleton width="40%" height={12} />
            <Skeleton width="85%" height={40} />
            <Skeleton width="60%" height={40} />
          </View>
        </SkeletonGroup>
      </View>
    );
  }

  if (!exercise) {
    return (
      <Shell top={insets.top} bg={colors.bg} backButton={backButton}>
        <TextV2 variant="section">{copy.notFound}</TextV2>
        <TextV2 variant="body" color={colors.text.secondary}>
          {copy.notInLibrary}
        </TextV2>
      </Shell>
    );
  }

  const isFavorite = favorites.isExerciseFavorite(exercise.id);
  const equipment = equipmentText(copy, exercise.equipment);
  const [mainMuscle, ...otherPrimary] = exercise.musclesWorked.primary.map(capitalize);
  const secondaryMuscles = [
    ...otherPrimary,
    ...exercise.musclesWorked.secondary.map(capitalize),
  ];
  const eyebrow = [mainMuscle, equipment].filter(Boolean).join(' · ');
  // Técnica: the step by step (the coaching cues when there are no steps).
  const steps =
    exercise.howToPerform.length > 0 ? exercise.howToPerform : exercise.coachingCues;
  const tabs = [
    steps.length > 0 ? { key: 'technique' as const, label: copy.technique } : null,
    exercise.commonMistakes.length > 0 ? { key: 'mistakes' as const, label: copy.mistakes } : null,
    variants.length > 0 ? { key: 'variants' as const, label: copy.variants } : null,
  ].filter((item): item is { key: Tab; label: string } => item !== null);
  // The chosen tab, or the first one left when it has nothing.
  const shownTab = tabs.find(item => item.key === tab)?.key ?? tabs[0]?.key ?? null;
  const footerHeight = 56 + 12 + Math.max(insets.bottom, 16) + 4;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Light over the dark top gradient of the video. */}
      <StatusBarV2 style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: footerHeight + 32 }}
      >
        <MoveKitPlayer
          title={exercise.name}
          posterUrl={posterUrl}
          videoUrl={videoUrl}
          unavailable={!exercise.videoKey}
          language={locale}
          height={heroHeight}
          fadeTo={colors.bg}
          overlap={OVERLAP}
          fullscreen={fullscreen}
          onFullscreenChange={setFullscreen}
          topInset={insets.top}
          topLeft={backButton}
          topRight={
            <IconButton
              icon={Heart}
              variant="studio"
              filled={isFavorite}
              accessibilityLabel={isFavorite ? copy.favoriteOn : copy.favoriteOff}
              onPress={() => {
                favorites.toggleExerciseFavorite(exercise.id).catch(() => {});
              }}
            />
          }
        />

        <View
          style={[
            styles.body,
            { marginTop: -OVERLAP, paddingHorizontal: layout.gutter + 4 },
          ]}
        >
          <View style={styles.head}>
            {eyebrow ? (
              <TextV2 variant="eyebrow" color={colors.ember.base} numberOfLines={1}>
                {eyebrow}
              </TextV2>
            ) : null}
            <TextV2
              accessibilityRole="header"
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              color={colors.text.primary}
              style={[display.displayS, styles.title]}
            >
              {exercise.name}
            </TextV2>
          </View>

          <View style={styles.facts}>
            <View style={[styles.fact, { backgroundColor: colors.surface.muted }]}>
              <TextV2 variant="eyebrow" color={colors.text.secondary}>
                {copy.level}
              </TextV2>
              <View style={styles.factValue}>
                <EmberBars value={levelBars(exercise.level)} />
                <TextV2 variant="bodyStrong" numberOfLines={1} style={styles.shrink}>
                  {levelText(copy, exercise.level)}
                </TextV2>
              </View>
            </View>
            <View style={[styles.fact, { backgroundColor: colors.surface.muted }]}>
              <TextV2 variant="eyebrow" color={colors.text.secondary}>
                {copy.equipment}
              </TextV2>
              <TextV2 variant="bodyStrong" numberOfLines={1}>
                {equipment}
              </TextV2>
            </View>
          </View>

          {mainMuscle ? (
            <View style={styles.block}>
              <TextV2 variant="eyebrow" color={colors.text.secondary}>
                {copy.muscles}
              </TextV2>
              <View style={styles.chips}>
                <View style={[styles.chip, { backgroundColor: colors.ember.base }]}>
                  <TextV2 variant="label" color={colors.ember.onText}>
                    {mainMuscle}
                  </TextV2>
                </View>
                {secondaryMuscles.map(muscle => (
                  <View
                    key={muscle}
                    style={[styles.chip, { backgroundColor: colors.surface.muted }]}
                  >
                    <TextV2 variant="label">{muscle}</TextV2>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {history ? (
            <View style={styles.block}>
              <TextV2 variant="eyebrow" color={colors.text.secondary}>
                {copy.history}
              </TextV2>
              <HistoryCard
                history={history}
                copy={copy}
                onRecords={() =>
                  navigation.navigate(APP_ROUTES.PersonalRecords, {
                    exerciseId: exercise.id,
                    exerciseName: exercise.name,
                  })
                }
              />
            </View>
          ) : null}

          {shownTab ? (
            <View style={styles.tabs}>
              {tabs.length > 1 ? (
                <Segmented options={tabs} value={shownTab} onChange={setTab} />
              ) : null}

              {shownTab === 'technique' ? (
                <View>
                  {(allSteps ? steps : steps.slice(0, VISIBLE_STEPS)).map((step, index) => (
                    <StepRow
                      key={`${index}-${step}`}
                      index={index}
                      text={step}
                      divider={index > 0}
                    />
                  ))}
                  {steps.length > VISIBLE_STEPS ? (
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityState={{ expanded: allSteps }}
                      onPress={() => setAllSteps(open => !open)}
                      style={[styles.toggle, { borderTopColor: colors.divider }]}
                    >
                      <TextV2 variant="bodyStrong">
                        {allSteps ? copy.fewerSteps : copy.allSteps(steps.length)}
                      </TextV2>
                      <ChevronDown
                        size={16}
                        color={colors.text.primary}
                        strokeWidth={2}
                        style={allSteps ? styles.flip : undefined}
                      />
                    </PressableScale>
                  ) : null}
                </View>
              ) : null}

              {shownTab === 'mistakes' ? (
                <View style={styles.cards}>
                  {exercise.commonMistakes.map(mistake => (
                    <MistakeCard key={mistake} text={mistake} />
                  ))}
                </View>
              ) : null}

              {shownTab === 'variants' ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -(layout.gutter + 4) }}
                  contentContainerStyle={[
                    styles.carousel,
                    { paddingHorizontal: layout.gutter + 4 },
                  ]}
                >
                  {variants.map(variant => (
                    <VariantCard
                      key={variant.id}
                      variant={variant}
                      onPress={() =>
                        navigation.push(APP_ROUTES.ExerciseDetail, { exerciseId: variant.id })
                      }
                    />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <GlassSurface
        kind="nav"
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 16) + 4,
            borderTopColor: colors.divider,
          },
        ]}
      >
        <Button
          label={copy.addToRoutine}
          icon={Plus}
          iconPosition="start"
          onPress={() =>
            navigation.navigate(APP_ROUTES.AddExerciseToRoutine, {
              exerciseId: exercise.id,
              exerciseName: exercise.name,
            })
          }
        />
      </GlassSurface>
    </View>
  );
}

// Level: 3 bars of 4 pt, Ember up to the level.
function EmberBars({ value }: { value: number }) {
  const { colors } = useThemeV2();
  return (
    <View style={styles.bars} accessibilityElementsHidden>
      {[1, 2, 3].map(index => (
        <View
          key={index}
          style={[
            styles.bar,
            { backgroundColor: index <= value ? colors.ember.base : colors.outline.strong },
          ]}
        />
      ))}
    </View>
  );
}

// veces · última vez · récord (the record opens Récords).
function HistoryCard({
  history,
  copy,
  onRecords,
}: {
  history: ExerciseHistorySummary;
  copy: ExerciseDetailCopy;
  onRecords: () => void;
}) {
  const { colors } = useThemeV2();
  const columns = [
    { value: String(history.times), label: copy.times },
    { value: history.last ?? '—', label: copy.lastTime },
    { value: history.record ?? '—', label: copy.record },
  ];
  return (
    <View style={[styles.history, { backgroundColor: colors.surface.muted }]}>
      {columns.map((column, index) => {
        const content = (
          <>
            <TextV2
              color={colors.text.primary}
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.historyValue}
            >
              {column.value}
            </TextV2>
            <TextV2 variant="caption" color={colors.text.secondary}>
              {column.label}
            </TextV2>
          </>
        );
        const style = [
          styles.historyColumn,
          index > 0 ? { borderLeftWidth: 1, borderLeftColor: colors.divider } : null,
        ];
        return index === 2 && history.record ? (
          <PressableScale
            key={column.label}
            accessibilityRole="button"
            accessibilityLabel={copy.seeRecords(history.record)}
            onPress={onRecords}
            style={style}
          >
            {content}
          </PressableScale>
        ) : (
          <View key={column.label} style={style}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

// Numbered step: Ember circle; a short title in bold, then the sentence.
function StepRow({ index, text, divider }: { index: number; text: string; divider: boolean }) {
  const { colors } = useThemeV2();
  const { title, body } = splitShortTitle(text);
  return (
    <View
      style={[
        styles.step,
        divider ? { borderTopWidth: 1, borderTopColor: colors.divider } : null,
      ]}
    >
      <View style={[styles.stepNumber, { borderColor: colors.ember.base }]}>
        <TextV2 variant="metaStrong" color={colors.ember.base}>
          {index + 1}
        </TextV2>
      </View>
      <TextV2 variant="body" style={styles.flex}>
        {title ? <TextV2 variant="bodyStrong">{`${title}. `}</TextV2> : null}
        {body}
      </TextV2>
    </View>
  );
}

// ✕ in soft red; short title in bold over the sentence.
function MistakeCard({ text }: { text: string }) {
  const { colors } = useThemeV2();
  const { title, body } = splitShortTitle(text);
  return (
    <View style={[styles.mistake, { backgroundColor: colors.surface.muted }]}>
      <View style={styles.mistakeIcon}>
        <X size={14} color={MISTAKE_RED} strokeWidth={2.4} />
      </View>
      <View style={[styles.flex, styles.mistakeText]}>
        {title ? <TextV2 variant="bodyStrong">{title}</TextV2> : null}
        <TextV2 variant="body" color={title ? colors.text.secondary : colors.text.primary}>
          {body}
        </TextV2>
      </View>
    </View>
  );
}

const MISTAKE_RED = '#E5484D';

function VariantCard({ variant, onPress }: { variant: ExerciseVariant; onPress: () => void }) {
  const { colors } = useThemeV2();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={variant.name}
      onPress={onPress}
      style={[styles.variant, { backgroundColor: colors.surface.muted }]}
    >
      <AppImage
        source={{ mediaKey: variant.thumbKey, fallback: MEDIA_PLACEHOLDER_THUMB }}
        style={styles.variantThumb}
      />
      <TextV2 variant="label" numberOfLines={2} style={styles.variantName}>
        {variant.name}
      </TextV2>
    </PressableScale>
  );
}

// Error / not-found layout with the back button.
function Shell({
  top,
  bg,
  backButton,
  children,
}: {
  top: number;
  bg: string;
  backButton: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.screen, styles.shell, { backgroundColor: bg, paddingTop: top + 8 }]}>
      <StatusBarV2 />
      <View style={styles.shellBack}>{backButton}</View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  shell: {
    paddingHorizontal: 20,
    gap: 16,
  },
  shellBack: { alignSelf: 'flex-start' },
  skeletonBody: { paddingTop: 20, gap: 12 },
  body: { gap: 28 },
  head: { gap: 8 },
  // Anton, caps, up to 3 lines; the box is a bit taller than the font so
  // capital accents (NATACIÓN) are not cut.
  title: {
    fontSize: TITLE_SIZE,
    lineHeight: Math.round(TITLE_SIZE * 1.06),
    paddingTop: 6,
    includeFontPadding: false,
  },
  facts: { flexDirection: 'row', gap: 10 },
  fact: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  factValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bar: { width: 4, height: 14, borderRadius: 1 },
  block: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    justifyContent: 'center',
  },
  history: {
    flexDirection: 'row',
    borderRadius: 20,
    paddingVertical: 16,
  },
  historyColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  historyValue: { fontSize: 26, lineHeight: 32, fontWeight: '600' },
  tabs: { gap: 16 },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  flip: { transform: [{ rotate: '180deg' }] },
  cards: { gap: 10 },
  mistake: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    padding: 16,
  },
  mistakeIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(229,72,77,.14)',
  },
  mistakeText: { gap: 4 },
  carousel: { gap: 10 },
  variant: {
    width: 150,
    borderRadius: 18,
    overflow: 'hidden',
  },
  variantThumb: { width: '100%', height: 96 },
  variantName: { paddingHorizontal: 12, paddingVertical: 12 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
