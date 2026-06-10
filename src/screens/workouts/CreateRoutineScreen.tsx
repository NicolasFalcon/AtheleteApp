import {useEffect, useMemo, useRef, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useQuery} from '@tanstack/react-query';
import {Button, Card, EmptyState, Loader} from '@app/components/ui';
import {
  HOME_ROUTES,
  WORKOUTS_ROUTES,
} from '@app/constants/routes';
import {RoutineBuilderHeader} from '@app/features/workouts/components/RoutineBuilderHeader';
import {RoutineExerciseLibraryPicker} from '@app/features/workouts/components/RoutineExerciseLibraryPicker';
import {RoutineExerciseRow} from '@app/features/workouts/components/RoutineExerciseRow';
import {RoutineMetadataForm} from '@app/features/workouts/components/RoutineMetadataForm';
import type {
  BuilderExercise,
  ExerciseMetricMode,
  RoutineBuilderStep,
} from '@app/features/workouts/types';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {useAuth} from '@app/hooks/useAuth';
import {useExerciseLibrary} from '@app/hooks/useExerciseLibrary';
import {useRoutineBuilder} from '@app/hooks/useRoutineBuilder';
import {fetchRoutineById} from '@app/services/supabase/routines';
import {
  findExerciseByName,
  getWorkoutAccess,
  type LibraryExercise,
  type Workout,
} from '@app/shared';
import type {
  HomeStackParamList,
  WorkoutsStackParamList,
} from '@app/types/navigation';

type Props =
  | NativeStackScreenProps<HomeStackParamList, 'CreateRoutine'>
  | NativeStackScreenProps<HomeStackParamList, 'EditRoutine'>
  | NativeStackScreenProps<WorkoutsStackParamList, 'CreateRoutine'>
  | NativeStackScreenProps<WorkoutsStackParamList, 'EditRoutine'>;

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
    new Set(
      inferred
        .map(item => item.toLowerCase())
        .filter(Boolean),
    ),
  );
}

function createBuilderExercise(libraryExercise: LibraryExercise): BuilderExercise {
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

function getMetricMode(exercise: BuilderExercise): ExerciseMetricMode {
  return exercise.duration ? 'duration' : 'reps';
}

export function CreateRoutineScreen({navigation, route}: Props) {
  const {theme} = useAppTheme();
  const {profile} = useAuth();
  const exercisesQuery = useExerciseLibrary();
  const routineBuilder = useRoutineBuilder();

  const routeNames = navigation.getState().routeNames as string[];
  const params = route.params;
  const initialWorkoutId = params && 'workoutId' in params ? params.workoutId : undefined;
  const initialExerciseId =
    params && 'initialExerciseId' in params ? params.initialExerciseId : undefined;
  const initialExerciseName =
    params && 'initialExerciseName' in params
      ? params.initialExerciseName
      : undefined;

  const mode: 'create' | 'edit' = initialWorkoutId ? 'edit' : 'create';
  const [step, setStep] = useState<RoutineBuilderStep>('details');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Workout['type']>('strength');
  const [difficulty, setDifficulty] = useState<Workout['difficulty']>('intermediate');
  const [duration, setDuration] = useState(45);
  const [calories, setCalories] = useState(estimateCalories(45, 0));
  const [hasManualCalories, setHasManualCalories] = useState(false);
  const [targetFocusInput, setTargetFocusInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<BuilderExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [replaceExerciseIndex, setReplaceExerciseIndex] = useState<number | null>(
    null,
  );
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
      const matchesEquipment =
        !equipmentFilter || exercise.equipment === equipmentFilter;

      return matchesSearch && matchesEquipment;
    });
  }, [equipmentFilter, exercisesQuery.data, searchQuery]);

  const selectedExerciseIds = selectedExercises
    .map(exercise => exercise.exerciseId)
    .filter(Boolean) as string[];

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    body: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    infoText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 20,
    },
    list: {
      gap: theme.spacing.md,
    },
    summaryCard: {
      gap: theme.spacing.sm,
    },
    summaryTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    summaryGrid: {
      gap: theme.spacing.xs,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    summaryLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    summaryValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.semibold,
    },
    footerActions: {
      gap: theme.spacing.sm,
    },
  });

  const detailRouteName = routeNames.includes(WORKOUTS_ROUTES.WorkoutDetail)
    ? WORKOUTS_ROUTES.WorkoutDetail
    : HOME_ROUTES.WorkoutDetail;

  const handleBack = () => {
    if (step === 'configure') {
      setStep('exercises');
      return;
    }

    if (step === 'exercises') {
      setStep('details');
      return;
    }

    navigation.goBack();
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
          exercise[field] ?? (field === 'duration' ? 45 : field === 'restTime' ? 60 : 1);
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

      (navigation as any).replace(detailRouteName, {
        workoutId: savedWorkout.id,
      });
    } catch (error) {
      Alert.alert(
        mode === 'edit' ? 'No pudimos guardar los cambios' : 'No pudimos crear la rutina',
        error instanceof Error ? error.message : 'Inténtalo otra vez.',
      );
    }
  };

  if (
    exercisesQuery.isLoading ||
    editWorkoutQuery.isLoading
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loader label="Cargando builder..." />
      </SafeAreaView>
    );
  }

  if (mode === 'edit' && initialWorkoutId && !workout) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.body}>
          <EmptyState
            title="Rutina no encontrada"
            description="No pudimos cargar esta rutina para editarla."
          />
          <Button label="Volver" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'edit' && workoutAccess && !workoutAccess.canEdit) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.body}>
          <EmptyState
            title="Rutina de solo lectura"
            description="Esta rutina pertenece a la biblioteca global. Puedes usarla como referencia, pero no editarla ni eliminarla."
          />
          <Button label="Volver al detalle" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <RoutineBuilderHeader mode={mode} step={step} onBack={handleBack} />
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {step === 'details' ? (
          <RoutineMetadataForm
            title={title}
            description={description}
            type={type}
            difficulty={difficulty}
            duration={duration}
            calories={calories}
            targetFocusInput={targetFocusInput}
            tagsInput={tagsInput}
            hasManualCalories={hasManualCalories}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onTypeChange={setType}
            onDifficultyChange={setDifficulty}
            onDurationChange={setDuration}
            onCaloriesChange={(value, modeOverride) => {
              if (modeOverride === 'auto') {
                setHasManualCalories(false);
                setCalories(estimateCalories(duration, selectedExercises.length));
                return;
              }

              setHasManualCalories(true);
              setCalories(value);
            }}
            onTargetFocusChange={setTargetFocusInput}
            onTagsChange={setTagsInput}
            onContinue={() => setStep('exercises')}
            canContinue={title.trim().length > 0}
          />
        ) : null}

        {step === 'exercises' ? (
          <RoutineExerciseLibraryPicker
            exercises={filteredExercises}
            selectedExerciseIds={selectedExerciseIds}
            searchQuery={searchQuery}
            equipmentFilter={equipmentFilter}
            selectedCount={selectedExercises.length}
            replaceExerciseName={
              replaceExerciseIndex !== null
                ? selectedExercises[replaceExerciseIndex]?.name || null
                : null
            }
            onSearchChange={setSearchQuery}
            onEquipmentChange={setEquipmentFilter}
            onSelectExercise={handleSelectExercise}
            onContinue={() => setStep('configure')}
            onCancelReplace={() => {
              setReplaceExerciseIndex(null);
              setStep('configure');
            }}
          />
        ) : null}

        {step === 'configure' ? (
          <>
            <Text style={styles.infoText}>
              Reordena la secuencia con subir y bajar. También puedes reemplazar,
              quitar o ajustar cada ejercicio.
            </Text>

            <View style={styles.list}>
              {selectedExercises.map((exercise, index) => (
                <RoutineExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === selectedExercises.length - 1}
                  metricMode={getMetricMode(exercise)}
                  onMove={direction => moveExercise(index, direction)}
                  onRemove={() =>
                    setSelectedExercises(prev =>
                      prev.filter((_, exerciseIndex) => exerciseIndex !== index),
                    )
                  }
                  onReplace={() => {
                    setReplaceExerciseIndex(index);
                    setStep('exercises');
                  }}
                  onMetricModeChange={metricMode =>
                    updateMetricMode(index, metricMode)
                  }
                  onNumberChange={(field, delta) =>
                    updateExerciseNumber(index, field, delta)
                  }
                  onNotesChange={notes =>
                    setSelectedExercises(prev =>
                      prev.map((item, exerciseIndex) =>
                        exerciseIndex === index ? {...item, notes} : item,
                      ),
                    )
                  }
                />
              ))}
            </View>

            <Button
              label="Agregar otro ejercicio"
              variant="outline"
              onPress={() => setStep('exercises')}
            />

            <Card style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Resumen</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Ejercicios</Text>
                  <Text style={styles.summaryValue}>{selectedExercises.length}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Duración</Text>
                  <Text style={styles.summaryValue}>{duration} min</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Calorías</Text>
                  <Text style={styles.summaryValue}>{calories} kcal</Text>
                </View>
              </View>
            </Card>

            <View style={styles.footerActions}>
              <Button
                label={mode === 'edit' ? 'Guardar cambios' : 'Guardar rutina'}
                onPress={handleSave}
                loading={
                  routineBuilder.isCreatingRoutine || routineBuilder.isUpdatingRoutine
                }
                disabled={title.trim().length === 0 || selectedExercises.length === 0}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
