import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, ChevronRight, Heart, Plus } from 'lucide-react-native';
import {
  Button,
  Eyebrow,
  GlassSurface,
  IconButton,
  PressableScale,
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
  EQUIPMENT,
  LEVEL_LABELS,
  capitalize,
  zoneLabel,
} from '@app/features/workouts/workoutsModel';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { useFavoriteExercises } from '@app/hooks/useFavoriteExercises';
import { usePersonalRecords } from '@app/hooks/usePersonalRecords';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { formatPRValue, getBestPR } from '@app/shared';
import type { PRType } from '@app/shared';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'ExerciseDetail'>;

const PR_ORDER: PRType[] = [
  'max_weight',
  'weight_reps',
  'max_reps',
  'duration',
  'distance',
];
const ESSENTIAL_STEPS = 3;

// Exercise Detail · MoveKit v2 (EXERCISE_01 / 02, handoff §9). Light: the
// video area bleeds over the studio background; Dark: a light box. Below,
// name, prescription and best mark, muscles, essential technique (with the
// full one and common mistakes collapsed) and the fixed "Agregar a rutina".
export function ExerciseDetailScreen({ navigation, route }: Props) {
  const { colors, layout, mode } = useThemeV2();
  const insets = useSafeAreaInsets();
  const exercisesQuery = useExerciseLibrary();
  const favorites = useFavoriteExercises();
  const exerciseId = route.params.exerciseId;
  const recordsQuery = usePersonalRecords(exerciseId);
  const [fullscreen, setFullscreen] = useState(Boolean(route.params.fullscreen));
  const [techOpen, setTechOpen] = useState(false);
  const [errOpen, setErrOpen] = useState(false);

  useEffect(() => {
    if (route.params.fullscreen !== undefined) {
      setFullscreen(route.params.fullscreen);
    }
  }, [route.params.fullscreen]);

  const exercise = useMemo(
    () => (exercisesQuery.data ?? []).find(item => item.id === exerciseId) ?? null,
    [exerciseId, exercisesQuery.data],
  );

  const bestMark = useMemo(() => {
    const records = recordsQuery.records ?? [];
    for (const type of PR_ORDER) {
      const best = getBestPR(records, type);
      if (best) {
        // "60 kg" — the reps of a weight × reps mark are left for Récords.
        return type === 'weight_reps'
          ? `${best.valueWeight ?? 0} kg`
          : formatPRValue(best);
      }
    }
    return null;
  }, [recordsQuery.records]);

  const back = () => safeGoBack(navigation, [ROOT_ROUTES.MainTabs]);
  const lightbox = mode === 'dark';
  const backButton = (
    <IconButton icon={ArrowLeft} variant="studio" accessibilityLabel="Volver" onPress={back} />
  );

  if (exercisesQuery.error) {
    return (
      <Shell top={insets.top} bg={colors.bg} backButton={backButton}>
        <BlockError
          message="No pudimos cargar el ejercicio."
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
        <StatusBarV2 style="dark" />
        <SkeletonGroup>
          <Skeleton
            height={lightbox ? 486 : 500}
            radius={lightbox ? 34 : 0}
            style={lightbox ? [styles.skeletonBox, { marginTop: insets.top }] : undefined}
          />
          <View style={[styles.body, styles.skeletonBody]}>
            <Skeleton width="80%" height={26} />
            <Skeleton width="50%" height={14} />
            <Skeleton width="60%" height={14} />
          </View>
        </SkeletonGroup>
      </View>
    );
  }

  if (!exercise) {
    return (
      <Shell top={insets.top} bg={colors.bg} backButton={backButton}>
        <TextV2 variant="section">Ejercicio no encontrado</TextV2>
        <TextV2 variant="body" color={colors.text.secondary}>
          No está en la biblioteca actual.
        </TextV2>
      </Shell>
    );
  }

  const isFavorite = favorites.isExerciseFavorite(exercise.id);
  const equipmentLabel =
    EQUIPMENT.find(item => item.key === exercise.equipment)?.label ??
    capitalize(exercise.equipment);
  const meta = [
    LEVEL_LABELS[exercise.level] ?? capitalize(exercise.level),
    equipmentLabel,
    zoneLabel(exercise.bodyPart),
  ]
    .filter(Boolean)
    .join(' · ');
  const scheme = exercise.recommendations.hypertrophy;
  // The library stores "-" when there is no recommendation.
  const prescription =
    hasValue(scheme.sets) && hasValue(scheme.reps)
      ? `${scheme.sets.trim()} × ${scheme.reps.trim()}`
      : null;
  const [mainMuscle, ...otherPrimary] = exercise.musclesWorked.primary.map(capitalize);
  const secondaryMuscles = [
    ...otherPrimary,
    ...exercise.musclesWorked.secondary.map(capitalize),
  ];
  // Essential technique: the coaching cues (short); the full technique is the
  // step by step. Without cues, the first steps act as the essentials.
  const essential = (
    exercise.coachingCues.length > 0 ? exercise.coachingCues : exercise.howToPerform
  ).slice(0, ESSENTIAL_STEPS);
  const fullTechnique =
    exercise.coachingCues.length > 0
      ? exercise.howToPerform
      : exercise.howToPerform.slice(ESSENTIAL_STEPS);
  const footerHeight = 56 + 12 + Math.max(insets.bottom, 16) + 4;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style={lightbox ? 'light' : 'dark'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: footerHeight + 40 }}
      >
        <MoveKitPlayer
          title={exercise.name}
          variant={lightbox ? 'lightbox' : 'bleed'}
          fullscreen={fullscreen}
          onFullscreenChange={setFullscreen}
          topInset={insets.top}
          topLeft={backButton}
          topRight={
            <IconButton
              icon={Heart}
              variant="studio"
              filled={isFavorite}
              accessibilityLabel={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              onPress={() => {
                favorites.toggleExerciseFavorite(exercise.id).catch(() => {});
              }}
            />
          }
        />

        <View style={[styles.body, { paddingHorizontal: layout.gutter + 4 }]}>
          <View style={styles.head}>
            <TextV2 variant="title26" style={styles.title}>
              {exercise.name}
            </TextV2>
            <TextV2 variant="body" color={colors.text.secondary}>
              {meta}
            </TextV2>
            {prescription || bestMark ? (
              <View style={styles.figures}>
                {prescription ? (
                  <TextV2 variant="bodyStrong">{prescription}</TextV2>
                ) : null}
                {prescription && bestMark ? <Dot color={colors.text.disabled} /> : null}
                {bestMark ? (
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`Tu mejor marca: ${bestMark}. Ver récords`}
                    onPress={() =>
                      navigation.navigate(APP_ROUTES.PersonalRecords, {
                        exerciseId: exercise.id,
                        exerciseName: exercise.name,
                      })
                    }
                    style={styles.best}
                  >
                    <TextV2 variant="bodyStrong">{bestMark}</TextV2>
                    <TextV2 variant="meta" color={colors.text.secondary}>
                      tu mejor
                    </TextV2>
                  </PressableScale>
                ) : null}
              </View>
            ) : null}
          </View>

          {mainMuscle ? (
            <View style={styles.block}>
              <Eyebrow>Músculos</Eyebrow>
              <View style={styles.muscleRow}>
                <View style={[styles.mainDot, { backgroundColor: colors.ember.base }]} />
                <TextV2 variant="section" style={styles.flex}>
                  {mainMuscle}
                </TextV2>
              </View>
              {secondaryMuscles.length > 0 ? (
                <View style={styles.muscleRow}>
                  <View
                    style={[styles.secondaryDot, { backgroundColor: colors.recovery.base }]}
                  />
                  <TextV2 variant="body" color={colors.text.bodySoft} style={styles.flex}>
                    {secondaryMuscles.join(' · ')}
                  </TextV2>
                </View>
              ) : null}
            </View>
          ) : null}

          {essential.length > 0 ? (
            <View style={styles.technique}>
              <Eyebrow>Técnica</Eyebrow>
              {essential.map((step, index) => (
                <View key={`${index}-${step}`} style={styles.step}>
                  <TextV2
                    variant="bodyStrong"
                    color={colors.text.tertiary}
                    style={styles.stepNumber}
                  >
                    {index + 1}
                  </TextV2>
                  <TextV2 variant="voice" style={styles.flex}>
                    {step}
                  </TextV2>
                </View>
              ))}
              {techOpen ? (
                <View style={styles.more}>
                  {fullTechnique.map((step, index) => (
                    <TextV2
                      key={`${index}-${step}`}
                      variant="body"
                      color={colors.text.secondary}
                    >
                      {step}
                    </TextV2>
                  ))}
                </View>
              ) : null}
              {fullTechnique.length > 0 ? (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityState={{ expanded: techOpen }}
                  onPress={() => setTechOpen(open => !open)}
                  style={styles.toggle}
                >
                  <TextV2 variant="bodyStrong">
                    {techOpen ? 'Menos detalle' : 'Ver técnica completa'}
                  </TextV2>
                  <ChevronDown
                    size={15}
                    color={colors.text.primary}
                    strokeWidth={2}
                    style={techOpen ? styles.flip : undefined}
                  />
                </PressableScale>
              ) : null}
            </View>
          ) : null}

          {exercise.commonMistakes.length > 0 ? (
            <View style={styles.mistakes}>
              <PressableScale
                accessibilityRole="button"
                accessibilityState={{ expanded: errOpen }}
                onPress={() => setErrOpen(open => !open)}
                style={styles.mistakesHead}
              >
                <TextV2 variant="cta">Errores comunes</TextV2>
                <ChevronRight
                  size={17}
                  color={colors.text.primary}
                  strokeWidth={2}
                  style={[styles.dim, errOpen ? styles.rotate : null]}
                />
              </PressableScale>
              {errOpen
                ? exercise.commonMistakes.map(mistake => (
                    <TextV2 key={mistake} variant="bodyStrong">
                      {mistake}
                    </TextV2>
                  ))
                : null}
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
          label="Agregar a rutina"
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

function hasValue(value?: string | null) {
  const trimmed = value?.trim();
  return Boolean(trimmed && trimmed !== '-');
}

function Dot({ color }: { color: string }) {
  return (
    <TextV2 variant="body" color={color}>
      ·
    </TextV2>
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
  shell: {
    paddingHorizontal: 20,
    gap: 16,
  },
  shellBack: { alignSelf: 'flex-start' },
  body: {
    paddingTop: 22,
    gap: 36,
  },
  skeletonBox: { marginHorizontal: 10 },
  skeletonBody: { paddingHorizontal: 24 },
  head: { gap: 10 },
  title: {
    fontWeight: '700',
    lineHeight: 30,
  },
  figures: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  best: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  block: { gap: 10 },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mainDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  secondaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 1,
  },
  technique: { gap: 16 },
  step: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 16,
  },
  stepNumber: {
    width: 14,
    fontWeight: '700',
  },
  more: {
    paddingLeft: 30,
    gap: 12,
  },
  toggle: {
    alignSelf: 'flex-start',
    paddingLeft: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flip: { transform: [{ rotate: '180deg' }] },
  mistakes: { gap: 14 },
  mistakesHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dim: { opacity: 0.55 },
  rotate: { transform: [{ rotate: '90deg' }] },
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
