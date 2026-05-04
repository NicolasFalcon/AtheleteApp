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
  Challenge: 'Challenge',
  WorkoutDetail: 'WorkoutDetail',
  WorkoutSession: 'WorkoutSession',
  ExerciseDetail: 'ExerciseDetail',
  CreateRoutine: 'CreateRoutine',
  EditRoutine: 'EditRoutine',
  AddExerciseToRoutine: 'AddExerciseToRoutine',
  QuizLanding: 'QuizLanding',
  QuizQuestion: 'QuizQuestion',
  QuizResult: 'QuizResult',
  PersonalRecords: 'PersonalRecords',
  RegisterPr: 'RegisterPr',
  NutritionPlan: 'NutritionPlan',
} as const;

export const WORKOUTS_ROUTES = {
  Workouts: 'WorkoutsRoot',
  CreateRoutine: 'CreateRoutine',
  EditRoutine: 'EditRoutine',
  AddExerciseToRoutine: 'AddExerciseToRoutine',
  WorkoutDetail: 'WorkoutDetail',
  WorkoutSession: 'WorkoutSession',
  ExerciseDetail: 'ExerciseDetail',
  PersonalRecords: 'WorkoutPersonalRecords',
  RegisterPr: 'WorkoutRegisterPr',
} as const;

export const ELLIE_ROUTES = {
  Ellie: 'EllieRoot',
  Challenge: 'Challenge',
  NutritionPlan: 'NutritionPlan',
} as const;

export const PROGRESS_ROUTES = {
  Progress: 'ProgressRoot',
  PersonalRecords: 'ProgressPersonalRecords',
  RegisterPr: 'ProgressRegisterPr',
  Challenge: 'ProgressChallenge',
  NutritionPlan: 'NutritionPlan',
} as const;

export const PROFILE_ROUTES = {
  Profile: 'ProfileRoot',
  Challenge: 'Challenge',
  EditProfile: 'EditProfile',
  Achievements: 'Achievements',
  NutritionPlan: 'NutritionPlan',
} as const;
