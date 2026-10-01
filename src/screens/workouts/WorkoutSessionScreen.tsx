import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Clock3,
  Flame,
  Play,
  Save,
  Sparkles,
} from 'lucide-react-native';
import {
  Button,
  Card,
  EmptyState,
  Loader,
  ProgressBar,
} from '@app/components/ui';
import { APP_ROUTES, ROOT_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import { WorkoutSessionExerciseRow } from '@app/features/workouts/components/WorkoutSessionExerciseRow';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { useWorkoutLibrary } from '@app/hooks/useWorkoutLibrary';
import { useWorkoutSession } from '@app/hooks/useWorkoutSession';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { findExerciseByName } from '@app/shared';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'WorkoutSession'>;

function formatTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(minutes)}:${pad(seconds)}`;
}

export function WorkoutSessionScreen({ navigation, route }: Props) {
  const handleSafeBack = () => safeGoBack(navigation, [ROOT_ROUTES.MainTabs]);
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const workoutsQuery = useWorkoutLibrary();
  const exercisesQuery = useExerciseLibrary();
  const workout = useMemo(
    () =>
      (workoutsQuery.data || []).find(
        item => item.id === route.params.workoutId,
      ) || null,
    [route.params.workoutId, workoutsQuery.data],
  );
  const {
    workoutSession,
    isLoading,
    startSession,
    isStartingSession,
    persistCompletedExercises,
    completeSession,
    isCompletingSession,
    saveSessionForLater,
    isSavingSession,
    resumeSession,
    isResumingSession,
  } = useWorkoutSession(workout);
  const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const status = workoutSession?.status ?? 'idle';
  const isInteractive = status === 'in_progress';
  const totalExercises = workout?.exercises.length || 0;
  const completedCount = completedExerciseIds.length;
  const progressPct =
    totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;
  const bottomBarClearance =
    (status === 'in_progress' ? 96 + theme.spacing.sm : 48) +
    theme.spacing.lg +
    Math.max(insets.bottom, theme.spacing.lg);

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    titleBlock: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: bottomBarClearance + theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    helperCard: {
      gap: theme.spacing.sm,
    },
    helperEyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    helperTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.titleSm,
      fontWeight: theme.typography.weights.bold,
    },
    helperText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 21,
    },
    statRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    statChip: {
      borderRadius: theme.radii.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.surfaceMuted,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    sectionSubtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      marginTop: 2,
    },
    list: {
      gap: theme.spacing.sm,
    },
    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
  });

  useEffect(() => {
    setCompletedExerciseIds(workoutSession?.completedExercises || []);
  }, [workoutSession?.completedExercises, workoutSession?.id]);

  useEffect(() => {
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = null;
    }

    if (!workoutSession?.startedAt || workoutSession.status !== 'in_progress') {
      setElapsedSeconds((workoutSession?.duration || 0) * 60);
      return;
    }

    const updateElapsed = () => {
      setElapsedSeconds(
        Math.max(
          0,
          Math.floor((Date.now() - new Date(workoutSession.startedAt!).getTime()) / 1000),
        ),
      );
    };

    updateElapsed();
    const intervalId = setInterval(updateElapsed, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [workoutSession?.duration, workoutSession?.startedAt, workoutSession?.status]);

  const flushPendingExercises = async (nextIds: string[]) => {
    if (!workoutSession || workoutSession.status !== 'in_progress') {
      return;
    }

    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = null;
    }

    await persistCompletedExercises(nextIds);
  };

  const handleStart = async () => {
    if (!workout) {
      return;
    }

    try {
      await startSession();
    } catch (error) {
      Alert.alert(
        'No pudimos iniciar la rutina',
        error instanceof Error ? error.message : 'Inténtalo otra vez.',
      );
    }
  };

  const handleToggleExercise = (exerciseId: string) => {
    if (!isInteractive) {
      return;
    }

    const nextIds = completedExerciseIds.includes(exerciseId)
      ? completedExerciseIds.filter(id => id !== exerciseId)
      : [...completedExerciseIds, exerciseId];

    setCompletedExerciseIds(nextIds);

    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }

    persistTimeoutRef.current = setTimeout(() => {
      persistCompletedExercises(nextIds).catch(() => {
        // The next explicit finish/save action will retry persistence.
      });
      persistTimeoutRef.current = null;
    }, 450);
  };

  const handleSaveForLater = async () => {
    if (!workoutSession || !workout) {
      return;
    }

    try {
      await flushPendingExercises(completedExerciseIds);
      await saveSessionForLater(completedExerciseIds);
      handleSafeBack();
    } catch (error) {
      Alert.alert(
        'No pudimos guardar la sesión',
        error instanceof Error ? error.message : 'Inténtalo otra vez.',
      );
    }
  };

  const handleComplete = async () => {
    if (!workoutSession || !workout || completedExerciseIds.length === 0) {
      return;
    }

    try {
      await flushPendingExercises(completedExerciseIds);
      await completeSession(completedExerciseIds);
    } catch (error) {
      Alert.alert(
        'No pudimos finalizar la sesión',
        error instanceof Error ? error.message : 'Inténtalo otra vez.',
      );
    }
  };

  const handleResume = async () => {
    try {
      await resumeSession();
    } catch (error) {
      Alert.alert(
        'No pudimos reanudar la sesión',
        error instanceof Error ? error.message : 'Inténtalo otra vez.',
      );
    }
  };

  const handleBack = () => {
    if (status !== 'in_progress') {
      handleSafeBack();
      return;
    }

    Alert.alert(
      '¿Guardar para continuar después?',
      'Tu progreso quedará listo para retomarlo más tarde desde Inicio.',
      [
        {text: 'Seguir entrenando', style: 'cancel'},
        {
          text: 'Guardar y salir',
          onPress: () => {
            handleSaveForLater().catch(() => {
              // Errors are surfaced inside handleSaveForLater.
            });
          },
        },
      ],
    );
  };

  const openExerciseDetail = (exerciseId: string) => {
    navigation.navigate(APP_ROUTES.ExerciseDetail, { exerciseId });
  };

  const goHome = () => {
    // The session sits above the tabs: pop back to MainTabs on Inicio.
    navigation.navigate(ROOT_ROUTES.MainTabs, { screen: TAB_ROUTES.Home });
  };

  if (isLoading || workoutsQuery.isLoading || exercisesQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loader label="Cargando sesión..." />
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <EmptyState
            title="Rutina no encontrada"
            description="No pudimos abrir la rutina asociada a esta sesión."
          />
          <Button label="Volver" onPress={handleSafeBack} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, {paddingTop: insets.top + theme.spacing.xs}]}>
        <View style={styles.headerRow}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft color={theme.colors.textPrimary} size={18} strokeWidth={2.2} />
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{workout.title}</Text>
            <Text style={styles.subtitle}>
              {completedCount}/{totalExercises} ejercicios · {formatTimer(elapsedSeconds)}
            </Text>
          </View>
          {status === 'in_progress' ? (
            <Pressable onPress={handleSaveForLater} style={styles.backButton}>
              <Save color={theme.colors.textPrimary} size={16} strokeWidth={2.2} />
            </Pressable>
          ) : null}
        </View>
        <ProgressBar value={progressPct} max={100} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {status === 'idle' ? (
          <Card style={styles.helperCard}>
            <Text style={styles.helperEyebrow}>Lista para empezar</Text>
            <Text style={styles.helperTitle}>Comienza tu sesión</Text>
            <Text style={styles.helperText}>
              Esta vista seguirá tu progreso real y mantendrá la rutina lista para
              continuarla después si necesitas pausar.
            </Text>
            <Button
              label="Empezar rutina"
              loading={isStartingSession}
              onPress={handleStart}
              accessoryRight={
                <Play
                  color={theme.colors.accentContrast}
                  size={16}
                  strokeWidth={2.2}
                />
              }
            />
          </Card>
        ) : null}

        {status === 'canceled' ? (
          <Card style={styles.helperCard}>
            <Text style={styles.helperEyebrow}>Sesión guardada</Text>
            <Text style={styles.helperTitle}>Lista para retomarla</Text>
            <Text style={styles.helperText}>
              Tu progreso quedó guardado. Puedes continuar justo donde lo dejaste.
            </Text>
            <View style={styles.statRow}>
              <View style={styles.statChip}>
                <Clock3 color={theme.colors.textSecondary} size={14} />
                <Text style={styles.statLabel}>{workoutSession?.duration || 0} min</Text>
              </View>
              <View style={styles.statChip}>
                <Flame color={theme.colors.textSecondary} size={14} />
                <Text style={styles.statLabel}>
                  {workoutSession?.caloriesBurned || 0} kcal
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {status === 'completed' ? (
          <Card style={styles.helperCard}>
            <Text style={styles.helperEyebrow}>Completado hoy</Text>
            <Text style={styles.helperTitle}>Sesión registrada</Text>
            <Text style={styles.helperText}>
              Tu sesión quedó guardada con el progreso real de hoy.
            </Text>
            <View style={styles.statRow}>
              <View style={styles.statChip}>
                <Sparkles color={theme.colors.textSecondary} size={14} />
                <Text style={styles.statLabel}>
                  {completedCount}/{totalExercises} ejercicios
                </Text>
              </View>
              <View style={styles.statChip}>
                <Clock3 color={theme.colors.textSecondary} size={14} />
                <Text style={styles.statLabel}>{workoutSession?.duration || 0} min</Text>
              </View>
              <View style={styles.statChip}>
                <Flame color={theme.colors.textSecondary} size={14} />
                <Text style={styles.statLabel}>
                  {workoutSession?.caloriesBurned || 0} kcal
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        <View>
          <Text style={styles.sectionTitle}>Checklist de ejercicios</Text>
          <Text style={styles.sectionSubtitle}>
            Marca lo que ya completaste y toca cualquier ejercicio para ver su detalle.
          </Text>
        </View>

        <View style={styles.list}>
          {workout.exercises.map((exercise, index) => {
            const libraryExercise = findExerciseByName(
              exercisesQuery.data || [],
              exercise.name,
            );

            return (
              <WorkoutSessionExerciseRow
                key={exercise.id}
                exercise={exercise}
                index={index}
                completed={completedExerciseIds.includes(exercise.id)}
                interactive={isInteractive}
                canOpenDetail={Boolean(libraryExercise)}
                onToggle={() => handleToggleExercise(exercise.id)}
                onOpenDetail={() => {
                  if (libraryExercise) {
                    openExerciseDetail(libraryExercise.id);
                  }
                }}
              />
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {paddingBottom: Math.max(insets.bottom, theme.spacing.lg)},
        ]}>
        {status === 'in_progress' ? (
          <>
            <Button
              label={`Finalizar entreno (${completedCount}/${totalExercises})`}
              loading={isCompletingSession}
              disabled={completedCount === 0}
              onPress={handleComplete}
            />
            <Button
              label="Guardar para después"
              variant="outline"
              loading={isSavingSession}
              onPress={handleSaveForLater}
            />
          </>
        ) : null}

        {status === 'canceled' ? (
          <>
            <Button
              label="Reanudar sesión"
              loading={isResumingSession}
              onPress={handleResume}
              accessoryRight={
                <Play
                  color={theme.colors.accentContrast}
                  size={16}
                  strokeWidth={2.2}
                />
              }
            />
            <Button label="Volver" variant="outline" onPress={handleSafeBack} />
          </>
        ) : null}

        {status === 'completed' ? (
          <>
            <Button label="Volver al inicio" onPress={goHome} />
            <Button label="Volver" variant="outline" onPress={handleSafeBack} />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
