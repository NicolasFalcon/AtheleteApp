import type { NavigatorScreenParams } from '@react-navigation/native';
import type {
  LibraryExercise,
  Workout,
} from '@app/shared';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
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

export type HomeStackParamList = {
  HomeRoot: undefined;
  WorkoutDetail: WorkoutDetailRouteParams;
  WorkoutSession: WorkoutSessionRouteParams;
  ExerciseDetail: ExerciseDetailRouteParams;
  QuizLanding: undefined;
  PersonalRecords: undefined;
  NutritionPlan: undefined;
};

export type WorkoutsStackParamList = {
  WorkoutsRoot: undefined;
  CreateRoutine: undefined;
  WorkoutDetail: WorkoutDetailRouteParams;
  WorkoutSession: WorkoutSessionRouteParams;
  ExerciseDetail: ExerciseDetailRouteParams;
};

export type EllieStackParamList = {
  EllieRoot: undefined;
  NutritionPlan: undefined;
};

export type ProgressStackParamList = {
  ProgressRoot: undefined;
  ProgressPersonalRecords: undefined;
  ProgressChallenge: undefined;
  NutritionPlan: undefined;
};

export type ProfileStackParamList = {
  ProfileRoot: undefined;
  EditProfile: undefined;
  Achievements: undefined;
  NutritionPlan: undefined;
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
