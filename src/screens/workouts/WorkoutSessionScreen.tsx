import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBarV2, TextV2 } from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import { planScheme } from '@app/features/session/sessionModel';
import {
  useSessionRunner,
  type DevSessionState,
} from '@app/features/session/useSessionRunner';
import { ExitDialog } from '@app/features/session/v2/ExitDialog';
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
  type ThumbFor,
} from '@app/features/session/v2/SessionViews';
import {
  exerciseThumbnail,
  ZONE_IMAGES,
} from '@app/features/workouts/workoutAssets';
import type { ZoneKey } from '@app/features/workouts/workoutsModel';
import { useAuth } from '@app/hooks/useAuth';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { useWorkoutLibrary } from '@app/hooks/useWorkoutLibrary';
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
  const dev: DevSessionState | null = __DEV__
    ? route.params.devState ?? null
    : null;
  const workoutsQuery = useWorkoutLibrary();
  const exercisesQuery = useExerciseLibrary();
  const workout = useMemo(
    () =>
      (workoutsQuery.data ?? []).find(
        item => item.id === route.params.workoutId,
      ) ?? null,
    [route.params.workoutId, workoutsQuery.data],
  );
  const {
    workoutSession,
    isLoading: sessionLoading,
    startSession,
  } = useWorkoutSession(workout);
  const [sessionId, setSessionId] = useState<string | null>(
    route.params.sessionId ?? null,
  );
  const [startFailed, setStartFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(dev === 'menu');
  const [exitOpen, setExitOpen] = useState(dev === 'exit');
  const starting = useRef(false);
  const lastRestKind = useRef<RestKind>('exercise');

  // Session to run: the one in the route, today's for this routine, or new.
  useEffect(() => {
    if (dev || sessionId || !workout || sessionLoading || starting.current) {
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
  }, [dev, sessionId, sessionLoading, startSession, workout, workoutSession]);

  const refreshSurfaces = useCallback(() => {
    if (userId) {
      invalidateWorkoutQueries(queryClient, userId).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['home'] }).catch(() => {});
    }
  }, [queryClient, userId]);

  const goHome = useCallback(() => {
    refreshSurfaces();
    navigation.navigate(ROOT_ROUTES.MainTabs, { screen: TAB_ROUTES.Home });
  }, [navigation, refreshSurfaces]);

  const onCompleted = useCallback(
    (result: CompletionResult) => {
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
    dev,
    onCompleted,
    onLeave: goHome,
  });

  const library = exercisesQuery.data;
  const bodyPartOf = useCallback(
    (exerciseId: string | null) =>
      exerciseId
        ? library?.find(item => item.id === exerciseId)?.bodyPart ?? null
        : null,
    [library],
  );
  const thumbFor: ThumbFor = useCallback(
    exercise => exerciseThumbnail(bodyPartOf(exercise.exerciseId)),
    [bodyPartOf],
  );
  const cardImage = useMemo(() => {
    const zone = runner.current
      ? (bodyPartOf(runner.current.exerciseId) as ZoneKey | null)
      : null;
    if (zone && ZONE_IMAGES[zone]) {
      return ZONE_IMAGES[zone];
    }
    return workout
      ? resolveWorkoutThumbnailSource({
          imageUrl: workout.imageUrl,
          type: workout.type,
          targetMuscles: workout.targetMuscles,
          title: workout.title,
        })
      : null;
  }, [bodyPartOf, runner, workout]);

  if (runner.rest) {
    lastRestKind.current = runner.rest.kind;
  }

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
          retrying={runner.busy === 'finish'}
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
    !workout || runner.loadState !== 'ready' || (!dev && !sessionId);
  const failed =
    workoutsQuery.error || startFailed || runner.loadState === 'error';

  let body: React.ReactNode = null;
  if (notReady) {
    body = (
      <View style={[styles.state, { paddingTop: topPadding + 40 }]}>
        {failed ? (
          <BlockError
            message="No pudimos abrir la sesión."
            onRetry={() => {
              setStartFailed(false);
              if (workoutsQuery.error) {
                workoutsQuery.refetch().catch(() => {});
              }
              runner.retryLoad();
            }}
          />
        ) : !workoutsQuery.isLoading && !workout ? (
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
      {exitOpen ? (
        <ExitDialog
          saving={runner.busy === 'save'}
          onStay={() => setExitOpen(false)}
          onSaveAndExit={saveAndExit}
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
