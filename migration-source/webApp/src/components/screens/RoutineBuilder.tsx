import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Minus,
  Plus,
  RefreshCcw,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Chip } from '@/components/ui/Chip';
import { cn } from '@/lib/utils';
import { useExercises, LibraryExercise, findExerciseByName, equipmentLabels } from '@/hooks/useExercises';
import { Exercise, Workout } from '@/lib/types';

interface RoutineBuilderProps {
  mode?: 'create' | 'edit';
  initialWorkout?: Workout;
  onBack: () => void;
  onSave: (workout: Omit<Workout, 'id'>) => Promise<void> | void;
}

interface SelectedExercise extends Exercise {
  libraryExercise?: LibraryExercise;
}

type Step = 'details' | 'exercises' | 'configure';
type ExerciseMetricMode = 'reps' | 'duration';

const workoutTypes = [
  { id: 'strength', label: 'Fuerza' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'fullbody', label: 'Full Body' },
  { id: 'hiit', label: 'HIIT' },
  { id: 'mobility', label: 'Movilidad' },
] as const;

const difficultyLevels = [
  { id: 'beginner', label: 'Principiante' },
  { id: 'intermediate', label: 'Intermedio' },
  { id: 'advanced', label: 'Avanzado' },
] as const;

function parseCommaSeparatedList(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function estimateCalories(duration: number, exerciseCount: number) {
  return Math.max(50, Math.round(duration * 8 + exerciseCount * 15));
}

function inferTargetMuscles(exercises: SelectedExercise[]) {
  const inferred = exercises.flatMap((exercise) => {
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
        .map((item) => item.toLowerCase())
        .filter(Boolean)
    )
  );
}

function createSelectedExercise(libraryExercise: LibraryExercise): SelectedExercise {
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

function getExerciseMetricMode(exercise: SelectedExercise): ExerciseMetricMode {
  return exercise.duration ? 'duration' : 'reps';
}

export function RoutineBuilder({
  mode = 'create',
  initialWorkout,
  onBack,
  onSave,
}: RoutineBuilderProps) {
  const { exercises: exerciseLibrary } = useExercises();
  const [step, setStep] = useState<Step>('details');
  const [title, setTitle] = useState(initialWorkout?.title ?? '');
  const [type, setType] = useState<Workout['type']>(initialWorkout?.type ?? 'strength');
  const [difficulty, setDifficulty] = useState<Workout['difficulty']>(initialWorkout?.difficulty ?? 'intermediate');
  const [duration, setDuration] = useState(initialWorkout?.duration ?? 45);
  const [calories, setCalories] = useState(
    initialWorkout?.calories ?? estimateCalories(initialWorkout?.duration ?? 45, initialWorkout?.exercises.length ?? 0)
  );
  const [hasManualCalories, setHasManualCalories] = useState(mode === 'edit');
  const [targetFocusInput, setTargetFocusInput] = useState((initialWorkout?.targetMuscles || []).join(', '));
  const [tagsInput, setTagsInput] = useState((initialWorkout?.tags || []).join(', '));
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [replaceExerciseIndex, setReplaceExerciseIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasInitializedExercises = useRef(false);

  useEffect(() => {
    if (hasInitializedExercises.current) {
      return;
    }

    const initialExercises = (initialWorkout?.exercises || []).map((exercise) => {
      const libraryExercise =
        exercise.exerciseId
          ? exerciseLibrary.find((item) => item.id === exercise.exerciseId)
          : findExerciseByName(exerciseLibrary, exercise.name);

      return {
        ...exercise,
        notes: exercise.notes ?? '',
        libraryExercise,
      };
    });

    if (initialExercises.length > 0 || !initialWorkout) {
      setSelectedExercises(initialExercises);
      hasInitializedExercises.current = true;
    }
  }, [exerciseLibrary, initialWorkout]);

  useEffect(() => {
    if (exerciseLibrary.length === 0) {
      return;
    }

    setSelectedExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.libraryExercise) {
          return exercise;
        }

        const libraryExercise =
          exercise.exerciseId
            ? exerciseLibrary.find((item) => item.id === exercise.exerciseId)
            : findExerciseByName(exerciseLibrary, exercise.name);

        return {
          ...exercise,
          libraryExercise,
        };
      })
    );
  }, [exerciseLibrary]);

  useEffect(() => {
    if (hasManualCalories) {
      return;
    }

    setCalories(estimateCalories(duration, selectedExercises.length));
  }, [duration, hasManualCalories, selectedExercises.length]);

  const filteredExercises = exerciseLibrary.filter((exercise) => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEquipment = !equipmentFilter || exercise.equipment === equipmentFilter;
    return matchesSearch && matchesEquipment;
  });

  const equipmentOptions = Array.from(new Set(exerciseLibrary.map((exercise) => exercise.equipment))).filter(Boolean);
  const canProceedToExercises = title.trim().length > 0;
  const canProceedToConfigure = selectedExercises.length > 0;
  const canSave = title.trim().length > 0 && selectedExercises.length > 0;

  const isExerciseSelected = (exerciseId: string) =>
    selectedExercises.some((exercise) => exercise.exerciseId === exerciseId);

  const handleSelectExercise = (exercise: LibraryExercise) => {
    if (replaceExerciseIndex !== null) {
      setSelectedExercises((prev) =>
        prev.map((item, index) =>
          index === replaceExerciseIndex
            ? {
                ...createSelectedExercise(exercise),
                id: item.id,
              }
            : item
        )
      );
      setReplaceExerciseIndex(null);
      setStep('configure');
      return;
    }

    if (isExerciseSelected(exercise.id)) {
      setSelectedExercises((prev) => prev.filter((item) => item.exerciseId !== exercise.id));
      return;
    }

    setSelectedExercises((prev) => [...prev, createSelectedExercise(exercise)]);
  };

  const updateExerciseMetricMode = (index: number, metricMode: ExerciseMetricMode) => {
    setSelectedExercises((prev) =>
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
      })
    );
  };

  const updateExerciseNumber = (
    index: number,
    field: 'sets' | 'reps' | 'duration' | 'restTime',
    delta: number
  ) => {
    setSelectedExercises((prev) =>
      prev.map((exercise, exerciseIndex) => {
        if (exerciseIndex !== index) {
          return exercise;
        }

        const currentValue = exercise[field] ?? (field === 'duration' ? 45 : field === 'restTime' ? 60 : 1);
        const minimum = field === 'restTime' ? 0 : 1;

        return {
          ...exercise,
          [field]: Math.max(minimum, currentValue + delta),
        };
      })
    );
  };

  const updateExerciseNotes = (index: number, notes: string) => {
    setSelectedExercises((prev) =>
      prev.map((exercise, exerciseIndex) =>
        exerciseIndex === index
          ? {
              ...exercise,
              notes,
            }
          : exercise
      )
    );
  };

  const removeExercise = (index: number) => {
    setSelectedExercises((prev) => prev.filter((_, exerciseIndex) => exerciseIndex !== index));
    if (replaceExerciseIndex === index) {
      setReplaceExerciseIndex(null);
    }
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === selectedExercises.length - 1)) {
      return;
    }

    setSelectedExercises((prev) => {
      const updated = [...prev];
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
      return updated;
    });
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    const parsedTargetFocus = parseCommaSeparatedList(targetFocusInput);
    const parsedTags = parseCommaSeparatedList(tagsInput);
    const targetMuscles = parsedTargetFocus.length > 0 ? parsedTargetFocus : inferTargetMuscles(selectedExercises);

    const workout: Omit<Workout, 'id'> = {
      title: title.trim(),
      type,
      duration,
      difficulty,
      calories,
      targetMuscles,
      exercises: selectedExercises.map((exercise) => ({
        id: exercise.id,
        exerciseId: exercise.exerciseId || null,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.duration ? undefined : exercise.reps,
        duration: exercise.duration,
        restTime: exercise.restTime,
        notes: exercise.notes?.trim() ? exercise.notes.trim() : undefined,
      })),
      isPremium: initialWorkout?.isPremium ?? false,
      description: initialWorkout?.description,
      imageUrl: initialWorkout?.imageUrl,
      tags: parsedTags,
      createdByAi: initialWorkout?.createdByAi ?? false,
      createdBy: initialWorkout?.createdBy,
      isPublic: initialWorkout?.isPublic ?? false,
      source: initialWorkout?.source ?? 'custom',
    };

    setIsSaving(true);
    try {
      await onSave(workout);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="app-screen bg-background page-safe-bottom">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 pb-4 pt-4 safe-area-pt">
          <button
            onClick={step === 'details' ? onBack : () => setStep(step === 'configure' ? 'exercises' : 'details')}
            className="rounded-full p-2 transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {step === 'details' && (mode === 'edit' ? 'Editar rutina' : 'Nueva rutina')}
              {step === 'exercises' && (replaceExerciseIndex !== null ? 'Reemplazar ejercicio' : 'Seleccionar ejercicios')}
              {step === 'configure' && 'Configurar rutina'}
            </h1>
            <p className="text-xs text-muted-foreground">
              Paso {step === 'details' ? '1' : step === 'exercises' ? '2' : '3'} de 3
            </p>
          </div>
        </div>

        <div className="flex gap-1 px-4 pb-3">
          <div className="h-1 flex-1 rounded-full bg-foreground" />
          <div className={cn('h-1 flex-1 rounded-full', step !== 'details' ? 'bg-foreground' : 'bg-secondary')} />
          <div className={cn('h-1 flex-1 rounded-full', step === 'configure' ? 'bg-foreground' : 'bg-secondary')} />
        </div>
      </div>

      {step === 'details' && (
        <div className="animate-fade-in space-y-6 p-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Nombre de la rutina</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej: Full body del viernes"
              className="bg-card"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Tipo de entrenamiento</label>
            <div className="flex flex-wrap gap-2">
              {workoutTypes.map((option) => (
                <Chip
                  key={option.id}
                  variant={type === option.id ? 'selected' : 'outline'}
                  onClick={() => setType(option.id)}
                  size="sm"
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Dificultad</label>
            <div className="flex flex-wrap gap-2">
              {difficultyLevels.map((option) => (
                <Chip
                  key={option.id}
                  variant={difficulty === option.id ? 'selected' : 'outline'}
                  onClick={() => setDifficulty(option.id)}
                  size="sm"
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Duracion estimada</label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDuration(Math.max(5, duration - 5))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-center font-medium text-foreground">
                {duration} min
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDuration(Math.min(240, duration + 5))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-foreground">Calorias</label>
              {!hasManualCalories && (
                <span className="text-xs text-muted-foreground">Estimadas automaticamente</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setHasManualCalories(true);
                  setCalories((current) => Math.max(50, current - 25));
                }}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={50}
                value={calories}
                onChange={(event) => {
                  setHasManualCalories(true);
                  setCalories(Math.max(50, Number(event.target.value) || 50));
                }}
                className="bg-card text-center"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setHasManualCalories(true);
                  setCalories((current) => current + 25);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setHasManualCalories(false)}
              className="mt-2 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              Volver al estimado
            </button>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Enfoque o grupos objetivo</label>
            <Input
              value={targetFocusInput}
              onChange={(event) => setTargetFocusInput(event.target.value)}
              placeholder="Pecho, espalda, gluteos"
              className="bg-card"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Tags</label>
            <Input
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="fuerza, gym, upper body"
              className="bg-card"
            />
          </div>

          <Button className="w-full" disabled={!canProceedToExercises} onClick={() => setStep('exercises')}>
            Continuar
          </Button>
        </div>
      )}

      {step === 'exercises' && (
        <div className="animate-fade-in">
          <div className="space-y-4 p-4">
            {replaceExerciseIndex !== null ? (
              <div className="rounded-2xl border border-border bg-secondary/60 p-4">
                <p className="text-sm font-medium text-foreground">
                  Selecciona el nuevo ejercicio para reemplazar "{selectedExercises[replaceExerciseIndex]?.name}".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReplaceExerciseIndex(null);
                    setStep('configure');
                  }}
                  className="mt-2 text-xs font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Cancelar reemplazo
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-secondary/60 p-4">
                <p className="text-sm font-medium text-foreground">
                  {selectedExercises.length} ejercicio{selectedExercises.length === 1 ? '' : 's'} seleccionado{selectedExercises.length === 1 ? '' : 's'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Toca un ejercicio para agregarlo o quitarlo. Luego podras ajustar orden, descansos y notas.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => setStep('configure')}
                  disabled={!canProceedToConfigure}
                >
                  Configurar rutina
                </Button>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar ejercicio"
                className="bg-card pl-10"
              />
            </div>

            <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
              <Chip
                variant={!equipmentFilter ? 'selected' : 'outline'}
                onClick={() => setEquipmentFilter(null)}
                size="sm"
              >
                Todos
              </Chip>
              {equipmentOptions.map((equipment) => (
                <Chip
                  key={equipment}
                  variant={equipmentFilter === equipment ? 'selected' : 'outline'}
                  onClick={() => setEquipmentFilter(equipment)}
                  size="sm"
                >
                  {equipmentLabels[equipment] || equipment}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2 px-4 pb-6">
            {filteredExercises.map((exercise) => {
              const selected = isExerciseSelected(exercise.id);

              return (
                <button
                  key={exercise.id}
                  onClick={() => handleSelectExercise(exercise)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
                    selected && replaceExerciseIndex === null
                      ? 'border-foreground bg-foreground/10'
                      : 'border-border bg-card hover:border-foreground/30'
                  )}
                >
                  <img
                    src={exercise.thumbnailUrl}
                    alt={exercise.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-foreground">{exercise.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {(equipmentLabels[exercise.equipment] || exercise.equipment) || 'Sin equipo'} · {exercise.bodyPart}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all',
                      selected && replaceExerciseIndex === null
                        ? 'border-foreground bg-foreground text-primary-foreground'
                        : 'border-muted-foreground text-muted-foreground'
                    )}
                  >
                    {replaceExerciseIndex !== null ? <RefreshCcw className="h-3.5 w-3.5" /> : selected ? '✓' : '+'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 'configure' && (
        <div className="animate-fade-in space-y-4 p-4">
          <p className="text-sm text-muted-foreground">
            Reordena la secuencia con subir y bajar. Tambien puedes reemplazar, quitar o ajustar cada ejercicio.
          </p>

          {selectedExercises.map((exercise, index) => {
            const metricMode = getExerciseMetricMode(exercise);

            return (
              <div key={exercise.id} className="space-y-4 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => moveExercise(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => moveExercise(index, 'down')}
                      disabled={index === selectedExercises.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Ejercicio {index + 1}
                        </p>
                        <h3 className="font-medium text-foreground">{exercise.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {exercise.libraryExercise
                            ? `${equipmentLabels[exercise.libraryExercise.equipment] || exercise.libraryExercise.equipment} · ${exercise.libraryExercise.bodyPart}`
                            : 'Ejercicio guardado en esta rutina'}
                        </p>
                      </div>

                      <button
                        onClick={() => removeExercise(index)}
                        className="rounded-lg p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                        aria-label={`Eliminar ${exercise.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplaceExerciseIndex(index);
                          setStep('exercises');
                        }}
                      >
                        <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                        Reemplazar
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Formato</label>
                  <div className="flex gap-2">
                    <Chip
                      variant={metricMode === 'reps' ? 'selected' : 'outline'}
                      onClick={() => updateExerciseMetricMode(index, 'reps')}
                      size="sm"
                    >
                      Series y reps
                    </Chip>
                    <Chip
                      variant={metricMode === 'duration' ? 'selected' : 'outline'}
                      onClick={() => updateExerciseMetricMode(index, 'duration')}
                      size="sm"
                    >
                      Tiempo
                    </Chip>
                  </div>
                </div>

                <div className={cn('grid gap-3', metricMode === 'duration' ? 'grid-cols-3' : 'grid-cols-3')}>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Series</label>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateExerciseNumber(index, 'sets', -1)}
                        className="rounded bg-secondary p-1 hover:bg-secondary/80"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="flex-1 text-center font-medium text-foreground">{exercise.sets ?? 1}</span>
                      <button
                        onClick={() => updateExerciseNumber(index, 'sets', 1)}
                        className="rounded bg-secondary p-1 hover:bg-secondary/80"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {metricMode === 'reps' ? (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Reps</label>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateExerciseNumber(index, 'reps', -1)}
                          className="rounded bg-secondary p-1 hover:bg-secondary/80"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="flex-1 text-center font-medium text-foreground">{exercise.reps ?? 1}</span>
                        <button
                          onClick={() => updateExerciseNumber(index, 'reps', 1)}
                          className="rounded bg-secondary p-1 hover:bg-secondary/80"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Duracion</label>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateExerciseNumber(index, 'duration', -5)}
                          className="rounded bg-secondary p-1 hover:bg-secondary/80"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="flex-1 text-center font-medium text-foreground">{exercise.duration ?? 45}s</span>
                        <button
                          onClick={() => updateExerciseNumber(index, 'duration', 5)}
                          className="rounded bg-secondary p-1 hover:bg-secondary/80"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Descanso</label>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateExerciseNumber(index, 'restTime', -15)}
                        className="rounded bg-secondary p-1 hover:bg-secondary/80"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="flex-1 text-center font-medium text-foreground">{exercise.restTime}s</span>
                      <button
                        onClick={() => updateExerciseNumber(index, 'restTime', 15)}
                        className="rounded bg-secondary p-1 hover:bg-secondary/80"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Notas</label>
                  <Textarea
                    value={exercise.notes ?? ''}
                    onChange={(event) => updateExerciseNotes(index, event.target.value)}
                    placeholder="Técnica, tempo, observaciones..."
                    className="min-h-20 bg-background"
                  />
                </div>
              </div>
            );
          })}

          <Button variant="outline" className="w-full" onClick={() => setStep('exercises')}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar otro ejercicio
          </Button>

          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <h3 className="font-medium text-foreground">Resumen</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Ejercicios</div>
              <div className="text-foreground">{selectedExercises.length}</div>
              <div className="text-muted-foreground">Duracion</div>
              <div className="text-foreground">{duration} min</div>
              <div className="text-muted-foreground">Calorias</div>
              <div className="text-foreground">{calories} kcal</div>
            </div>
          </div>

          <Button className="w-full" disabled={!canSave || isSaving} onClick={() => void handleSave()}>
            {isSaving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar rutina'}
          </Button>
        </div>
      )}
    </div>
  );
}
