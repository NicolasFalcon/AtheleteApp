import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  GlassSurface,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import type {
  BuilderExercise,
  ExerciseMetricMode,
  RoutineBuilderStep,
} from '@app/features/workouts/types';
import {
  BuilderHeader,
  BuilderTray,
  ExerciseAdjustSheet,
  IdentityStep,
  PickStep,
  ReviewStep,
} from '@app/features/workouts/v2/RoutineBuilderSteps';
import {
  clampDuration,
  type ZoneKey,
} from '@app/features/workouts/workoutsModel';
import { routineErrorCopy } from '@app/features/workouts/routineErrors';
import { useAuth } from '@app/hooks/useAuth';
import { useExercise, useExerciseBrowse } from '@app/hooks/useCatalog';
import { useDebouncedValue } from '@app/hooks/useDebouncedValue';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { useRoutine, useRoutineMutations } from '@app/hooks/useRoutines';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { RoutineInput } from '@app/services/routines/routinesService';
import {
  getWorkoutAccess,
  type LibraryExercise,
  type Workout,
} from '@app/shared';
import type { AppScreenProps } from '@app/types/navigation';

// Registered twice in the root stack: CreateRoutine and EditRoutine.
type Props = AppScreenProps<'CreateRoutine'> | AppScreenProps<'EditRoutine'>;

function parseCommaSeparatedList(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean),
    ),
  );
}

function estimateCalories(duration: number, exerciseCount: number) {
  return Math.max(50, Math.round(duration * 8 + exerciseCount * 15));
}

function inferTargetMuscles(exercises: BuilderExercise[]) {
  const inferred = exercises.flatMap(exercise => {
    if (!exercise.libraryExercise) {
      return [];
    }

    return [
      ...exercise.libraryExercise.musclesWorked.primary,
      ...exercise.libraryExercise.musclesWorked.secondary,
      exercise.libraryExercise.bodyPart,
    ];
  });

  return Array.from(
    new Set(inferred.map(item => item.toLowerCase()).filter(Boolean)),
  );
}

function createBuilderExercise(
  libraryExercise: LibraryExercise,
): BuilderExercise {
  return {
    id: `custom-${libraryExercise.id}-${Date.now()}`,
    exerciseId: libraryExercise.id,
    name: libraryExercise.name,
    sets: 3,
    reps: 10,
    duration: undefined,
    restTime: 60,
    notes: '',
    libraryExercise,
  };
}

export function CreateRoutineScreen({ navigation, route }: Props) {
  const handleSafeBack = () => safeGoBack(navigation, [ROOT_ROUTES.MainTabs]);
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const language = useProfileLanguage();
  const mutations = useRoutineMutations();

  const params = route.params;
  const initialWorkoutId =
    params && 'workoutId' in params ? params.workoutId : undefined;
  const initialExerciseId =
    params && 'initialExerciseId' in params
      ? params.initialExerciseId
      : undefined;

  const mode: 'create' | 'edit' = initialWorkoutId ? 'edit' : 'create';
  const [step, setStep] = useState<RoutineBuilderStep>('details');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Workout['type']>('strength');
  const [difficulty, setDifficulty] =
    useState<Workout['difficulty']>('intermediate');
  const [duration, setDuration] = useState(45);
  const [calories, setCalories] = useState(estimateCalories(45, 0));
  const [hasManualCalories, setHasManualCalories] = useState(false);
  const [targetFocusInput, setTargetFocusInput] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<BuilderExercise[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<ZoneKey | null>(null);
  const [adjustIndex, setAdjustIndex] = useState<number | null>(null);
  const [replaceExerciseIndex, setReplaceExerciseIndex] = useState<
    number | null
  >(null);
  const hasInitialized = useRef(false);
  // Editing reads the routine with get_routine (the same as the detail).
  const editWorkoutQuery = useRoutine(mode === 'edit' ? initialWorkoutId : null);
  // "Agregar a rutina" from an exercise: that exercise (get_exercise).
  const initialExerciseQuery = useExercise(
    mode === 'create' ? initialExerciseId : null,
  );
  // Picker: list_exercises page by page, search on the server (300 ms).
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const pickerQuery = useExerciseBrowse(
    { zone: zoneFilter, equipment: [], level: null, q: debouncedQuery },
    { enabled: step === 'exercises' },
  );

  const workout = useMemo(
    () => editWorkoutQuery.data || null,
    [editWorkoutQuery.data],
  );
  const workoutAccess = useMemo(
    () => (workout ? getWorkoutAccess(workout, profile?.id) : null),
    [profile?.id, workout],
  );

  useEffect(() => {
    if (hasInitialized.current || initialExerciseQuery.isLoading) {
      return;
    }

    if (mode === 'edit' && initialWorkoutId) {
      if (!workout) {
        return;
      }

      setTitle(workout.title);
      setDescription(workout.description || '');
      setType(workout.type);
      setDifficulty(workout.difficulty);
      setDuration(workout.duration);
      setCalories(workout.calories);
      setHasManualCalories(true);
      setTargetFocusInput((workout.targetMuscles || []).join(', '));
      // Each exercise keeps its block (warmup / main / cooldown).
      setSelectedExercises(
        workout.exercises.map(exercise => ({
          ...exercise,
          notes: exercise.notes ?? '',
        })),
      );
      hasInitialized.current = true;
      return;
    }

    const initialExercises: BuilderExercise[] = [];
    if (initialExerciseQuery.data) {
      initialExercises.push(createBuilderExercise(initialExerciseQuery.data));
    }

    setSelectedExercises(initialExercises);
    hasInitialized.current = true;
  }, [
    initialExerciseQuery.data,
    initialExerciseQuery.isLoading,
    initialWorkoutId,
    mode,
    workout,
  ]);

  useEffect(() => {
    if (hasManualCalories) {
      return;
    }

    setCalories(estimateCalories(duration, selectedExercises.length));
  }, [duration, hasManualCalories, selectedExercises.length]);

  const pickerExercises = pickerQuery.items;
  const loadMoreExercises = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (step !== 'exercises') {
      return;
    }
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const nearEnd =
      contentOffset.y + layoutMeasurement.height > contentSize.height - 600;
    if (nearEnd && pickerQuery.hasNextPage && !pickerQuery.isFetchingNextPage) {
      pickerQuery.fetchNextPage().catch(() => {});
    }
  };

  const selectedExerciseIds = selectedExercises
    .map(exercise => exercise.exerciseId)
    .filter(Boolean) as string[];

  const handleBack = () => {
    if (step === 'configure') {
      setStep('exercises');
      return;
    }

    if (step === 'exercises') {
      setStep('details');
      return;
    }

    handleSafeBack();
  };

  const handleSelectExercise = (exercise: LibraryExercise) => {
    if (replaceExerciseIndex !== null) {
      setSelectedExercises(prev =>
        prev.map((item, index) =>
          index === replaceExerciseIndex
            ? {
                ...createBuilderExercise(exercise),
                id: item.id,
              }
            : item,
        ),
      );
      setReplaceExerciseIndex(null);
      setStep('configure');
      return;
    }

    if (selectedExerciseIds.includes(exercise.id)) {
      setSelectedExercises(prev =>
        prev.filter(item => item.exerciseId !== exercise.id),
      );
      return;
    }

    setSelectedExercises(prev => [...prev, createBuilderExercise(exercise)]);
  };

  const updateMetricMode = (index: number, metricMode: ExerciseMetricMode) => {
    setSelectedExercises(prev =>
      prev.map((exercise, exerciseIndex) => {
        if (exerciseIndex !== index) {
          return exercise;
        }

        if (metricMode === 'duration') {
          return {
            ...exercise,
            reps: undefined,
            duration: exercise.duration ?? 45,
          };
        }

        return {
          ...exercise,
          duration: undefined,
          reps: exercise.reps ?? 10,
        };
      }),
    );
  };

  const updateExerciseNumber = (
    index: number,
    field: 'sets' | 'reps' | 'duration' | 'restTime',
    delta: number,
  ) => {
    setSelectedExercises(prev =>
      prev.map((exercise, exerciseIndex) => {
        if (exerciseIndex !== index) {
          return exercise;
        }

        const currentValue =
          exercise[field] ??
          (field === 'duration' ? 45 : field === 'restTime' ? 60 : 1);
        const minimum = field === 'restTime' ? 0 : 1;
        return {
          ...exercise,
          [field]: Math.max(minimum, currentValue + delta),
        };
      }),
    );
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    setSelectedExercises(prev => {
      const next = [...prev];
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= next.length) {
        return prev;
      }

      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    if (mode === 'edit' && workoutAccess && !workoutAccess.canEdit) {
      Alert.alert(
        'Rutina protegida',
        'Solo puedes editar rutinas propias o rutinas generadas por ELLIE para tu cuenta.',
      );
      return;
    }

    const parsedTargetMuscles = parseCommaSeparatedList(targetFocusInput);
    const targetMuscles =
      parsedTargetMuscles.length > 0
        ? parsedTargetMuscles
        : inferTargetMuscles(selectedExercises);

    // save_user_routine needs a catalog exercise for every row (an old row
    // without one has to be replaced or removed first).
    const missing = selectedExercises.filter(exercise => !exercise.exerciseId);
    if (missing.length > 0) {
      Alert.alert(
        language === 'en' ? 'Exercise not available' : 'Ejercicio no disponible',
        language === 'en'
          ? `${missing[0].name} is no longer in the catalogue. Replace or remove it.`
          : `${missing[0].name} ya no está en el catálogo. Cámbialo o quítalo.`,
      );
      return;
    }

    const input: RoutineInput = {
      title: title.trim(),
      description: description.trim() || null,
      type,
      duration,
      difficulty,
      calories,
      targetMuscles,
      exercises: selectedExercises.map(exercise => ({
        exerciseId: exercise.exerciseId as string,
        block: exercise.block ?? 'main',
        sets: exercise.sets ?? null,
        reps: exercise.duration ? null : exercise.reps ?? null,
        duration: exercise.duration ?? null,
        restTime: exercise.restTime,
        notes: exercise.notes.trim() ? exercise.notes.trim() : null,
        plannedWeightKg: exercise.plannedWeightKg ?? null,
      })),
    };

    try {
      const savedWorkout =
        mode === 'edit' && initialWorkoutId
          ? await mutations.updateRoutine({ id: initialWorkoutId, input })
          : (await mutations.createRoutine(input)).routine;

      navigation.replace(APP_ROUTES.WorkoutDetail, {
        workoutId: savedWorkout.id,
      });
    } catch (error) {
      const copy = routineErrorCopy(error, language);
      Alert.alert(
        mode === 'edit'
          ? 'No pudimos guardar los cambios'
          : 'No pudimos crear la rutina',
        copy.message,
      );
    }
  };

  const stepIndex = step === 'details' ? 0 : step === 'exercises' ? 1 : 2;
  const saving = mutations.isCreating || mutations.isUpdating;
  const canNext =
    stepIndex === 0
      ? title.trim().length > 0
      : stepIndex === 1
      ? selectedExercises.length > 0
      : title.trim().length > 0 && selectedExercises.length > 0;
  const headerTitle = mode === 'edit' ? 'Editar rutina' : 'Nueva rutina';

  const goNext = () => {
    if (!canNext) {
      return;
    }
    if (step === 'details') {
      setStep('exercises');
      return;
    }
    if (step === 'exercises') {
      setReplaceExerciseIndex(null);
      setStep('configure');
      return;
    }
    handleSave().catch(() => {});
  };

  const changeDuration = (delta: number) =>
    setDuration(current => clampDuration(current + delta));

  const loading = initialExerciseQuery.isLoading || editWorkoutQuery.isLoading;
  const loadError = initialExerciseQuery.error || editWorkoutQuery.error;

  const renderBody = () => {
    if (loadError) {
      return (
        <BlockError
          message="No pudimos cargar los datos de la rutina."
          onRetry={() => {
            // refetch() ignores `enabled`: retry only what failed.
            if (initialExerciseQuery.error) {
              initialExerciseQuery.refetch().catch(() => {});
            }
            if (editWorkoutQuery.error) {
              editWorkoutQuery.refetch().catch(() => {});
            }
          }}
        />
      );
    }

    if (loading) {
      return (
        <SkeletonGroup>
          <Skeleton width="80%" height={34} />
          <Skeleton width="60%" height={16} />
          <Skeleton height={144} radius={20} />
          <Skeleton height={44} radius={22} />
        </SkeletonGroup>
      );
    }

    if (mode === 'edit' && initialWorkoutId && !workout) {
      return (
        <View style={styles.message}>
          <TextV2 variant="section" align="center">
            Rutina no encontrada
          </TextV2>
          <TextV2 variant="body" tone="secondary" align="center">
            No pudimos cargar esta rutina para editarla.
          </TextV2>
        </View>
      );
    }

    if (mode === 'edit' && workoutAccess && !workoutAccess.canEdit) {
      return (
        <View style={styles.message}>
          <TextV2 variant="section" align="center">
            Rutina de solo lectura
          </TextV2>
          <TextV2 variant="body" tone="secondary" align="center">
            Esta rutina pertenece a la biblioteca. Puedes usarla, pero no
            editarla ni eliminarla.
          </TextV2>
        </View>
      );
    }

    if (step === 'details') {
      return (
        <IdentityStep
          title={title}
          description={description}
          type={type}
          difficulty={difficulty}
          duration={duration}
          calories={calories}
          onTitle={setTitle}
          onDescription={setDescription}
          onType={setType}
          onDifficulty={setDifficulty}
          onDuration={changeDuration}
        />
      );
    }

    if (step === 'exercises') {
      return (
        <PickStep
          exercises={pickerExercises}
          loading={pickerQuery.isLoading || pickerQuery.isFetchingNextPage}
          error={Boolean(pickerQuery.error)}
          onRetry={() => {
            pickerQuery.refetch().catch(() => {});
          }}
          selectedIds={selectedExerciseIds}
          query={searchQuery}
          zone={zoneFilter}
          replaceName={
            replaceExerciseIndex !== null
              ? selectedExercises[replaceExerciseIndex]?.name || null
              : null
          }
          onQuery={setSearchQuery}
          onZone={setZoneFilter}
          onToggle={handleSelectExercise}
          onCancelReplace={() => {
            setReplaceExerciseIndex(null);
            setStep('configure');
          }}
        />
      );
    }

    return (
      <ReviewStep
        title={title.trim() || 'Tu rutina'}
        type={type}
        difficulty={difficulty}
        duration={duration}
        calories={calories}
        exercises={selectedExercises}
        onAdjust={setAdjustIndex}
      />
    );
  };

  const blocked =
    Boolean(loadError) ||
    loading ||
    (mode === 'edit' && initialWorkoutId && !workout) ||
    (mode === 'edit' && workoutAccess && !workoutAccess.canEdit);
  const darkFooter = step === 'exercises';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <BuilderHeader
        title={headerTitle}
        step={stepIndex}
        top={insets.top}
        onBack={handleBack}
      />
      <ScrollView
        onScroll={loadMoreExercises}
        scrollEventThrottle={64}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.body,
          { paddingHorizontal: layout.gutter },
        ]}
      >
        {renderBody()}
      </ScrollView>

      {!blocked && step === 'exercises' && selectedExercises.length > 0 ? (
        <BuilderTray
          exercises={selectedExercises}
          onMove={moveExercise}
          onAdjust={setAdjustIndex}
        />
      ) : null}

      {blocked ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) + 4 },
          ]}
        >
          <Button
            label="Volver"
            variant="secondary"
            fullWidth
            onPress={handleSafeBack}
          />
        </View>
      ) : darkFooter ? (
        <View
          style={[
            styles.footer,
            styles.darkFooter,
            { paddingBottom: Math.max(insets.bottom, 16) + 4 },
          ]}
        >
          <Button
            label="Siguiente"
            variant="onScene"
            fullWidth
            disabled={!canNext}
            onPress={goNext}
          />
        </View>
      ) : (
        <GlassSurface
          kind="nav"
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) + 4 },
          ]}
        >
          <Button
            label={
              stepIndex < 2
                ? 'Siguiente'
                : mode === 'edit'
                ? 'Guardar cambios'
                : 'Guardar rutina'
            }
            fullWidth
            disabled={!canNext}
            loading={saving}
            loadingLabel="Guardando"
            onPress={goNext}
          />
        </GlassSurface>
      )}

      <ExerciseAdjustSheet
        exercise={
          adjustIndex !== null ? selectedExercises[adjustIndex] ?? null : null
        }
        onClose={() => setAdjustIndex(null)}
        onMode={(metricMode: ExerciseMetricMode) => {
          if (adjustIndex !== null) {
            updateMetricMode(adjustIndex, metricMode);
          }
        }}
        onNumber={(field, delta) => {
          if (adjustIndex !== null) {
            updateExerciseNumber(adjustIndex, field, delta);
          }
        }}
        onReplace={() => {
          if (adjustIndex !== null) {
            setReplaceExerciseIndex(adjustIndex);
            setAdjustIndex(null);
            setStep('exercises');
          }
        }}
        onRemove={() => {
          if (adjustIndex !== null) {
            const index = adjustIndex;
            setAdjustIndex(null);
            setSelectedExercises(prev =>
              prev.filter((_, exerciseIndex) => exerciseIndex !== index),
            );
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    paddingTop: 12,
    paddingBottom: 24,
    gap: 28,
  },
  message: {
    paddingTop: 60,
    gap: 10,
    alignItems: 'center',
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  darkFooter: {
    backgroundColor: '#141312',
  },
});
