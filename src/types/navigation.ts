import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { LibraryExercise, Workout } from '@app/shared';
import type {
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
  // v2: 8 questions + ELLIE welcome in one screen. The routes below belong
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

// Entrenos tab (WORKOUTS_01 / 02 / 03). Also set by the dev screen cycler.
export type WorkoutsTabParams = {
  segment?: 'routines' | 'exercises';
  favoritesOnly?: boolean;
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
};

export type RegisterPrRouteParams = {
  exerciseId?: LibraryExercise['id'];
  exerciseName?: string;
  showExercisePicker?: boolean;
};

export type NutritionPlanRouteParams = {
  openLog?: boolean;
};

export type MainTabParamList = {
  Home: undefined;
  Workouts: WorkoutsTabParams | undefined;
  Ellie: undefined;
  Progress: undefined;
  Community: undefined;
};

// Shared screens above the tabs (handoff §6: detail, flows and immersive
// screens hide the tab bar).
export type AppStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Achievements: undefined;
  Notifications: undefined;
  Core33: undefined;
  WorkoutDetail: WorkoutDetailRouteParams;
  WorkoutSession: WorkoutSessionRouteParams;
  ExerciseDetail: ExerciseDetailRouteParams;
  ExerciseList: ExerciseListRouteParams | undefined;
  CreateRoutine: RoutineBuilderRouteParams | undefined;
  EditRoutine: EditRoutineRouteParams;
  AddExerciseToRoutine: AddExerciseToRoutineRouteParams;
  QuizLanding: undefined;
  QuizQuestion: QuizQuestionRouteParams;
  QuizResult: QuizResultRouteParams;
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
