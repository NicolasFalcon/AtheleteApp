import { ALL_BADGES } from '@app/shared';
import {
  daysLeftLabel,
  metricInfo,
  officialLeftLine,
  progressPct,
} from '@app/features/social/challengeModel';
import type { MyChallenges } from '@app/features/social/challengeTypes';

// Inicio · full-width challenge section (v2.12 §22.3). One official
// challenge, two states. Data comes from `get_my_challenges`; nothing here
// reads or writes the backend.
export type HomeChallengeCardState = 'joined' | 'invite';

export type HomeChallengeReward = {
  points: number | null;
  badgeId: string | null;
  badgeName: string | null;
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

// With a challenge: I take part in an official one (its `mine` row is active
// or completed, i.e. its id would be in `active`). Without: the featured
// official challenge (the first of `official`) as an invitation. No official
// challenge → null and the section does not appear.
export function homeChallengeCard(
  data: MyChallenges | null,
  now: Date = new Date(),
): HomeChallengeCard | null {
  const official = data?.official;
  if (!official || official.challenge.status !== 'active') {
    return null;
  }
  const { challenge, mine } = official;
  const joined = mine !== null && (mine.status === 'active' || mine.status === 'completed');
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
    reward: homeChallengeReward(challenge),
  };
}
