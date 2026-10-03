import type {
  LibraryExercise,
  Workout,
  WorkoutExercise,
  WorkoutType,
} from '@app/shared';
import type { OnboardingGoal } from '@app/types/auth';

// Entrenos v2 (Workouts.dc.html): pure helpers shared by Rutinas, Ejercicios,
// the filtered list, the filters sheet, the routine detail and the builder.

// ── Labels ─────────────────────────────────────────────────────────────────
export const TYPE_LABELS: Record<WorkoutType, string> = {
  strength: 'Fuerza',
  cardio: 'Cardio',
  fullbody: 'Full body',
  hiit: 'HIIT',
  mobility: 'Movilidad',
};

export const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

export const LEVEL_KEYS = ['beginner', 'intermediate', 'advanced'] as const;
export type LevelKey = (typeof LEVEL_KEYS)[number];

// workout_templates.type is free text in the database (e.g. "full_body",
// "Fuerza"); map it to the app keys.
const TYPE_ALIASES: Record<string, WorkoutType> = {
  strength: 'strength',
  fuerza: 'strength',
  cardio: 'cardio',
  fullbody: 'fullbody',
  full_body: 'fullbody',
  'full body': 'fullbody',
  'full-body': 'fullbody',
  'cuerpo completo': 'fullbody',
  hiit: 'hiit',
  mobility: 'mobility',
  movilidad: 'mobility',
};

export function normalizeWorkoutType(
  value?: string | null,
): WorkoutType | null {
  return (value && TYPE_ALIASES[value.trim().toLowerCase()]) || null;
}

export function typeLabel(value?: string | null): string {
  const key = normalizeWorkoutType(value);
  return key
    ? TYPE_LABELS[key]
    : capitalize((value || 'Rutina').replace(/_/g, ' '));
}

export function levelLabel(level?: string | null): string {
  return (level && LEVEL_LABELS[level]) || 'Todos los niveles';
}

// 1–3 bars of the Exercise Row level indicator.
export function levelBars(level?: string | null): number {
  return level === 'advanced' ? 3 : level === 'intermediate' ? 2 : 1;
}

// ── Rutinas ────────────────────────────────────────────────────────────────
export type RoutineChip = 'favorites' | 'all' | WorkoutType;

export const ROUTINE_CHIPS: { key: RoutineChip; label: string }[] = [
  { key: 'favorites', label: 'Solo favoritos' },
  { key: 'all', label: 'Todos' },
  { key: 'strength', label: 'Fuerza' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'fullbody', label: 'Full body' },
  { key: 'hiit', label: 'HIIT' },
  { key: 'mobility', label: 'Movilidad' },
];

// "Por tipo" tiles in the prototype order.
export const TYPE_TILES: WorkoutType[] = [
  'strength',
  'cardio',
  'hiit',
  'mobility',
];

export function filterRoutines(
  workouts: Workout[],
  params: { chip: RoutineChip; query: string; favoriteIds: string[] },
): Workout[] {
  const query = params.query.trim().toLowerCase();
  const favorites = new Set(params.favoriteIds);

  return workouts.filter(workout => {
    if (params.chip === 'favorites' && !favorites.has(workout.id)) {
      return false;
    }
    if (
      params.chip !== 'favorites' &&
      params.chip !== 'all' &&
      normalizeWorkoutType(workout.type) !== params.chip
    ) {
      return false;
    }
    return !query || workout.title.toLowerCase().includes(query);
  });
}

export function countByType(workouts: Workout[]): Record<WorkoutType, number> {
  const counts: Record<WorkoutType, number> = {
    strength: 0,
    cardio: 0,
    fullbody: 0,
    hiit: 0,
    mobility: 0,
  };
  workouts.forEach(workout => {
    const key = normalizeWorkoutType(workout.type);
    if (key) {
      counts[key] += 1;
    }
  });
  return counts;
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function routineListTitle(chip: RoutineChip): string {
  if (chip === 'all') {
    return 'Todas las rutinas';
  }
  return ROUTINE_CHIPS.find(item => item.key === chip)?.label ?? 'Rutinas';
}

export function routineEmptyText(chip: RoutineChip): string {
  return chip === 'favorites'
    ? 'Aún no tienes favoritas. Toca el corazón en cualquier rutina.'
    : `Sin rutinas de ${routineListTitle(chip).toLowerCase()} todavía.`;
}

// "Principiante · 35 min · 280 kcal"
export function routineMeta(workout: Workout): string {
  return [
    LEVEL_LABELS[workout.difficulty],
    `${workout.duration} min`,
    `${workout.calories} kcal`,
  ]
    .filter(Boolean)
    .join(' · ');
}

// "35 min · 280 kcal · Principiante" (hero of "Tu próxima sesión")
export function routineHeroMeta(workout: Workout): string {
  return [
    `${workout.duration} min`,
    `${workout.calories} kcal`,
    LEVEL_LABELS[workout.difficulty],
  ]
    .filter(Boolean)
    .join(' · ');
}

// Same score Inicio uses ("Para entrenar esta semana"): featured editorial
// routines first, ordered by the user's goal.
export function recommendRoutines(
  workouts: Workout[],
  goal: OnboardingGoal | null | undefined,
  limit = 8,
): Workout[] {
  const featured = workouts.filter(
    workout => workout.sourceType === 'featured_editorial',
  );
  const source = featured.length > 0 ? featured : workouts;

  const score = (workout: Workout) => {
    if (goal === 'lose_weight') {
      return workout.type === 'cardio' || workout.type === 'hiit' ? 2 : 0;
    }
    if (goal === 'gain_muscle') {
      return workout.type === 'strength' || workout.type === 'fullbody' ? 2 : 0;
    }
    if (goal === 'performance') {
      return workout.type === 'hiit' || workout.type === 'cardio' ? 2 : 0;
    }
    if (goal === 'improve_health') {
      return workout.type === 'mobility' || workout.type === 'fullbody' ? 2 : 0;
    }
    return workout.sourceType === 'featured_editorial' ? 2 : 0;
  };

  return [...source].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

// ── Ejercicios ─────────────────────────────────────────────────────────────
export type ZoneKey =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'legs'
  | 'glutes';

// Por zona mosaic (handoff §16): 2 columns, rows of 118, Pecho spans two rows
// and carries the Ember dot. Order and placement of the prototype.
export const ZONES: {
  key: ZoneKey;
  label: string;
  column: 1 | 2;
  span: 1 | 2;
  dot: boolean;
}[] = [
  { key: 'chest', label: 'Pecho', column: 1, span: 2, dot: true },
  { key: 'back', label: 'Espalda', column: 2, span: 1, dot: false },
  { key: 'shoulders', label: 'Hombros', column: 2, span: 1, dot: false },
  { key: 'arms', label: 'Brazos', column: 1, span: 1, dot: false },
  { key: 'core', label: 'Core', column: 2, span: 1, dot: false },
  { key: 'legs', label: 'Piernas', column: 1, span: 1, dot: false },
  { key: 'glutes', label: 'Glúteos', column: 2, span: 1, dot: false },
];

export type EquipmentKey =
  | 'bodyweight'
  | 'dumbbells'
  | 'barbell'
  | 'cable'
  | 'machines';

export const EQUIPMENT: { key: EquipmentKey; label: string }[] = [
  { key: 'bodyweight', label: 'Peso corporal' },
  { key: 'dumbbells', label: 'Mancuernas' },
  { key: 'barbell', label: 'Barra' },
  { key: 'cable', label: 'Cable' },
  { key: 'machines', label: 'Máquina' },
];

export function equipmentLabel(key?: string | null): string {
  return EQUIPMENT.find(item => item.key === key)?.label ?? key ?? '';
}

export function zoneLabel(key?: string | null): string {
  return ZONES.find(item => item.key === key)?.label ?? '';
}

export function countBy<T extends string>(
  exercises: LibraryExercise[],
  field: 'bodyPart' | 'equipment',
  keys: readonly T[],
): Record<T, number> {
  const counts = Object.fromEntries(keys.map(key => [key, 0])) as Record<
    T,
    number
  >;
  exercises.forEach(exercise => {
    const value = exercise[field] as T;
    if (value in counts) {
      counts[value] += 1;
    }
  });
  return counts;
}

export type ExerciseFilters = {
  bodyPart: ZoneKey | null;
  equipment: EquipmentKey[];
  level: LevelKey | null;
  favoritesOnly: boolean;
};

export const NO_EXERCISE_FILTERS: ExerciseFilters = {
  bodyPart: null,
  equipment: [],
  level: null,
  favoritesOnly: false,
};

export function filterExercises(
  exercises: LibraryExercise[],
  filters: ExerciseFilters,
  params: { query: string; favoriteIds: string[] },
): LibraryExercise[] {
  const query = params.query.trim().toLowerCase();
  const favorites = new Set(params.favoriteIds);

  return exercises.filter(exercise => {
    if (filters.bodyPart && exercise.bodyPart !== filters.bodyPart) {
      return false;
    }
    if (
      filters.equipment.length > 0 &&
      !filters.equipment.includes(exercise.equipment as EquipmentKey)
    ) {
      return false;
    }
    if (filters.level && exercise.level !== filters.level) {
      return false;
    }
    if (filters.favoritesOnly && !favorites.has(exercise.id)) {
      return false;
    }
    return !query || exercise.name.toLowerCase().includes(query);
  });
}

// Filters shown as removable chips (the zone is the screen title, not a chip).
export function activeFilterCount(filters: ExerciseFilters): number {
  return (
    filters.equipment.length +
    (filters.level ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0)
  );
}

// Primary muscle line of an Exercise Row ("Pectoral").
export function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export function primaryMuscle(exercise: LibraryExercise): string {
  return capitalize(
    exercise.musclesWorked.primary[0] ||
      zoneLabel(exercise.bodyPart) ||
      'General',
  );
}

// ── Routine path / builder ─────────────────────────────────────────────────
// "3 × 10" · "3 × 45 s" · "Libre"
export function schemeLabel(exercise: WorkoutExercise): string {
  if (exercise.duration) {
    return exercise.sets
      ? `${exercise.sets} × ${exercise.duration} s`
      : `${exercise.duration} s`;
  }
  if (exercise.sets && exercise.reps) {
    return `${exercise.sets} × ${exercise.reps}`;
  }
  return 'Libre';
}

// "3 × 10 · 45 s descanso"
export function pathMeta(exercise: WorkoutExercise): string {
  const rest = exercise.restTime > 0 ? `${exercise.restTime} s descanso` : '';
  return [schemeLabel(exercise), rest].filter(Boolean).join(' · ');
}

// "3 × 10 · 60 s" (review / tray chip)
export function schemeChip(exercise: WorkoutExercise): string {
  return [
    schemeLabel(exercise),
    exercise.restTime > 0 ? `${exercise.restTime} s` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export const BUILDER_TYPES: WorkoutType[] = [
  'strength',
  'cardio',
  'fullbody',
  'hiit',
  'mobility',
];

// Zone chips of the exercise picker (prototype order).
export const PICKER_ZONES: { key: ZoneKey | null; label: string }[] = [
  { key: null, label: 'Todos' },
  { key: 'legs', label: 'Piernas' },
  { key: 'chest', label: 'Pecho' },
  { key: 'back', label: 'Espalda' },
  { key: 'shoulders', label: 'Hombros' },
  { key: 'core', label: 'Core' },
  { key: 'arms', label: 'Brazos' },
];

export const DURATION_RANGE = { min: 10, max: 150, step: 5 } as const;

export function clampDuration(value: number): number {
  return Math.min(DURATION_RANGE.max, Math.max(DURATION_RANGE.min, value));
}
