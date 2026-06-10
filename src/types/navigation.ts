import type { NavigatorScreenParams } from '@react-navigation/native';
import type {
  LibraryExercise,
  Workout,
} from '@app/shared';
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
  Welcome: undefined;
  GoalSelection: undefined;
  BodyData: undefined;
  TrainingFrequency: undefined;
};

export type WorkoutDetailRouteParams = {
  workoutId: Workout['id'];
};

export type WorkoutSessionRouteParams = {
  workoutId: Workout['id'];
};

export type ExerciseDetailRouteParams = {
  exerciseId: LibraryExercise['id'];
};

export type RoutineBuilderRouteParams = {
  workoutId?: Workout['id'];
  initialExerciseId?: LibraryExercise['id'];
  initialExerciseName?: string;
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

export type HomeStackParamList = {
  HomeRoot: undefined;
  Notifications: undefined;
  Challenge: undefined;
  WorkoutDetail: WorkoutDetailRouteParams;
  WorkoutSession: WorkoutSessionRouteParams;
  ExerciseDetail: ExerciseDetailRouteParams;
  CreateRoutine: RoutineBuilderRouteParams | undefined;
  EditRoutine: EditRoutineRouteParams;
  AddExerciseToRoutine: AddExerciseToRoutineRouteParams;
  QuizLanding: undefined;
  QuizQuestion: QuizQuestionRouteParams;
  QuizResult: QuizResultRouteParams;
  PersonalRecords: PersonalRecordsRouteParams | undefined;
  RegisterPr: RegisterPrRouteParams | undefined;
  NutritionPlan: NutritionPlanRouteParams | undefined;
};

export type WorkoutsStackParamList = {
  WorkoutsRoot: undefined;
  CreateRoutine: RoutineBuilderRouteParams | undefined;
  EditRoutine: EditRoutineRouteParams;
  AddExerciseToRoutine: AddExerciseToRoutineRouteParams;
  WorkoutDetail: WorkoutDetailRouteParams;
  WorkoutSession: WorkoutSessionRouteParams;
  ExerciseDetail: ExerciseDetailRouteParams;
  WorkoutPersonalRecords: PersonalRecordsRouteParams | undefined;
  WorkoutRegisterPr: RegisterPrRouteParams | undefined;
};

export type EllieStackParamList = {
  EllieRoot: undefined;
  Challenge: undefined;
  NutritionPlan: NutritionPlanRouteParams | undefined;
};

export type ProgressStackParamList = {
  ProgressRoot: undefined;
  ProgressPersonalRecords: PersonalRecordsRouteParams | undefined;
  ProgressRegisterPr: RegisterPrRouteParams | undefined;
  ProgressChallenge: undefined;
  NutritionPlan: NutritionPlanRouteParams | undefined;
  BodyScience: undefined;
  BodyScienceArticle: {articleId: string};
};

export type ProfileStackParamList = {
  ProfileRoot: undefined;
  Challenge: undefined;
  EditProfile: undefined;
  Achievements: undefined;
  NutritionPlan: NutritionPlanRouteParams | undefined;
};

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Workouts: NavigatorScreenParams<WorkoutsStackParamList>;
  Ellie: NavigatorScreenParams<EllieStackParamList>;
  Progress: NavigatorScreenParams<ProgressStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackParamList = {
  AuthFlow: NavigatorScreenParams<AuthStackParamList>;
  OnboardingFlow: NavigatorScreenParams<OnboardingStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};
