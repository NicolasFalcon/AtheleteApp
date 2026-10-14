import type {
  BoardEntry,
  ChallengeBadge,
  ChallengeMeta,
  ChallengeUnit,
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
  'distance_km',
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
export function parseChallengeHead(
  value: unknown,
  fallbackStatus?: ChallengeStatus,
): ChallengeHead | null {
  const row = asRecord(value);
  const id = asString(row?.id);
  const metric = oneOf(METRICS, row?.metric);
  const status = oneOf(CHALLENGE_STATUSES, row?.status) ?? fallbackStatus;
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
// Every row carries what the list needs (participants, people, leader, badge,
// unit, cover_path…), so the list makes no get_challenge_board calls.
export type ListedChallenge = {
  head: ChallengeHead;
  // The participant columns that come with the row (null: not a participant).
  mine: ChallengeMine | null;
  people: { profile: SocialProfileRow | null; isMe: boolean }[];
  participantsTotal: number | null;
  leader: ChallengeSummary['leader'];
  meta: ChallengeMeta;
};

const UNITS: readonly ChallengeUnit[] = ['km', 'reps', 'min', 'sessions'];

function parsePerson(value: unknown): { profile: SocialProfileRow | null; isMe: boolean } | null {
  const row = asRecord(value);
  const id = asString(row?.user_id);
  if (!row || !id) {
    return null;
  }
  return { profile: boardProfile(row, id), isMe: asBool(row.is_me) };
}

function parseLeader(value: unknown): ChallengeSummary['leader'] {
  const row = asRecord(value);
  const id = asString(row?.user_id);
  const progress = asNumber(row?.progress);
  if (!row || !id || progress === undefined) {
    return null;
  }
  return { profile: boardProfile(row, id), progress, isMe: asBool(row.is_me) };
}

function parseBadge(value: unknown): ChallengeBadge | null {
  const row = asRecord(value);
  const id = asString(row?.id);
  if (!row || !id) {
    return null;
  }
  return { id, title: asString(row.title) ?? '', icon: orNull(asString(row.icon)) };
}

export function parseMeta(row: Json): ChallengeMeta {
  return {
    unit: oneOf(UNITS, row.unit) ?? null,
    exerciseName: orNull(asString(row.exercise_name)),
    badge: parseBadge(row.badge),
    // The app signs `cover_path`; `cover_url` is never used directly.
    coverPath: orNull(asString(row.cover_path)),
    coverUrl: null,
    description: orNull(asString(row.description)),
    sport: orNull(asString(row.sport)),
  };
}

function parseListed(
  value: unknown,
  fallbackStatus: ParticipantStatus | null,
  fallbackChallengeStatus?: ChallengeStatus,
): ListedChallenge | null {
  const row = asRecord(value);
  const head = parseChallengeHead(row, fallbackChallengeStatus);
  if (!row || !head) {
    return null;
  }
  // The server says 'joined' for an official challenge I signed up for.
  const rawStatus = row.my_status === 'joined' ? 'active' : row.my_status;
  const status = oneOf(PARTICIPANT_STATUSES, rawStatus) ?? fallbackStatus;
  const mine: ChallengeMine | null = status
    ? {
        status,
        progress: asNumber(row.my_progress) ?? 0,
        invited_by: orNull(asString(row.invited_by)),
        final_rank_among_friends: orNull(asNumber(row.final_rank_among_friends)),
        celebrated_at: orNull(asString(row.celebrated_at)),
      }
    : null;
  const people = asRecord(row.people);
  const total = asNumber(people?.total) ?? asNumber(row.participants_count);
  return {
    head,
    mine,
    people: asArray(people?.preview).flatMap(item => {
      const person = parsePerson(item);
      return person ? [person] : [];
    }),
    participantsTotal: orNull(total),
    leader: parseLeader(row.leader),
    meta: parseMeta(row),
  };
}

export type ParsedMyChallenges = {
  active: ListedChallenge[];
  invitations: ListedChallenge[];
  recently_completed: ListedChallenge[];
  // Every active official challenge already started, joined or not.
  official: ListedChallenge[];
  // Official challenges that have not started yet.
  official_upcoming: ListedChallenge[];
};

function listOf(
  value: unknown,
  fallback: ParticipantStatus | null,
  challengeStatus?: ChallengeStatus,
): ListedChallenge[] {
  return asArray(value).flatMap(item => {
    const parsed = parseListed(item, fallback, challengeStatus);
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
    // A row already says whether I joined (my_status); `active` also tells.
    official: official.map(item => {
      const mine = joined.get(item.head.id);
      return mine ? { ...item, mine: mine.mine } : item;
    }),
    // They have not started: their status may not be one the app knows.
    official_upcoming: listOf(body?.official_upcoming, null, 'pending').map(item => ({
      ...item,
      head: { ...item.head, kind: 'official' },
    })),
  };
}

export function summaryFrom(
  listed: ListedChallenge,
  profiles: Map<string, SocialProfileRow>,
): ChallengeSummary {
  const inviterId = listed.mine?.invited_by ?? null;
  return {
    challenge: listed.head,
    mine: listed.mine,
    people: listed.people,
    inviter: inviterId
      ? (profiles.get(inviterId) ??
        listed.people.find(person => person.profile?.id === inviterId)?.profile ??
        null)
      : null,
    participants_total: listed.participantsTotal,
    leader: listed.leader,
    meta: listed.meta,
  };
}

// The covers of a list to sign in one call.
export function coverPaths(parsed: ParsedMyChallenges): string[] {
  return Array.from(
    new Set(
      [...parsed.official, ...parsed.official_upcoming, ...parsed.active].flatMap(item =>
        item.meta.coverPath ? [item.meta.coverPath] : [],
      ),
    ),
  );
}

export function buildMyChallenges(
  parsed: ParsedMyChallenges,
  profiles: Map<string, SocialProfileRow>,
  covers: Map<string, string> = new Map(),
): MyChallenges {
  const toSummary = (listed: ListedChallenge): ChallengeSummary => {
    const summary = summaryFrom(listed, profiles);
    const path = listed.meta.coverPath;
    return path && covers.has(path)
      ? { ...summary, meta: { ...listed.meta, coverUrl: covers.get(path) ?? null } }
      : summary;
  };
  const officialList = parsed.official.map(toSummary);
  return {
    active: parsed.active.map(toSummary),
    invitations: parsed.invitations.map(toSummary),
    recently_completed: parsed.recently_completed.map(toSummary),
    official: officialList.length > 0 ? officialList[0] : null,
    officialList,
    official_upcoming: parsed.official_upcoming.map(toSummary),
  };
}

// Inviters of the invitations (to ask get_social_profiles for the missing ones).
export function inviterIds(parsed: ParsedMyChallenges): string[] {
  const known = new Set(
    [...parsed.invitations].flatMap(item =>
      item.people.flatMap(person => (person.profile ? [person.profile.id] : [])),
    ),
  );
  return Array.from(
    new Set(
      parsed.invitations.flatMap(item =>
        item.mine?.invited_by && !known.has(item.mine.invited_by) ? [item.mine.invited_by] : [],
      ),
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
