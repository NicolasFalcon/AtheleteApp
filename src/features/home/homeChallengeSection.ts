import { ALL_BADGES } from '@app/shared';
import {
  daysLeftLabel,
  metricInfo,
  officialLeftLine,
  progressPct,
} from '@app/features/social/challengeModel';
import type {
  ChallengeBoard,
  MyChallenges,
} from '@app/features/social/challengeTypes';
import type { SocialProfileRow } from '@app/features/social/socialTypes';

// Inicio · full-width challenge section (v2.12 §22.3). One official
// challenge, two states. Data comes from `get_my_challenges`; nothing here
// reads or writes the backend.
export type HomeChallengeCardState = 'joined' | 'invite';

export type HomeChallengeReward = {
  points: number | null;
  badgeId: string | null;
  badgeName: string | null;
};

// A friend of mine in the same challenge ("Carlos acaba de llegar a 81").
// `profile` null = the placeholder photo of the dev sample.
export type HomeChallengeFriend = {
  name: string;
  progress: number;
  profile: SocialProfileRow | null;
};

export type HomeChallengeCard = {
  state: HomeChallengeCardState;
  id: string;
  title: string;
  // The title without the goal it already starts with ("100 dominadas" →
  // "dominadas"), because the big figure shows the number.
  label: string;
  unit: string;
  goal: number;
  progress: number;
  pct: number;
  daysLabel: string;
  // Joined: "Te faltan 26 para completar el reto." Invite: nothing here
  // (the athletes line is built from `participants`).
  line: string;
  participants: number | null;
  // Joined only: the friend who is furthest along, if any has progress.
  friend: HomeChallengeFriend | null;
  // null when the challenge has neither points nor a badge: the reward line
  // is hidden.
  reward: HomeChallengeReward | null;
};

export function challengeLabel(title: string, goal: number): string {
  const trimmed = title.trim();
  const prefix = String(goal);
  if (trimmed.startsWith(prefix)) {
    const rest = trimmed.slice(prefix.length).trim();
    if (rest.length > 0 && /^[^\d]/.test(rest)) {
      return rest;
    }
  }
  return trimmed;
}

export function badgeName(badgeId: string | null): string | null {
  if (!badgeId) {
    return null;
  }
  return ALL_BADGES.find(badge => badge.id === badgeId)?.title ?? null;
}

export function homeChallengeReward(challenge: {
  points: number | null;
  badge_id: string | null;
}): HomeChallengeReward | null {
  const points = challenge.points && challenge.points > 0 ? challenge.points : null;
  const badgeId = challenge.badge_id ? challenge.badge_id : null;
  if (points === null && badgeId === null) {
    return null;
  }
  return { points, badgeId, badgeName: badgeName(badgeId) };
}

// With a challenge (retoOn): I take part in the featured official challenge
// (its `mine` row is active, i.e. its id would be in `active`) and have not
// finished it. Without one, or already completed (retoOff): the same
// challenge as an invitation. No official challenge → null and the section
// does not appear.
export function homeChallengeCard(
  data: MyChallenges | null,
  now: Date = new Date(),
): HomeChallengeCard | null {
  const official = data?.official;
  if (!official || official.challenge.status !== 'active') {
    return null;
  }
  const { challenge, mine } = official;
  const joined =
    mine !== null && mine.status === 'active' && mine.progress < challenge.goal;
  const progress = joined ? mine.progress : 0;

  return {
    state: joined ? 'joined' : 'invite',
    id: challenge.id,
    title: challenge.title,
    label: challengeLabel(challenge.title, challenge.goal),
    unit: metricInfo(challenge.metric).unit,
    goal: challenge.goal,
    progress,
    pct: progressPct(progress, challenge.goal),
    daysLabel: daysLeftLabel(challenge.ends_at, challenge.duration_days, now),
    line: joined ? officialLeftLine(progress, challenge.goal) : '',
    participants: official.participants_total,
    friend: null,
    reward: homeChallengeReward(challenge),
  };
}

// Joined state: the friend (not me) with the most progress in the board of
// the official challenge (`get_challenge_board`: me and my friends).
export function friendLeader(board: ChallengeBoard | null): HomeChallengeFriend | null {
  const friends = (board?.board ?? []).filter(entry => !entry.isMe && entry.progress > 0);
  if (friends.length === 0) {
    return null;
  }
  const top = friends.reduce((best, entry) => (entry.progress > best.progress ? entry : best));
  const name = top.profile?.name?.trim() || top.profile?.username || 'Un amigo';
  return { name: name.split(/\s+/)[0], progress: top.progress, profile: top.profile };
}

export function withFriend(
  card: HomeChallengeCard,
  friend: HomeChallengeFriend | null,
): HomeChallengeCard {
  return card.state === 'joined' ? { ...card, friend } : card;
}

// ── Development samples (same as the reference) ────────────────────────────
// Used only in `__DEV__` when the database has no official challenge, or when
// forced with athelete://dev/home?scenario=<key>. Never in release builds.
export type HomeChallengeScenario =
  | 'challengeInvite'
  | 'challengeJoined'
  | 'challengeCompleted';

export const HOME_CHALLENGE_SCENARIOS: readonly HomeChallengeScenario[] = [
  'challengeInvite',
  'challengeJoined',
  'challengeCompleted',
];

export function isHomeChallengeScenario(value: string | null): value is HomeChallengeScenario {
  return HOME_CHALLENGE_SCENARIOS.some(item => item === value);
}

export function sampleChallengeCard(scenario: HomeChallengeScenario): HomeChallengeCard {
  const base: HomeChallengeCard = {
    state: 'invite',
    id: 'dev-sample-official',
    title: '100 dominadas',
    label: 'dominadas',
    unit: 'repeticiones',
    goal: 100,
    progress: 0,
    pct: 0,
    daysLabel: '3 días restantes',
    line: '',
    participants: 18420,
    friend: null,
    reward: { points: 150, badgeId: 'sample', badgeName: 'Semana de tracción' },
  };
  if (scenario === 'challengeJoined') {
    return {
      ...base,
      state: 'joined',
      progress: 74,
      pct: 74,
      line: officialLeftLine(74, 100),
      friend: { name: 'Carlos', progress: 81, profile: null },
    };
  }
  // challengeCompleted: finished, so it reads as the invitation again.
  return base;
}
