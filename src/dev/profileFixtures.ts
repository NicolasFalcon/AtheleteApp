import type { ProfileRecord } from '@app/types/auth';
import { progressFixture, FIXTURE_EXERCISE_NAMES } from '@app/dev/progressFixtures';

// Development only: a complete profile and a new one
// (athelete://dev/profile?screen=…). Nothing is read or written.
export const FIXTURE_PROFILE: ProfileRecord = {
  id: 'fx',
  name: 'Nicolas',
  email: 'nicolas@ejemplo.com',
  onboardingCompleted: true,
  avatarKey: null,
  profilePhotoUrl: null,
  goal: 'gain_muscle',
  birthDate: '1989-08-30',
  gender: null,
  weight: 76,
  height: 170,
  trainingDaysPerWeek: 6,
  dailyCalorieGoal: null,
  dailyProteinGoal: null,
  dailyCarbsGoal: null,
  dailyFatGoal: null,
  dailyWaterGoal: 14,
  trainingEnvironment: null,
  availableEquipment: ['Mancuernas'],
  trainingLevel: 'intermedio',
  preferredSessionMinutes: 45,
  core33IntroSeenAt: null,
  core33CompletedAt: null,
  core33InviteDismissedAt: null,
  createdAt: '2026-01-12T10:00:00.000Z',
};

// Signed up but never finished the onboarding: nothing to show yet.
export const FIXTURE_NEW_PROFILE: ProfileRecord = {
  ...FIXTURE_PROFILE,
  name: 'Nicolas',
  onboardingCompleted: false,
  goal: null,
  birthDate: null,
  weight: null,
  height: null,
  trainingDaysPerWeek: null,
  trainingLevel: null,
  preferredSessionMinutes: null,
  createdAt: null,
};

export function profileDevData(now: Date) {
  const base = progressFixture(now);
  return {
    ...base,
    sessionsCount: 23,
    points: 4860,
    streak: 6,
    firstSession: { at: `${now.getFullYear()}-01-12T10:00:00`, title: 'Movilidad esencial' },
    exerciseNames: FIXTURE_EXERCISE_NAMES,
  };
}
