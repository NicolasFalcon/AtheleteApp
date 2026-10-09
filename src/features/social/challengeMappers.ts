import type {
  BoardEntry,
  ChallengeBoard,
  ChallengeHead,
  ChallengeKind,
  ChallengeMetric,
  ChallengeMine,
  ChallengeStatus,
  ChallengeSummary,
  CreateChallengeError,
  CreateChallengeResult,
  JoinOfficialResult,
  ManualContributionError,
  ManualContributionResult,
  MyChallenges,
  ParticipantStatus,
  RespondInviteResult,
} from '@app/features/social/challengeTypes';
import type { SocialProfileRow } from '@app/features/social/socialTypes';

// Pure mapping of the W5 responses (get_my_challenges, get_challenge_board and
// the result of each challenge RPC) to the models of the screens. Shapes:
// SOCIAL_RPC_SHAPES.md. Anything unexpected drops that row instead of the
// whole list, and an unknown error code becomes 'unknown'.

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Json)
    : null;
}
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const asBool = (value: unknown): boolean => value === true;
const orNull = <T>(value: T | undefined): T | null => (value === undefined ? null : value);

const METRICS: readonly ChallengeMetric[] = [
  'workouts',
  'strength_sessions',
  'minutes_trained',
  'exercise_reps',
  'core33_habit_days',
  'mobility_minutes',
];
const CHALLENGE_STATUSES: readonly ChallengeStatus[] = [
  'pending',
  'active',
  'completed',
  'cancelled',
  'expired',
];
const PARTICIPANT_STATUSES: readonly ParticipantStatus[] = [
  'invited',
  'active',
  'declined',
  'expired',
  'left',
  'completed',
];

function oneOf<T extends string>(list: readonly T[], value: unknown): T | undefined {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

// ── The challenge columns ─────────────────────────────────────────────────
export function parseChallengeHead(value: unknown): ChallengeHead | null {
  const row = asRecord(value);
  const id = asString(row?.id);
  const metric = oneOf(METRICS, row?.metric);
  const status = oneOf(CHALLENGE_STATUSES, row?.status);
  const goal = asNumber(row?.goal);
  if (!row || !id || !metric || !status || goal === undefined) {
    return null;
  }
  const kind: ChallengeKind = row.kind === 'official' ? 'official' : 'friends';
  return {
    id,
    kind,
    metric,
    status,
    goal,
    title: asString(row.title) ?? '',
    duration_days: asNumber(row.duration_days) ?? 0,
    starts_at: orNull(asString(row.starts_at)),
    ends_at: orNull(asString(row.ends_at)),
    invite_expires_at: orNull(asString(row.invite_expires_at)),
    points: asNumber(row.points) ?? 0,
    badge_id: orNull(asString(row.badge_id)),
    allow_manual: asBool(row.allow_manual),
    creator_id: orNull(asString(row.creator_id)),
  };
}

// ── get_my_challenges ─────────────────────────────────────────────────────
export type ListedChallenge = {
  head: ChallengeHead;
  // The participant columns that come with the row (null: not a participant).
  mine: ChallengeMine | null;
};

function parseListed(value: unknown, fallbackStatus: ParticipantStatus | null): ListedChallenge | null {
  const row = asRecord(value);
  const head = parseChallengeHead(row);
  if (!row || !head) {
    return null;
  }
  const status = oneOf(PARTICIPANT_STATUSES, row.my_status) ?? fallbackStatus;
  const mine: ChallengeMine | null = status
    ? {
        status,
        progress: asNumber(row.my_progress) ?? 0,
        invited_by: orNull(asString(row.invited_by)),
        final_rank_among_friends: orNull(asNumber(row.final_rank_among_friends)),
        celebrated_at: orNull(asString(row.celebrated_at)),
      }
    : null;
  return { head, mine };
}

export type ParsedMyChallenges = {
  active: ListedChallenge[];
  invitations: ListedChallenge[];
  recently_completed: ListedChallenge[];
  // Every active official challenge, joined or not.
  official: ListedChallenge[];
};

function listOf(value: unknown, fallback: ParticipantStatus | null): ListedChallenge[] {
  return asArray(value).flatMap(item => {
    const parsed = parseListed(item, fallback);
    return parsed ? [parsed] : [];
  });
}

export function parseMyChallenges(data: unknown): ParsedMyChallenges {
  const body = asRecord(data);
  const official = listOf(body?.official, null);
  const active = listOf(body?.active, 'active');
  const joined = new Map(active.map(item => [item.head.id, item]));
  return {
    active: active.filter(item => item.head.kind !== 'official'),
    invitations: listOf(body?.invitations, 'invited'),
    recently_completed: listOf(body?.recently_completed, 'completed'),
    // The official list also holds challenges not joined yet: whether I take
    // part is whether the id is in `active`.
    official: official.map(item => {
      const mine = joined.get(item.head.id);
      return mine ? { head: item.head, mine: mine.mine } : { head: item.head, mine: null };
    }),
  };
}

// Ids whose board adds the avatars and the leader to the list (the rows of
// the list carry no people). The completed ones are plain rows without avatars,
// so they are not looked up; the rest is capped.
export const BOARD_LOOKUP_MAX = 12;

export function listedIds(parsed: ParsedMyChallenges): string[] {
  const ids = [
    ...parsed.official.map(item => item.head.id),
    ...parsed.invitations.map(item => item.head.id),
    ...parsed.active.map(item => item.head.id),
  ];
  return Array.from(new Set(ids)).slice(0, BOARD_LOOKUP_MAX);
}

// Everything the list needs from one board (people, leader, total).
export type BoardLookup = {
  participants_total: number | null;
  board: BoardEntry[];
};

export function summaryFrom(
  listed: ListedChallenge,
  lookup: BoardLookup | null,
  profiles: Map<string, SocialProfileRow>,
): ChallengeSummary {
  const board = lookup?.board ?? [];
  const inviterId = listed.mine?.invited_by ?? null;
  const people = board.map(entry => ({ profile: entry.profile, isMe: entry.isMe }));
  // The friend ahead of me: the best of the others, shown while they lead.
  const others = board.filter(entry => !entry.isMe);
  const best = others.reduce<BoardEntry | null>(
    (top, entry) => (!top || entry.progress > top.progress ? entry : top),
    null,
  );
  return {
    challenge: listed.head,
    mine: listed.mine,
    people,
    inviter: inviterId
      ? (profiles.get(inviterId) ??
        board.find(entry => entry.user_id === inviterId)?.profile ??
        null)
      : null,
    participants_total: lookup?.participants_total ?? null,
    leader: best ? { profile: best.profile, progress: best.progress } : null,
  };
}

export function buildMyChallenges(
  parsed: ParsedMyChallenges,
  lookups: Map<string, BoardLookup>,
  profiles: Map<string, SocialProfileRow>,
): MyChallenges {
  const toSummary = (listed: ListedChallenge) =>
    summaryFrom(listed, lookups.get(listed.head.id) ?? null, profiles);
  return {
    active: parsed.active.map(toSummary),
    invitations: parsed.invitations.map(toSummary),
    recently_completed: parsed.recently_completed.map(toSummary),
    official: parsed.official.length > 0 ? toSummary(parsed.official[0]) : null,
  };
}

// Inviters of the invitations (to ask get_social_profiles for the missing ones).
export function inviterIds(parsed: ParsedMyChallenges): string[] {
  return Array.from(
    new Set(
      parsed.invitations.flatMap(item => (item.mine?.invited_by ? [item.mine.invited_by] : [])),
    ),
  );
}

// ── get_challenge_board ───────────────────────────────────────────────────
export type ParsedBoard = {
  head: ChallengeHead;
  participants_total: number | null;
  board: BoardEntry[];
};

function boardProfile(row: Json, id: string): SocialProfileRow {
  return {
    id,
    username: asString(row.username) ?? '',
    name: asString(row.name) ?? 'Usuario',
    avatar_key: asString(row.avatar_key) ?? '',
    profile_photo_url: asString(row.profile_photo_url) ?? '',
    goal: '',
    weight: 0,
  };
}

// null: the challenge does not exist or I am not in it ("no disponible").
export function parseBoard(data: unknown): ParsedBoard | null {
  const body = asRecord(data);
  const head = parseChallengeHead(body?.challenge);
  if (!body || !head) {
    return null;
  }
  const board = asArray(body.board).flatMap((item): BoardEntry[] => {
    const row = asRecord(item);
    const userId = asString(row?.user_id);
    const status = oneOf(PARTICIPANT_STATUSES, row?.status);
    if (!row || !userId || !status) {
      return [];
    }
    const isMe = asBool(row.is_me);
    return [
      {
        user_id: userId,
        profile: boardProfile(row, userId),
        progress: asNumber(row.progress) ?? 0,
        status,
        completed_at: orNull(asString(row.completed_at)),
        isMe,
        // The board only holds me and my friends.
        relationship: isMe ? 'self' : 'friends',
      },
    ];
  });
  return {
    head,
    participants_total: orNull(asNumber(body.participants_total)),
    board,
  };
}

export function lookupFromBoard(board: ParsedBoard | null): BoardLookup | null {
  return board ? { participants_total: board.participants_total, board: board.board } : null;
}

// My participant row (select on social_challenge_participants).
export function parseMineRow(value: unknown): ChallengeMine | null {
  const row = asRecord(value);
  const status = oneOf(PARTICIPANT_STATUSES, row?.status);
  if (!row || !status) {
    return null;
  }
  return {
    status,
    progress: asNumber(row.progress) ?? 0,
    invited_by: orNull(asString(row.invited_by)),
    final_rank_among_friends: orNull(asNumber(row.final_rank_among_friends)),
    celebrated_at: orNull(asString(row.celebrated_at)),
  };
}

// ── The week of the official challenge ────────────────────────────────────
export type ContributionRow = {
  amount: number;
  source: string;
  occurred_at: string;
};

export function parseContributions(rows: unknown): ContributionRow[] {
  return asArray(rows).flatMap(item => {
    const row = asRecord(item);
    const amount = asNumber(row?.amount);
    const occurred = asString(row?.occurred_at);
    return row && amount !== undefined && occurred
      ? [{ amount, source: asString(row.source) ?? '', occurred_at: occurred }]
      : [];
  });
}

// Monday 00:00 (local) of the week that contains `now`.
export function weekStart(now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

// Progress per day (Monday to Sunday); null for the days that have not
// happened yet.
export function weekFrom(rows: ContributionRow[], now: Date): (number | null)[] {
  const start = weekStart(now);
  const days = Array.from({ length: 7 }, () => 0);
  rows.forEach(row => {
    const index = Math.floor(
      (new Date(row.occurred_at).getTime() - start.getTime()) / 86_400_000,
    );
    if (index >= 0 && index < 7) {
      days[index] += row.amount;
    }
  });
  const today = (now.getDay() + 6) % 7;
  return days.map((value, index) => (index > today ? null : value));
}

// What I added by hand today (the server limit is 300 a day).
export function manualTodayFrom(rows: ContributionRow[], now: Date): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return rows
    .filter(row => row.source === 'manual' && new Date(row.occurred_at).getTime() >= start)
    .reduce((sum, row) => sum + row.amount, 0);
}

// ── Results of the RPCs ───────────────────────────────────────────────────
const CREATE_ERRORS: readonly CreateChallengeError[] = [
  'invalid_metric',
  'goal_out_of_range',
  'invalid_duration',
  'no_invitees',
  'invitee_not_friend',
];

export function parseCreateChallenge(data: unknown): CreateChallengeResult {
  const body = asRecord(data);
  const id = asString(body?.challenge_id);
  if (body?.ok === true && id) {
    return { ok: true, challengeId: id, title: asString(body.title) ?? '' };
  }
  const error = oneOf(CREATE_ERRORS, body?.error) ?? 'unknown';
  return {
    ok: false,
    error,
    ...(asNumber(body?.min) !== undefined ? { min: asNumber(body?.min) } : {}),
    ...(asNumber(body?.max) !== undefined ? { max: asNumber(body?.max) } : {}),
    ...(asString(body?.user_id) ? { userId: asString(body?.user_id) } : {}),
  };
}

export function parseRespondInvite(data: unknown, accept: boolean): RespondInviteResult {
  const body = asRecord(data);
  if (body?.ok === true) {
    const status =
      body.status === 'active' || body.status === 'declined'
        ? body.status
        : accept
        ? 'active'
        : 'declined';
    return { ok: true, status };
  }
  const error = asString(body?.error);
  return {
    ok: false,
    error: error === 'no_invite' || error === 'invite_expired' ? error : 'unknown',
  };
}

export function parseJoinOfficial(data: unknown): JoinOfficialResult {
  const body = asRecord(data);
  if (body?.ok === true) {
    return { ok: true };
  }
  return { ok: false, error: asString(body?.error) === 'not_available' ? 'not_available' : 'unknown' };
}

// leave_challenge / cancel_friend_challenge / mark_challenge_celebrated:
// {ok:true|false}. false means there was nothing to change.
export function parseOkFlag(data: unknown): boolean {
  return asRecord(data)?.ok === true;
}

const MANUAL_ERRORS: readonly ManualContributionError[] = [
  'amount_out_of_range',
  'daily_limit',
  'not_allowed',
];

export function parseManualContribution(data: unknown): ManualContributionResult {
  const body = asRecord(data);
  const progress = asNumber(body?.progress);
  if (body?.ok === true && progress !== undefined) {
    return { ok: true, progress };
  }
  const remaining = asNumber(body?.remaining);
  return {
    ok: false,
    error: oneOf(MANUAL_ERRORS, body?.error) ?? 'unknown',
    ...(remaining !== undefined ? { remaining } : {}),
  };
}

// The assembled detail: board + my row + the official week.
export function buildBoard(input: {
  parsed: ParsedBoard;
  mine: ChallengeMine | null;
  contributions: ContributionRow[] | null;
  inviter: SocialProfileRow | null;
  now: Date;
}): ChallengeBoard {
  const { parsed, mine, contributions, inviter, now } = input;
  const official = parsed.head.kind === 'official';
  const me = parsed.board.find(entry => entry.isMe);
  return {
    challenge: parsed.head,
    // The row is the source of truth; the board still tells my progress if the
    // row could not be read.
    mine:
      mine ??
      (me ? { status: me.status, progress: me.progress, invited_by: null, final_rank_among_friends: null, celebrated_at: null } : null),
    participants_total: parsed.participants_total,
    board: parsed.board,
    week: official && contributions ? weekFrom(contributions, now) : null,
    manualToday: official && contributions ? manualTodayFrom(contributions, now) : 0,
    // There is no per-challenge activity in the API (ranking only).
    activity: [],
    inviter,
  };
}
