export type WorkoutType =
  | 'strength'
  | 'cardio'
  | 'fullbody'
  | 'mobility'
  | 'hiit';

export type WorkoutDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type WorkoutSourceType =
  | 'library'
  | 'ellie'
  | 'user'
  | 'featured_editorial';

export type WorkoutCollectionType =
  | 'standard_library'
  | 'featured_styles'
  | 'user_created'
  | 'ellie_generated';

// workout_templates.routine_category: computed by the server, the app only
// reads it (never writes it). null → the routine only shows in "Todas".
export const ROUTINE_CATEGORY_VALUES = [
  'fuerza',
  'cuerpo_completo',
  'tren_superior',
  'tren_inferior',
  'core',
  'movilidad',
  'acondicionamiento',
  'hiit',
  'cardio',
] as const;
export type RoutineCategory = (typeof ROUTINE_CATEGORY_VALUES)[number];

// template_exercises.block (docs/backend/ROUTINES_SHAPES.md): read in this
// order, warmup → main → cooldown; main by default.
export type RoutineBlock = 'warmup' | 'main' | 'cooldown';

// Computed by the backend from workout_templates.source.
export type RoutineOrigin = 'official' | 'editorial' | 'ellie' | 'user';

export type WorkoutExercise = {
  id: string;
  exerciseId?: string | null;
  name: string;
  block?: RoutineBlock;
  // Base 1, as get_routine returns it.
  position?: number;
  // movekit/thumbs/<slug>.webp (signed through exercise-media-url).
  thumbKey?: string | null;
  trackingMetrics?: string[];
  isUnilateral?: boolean;
  sets?: number;
  reps?: number;
  duration?: number;
  restTime: number;
  notes?: string;
  // template_exercises.planned_weight_kg: starting kg of a set when the user
  // has no history for the exercise (no editing UI yet).
  plannedWeightKg?: number;
};

export type Workout = {
  id: string;
  title: string;
  type: WorkoutType;
  // Server-computed group of the routine (see ROUTINE_CATEGORY_VALUES).
  routineCategory?: RoutineCategory | null;
  duration: number;
  difficulty: WorkoutDifficulty;
  calories: number;
  targetMuscles: string[];
  exercises: WorkoutExercise[];
  isPremium: boolean;
  description?: string;
  imageUrl?: string;
  tags?: string[];
  createdBy?: string | null;
  createdByAi?: boolean;
  isPublic?: boolean;
  source?: string;
  sourceType?: WorkoutSourceType;
  collectionType?: WorkoutCollectionType;
  collectionTitle?: string;
  collectionBadge?: string;
  inspirationStyle?: string;
  isFeatured?: boolean;
  // From the routine RPCs (get_routine / list_routines).
  origin?: RoutineOrigin;
  isMine?: boolean;
  canEdit?: boolean;
  archived?: boolean;
  thumbKey?: string | null;
  // list_routines has the count, not the exercises.
  exerciseCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkoutSession = {
  id: string;
  workoutId: string;
  workoutTitle: string;
  userId: string;
  date: string;
  completed: boolean;
  duration: number;
  caloriesBurned: number;
  // `saved` = "Guardar para después" (backend status; written from the v2
  // session flow).
  status: 'idle' | 'in_progress' | 'completed' | 'canceled' | 'saved';
  startedAt: string | null;
  endedAt: string | null;
  // Pause bookkeeping (v2 session): the active time excludes pauses.
  pausedAt?: string | null;
  pausedTotalSec?: number;
  // workout_sessions.volume_kg: computed by the server on completion; null
  // when the session has no weighted sets (never 0).
  volumeKg?: number | null;
  completedExercises: string[];
  totalExercises: number;
  createdAt?: string;
  // 'route' = a Ruta activity counted as a workout (no routine behind it).
  source?: string | null;
  routeActivityId?: string | null;
};

// Sessions created by saving a Ruta have no routine: lists show them as Ruta.
export function isRouteSession(session: { source?: string | null }): boolean {
  return session.source === 'route';
}

// Title to show: a Ruta session never reads as an empty routine.
export function sessionDisplayTitle(session: {
  source?: string | null;
  workoutTitle: string;
}): string {
  if (isRouteSession(session)) {
    return session.workoutTitle.trim() || 'Ruta';
  }
  return session.workoutTitle;
}

export type HabitCategory = 'training' | 'health' | 'mind';

export type Habit = {
  id: string;
  challengeId: string;
  category: HabitCategory;
  name: string;
};

export type HabitChallenge = {
  id: string;
  userId: string;
  status: 'active' | 'completed' | 'abandoned';
  startDate: string;
  habits: Habit[];
};

export type NutritionPlan = {
  id: string;
  userId: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs?: number;
  targetFats?: number;
  notes?: string;
};

export type DailyNutritionLog = {
  id: string;
  userId: string;
  date: string;
  calories: number;
  protein: number;
  carbs?: number;
  fats?: number;
  adherence?: number;
};
