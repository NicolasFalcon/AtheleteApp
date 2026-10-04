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

export type WorkoutExercise = {
  id: string;
  exerciseId?: string | null;
  name: string;
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
};

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
