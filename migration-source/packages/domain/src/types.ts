export interface User {
  id: string;
  name: string;
  email: string;
  birthDate: string;
  weight: number;
  height: number;
  goal: 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_health';
  trainingDaysPerWeek: number;
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  dailyCarbsGoal: number;
  dailyFatGoal: number;
  dailyWaterGoal: number;
  assignedCoachId?: string;
}

export interface Workout {
  id: string;
  title: string;
  type: 'strength' | 'cardio' | 'fullbody' | 'mobility' | 'hiit';
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  calories: number;
  targetMuscles: string[];
  exercises: Exercise[];
  isPremium: boolean;
  description?: string;
  imageUrl?: string;
  tags?: string[];
  createdBy?: string | null;
  createdByAi?: boolean;
  isPublic?: boolean;
  source?: string;
  sourceType?: 'library' | 'ellie' | 'user' | 'featured_editorial';
  collectionType?: 'standard_library' | 'featured_styles' | 'user_created' | 'ellie_generated';
  collectionTitle?: string;
  collectionBadge?: string;
  inspirationStyle?: string;
  isFeatured?: boolean;
}

export interface Exercise {
  id: string;
  exerciseId?: string | null;
  name: string;
  sets?: number;
  reps?: number;
  duration?: number;
  restTime: number;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  userId: string;
  date: string;
  completed: boolean;
  duration: number;
  caloriesBurned: number;
  status?: 'in_progress' | 'completed' | 'canceled';
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt?: string;
}

export interface TodayWorkoutSession {
  id: string;
  workoutId: string;
  workoutTitle: string;
  status: 'idle' | 'in_progress' | 'completed' | 'canceled';
  startedAt: string | null;
  endedAt: string | null;
  elapsedMinutes: number;
  completedExercises: string[];
  totalExercises: number;
}

export interface HabitChallenge {
  id: string;
  userId: string;
  status: 'active' | 'completed' | 'abandoned';
  startDate: string;
  habits: Habit[];
}

export interface Habit {
  id: string;
  challengeId: string;
  category: 'training' | 'health' | 'mind';
  name: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
}

export interface NutritionEntry {
  id: string;
  userId: string;
  date: string;
  description: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface NutritionPlan {
  id: string;
  userId: string;
  coachId?: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs?: number;
  targetFats?: number;
  notes?: string;
}

export interface DailyNutritionLog {
  id: string;
  userId: string;
  date: string;
  calories: number;
  protein: number;
  carbs?: number;
  fats?: number;
  adherence?: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  type: 'workout' | 'challenge' | 'nutrition';
  title: string;
  description: string;
  date: string;
  metadata?: Record<string, unknown>;
}

export type TabId = 'inicio' | 'progreso' | 'entrenos' | 'ellie' | 'registro' | 'perfil';

export type BadgeId =
  | 'first_workout'
  | 'week_consistency'
  | 'core33_finisher'
  | 'streak_7_days'
  | 'nutrition_started'
  | 'first_custom_workout'
  | 'quiz_master'
  | 'first_quiz'
  | 'hydration_3_days'
  | 'hydration_7_days'
  | 'weekly_hydration_master';

export type Badge = {
  id: BadgeId;
  title: string;
  description: string;
  icon: string;
  earnedAt?: string;
};

export type UserGamificationState = {
  points: number;
  badges: Badge[];
};

export type PointsReason =
  | 'workout_completed'
  | 'workout_canceled'
  | 'core33_day_completed'
  | 'core33_completed'
  | 'nutrition_plan_activated'
  | 'custom_workout_created'
  | 'quiz_completed';

export type BodyScienceCategory = 'Training' | 'Recovery' | 'Nutrition' | 'Mindset';

export interface BodyScienceArticle {
  id: string;
  title: string;
  category: BodyScienceCategory;
  summary: string;
  readTimeMinutes: number;
  content: string;
}

export interface Coach {
  id: string;
  name: string;
  avatar: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  tags: ('Online' | 'Hybrid' | 'In-person')[];
  bio: string;
  whatYouGet: string[];
  sampleWorkoutPlan: CoachWorkoutDay[];
  sampleMealPlan: CoachMealPlan;
}

export interface CoachWorkoutDay {
  day: string;
  workout: string;
  focus: string;
}

export interface CoachMealPlan {
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string;
}

export interface ChatMessage {
  id: string;
  senderId: 'user' | 'coach';
  type: 'text' | 'workout' | 'meal' | 'nutrition_plan';
  content: string;
  timestamp: string;
  workoutData?: {
    name: string;
    duration: number;
  };
  mealData?: {
    name: string;
    macros: string;
  };
  nutritionPlanData?: {
    targetCalories: number;
    targetProtein: number;
    targetCarbs?: number;
    targetFats?: number;
    notes?: string;
  };
  nutritionPlanAccepted?: boolean;
}

export interface CoachPlan {
  workouts: CoachAssignedWorkout[];
  nutrition: CoachNutritionPlan;
  supplements: CoachSupplement[];
}

export interface CoachAssignedWorkout {
  id: string;
  name: string;
  daysPerWeek: number;
  isActive: boolean;
}

export interface CoachNutritionPlan {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface CoachSupplement {
  id: string;
  name: string;
  dose: string;
  timing: string;
}

export interface Specialist {
  id: string;
  name: string;
  avatar: string;
  role: 'Physiotherapist' | 'Kinesiologist' | 'Chiropractor';
  specialties: string[];
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  tags: ('Online' | 'Hybrid' | 'In-person')[];
  location: string;
  bio: string;
  helpsWith: string[];
  sessionFormat: {
    duration: string;
    mode: string;
    description: string;
  };
  areasOfFocus: string[];
}

export interface SpecialistChatMessage {
  id: string;
  senderId: 'user' | 'specialist';
  type: 'text' | 'questions' | 'warmup';
  content: string;
  timestamp: string;
  questionsData?: string[];
  warmupData?: { name: string; movements: string[] };
}
