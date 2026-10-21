import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBarV2, TextV2, useToast } from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import { planScheme } from '@app/features/session/sessionModel';
import {
  useSessionRunner,
} from '@app/features/session/useSessionRunner';
import { ExitDialog } from '@app/features/session/v2/ExitDialog';
import { VariantSheet, type VariantSheetStep } from '@app/features/session/v2/VariantSheet';
import {
  variantTag,
  variantToastText,
  type SessionVariantReason,
} from '@app/features/session/variantModel';
import { routineErrorCopy } from '@app/features/workouts/routineErrors';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { invalidateRoutineLists, routineKeys } from '@app/hooks/useRoutines';
import { invalidateWeek, weekKeys } from '@app/hooks/useWeekPlan';
import { routinesService, type ExerciseVariant } from '@app/services/routines/routinesService';
import { weekPlanService } from '@app/services/routines/weekPlanService';
import type { WeekPlan } from '@app/features/week/weekModel';
import type { Workout } from '@app/shared';
import {
  ActiveView,
  doneLabel,
  FinishFooter,
  PausedView,
  RestView,
  SaveErrorView,
  SESSION_COLORS,
  SessionHeader,
  SessionMenu,
  type ExerciseImage,
  type ThumbFor,
} from '@app/features/session/v2/SessionViews';
import {
  exerciseThumbnail,
  ZONE_IMAGES,
} from '@app/features/workouts/workoutAssets';
import type { ZoneKey } from '@app/features/workouts/workoutsModel';
import { useAuth } from '@app/hooks/useAuth';
import { useExercise } from '@app/hooks/useCatalog';
import { useRoutine } from '@app/hooks/useRoutines';
import { useWorkoutSession } from '@app/hooks/useWorkoutSession';
import { invalidateWorkoutQueries } from '@app/lib/queryInvalidation';
import { resolveWorkoutThumbnailSource } from '@app/lib/workoutThumbnails';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { SceneScope } from '@app/providers/ThemeProvider';
import type { CompletionResult } from '@app/services/supabase/session';
import type { RestKind } from '@app/features/session/sessionModel';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'WorkoutSession'>;

const HEADER_HEIGHT = 58;

// Workout Session v2 (SESSION_01–06, STATE_09): modo foco oscuro con la
// serie actual, pausa, descansos y el cierre. Sets are written one by one
// (workout_session_sets) and kept on the phone when the network fails.
export function WorkoutSessionScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const userId = profile?.id;
  // "Comenzar" always reads get_routine(id) (B-03): any routine the user can
  // see, also their own and ELLIE's.
  const routineQuery = useRoutine(route.params.workoutId);
  // The routine is read once: saving a variant in it (or in a copy) must not
  // rebuild the session that is running.
  const [workout, setWorkout] = useState<Workout | null>(null);
  useEffect(() => {
    if (!workout && routineQuery.data) {
      setWorkout(routineQuery.data);
    }
  }, [routineQuery.data, workout]);
  const toast = useToast();
  const language = useProfileLanguage();
  // Variants (25.6): the sheet, the reason and where "Guardar en la rutina"
  // writes (the routine, or the user's copy once the server made one).
  const [variantOpen, setVariantOpen] = useState(false);
  const [variantStep, setVariantStep] = useState<VariantSheetStep>({ kind: 'list' });
  const [variantReason, setVariantReason] = useState<SessionVariantReason | null>(null);
  const [savingVariant, setSavingVariant] = useState(false);
  const [saveTarget, setSaveTarget] = useState<Workout | null>(null);
  const {
    workoutSession,
    isLoading: sessionLoading,
    startSession,
  } = useWorkoutSession(workout);
  const [sessionId, setSessionId] = useState<string | null>(
    route.params.sessionId ?? null,
  );
  const [startFailed, setStartFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const starting = useRef(false);
  // Set right before an intentional exit (saved, discarded, summary).
  const allowLeave = useRef(false);
  const readyRef = useRef(false);
  const exitOpenRef = useRef(exitOpen);
  exitOpenRef.current = exitOpen;
  const lastRestKind = useRef<RestKind>('exercise');

  // Session to run: the one in the route, today's for this routine, or new.
  useEffect(() => {
    if (sessionId || !workout || sessionLoading || starting.current) {
      return;
    }
    if (workoutSession) {
      setSessionId(workoutSession.id);
      return;
    }
    starting.current = true;
    startSession()
      .then(session => setSessionId(session.id))
      .catch(error => {
        console.warn('[session] No se pudo iniciar.', error);
        setStartFailed(true);
      })
      .finally(() => {
        starting.current = false;
      });
  }, [sessionId, sessionLoading, startSession, workout, workoutSession]);

  const refreshSurfaces = useCallback(() => {
    if (userId) {
      invalidateWorkoutQueries(queryClient, userId).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['home'] }).catch(() => {});
    }
  }, [queryClient, userId]);

  const goHome = useCallback(() => {
    allowLeave.current = true;
    refreshSurfaces();
    navigation.navigate(ROOT_ROUTES.MainTabs, { screen: TAB_ROUTES.Home });
  }, [navigation, refreshSurfaces]);

  const onCompleted = useCallback(
    (result: CompletionResult) => {
      allowLeave.current = true;
      refreshSurfaces();
      navigation.replace(APP_ROUTES.WorkoutSummary, {
        sessionId: result.session.id,
        newBadges: result.award?.badgesUnlocked ?? [],
      });
    },
    [navigation, refreshSurfaces],
  );

  const runner = useSessionRunner({
    workout,
    sessionId,
    userId,
    onCompleted,
    onLeave: goHome,
  });

  // Rows and rest cards: the thumb of each exercise (thumb_key of
  // get_routine). The hero card: the poster of the current exercise
  // (get_exercise, kept on the phone). The muscle image stays as the fallback
  // for an exercise without media or one that fails to load.
  const thumbKeys = useMemo(() => {
    const keys: Record<string, string | null | undefined> = {};
    (workout?.exercises ?? []).forEach(exercise => {
      if (exercise.exerciseId) {
        keys[exercise.exerciseId] = exercise.thumbKey;
      }
    });
    return keys;
  }, [workout?.exercises]);
  const thumbFor: ThumbFor = useCallback(
    exercise => {
      const fallback = exerciseThumbnail(null);
      return {
        source: {
          mediaKey: exercise.exerciseId ? thumbKeys[exercise.exerciseId] : null,
          fallback,
        },
        fallback,
      };
    },
    [thumbKeys],
  );
  const currentExercise = useExercise(runner.current?.exerciseId ?? null).data;
  const cardImage = useMemo((): ExerciseImage | null => {
    const zone = (currentExercise?.bodyPart as ZoneKey | undefined) ?? null;
    const generic: ImageSourcePropType | null =
      zone && ZONE_IMAGES[zone]
        ? ZONE_IMAGES[zone]
        : workout
          ? resolveWorkoutThumbnailSource({
              imageUrl: workout.imageUrl,
              type: workout.type,
              targetMuscles: workout.targetMuscles,
              title: workout.title,
            })
          : null;
    if (!generic) {
      return null;
    }
    return {
      source: { mediaKey: currentExercise?.posterKey ?? null, fallback: generic },
      fallback: generic,
    };
  }, [currentExercise?.bodyPart, currentExercise?.posterKey, workout]);

  if (runner.rest) {
    lastRestKind.current = runner.rest.kind;
  }

  // ── Variants ──────────────────────────────────────────────────────────────
  const variantPosition = runner.current?.position ?? null;
  const planned = variantPosition !== null ? runner.basePlan[variantPosition] ?? null : null;
  const applied = variantPosition !== null ? runner.variants[variantPosition] ?? null : null;
  const routineForSave = saveTarget ?? workout;

  const closeVariants = () => {
    setVariantOpen(false);
    setVariantStep({ kind: 'list' });
  };

  const chooseVariant = (variant: ExerciseVariant, scope: 'today' | 'routine') => {
    if (variantPosition === null || !planned?.exerciseId) {
      return;
    }
    runner.applyVariant({
      position: variantPosition,
      exerciseId: variant.id,
      name: variant.name,
      note: variant.note,
      originalExerciseId: planned.exerciseId,
      originalName: planned.name,
      reason: variantReason ?? 'other',
      scope,
    });
  };

  // After a copy, the days of this week that had the original routine move
  // to the copy (best effort; today and ahead).
  const moveWeekToCopy = async (sourceId: string, copyId: string) => {
    const weeks = queryClient.getQueriesData<WeekPlan>({ queryKey: weekKeys.all });
    const week = weeks.map(([, data]) => data).find(Boolean);
    if (!week?.plan?.active) {
      return;
    }
    const days = week.days.filter(
      day => day.date >= week.today && day.kind === 'session' && day.routine?.id === sourceId,
    );
    await Promise.allSettled(
      days.map(day =>
        weekPlanService.setWeekDay(day.date, { kind: 'session', routineId: copyId, minutes: day.minutes }),
      ),
    );
    await invalidateWeek(queryClient);
  };

  const saveVariantInRoutine = async (variant: ExerciseVariant) => {
    const target = routineForSave;
    const templateExerciseId =
      variantPosition !== null ? target?.exercises[variantPosition]?.id ?? null : null;
    if (!target || !templateExerciseId) {
      toast.show(routineErrorCopy(null, language).message, { tone: 'error' });
      return;
    }
    setSavingVariant(true);
    try {
      const result = await routinesService.replaceRoutineExercise({
        routineId: target.id,
        templateExerciseId,
        newExerciseId: variant.id,
      });
      // From here on "Guardar en la rutina" writes in the copy.
      setSaveTarget(result.routine);
      chooseVariant(variant, 'routine');
      queryClient.setQueryData(routineKeys.detail(result.routine.id), result.routine);
      invalidateRoutineLists(queryClient).catch(() => undefined);
      if (result.copied && result.sourceRoutineId) {
        moveWeekToCopy(result.sourceRoutineId, result.routine.id).catch(() => undefined);
      }
      toast.show(
        variantToastText({ kind: 'routine', routineTitle: target.title, copied: result.copied }),
      );
      closeVariants();
    } catch (error) {
      toast.show(routineErrorCopy(error, language).message, { tone: 'error' });
    } finally {
      setSavingVariant(false);
    }
  };

  const title = workout?.title ?? 'Sesión';
  const topPadding = insets.top + HEADER_HEIGHT;
  const bottomInset = Math.max(insets.bottom, 16) + 18;
  const total = runner.plan.length;
  const progress = runner.plan.map(exercise =>
    Math.min(
      1,
      runner.sets.filter(set => set.position === exercise.position).length /
        exercise.sets,
    ),
  );
  const doneText = doneLabel(runner.doneCount, total);

  // Any other way out (iOS swipe if enabled, Android back, a navigation
  // from elsewhere) asks first: the same "Salir del entreno" dialog in the
  // active, paused and rest states. Android back on the open dialog closes it.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', event => {
        if (allowLeave.current || !readyRef.current) {
          return;
        }
        event.preventDefault();
        setMenuOpen(false);
        setExitOpen(!exitOpenRef.current);
      }),
    [navigation],
  );

  const askDiscard = () => {
    setMenuOpen(false);
    Alert.alert(
      '¿Salir sin guardar?',
      'Se descarta esta sesión y no podrás retomarla.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir sin guardar',
          style: 'destructive',
          onPress: () => {
            runner.discard().catch(() =>
              Alert.alert('No pudimos salir', 'Revisa tu conexión e inténtalo otra vez.'),
            );
          },
        },
      ],
    );
  };

  const saveAndExit = () => {
    setMenuOpen(false);
    runner.saveForLater().catch(() => {
      setExitOpen(false);
      Alert.alert(
        'No pudimos guardar la sesión',
        'Revisa tu conexión. Tu progreso sigue en esta pantalla.',
      );
    });
  };

  // ── STATE_09 · error al guardar ─────────────────────────────────────────
  if (runner.saveError) {
    return (
      <SceneScope>
        <StatusBarV2 style="light" />
        <SaveErrorView
          topInset={insets.top}
          bottomInset={bottomInset}
          durationSec={runner.saveError.activeSec}
          exercises={runner.saveError.completedExercises.length}
          kcal={runner.saveError.caloriesBurned}
          retrying={runner.busy === 'finish' || runner.busy === 'save'}
          debugMessage={runner.saveErrorDetail}
          onRetry={() => {
            runner.retrySave().catch(() => {});
          }}
          onContinue={() => {
            runner.continueOffline().catch(() => {});
          }}
        />
      </SceneScope>
    );
  }

  const notReady =
    !workout || runner.loadState !== 'ready' || !sessionId;
  readyRef.current = !notReady;
  const failed =
    routineQuery.error || startFailed || runner.loadState === 'error';

  let body: React.ReactNode = null;
  if (notReady) {
    body = (
      <View style={[styles.state, { paddingTop: topPadding + 40 }]}>
        {failed ? (
          <BlockError
            message="No pudimos abrir la sesión."
            onRetry={() => {
              setStartFailed(false);
              if (routineQuery.error) {
                routineQuery.refetch().catch(() => {});
              }
              runner.retryLoad();
            }}
          />
        ) : routineQuery.notFound ? (
          <TextV2 variant="body" color={SESSION_COLORS.meta} align="center">
            Esta rutina ya no está disponible.
          </TextV2>
        ) : (
          <TextV2 variant="body" color={SESSION_COLORS.meta} align="center">
            Preparando tu sesión…
          </TextV2>
        )}
      </View>
    );
  } else {
    const current = runner.current;
    const lastSet = runner.sets[runner.sets.length - 1];
    const lastExercise = lastSet ? runner.plan[lastSet.position] : null;
    const restKind = runner.rest?.kind ?? lastRestKind.current;
    const doneLine =
      restKind === 'set' && lastExercise && lastSet
        ? `Serie ${lastSet.setIndex + 1} de ${lastExercise.sets} · ${lastExercise.name}`
        : lastExercise
        ? `Hecho · ${lastExercise.name} · ${planScheme(lastExercise)}`
        : '';

    body = (
      <>
        <ActiveView
          topPadding={topPadding + 4}
          bottomPadding={bottomInset + (current ? 40 : 110)}
          elapsedSec={runner.elapsedSec}
          plan={runner.plan}
          progress={progress}
          current={current}
          setIndex={runner.cursor?.setIndex ?? 0}
          doneCount={runner.doneCount}
          draft={runner.draft}
          onDraft={runner.setDraft}
          thumbFor={thumbFor}
          cardImage={cardImage}
          onPause={runner.pause}
          onLogSet={runner.logSet}
          variantTag={variantTag(applied)}
          onVariant={
            planned?.exerciseId
              ? () => {
                  setVariantReason(null);
                  setVariantStep({ kind: 'list' });
                  setVariantOpen(true);
                }
              : undefined
          }
          onTechnique={
            current?.exerciseId
              ? () =>
                  navigation.navigate(APP_ROUTES.ExerciseDetail, {
                    exerciseId: current.exerciseId as string,
                  })
              : undefined
          }
        />
        {!current && !runner.rest ? (
          <FinishFooter
            bottomInset={bottomInset}
            busy={runner.busy === 'finish'}
            onFinish={() => {
              runner.finish().catch(() => {});
            }}
          />
        ) : null}
        {runner.rest || runner.yourTurn ? (
          <RestView
            topPadding={topPadding}
            bottomInset={bottomInset}
            kind={restKind}
            remainingMs={runner.rest?.remainingMs ?? 0}
            totalSec={runner.rest?.totalSec ?? 1}
            phase={runner.rest?.phase ?? 'go'}
            progress={progress}
            doneText={doneText}
            doneLine={doneLine}
            next={current}
            nextSetIndex={runner.cursor?.setIndex ?? 0}
            nextWeightKg={runner.draft.weightKg}
            thumbFor={thumbFor}
            onAdd={runner.addRest}
            onSkip={runner.skipRest}
          />
        ) : null}
        {runner.paused ? (
          <PausedView
            topPadding={topPadding + 20}
            bottomInset={bottomInset}
            elapsedSec={runner.elapsedSec}
            pausedForSec={runner.pausedForSec}
            progress={progress}
            current={current}
            total={total}
            doneCount={runner.doneCount}
            weightKg={runner.draft.weightKg}
            thumbFor={thumbFor}
            onResume={runner.resume}
          />
        ) : null}
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <SceneScope>
        <StatusBarV2 style="light" />
        {body}
        <SessionHeader
          title={title}
          topInset={insets.top}
          onBack={() =>
            notReady ? safeGoBack(navigation, [ROOT_ROUTES.MainTabs]) : setExitOpen(true)
          }
          onMenu={notReady ? undefined : () => setMenuOpen(open => !open)}
        />
        {menuOpen ? (
          <SessionMenu
            top={insets.top + HEADER_HEIGHT}
            doneText={doneText}
            onClose={() => setMenuOpen(false)}
            onSave={saveAndExit}
            onFinish={() => {
              setMenuOpen(false);
              runner.finish().catch(() => {});
            }}
            onDiscard={askDiscard}
          />
        ) : null}
      </SceneScope>
      {planned?.exerciseId && variantPosition !== null ? (
        <SceneScope>
          <VariantSheet
            open={variantOpen}
            step={variantStep}
            exerciseName={runner.current?.name ?? planned.name}
            originalExerciseId={planned.exerciseId}
            originalName={planned.name}
            appliedExerciseId={applied?.exerciseId ?? null}
            routineTitle={routineForSave?.title ?? title}
            reason={variantReason}
            language={language}
            saving={savingVariant}
            onReason={setVariantReason}
            onChoose={variant => setVariantStep({ kind: 'save', variant })}
            onToday={() => {
              if (variantStep.kind === 'save') {
                chooseVariant(variantStep.variant, 'today');
                toast.show(variantToastText({ kind: 'today' }));
              }
              closeVariants();
            }}
            onSaveInRoutine={() => {
              if (variantStep.kind === 'save') {
                saveVariantInRoutine(variantStep.variant).catch(() => undefined);
              }
            }}
            onChooseAnother={() => setVariantStep({ kind: 'list' })}
            onRevert={() => {
              runner.revertVariant(variantPosition).catch(() => undefined);
              toast.show(variantToastText({ kind: 'reverted' }));
              closeVariants();
            }}
            onClose={closeVariants}
          />
        </SceneScope>
      ) : null}
      {exitOpen ? (
        <ExitDialog
          busy={
            runner.busy === 'save' || runner.busy === 'discard'
              ? runner.busy
              : null
          }
          onCancel={() => setExitOpen(false)}
          onSaveForLater={saveAndExit}
          onDiscard={() => {
            // The dialog is the confirmation: discard right away.
            runner.discard().catch(() => {
              setExitOpen(false);
              Alert.alert(
                'No pudimos salir',
                'Revisa tu conexión. Tu progreso sigue en esta pantalla.',
              );
            });
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SESSION_COLORS.plate,
  },
  state: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'stretch',
  },
});
