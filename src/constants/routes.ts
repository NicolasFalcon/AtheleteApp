export const ROOT_ROUTES = {
  AuthFlow: 'AuthFlow',
  OnboardingFlow: 'OnboardingFlow',
  MainTabs: 'MainTabs',
} as const;

export const AUTH_ROUTES = {
  Login: 'Login',
  Register: 'Register',
  ForgotPassword: 'ForgotPassword',
  ResetPassword: 'ResetPassword',
} as const;

export const ONBOARDING_ROUTES = {
  Flow: 'Flow',
  Welcome: 'Welcome',
  Avatar: 'Avatar',
  BirthDate: 'BirthDate',
  Gender: 'Gender',
  Weight: 'Weight',
  Height: 'Height',
  TrainingFrequency: 'TrainingFrequency',
  GoalSelection: 'GoalSelection',
  Complete: 'Complete',
} as const;

export const TAB_ROUTES = {
  Home: 'Home',
  Workouts: 'Workouts',
  Ellie: 'Ellie',
  Progress: 'Progress',
  Community: 'Community',
} as const;

// Screens of the shared root stack (above the tabs). One name per screen:
// the tab bar is hidden on all of them (handoff §6).
export const APP_ROUTES = {
  Profile: 'Profile',
  EditProfile: 'EditProfile',
  Settings: 'Settings',
  HealthSettings: 'HealthSettings',
  Achievements: 'Achievements',
  Notifications: 'Notifications',
  Core33: 'Core33',
  WorkoutDetail: 'WorkoutDetail',
  WorkoutSession: 'WorkoutSession',
  WorkoutSummary: 'WorkoutSummary',
  ExerciseDetail: 'ExerciseDetail',
  ExerciseList: 'ExerciseList',
  RoutineList: 'RoutineList',
  EllieChat: 'EllieChat',
  CreateRoutine: 'CreateRoutine',
  EditRoutine: 'EditRoutine',
  AddExerciseToRoutine: 'AddExerciseToRoutine',
  QuizLanding: 'QuizLanding',
  QuizQuestion: 'QuizQuestion',
  QuizResult: 'QuizResult',
  PersonalRecords: 'PersonalRecords',
  RegisterPr: 'RegisterPr',
  NutritionPlan: 'NutritionPlan',
  BodyScience: 'BodyScience',
  BodyScienceArticle: 'BodyScienceArticle',
} as const;
