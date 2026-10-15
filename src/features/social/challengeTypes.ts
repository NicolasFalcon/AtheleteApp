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
  | 'mobility_minutes'
  // Official only: kilometres of Ruta (running and cycling), saved by the
  // server with 2 decimals.
  | 'distance_km';

// What the server says the figures are ("km", "reps", "min", "sessions").
export type ChallengeUnit = 'km' | 'reps' | 'min' | 'sessions';

// The badge of an official challenge. TODO(badges-oficiales): final artwork;
// `icon` is a name the app maps to a placeholder in `officialBadge.ts`.
export type ChallengeBadge = { id: string; title: string; icon: string | null };

// Official challenges: what get_my_challenges adds to each row.
export type ChallengeMeta = {
  unit: ChallengeUnit | null;
  // Localised name of the exercise of a repetitions challenge ("dominadas").
  exerciseName: string | null;
  badge: ChallengeBadge | null;
  coverPath: string | null;
  // Signed URL of `coverPath` (bucket challenge-covers is private); null when
  // there is no cover or it could not be signed.
  coverUrl: string | null;
  description: string | null;
  // 'running' | 'cycling' | null (both).
  sport: string | null;
};

export const NO_META: ChallengeMeta = {
  unit: null,
  exerciseName: null,
  badge: null,
  coverPath: null,
  coverUrl: null,
  description: null,
  sport: null,
};

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
  // Who leads among me and my friends ("Carlos acaba de llegar a 81"). From
  // the server (`leader`); `isMe` when it is me.
  leader: { profile: SocialProfileRow | null; progress: number; isMe?: boolean } | null;
  // Official challenges (absent in friend challenges).
  meta?: ChallengeMeta;
};

export type MyChallenges = {
  active: ChallengeSummary[];
  invitations: ChallengeSummary[];
  recently_completed: ChallengeSummary[];
  // The featured official challenge (the first of `officialList`).
  official: ChallengeSummary | null;
  // Every official challenge already started (featured first).
  officialList: ChallengeSummary[];
  // Official challenges that have not started: I can join before they do
  // (`mine` is active when I did).
  official_upcoming: ChallengeSummary[];
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

// Errors of create_friend_challenge (HTTP 200, ok:false). goal_out_of_range
// carries the range of that metric; invitee_not_friend, the offending user.
export type CreateChallengeError =
  | 'invalid_metric'
  | 'goal_out_of_range'
  | 'invalid_duration'
  | 'no_invitees'
  | 'invitee_not_friend'
  | 'unknown';

export type CreateChallengeResult =
  | { ok: true; challengeId: string; title: string }
  | {
      ok: false;
      error: CreateChallengeError;
      min?: number;
      max?: number;
      userId?: string;
    };

// respond_challenge_invite: accepting starts the challenge.
export type RespondInviteResult =
  | { ok: true; status: 'active' | 'declined' }
  | { ok: false; error: 'no_invite' | 'invite_expired' | 'unknown' };

export type JoinOfficialResult =
  | { ok: true }
  | { ok: false; error: 'not_available' | 'unknown' };

export type ManualContributionError =
  | 'amount_out_of_range'
  | 'daily_limit'
  | 'not_allowed'
  | 'unknown';

export type ManualContributionResult =
  | { ok: true; progress: number }
  | { ok: false; error: ManualContributionError; remaining?: number };
