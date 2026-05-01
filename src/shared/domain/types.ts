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

export type WorkoutExercise = {
  id: string;
  exerciseId?: string | null;
  name: string;
  sets?: number;
  reps?: number;
  duration?: number;
  restTime: number;
  notes?: string;
};

export type Workout = {
  id: string;
  title: string;
  type: WorkoutType;
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
  status: 'idle' | 'in_progress' | 'completed' | 'canceled';
  startedAt: string | null;
  endedAt: string | null;
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
