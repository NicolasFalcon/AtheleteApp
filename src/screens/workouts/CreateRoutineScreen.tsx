import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
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
import { useAuth } from '@app/hooks/useAuth';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { useRoutineBuilder } from '@app/hooks/useRoutineBuilder';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { fetchRoutineById } from '@app/services/supabase/routines';
import {
  findExerciseByName,
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
  const exercisesQuery = useExerciseLibrary();
  const routineBuilder = useRoutineBuilder();

  const params = route.params;
  const initialWorkoutId =
    params && 'workoutId' in params ? params.workoutId : undefined;
  const initialExerciseId =
    params && 'initialExerciseId' in params
      ? params.initialExerciseId
      : undefined;
  const initialExerciseName =
    params && 'initialExerciseName' in params
      ? params.initialExerciseName
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
  const [tagsInput, setTagsInput] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<BuilderExercise[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<ZoneKey | null>(null);
  const [adjustIndex, setAdjustIndex] = useState<number | null>(null);
  const devStep =
    __DEV__ && params && 'devStep' in params ? params.devStep : undefined;
  const [replaceExerciseIndex, setReplaceExerciseIndex] = useState<
    number | null
  >(null);
  const hasInitialized = useRef(false);
  const editWorkoutQuery = useQuery({
    queryKey: ['workouts', 'detail', initialWorkoutId || 'new'],
    enabled: mode === 'edit' && Boolean(initialWorkoutId),
    queryFn: async () => fetchRoutineById(initialWorkoutId!),
  });

  const workout = useMemo(
    () => editWorkoutQuery.data || null,
    [editWorkoutQuery.data],
  );
  const workoutAccess = useMemo(
    () => (workout ? getWorkoutAccess(workout, profile?.id) : null),
    [profile?.id, workout],
  );

  useEffect(() => {
    if (hasInitialized.current || exercisesQuery.isLoading) {
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
      setTagsInput((workout.tags || []).join(', '));
      setSelectedExercises(
        workout.exercises.map(exercise => ({
          ...exercise,
          notes: exercise.notes ?? '',
          libraryExercise: exercise.exerciseId
            ? exercisesQuery.data?.find(item => item.id === exercise.exerciseId)
            : exercisesQuery.data
            ? findExerciseByName(exercisesQuery.data, exercise.name)
            : undefined,
        })),
      );
      hasInitialized.current = true;
      return;
    }

    // Development only: open a step with sample answers (devStep).
    if (devStep !== undefined && exercisesQuery.data) {
      const seen = new Set<string>();
      const sample = exercisesQuery.data
        .filter(item => {
          if (seen.has(item.bodyPart)) {
            return false;
          }
          seen.add(item.bodyPart);
          return true;
        })
        .slice(0, 4);
      setTitle('Full body del viernes');
      setSelectedExercises(sample.map(createBuilderExercise));
      setStep(
        devStep === 0 ? 'details' : devStep === 1 ? 'exercises' : 'configure',
      );
      if (devStep === 0) {
        setTitle('');
      }
      hasInitialized.current = true;
      return;
    }

    const initialExercises: BuilderExercise[] = [];
    if (initialExerciseId && exercisesQuery.data) {
      const libraryExercise = exercisesQuery.data.find(
        item => item.id === initialExerciseId,
      );

      if (libraryExercise) {
        initialExercises.push(createBuilderExercise(libraryExercise));
      } else if (initialExerciseName) {
        const fallbackExercise = findExerciseByName(
          exercisesQuery.data,
          initialExerciseName,
        );
        if (fallbackExercise) {
          initialExercises.push(createBuilderExercise(fallbackExercise));
        }
      }
    }

    setSelectedExercises(initialExercises);
    hasInitialized.current = true;
  }, [
    exercisesQuery.data,
    exercisesQuery.isLoading,
    initialExerciseId,
    initialExerciseName,
    initialWorkoutId,
    mode,
    workout,
    devStep,
  ]);

  useEffect(() => {
    if (hasManualCalories) {
      return;
    }

    setCalories(estimateCalories(duration, selectedExercises.length));
  }, [duration, hasManualCalories, selectedExercises.length]);

  const filteredExercises = useMemo(() => {
    const allExercises = exercisesQuery.data || [];
    return allExercises.filter(exercise => {
      const matchesSearch = exercise.name
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());
      const matchesZone = !zoneFilter || exercise.bodyPart === zoneFilter;

      return matchesSearch && matchesZone;
    });
  }, [zoneFilter, exercisesQuery.data, searchQuery]);

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
    const parsedTags = parseCommaSeparatedList(tagsInput);
    const targetMuscles =
      parsedTargetMuscles.length > 0
        ? parsedTargetMuscles
        : inferTargetMuscles(selectedExercises);

    const payload: Omit<Workout, 'id'> = {
      title: title.trim(),
      type,
      duration,
      difficulty,
      calories,
      targetMuscles,
      exercises: selectedExercises.map(exercise => ({
        id: exercise.id,
        exerciseId: exercise.exerciseId || null,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.duration ? undefined : exercise.reps,
        duration: exercise.duration,
        restTime: exercise.restTime,
        notes: exercise.notes.trim() ? exercise.notes.trim() : undefined,
      })),
      isPremium: workout?.isPremium || false,
      description: description.trim() || undefined,
      imageUrl: workout?.imageUrl,
      tags: parsedTags,
      createdByAi: workout?.createdByAi || false,
      createdBy: workout?.createdBy,
      isPublic: workout?.isPublic || false,
      source: workout?.source || 'custom',
      sourceType: workout?.sourceType,
      collectionType: workout?.collectionType,
      collectionTitle: workout?.collectionTitle,
      collectionBadge: workout?.collectionBadge,
      inspirationStyle: workout?.inspirationStyle,
      isFeatured: workout?.isFeatured,
    };

    try {
      const savedWorkout =
        mode === 'edit' && initialWorkoutId
          ? await routineBuilder.updateRoutine({
              workoutId: initialWorkoutId,
              workout: payload,
            })
          : await routineBuilder.createRoutine(payload);

      navigation.replace(APP_ROUTES.WorkoutDetail, {
        workoutId: savedWorkout.id,
      });
    } catch (error) {
      Alert.alert(
        mode === 'edit'
          ? 'No pudimos guardar los cambios'
          : 'No pudimos crear la rutina',
        error instanceof Error ? error.message : 'Inténtalo otra vez.',
      );
    }
  };

  const stepIndex = step === 'details' ? 0 : step === 'exercises' ? 1 : 2;
  const saving =
    routineBuilder.isCreatingRoutine || routineBuilder.isUpdatingRoutine;
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

  const loading = exercisesQuery.isLoading || editWorkoutQuery.isLoading;
  const loadError = exercisesQuery.error || editWorkoutQuery.error;

  const renderBody = () => {
    if (loadError) {
      return (
        <BlockError
          message="No pudimos cargar los datos de la rutina."
          onRetry={() => {
            // refetch() ignores `enabled`: retry only what failed.
            if (exercisesQuery.error) {
              exercisesQuery.refetch().catch(() => {});
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
          exercises={filteredExercises}
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
