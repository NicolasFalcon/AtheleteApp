import type { Tables } from '@app/types/supabase';
import type {
  RelationshipState,
  SocialProfileRow,
} from '@app/features/social/socialTypes';

// Types of Comunidad · tanda C (retos). Rows come from `types/supabase.ts`
// (`social_challenges`, `social_challenge_participants`); the RPC results
// (`get_my_challenges`, `get_challenge_board`) are typed from their documented
// shape (BACKEND_SUMMARY §2, SOCIAL_SCHEMA_PROPOSAL §4.10).

export type SocialChallengeRow = Tables<'social_challenges'>;
export type ChallengeParticipantRow = Tables<'social_challenge_participants'>;

export type ChallengeKind = 'official' | 'friends';

export type ChallengeStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type ParticipantStatus =
  | 'invited'
  | 'active'
  | 'declined'
  | 'expired'
  | 'left'
  | 'completed';

export type ChallengeMetric =
  | 'workouts'
  | 'strength_sessions'
  | 'minutes_trained'
  | 'exercise_reps'
  | 'core33_habit_days'
  | 'mobility_minutes';

export type ChallengeHead = Pick<
  SocialChallengeRow,
  | 'id'
  | 'title'
  | 'goal'
  | 'duration_days'
  | 'starts_at'
  | 'ends_at'
  | 'invite_expires_at'
  | 'points'
  | 'badge_id'
  | 'allow_manual'
  | 'creator_id'
> & {
  kind: ChallengeKind;
  metric: ChallengeMetric;
  status: ChallengeStatus;
};

export type ChallengeMine = Pick<
  ChallengeParticipantRow,
  'progress' | 'invited_by' | 'final_rank_among_friends' | 'celebrated_at'
> & { status: ParticipantStatus };

// One row of `get_my_challenges`.
export type ChallengeSummary = {
  challenge: ChallengeHead;
  // null: the official challenge, not joined yet.
  mine: ChallengeMine | null;
  // The people shown as stacked avatars (me + friends); absent rows are
  // tolerated (SOCIAL_PLAN §8.1).
  people: { profile: SocialProfileRow | null; isMe: boolean }[];
  // The friend who invited me (invitations).
  inviter: SocialProfileRow | null;
  // Official challenge only: an aggregate with no names.
  participants_total: number | null;
  // Best friend of mine in this challenge ("Carlos acaba de llegar a 81").
  leader: { profile: SocialProfileRow | null; progress: number } | null;
};

export type MyChallenges = {
  active: ChallengeSummary[];
  invitations: ChallengeSummary[];
  recently_completed: ChallengeSummary[];
  official: ChallengeSummary | null;
};

export type BoardEntry = {
  user_id: string;
  profile: SocialProfileRow | null;
  progress: number;
  status: ParticipantStatus;
  completed_at: string | null;
  isMe: boolean;
  relationship: RelationshipState;
};

export type ChallengeActivity = {
  id: string;
  profile: SocialProfileRow | null;
  isMe: boolean;
  text: string;
  created_at: string;
};

// `get_challenge_board` plus what the detail needs. The week bars come from
// the user's own `social_challenge_contributions`; `activity` is NOT declared
// by the API yet (BT-46 c).
export type ChallengeBoard = {
  challenge: ChallengeHead;
  mine: ChallengeMine | null;
  participants_total: number | null;
  board: BoardEntry[];
  // Official challenge: progress of the user per day of the week (null = day
  // that has not happened).
  week: (number | null)[] | null;
  // Official challenge: what the user added by hand today (limit 300/day).
  manualToday: number;
  activity: ChallengeActivity[];
  inviter: SocialProfileRow | null;
};

export type CreateChallengeInput = {
  metric: ChallengeMetric;
  goal: number;
  durationDays: number;
  inviteeIds: string[];
};

export type CreateChallengeResult =
  | { ok: true; challengeId: string; title: string }
  | { ok: false; error: 'validation' | 'not_friends' | 'unavailable' };

export type ManualContributionResult =
  | { ok: true; progress: number }
  | { ok: false; error: 'amount_out_of_range' | 'daily_limit' | 'not_allowed' };
