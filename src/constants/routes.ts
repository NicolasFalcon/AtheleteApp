export const ROOT_ROUTES = {
  AuthFlow: 'AuthFlow',
  OnboardingFlow: 'OnboardingFlow',
  MainTabs: 'MainTabs',
} as const;

export const AUTH_ROUTES = {
  Login: 'Login',
  Register: 'Register',
  ForgotPassword: 'ForgotPassword',
} as const;

export const ONBOARDING_ROUTES = {
  Welcome: 'Welcome',
  GoalSelection: 'GoalSelection',
  BodyData: 'BodyData',
  TrainingFrequency: 'TrainingFrequency',
} as const;

export const TAB_ROUTES = {
  Home: 'Home',
  Workouts: 'Workouts',
  Ellie: 'Ellie',
  Progress: 'Progress',
  Profile: 'Profile',
} as const;

export const HOME_ROUTES = {
  Home: 'HomeRoot',
  WorkoutDetail: 'WorkoutDetail',
  WorkoutSession: 'WorkoutSession',
  ExerciseDetail: 'ExerciseDetail',
  QuizLanding: 'QuizLanding',
  PersonalRecords: 'PersonalRecords',
  NutritionPlan: 'NutritionPlan',
} as const;

export const WORKOUTS_ROUTES = {
  Workouts: 'WorkoutsRoot',
  CreateRoutine: 'CreateRoutine',
  WorkoutDetail: 'WorkoutDetail',
  WorkoutSession: 'WorkoutSession',
  ExerciseDetail: 'ExerciseDetail',
} as const;

export const ELLIE_ROUTES = {
  Ellie: 'EllieRoot',
  NutritionPlan: 'NutritionPlan',
} as const;

export const PROGRESS_ROUTES = {
  Progress: 'ProgressRoot',
  PersonalRecords: 'ProgressPersonalRecords',
  Challenge: 'ProgressChallenge',
  NutritionPlan: 'NutritionPlan',
} as const;

export const PROFILE_ROUTES = {
  Profile: 'ProfileRoot',
  EditProfile: 'EditProfile',
  Achievements: 'Achievements',
  NutritionPlan: 'NutritionPlan',
} as const;
