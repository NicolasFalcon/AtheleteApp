export type AppFlow = 'auth' | 'onboarding' | 'app';

export type OnboardingGoal =
  | 'lose_weight'
  | 'gain_muscle'
  | 'maintain'
  | 'improve_health';

export type OnboardingData = {
  goal: OnboardingGoal;
  birthDate: string;
  weight: number;
  height: number;
  trainingDaysPerWeek: number;
};

export type ProfileRecord = {
  id: string;
  name: string;
  email: string;
  onboardingCompleted: boolean;
  goal: OnboardingGoal | null;
  birthDate: string | null;
  weight: number | null;
  height: number | null;
  trainingDaysPerWeek: number | null;
  dailyCalorieGoal: number | null;
  dailyProteinGoal: number | null;
  dailyCarbsGoal: number | null;
  dailyFatGoal: number | null;
  dailyWaterGoal: number | null;
  trainingEnvironment: string | null;
  availableEquipment: string[];
};
