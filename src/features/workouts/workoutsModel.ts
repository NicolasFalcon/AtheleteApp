import {
  ROUTINE_CATEGORY_VALUES,
  type LibraryExercise,
  type RoutineCategory,
  type Workout,
  type WorkoutExercise,
  type WorkoutType,
} from '@app/shared';
import {
  formatSetsReps,
  recommendationFor,
} from '@app/shared/domain/setsReps';
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

// Routine groups (Por tipo): workout_templates.routine_category, computed by
// the server. The app never maps the free-text `type` for grouping.
export type { RoutineCategory };

export const ROUTINE_CATEGORIES: readonly RoutineCategory[] =
  ROUTINE_CATEGORY_VALUES;

export const CATEGORY_LABELS: Record<RoutineCategory, string> = {
  fuerza: 'Fuerza',
  cuerpo_completo: 'Full body',
  tren_superior: 'Tren superior',
  tren_inferior: 'Tren inferior',
  core: 'Core',
  movilidad: 'Movilidad',
  acondicionamiento: 'Acondicionamiento',
  hiit: 'HIIT',
  cardio: 'Cardio',
};

export function parseCategory(value?: string | null): RoutineCategory | null {
  return (ROUTINE_CATEGORIES as readonly string[]).includes(value ?? '')
    ? (value as RoutineCategory)
    : null;
}

// Label of a routine for eyebrows and heroes: its category; without one, the
// raw type text capitalised ("full_body" → "Full body"), or "Rutina".
export function routineTypeLabel(
  workout?: Pick<Workout, 'routineCategory' | 'type'> | null,
): string {
  if (!workout) {
    return 'Rutina';
  }
  if (workout.routineCategory) {
    return CATEGORY_LABELS[workout.routineCategory];
  }
  return capitalize((workout.type || 'Rutina').replace(/_/g, ' '));
}

export function levelLabel(level?: string | null): string {
  return (level && LEVEL_LABELS[level]) || 'Todos los niveles';
}

// 1–3 bars of the Exercise Row level indicator.
export function levelBars(level?: string | null): number {
  return level === 'advanced' ? 3 : level === 'intermediate' ? 2 : 1;
}

// ── Rutinas ────────────────────────────────────────────────────────────────
// The root explores (types + collections); the list lives in RoutineList.
export type RoutineCollection = 'favorites' | 'mine' | 'all';
export type RoutineScope =
  | { category: RoutineCategory; collection?: undefined }
  | { collection: RoutineCollection; category?: undefined };

// "Por tipo" cards: every category (ROUTINE_CATEGORIES), then the collections.
export const COLLECTION_TILES: RoutineCollection[] = ['favorites', 'mine', 'all'];

export const COLLECTION_LABELS: Record<RoutineCollection, string> = {
  favorites: 'Favoritas',
  mine: 'Tus rutinas',
  all: 'Todas las rutinas',
};

// Created by the user, including the ones ELLIE generated for them.
export function isMyRoutine(workout: Workout, userId?: string | null): boolean {
  return (
    Boolean(userId) &&
    workout.createdBy === userId &&
    workout.sourceType !== 'featured_editorial'
  );
}

type RoutineContext = { favoriteIds: string[]; userId?: string | null };

function inScope(
  workout: Workout,
  scope: RoutineScope,
  favorites: Set<string>,
  userId?: string | null,
): boolean {
  if (scope.category) {
    return workout.routineCategory === scope.category;
  }
  if (scope.collection === 'favorites') {
    return favorites.has(workout.id);
  }
  if (scope.collection === 'mine') {
    return isMyRoutine(workout, userId);
  }
  return true;
}

export function filterRoutines(
  workouts: Workout[],
  params: RoutineContext & { scope: RoutineScope; query: string },
): Workout[] {
  const query = params.query.trim().toLowerCase();
  const favorites = new Set(params.favoriteIds);

  return workouts.filter(
    workout =>
      inScope(workout, params.scope, favorites, params.userId) &&
      (!query || workout.title.toLowerCase().includes(query)),
  );
}

// Routines per category; those without one are not counted here (they only
// show in "Todas").
export function countByCategory(
  workouts: Workout[],
): Record<RoutineCategory, number> {
  const counts = Object.fromEntries(
    ROUTINE_CATEGORIES.map(category => [category, 0]),
  ) as Record<RoutineCategory, number>;
  workouts.forEach(workout => {
    if (workout.routineCategory) {
      counts[workout.routineCategory] += 1;
    }
  });
  return counts;
}

export function countByCollection(
  workouts: Workout[],
  context: RoutineContext,
): Record<RoutineCollection, number> {
  const favorites = new Set(context.favoriteIds);
  return {
    favorites: workouts.filter(workout => favorites.has(workout.id)).length,
    mine: workouts.filter(workout => isMyRoutine(workout, context.userId))
      .length,
    all: workouts.length,
  };
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function routineScopeTitle(scope: RoutineScope): string {
  return scope.category
    ? CATEGORY_LABELS[scope.category]
    : COLLECTION_LABELS[scope.collection];
}

export function routineEmptyText(scope: RoutineScope): string {
  if (scope.collection === 'favorites') {
    return 'Toca el corazón en cualquier rutina y la tendrás siempre aquí.';
  }
  if (scope.collection === 'mine') {
    return 'Crea una rutina con “+” o pídesela a ELLIE.';
  }
  return scope.category
    ? `Sin rutinas de ${CATEGORY_LABELS[scope.category].toLowerCase()} todavía.`
    : 'Todavía no hay rutinas.';
}

// Route params → scope (category wins; default: all).
export function routineScopeFrom(params?: {
  category?: string;
  collection?: RoutineCollection;
}): RoutineScope {
  const category = parseCategory(params?.category);
  return category
    ? { category }
    : { collection: params?.collection ?? 'all' };
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

  const inGroup = (workout: Workout, groups: RoutineCategory[]) =>
    workout.routineCategory ? groups.includes(workout.routineCategory) : false;

  const score = (workout: Workout) => {
    if (goal === 'lose_weight') {
      return inGroup(workout, ['cardio', 'hiit', 'acondicionamiento']) ? 2 : 0;
    }
    if (goal === 'gain_muscle') {
      return inGroup(workout, [
        'fuerza',
        'cuerpo_completo',
        'tren_superior',
        'tren_inferior',
      ])
        ? 2
        : 0;
    }
    if (goal === 'performance') {
      return inGroup(workout, ['hiit', 'cardio', 'acondicionamiento']) ? 2 : 0;
    }
    if (goal === 'improve_health') {
      return inGroup(workout, ['movilidad', 'cuerpo_completo', 'core'])
        ? 2
        : 0;
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
// `recommended` is the library exercise's recommended_sets_reps: used only
// when the routine row carries neither reps nor time (then "Libre").
export function schemeLabel(
  exercise: WorkoutExercise,
  recommended?: unknown,
): string {
  if (exercise.duration) {
    return exercise.sets
      ? `${exercise.sets} × ${exercise.duration} s`
      : `${exercise.duration} s`;
  }
  if (exercise.sets && exercise.reps) {
    return `${exercise.sets} × ${exercise.reps}`;
  }
  if (recommended !== undefined && recommended !== null) {
    const scheme = recommendationFor(recommended, 'hypertrophy');
    if (scheme.parsed) {
      return formatSetsReps(scheme);
    }
  }
  return 'Libre';
}

// "3 × 10 · 45 s descanso"
export function pathMeta(
  exercise: WorkoutExercise,
  recommended?: unknown,
): string {
  const rest = exercise.restTime > 0 ? `${exercise.restTime} s descanso` : '';
  return [schemeLabel(exercise, recommended), rest].filter(Boolean).join(' · ');
}

// "3 × 10 · 60 s" (review / tray chip)
export function schemeChip(
  exercise: WorkoutExercise,
  recommended?: unknown,
): string {
  return [
    schemeLabel(exercise, recommended),
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
