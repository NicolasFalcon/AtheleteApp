import type { HomeChallengeCard } from '../../src/features/home/homeChallengeSection';
import { officialLeftLine } from '../../src/features/social/challengeModel';

// Sample official-challenge cards (same figures as the design reference), for
// tests only.
export type HomeChallengeScenario =
  | 'challengeInvite'
  | 'challengeJoined'
  | 'challengeCompleted';

export function sampleChallengeCard(scenario: HomeChallengeScenario): HomeChallengeCard {
  const base: HomeChallengeCard = {
    state: 'invite',
    id: 'dev-sample-official',
    title: '100 dominadas',
    label: 'dominadas',
    unit: 'repeticiones',
    goal: 100,
    progress: 0,
    goalText: '100',
    progressText: '0',
    coverUrl: null,
    pct: 0,
    daysLabel: '3 días restantes',
    line: '',
    participants: 18420,
    friend: null,
    people: [],
    reward: { points: 150, badgeId: 'sample', badgeName: 'Semana de tracción' },
  };
  if (scenario === 'challengeJoined') {
    return {
      ...base,
      state: 'joined',
      progress: 74,
      progressText: '74',
      pct: 74,
      line: officialLeftLine(74, 100),
      friend: { name: 'Carlos', progress: 81, profile: null },
    };
  }
  // challengeCompleted: finished, so it reads as the invitation again.
  return base;
}
