import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { Core33ChallengeId } from '@app/features/core33/core33Catalog';
import type { DevSessionState } from '@app/features/session/useSessionRunner';
import type { LibraryExercise, Workout, WorkoutType } from '@app/shared';
import type {
  QuizChallengeRouteParams,
  QuizLandingRouteParams,
  QuizQuestionRouteParams,
  QuizResultRouteParams,
} from '@app/types/quiz';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

export type OnboardingStackParamList = {
  // v2: 9 questions + ELLIE welcome in one screen. The routes below belong
  // to the v1 onboarding, no longer registered (pending cleanup).
  Flow: undefined;
  Welcome: undefined;
  Avatar: undefined;
  BirthDate: undefined;
  Gender: undefined;
  Weight: undefined;
  Height: undefined;
  TrainingFrequency: undefined;
  GoalSelection: undefined;
  Complete: undefined;
};

export type WorkoutDetailRouteParams = {
  workoutId: Workout['id'];
};

export type WorkoutSessionRouteParams = {
  workoutId: Workout['id'];
  // A specific session (e.g. one saved for later on another day).
  sessionId?: string;
  // Development only (__DEV__): open in a state without writing anything.
  devState?: DevSessionState;
};

// Resumen de cierre (SESSION_07).
export type WorkoutSummaryRouteParams = {
  sessionId: string;
  // Badges unlocked by workout_completed (from the completion response).
  newBadges?: string[];
  // Development only (__DEV__): sample figures, nothing read or written.
  devPreview?: boolean;
};

export type ExerciseDetailRouteParams = {
  exerciseId: LibraryExercise['id'];
  // Opens the MoveKit area in full screen (EXERCISE_02).
  fullscreen?: boolean;
};

// Entrenos · lista filtrada (WORKOUTS_04): a zone, an equipment or all.
export type ExerciseListRouteParams = {
  zone?: string;
  equipment?: string;
  openFilters?: boolean;
  focusSearch?: boolean;
};

// Entrenos · lista de rutinas (D-46): a card (type) or a collection.
export type RoutineListRouteParams = {
  type?: WorkoutType;
  collection?: 'favorites' | 'mine' | 'all';
  focusSearch?: boolean;
  // Development only (__DEV__): shows the empty state (STATE_06).
  devEmpty?: boolean;
};

// Entrenos tab (WORKOUTS_01 / 03). Also set by the dev screen cycler.
export type WorkoutsTabParams = {
  segment?: 'routines' | 'exercises';
};

export type RoutineBuilderRouteParams = {
  workoutId?: Workout['id'];
  initialExerciseId?: LibraryExercise['id'];
  initialExerciseName?: string;
  // Development only (__DEV__): open on a step with sample answers so each
  // step can be reviewed. Nothing is saved unless "Guardar" is pressed.
  devStep?: 0 | 1 | 2;
};

export type EditRoutineRouteParams = {
  workoutId: Workout['id'];
};

export type AddExerciseToRoutineRouteParams = {
  exerciseId: LibraryExercise['id'];
  exerciseName: string;
};

export type PersonalRecordsRouteParams = {
  exerciseId?: LibraryExercise['id'];
  exerciseName?: string;
  // Development only (__DEV__): sample / empty data and the open sheet.
  devState?: 'data' | 'empty' | 'loading' | 'error';
  devSheet?: boolean;
  devCelebration?: boolean;
};

export type RegisterPrRouteParams = {
  exerciseId?: LibraryExercise['id'];
  exerciseName?: string;
  showExercisePicker?: boolean;
};

// Perfil, Editar perfil y Ajustes. Development only: sample data / forced states.
export type ProfileRouteParams = {
  devState?: 'data' | 'new' | 'loading' | 'error';
};
export type ProfileFormRouteParams = {
  devState?: 'data' | 'saving' | 'saved' | 'error' | 'invalid' | 'loading' | 'new';
};

// Core 33 (day screen). Development only: sample states, nothing is read or
// written.
export type Core33RouteParams = {
  devState?:
    | 'none'
    | 'day1'
    | 'day17'
    | 'missed'
    | 'day33'
    | 'completed'
    | 'celebration'
    | 'loading'
    | 'error';
};

// Achievements (Logros). Development only: sample data and the open sheet.
export type AchievementsRouteParams = {
  devState?: 'data' | 'loading' | 'error';
  devSheet?: boolean | 'locked';
};

export type NutritionPlanRouteParams = {
  openLog?: boolean;
  // Development only: sample data / forced states (nothing is read or written).
  devState?: 'plan' | 'goalMet' | 'noPlan' | 'empty' | 'loading' | 'error';
  devSheet?: 'log' | 'logSaving' | 'logError';
};

// Progreso tab. Also set by the dev screen cycler (__DEV__).
export type ProgressTabParams = {
  segment?: 'summary' | 'challenges';
  period?: 'week' | 'month';
  // Development only: force a state; 'data' uses sample data (no reads).
  devState?: 'data' | 'empty' | 'loading' | 'error';
  // Development only: scroll offset (to review the lower sections).
  devScroll?: number;
};

// ELLIE tab (portada). Development only: a forced state.
export type EllieTabParams = {
  devState?: 'empty' | 'data' | 'loading' | 'error';
};

// ELLIE conversation (its own screen, no tab bar). `prompt` is sent once on
// arrival, like the prototype's askEllie(prompt).
export type EllieChatRouteParams = {
  prompt?: string;
  mode?: 'generate_workout' | 'generate_nutrition';
  // Open with the composer focused (no prompt).
  focusInput?: boolean;
  // Development only (__DEV__): fixture conversation, no network, no writes.
  devState?:
    | 'first'
    | 'chat'
    | 'thinking'
    | 'plan'
    | 'planActivating'
    | 'planError'
    | 'planActive'
    | 'routine'
    | 'offline'
    | 'server'
    | 'limit'
    | 'loading'
    | 'historyError';
};

export type MainTabParamList = {
  Home: undefined;
  Workouts: WorkoutsTabParams | undefined;
  Ellie: EllieTabParams | undefined;
  Progress: ProgressTabParams | undefined;
  Community: undefined;
};

// Shared screens above the tabs (handoff §6: detail, flows and immersive
// screens hide the tab bar).
export type AppStackParamList = {
  Profile: ProfileRouteParams | undefined;
  EditProfile: ProfileFormRouteParams | undefined;
  Settings: ProfileFormRouteParams | undefined;
  HealthSettings: { devConnected?: boolean } | undefined;
  Achievements: AchievementsRouteParams | undefined;
  Notifications: undefined;
  Core33: Core33RouteParams | undefined;
  Core33Intro: { devStep?: 0 | 1 | 2 } | undefined;
  Core33Explore: undefined;
  Core33Detail: { challengeId: Core33ChallengeId };
  Core33Ready: {
    challengeId: Core33ChallengeId;
    devStarting?: boolean;
    devAlreadyActive?: boolean;
  };
  WorkoutDetail: WorkoutDetailRouteParams;
  WorkoutSession: WorkoutSessionRouteParams;
  WorkoutSummary: WorkoutSummaryRouteParams;
  ExerciseDetail: ExerciseDetailRouteParams;
  ExerciseList: ExerciseListRouteParams | undefined;
  RoutineList: RoutineListRouteParams | undefined;
  CreateRoutine: RoutineBuilderRouteParams | undefined;
  EditRoutine: EditRoutineRouteParams;
  AddExerciseToRoutine: AddExerciseToRoutineRouteParams;
  QuizLanding: QuizLandingRouteParams;
  QuizChallenge: QuizChallengeRouteParams;
  QuizQuestion: QuizQuestionRouteParams;
  QuizResult: QuizResultRouteParams;
  EllieChat: EllieChatRouteParams | undefined;
  PersonalRecords: PersonalRecordsRouteParams | undefined;
  RegisterPr: RegisterPrRouteParams | undefined;
  NutritionPlan: NutritionPlanRouteParams | undefined;
  BodyScience: undefined;
  BodyScienceArticle: { articleId: string };
};

export type RootStackParamList = {
  AuthFlow: NavigatorScreenParams<AuthStackParamList>;
  OnboardingFlow: NavigatorScreenParams<OnboardingStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
} & AppStackParamList;

export type AppRouteName = keyof AppStackParamList;

// Props of a shared screen (root stack).
export type AppScreenProps<RouteName extends AppRouteName> =
  NativeStackScreenProps<RootStackParamList, RouteName>;

// Props of a tab root: can switch tabs and push shared screens, typed.
export type TabScreenProps<RouteName extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, RouteName>,
    NativeStackScreenProps<RootStackParamList>
  >;

// Navigation object reachable from any screen of the app (hooks, headers).
export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

// Every route name a back fallback can target.
export type AnyRouteName =
  | keyof RootStackParamList
  | keyof AuthStackParamList
  | keyof OnboardingStackParamList;
