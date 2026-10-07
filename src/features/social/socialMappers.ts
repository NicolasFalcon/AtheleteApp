import type { Tables } from '@app/types/supabase';
import type {
  BlockedEntry,
  FindUserResult,
  FriendActivity,
  FriendEntry,
  FriendRequestRow,
  FriendsOverview,
  HiddenCategory,
  Relationship,
  SetUsernameResult,
  SocialProfileDetail,
  SocialProfileRow,
  SocialRecentPost,
  SocialRecord,
  UserBlockRow,
} from '@app/features/social/socialTypes';

// Pure mapping of the Supabase responses (RPC `Json`, table rows) to the
// models the Comunidad screens use. Nothing here talks to the network: it is
// what `supabaseSocialService` calls and what the tests cover. The RPC shapes
// come from BACKEND_SUMMARY §2; fields the documentation does not pin down
// are read defensively (an unexpected shape drops the field, never the screen).

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Json)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// ── Username ──────────────────────────────────────────────────────────────
export type UsernameRpcResult =
  | { kind: 'ok'; username: string; created: boolean | null }
  | { kind: 'error'; error: 'invalid_username' | 'username_taken' }
  | { kind: 'unknown' };

export function usernameErrorFromText(
  text: string | undefined,
): 'invalid_username' | 'username_taken' | null {
  if (!text) {
    return null;
  }
  const value = text.toLowerCase();
  if (/taken|duplicate|exists|already|unique/.test(value)) {
    return 'username_taken';
  }
  if (/invalid|format|check|length|characters/.test(value)) {
    return 'invalid_username';
  }
  return null;
}

// ensure_social_settings → {created, username} | {error}
// set_username          → {ok, username}       | {error}
export function interpretUsernameRpc(data: unknown): UsernameRpcResult {
  const body = asRecord(data);
  if (!body) {
    return { kind: 'unknown' };
  }
  const error = asString(body.error);
  if (error) {
    const mapped = usernameErrorFromText(error);
    return mapped ? { kind: 'error', error: mapped } : { kind: 'unknown' };
  }
  const username = asString(body.username);
  if (username && (body.ok === true || typeof body.created === 'boolean')) {
    return {
      kind: 'ok',
      username,
      created: typeof body.created === 'boolean' ? body.created : null,
    };
  }
  return { kind: 'unknown' };
}

// PostgREST error of a failed rpc / write: 23505 (unique) and 23514 (check)
// are the duplicate and the format errors of `social_settings.username`.
export function usernameErrorFromPostgres(error: {
  code?: string | null;
  message?: string | null;
} | null): 'invalid_username' | 'username_taken' | null {
  if (!error) {
    return null;
  }
  if (error.code === '23505') {
    return 'username_taken';
  }
  if (error.code === '23514' || error.code === '22001') {
    return 'invalid_username';
  }
  return usernameErrorFromText(error.message ?? undefined);
}

export function toSetUsernameResult(
  result: UsernameRpcResult,
  fallback: string,
): SetUsernameResult | null {
  if (result.kind === 'ok') {
    return { ok: true, username: result.username || fallback };
  }
  if (result.kind === 'error') {
    return { ok: false, error: result.error };
  }
  return null;
}

// ── find_user_by_username ─────────────────────────────────────────────────
const RELATIONSHIPS: readonly Relationship[] = [
  'self',
  'none',
  'request_sent',
  'request_received',
  'friends',
];

function asRelationship(value: unknown): Relationship | null {
  return RELATIONSHIPS.includes(value as Relationship)
    ? (value as Relationship)
    : null;
}

// null when the person does not exist or is blocked (the RPC returns null).
export function parseFindUser(data: unknown): FindUserResult | null {
  const body = asRecord(data);
  if (!body) {
    return null;
  }
  const userId = asString(body.user_id);
  const username = asString(body.username);
  if (!userId || !username) {
    return null;
  }
  return {
    user_id: userId,
    username,
    name: asString(body.name) ?? username,
    avatar_key: asString(body.avatar_key) ?? null,
    accepts_requests: body.accepts_requests !== false,
    relationship: asRelationship(body.relationship) ?? 'none',
  };
}

// ── get_social_profile ────────────────────────────────────────────────────
const HIDDEN: readonly HiddenCategory[] = [
  'workouts',
  'records',
  'achievements',
  'photos',
  'routines',
  'body_weight',
  'nutrition',
];

const POST_TYPES: readonly SocialRecentPost['type'][] = [
  'workout',
  'record',
  'routine',
  'achievement',
  'challenge',
  'photo',
];

function parseRecords(value: unknown): SocialRecord[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const records: SocialRecord[] = [];
  value.forEach(item => {
    const row = asRecord(item);
    const name =
      asString(row?.exercise_name) ?? asString(row?.exercise) ?? asString(row?.name);
    const amount = asNumber(row?.value) ?? asNumber(row?.value_weight);
    if (!row || !name || amount === undefined) {
      return;
    }
    records.push({
      exercise_name: name,
      value: amount,
      unit: asString(row.unit) ?? 'kg',
      reps: asNumber(row.reps) ?? asNumber(row.value_reps) ?? null,
      is_new: row.is_new === true,
    });
  });
  return records;
}

function parseRecentPosts(value: unknown): SocialRecentPost[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const posts: SocialRecentPost[] = [];
  value.forEach(item => {
    const row = asRecord(item);
    const id = asString(row?.id) ?? asString(row?.post_id);
    const type = row?.type as SocialRecentPost['type'] | undefined;
    if (!row || !id || !type || !POST_TYPES.includes(type)) {
      return;
    }
    const summary = asRecord(row.summary);
    posts.push({
      id,
      type,
      title: asString(row.title) ?? asString(summary?.title) ?? '',
    });
  });
  return posts;
}

// null when the response is not a profile (absent, blocked or {error}): the
// screen shows "no disponible", never a failure.
export function parseProfileDetail(data: unknown): SocialProfileDetail | null {
  const body = asRecord(data);
  if (!body || asString(body.error)) {
    return null;
  }
  const relationship = asRelationship(body.relationship);
  if (!relationship) {
    return null;
  }
  const detail: SocialProfileDetail = {
    relationship,
    streak_days: asNumber(body.streak_days) ?? 0,
    // 'nutrition' is never shared (Q14), whatever the server says.
    hidden_categories: Array.from(
      new Set<HiddenCategory>([
        ...asArray(body.hidden_categories).filter((item): item is HiddenCategory =>
          HIDDEN.includes(item as HiddenCategory),
        ),
        'nutrition',
      ]),
    ),
  };
  const friendsSince = asString(body.friends_since);
  if (friendsSince) {
    detail.friends_since = friendsSince;
  }
  const sessions = asNumber(body.sessions_total);
  if (sessions !== undefined) {
    detail.sessions_total = sessions;
  }
  const badges = asNumber(body.badges_total);
  if (badges !== undefined) {
    detail.badges_total = badges;
  }
  const records = parseRecords(body.records);
  if (records) {
    detail.records = records;
  }
  const weight = asNumber(body.weight);
  if (weight !== undefined) {
    detail.weight = weight;
  }
  const posts = parseRecentPosts(body.recent_posts);
  if (posts) {
    detail.recent_posts = posts;
  }
  // `common_challenges` is intentionally not read: the server does not return
  // it (confirmed with backend), so the profile has no "retos en común".
  return detail;
}

// ── get_social_profiles ───────────────────────────────────────────────────
export function profileMap(rows: unknown): Map<string, SocialProfileRow> {
  const map = new Map<string, SocialProfileRow>();
  asArray(rows).forEach(item => {
    const row = asRecord(item);
    const id = asString(row?.id);
    if (!row || !id) {
      return;
    }
    map.set(id, {
      id,
      username: asString(row.username) ?? '',
      name: asString(row.name) ?? 'Usuario',
      avatar_key: asString(row.avatar_key) ?? '',
      profile_photo_url: asString(row.profile_photo_url) ?? '',
      goal: asString(row.goal) ?? '',
      weight: asNumber(row.weight) ?? 0,
    });
  });
  return map;
}

// A requested id may be absent from get_social_profiles (SOCIAL_PLAN §8.1 #1):
// the row is shown as "Usuario" instead of disappearing.
export function profileOrPlaceholder(
  profiles: Map<string, SocialProfileRow>,
  id: string,
): SocialProfileRow {
  return (
    profiles.get(id) ?? {
      id,
      username: '',
      name: 'Usuario',
      avatar_key: '',
      profile_photo_url: '',
      goal: '',
      weight: 0,
    }
  );
}

// ── get_friend_activity ───────────────────────────────────────────────────
// Last activity line per person (newest wins).
export function parseFriendActivity(data: unknown): Map<string, FriendActivity> {
  const latest = new Map<string, FriendActivity>();
  asArray(data).forEach(item => {
    const row = asRecord(item);
    const userId = asString(row?.user_id) ?? asString(row?.actor_id);
    const createdAt = asString(row?.created_at);
    if (!row || !userId || !createdAt) {
      return;
    }
    const summary = row.summary;
    const title =
      asString(asRecord(summary)?.title) ??
      (typeof summary === 'string' ? summary : undefined) ??
      '';
    const activity: FriendActivity = {
      user_id: userId,
      kind: asString(row.kind) ?? asString(row.type) ?? '',
      summary: { title },
      created_at: createdAt,
    };
    const current = latest.get(userId);
    if (!current || activity.created_at > current.created_at) {
      latest.set(userId, activity);
    }
  });
  return latest;
}

// ── get_my_challenges (counts only; the rest is W5) ───────────────────────
export function parseChallengeCounts(data: unknown): {
  active: number;
  invitations: number;
} {
  const body = asRecord(data);
  return {
    active: asArray(body?.active).length,
    invitations: asArray(body?.invitations).length,
  };
}

// ── Friends overview ──────────────────────────────────────────────────────
export type FriendshipRow = Tables<'friendships'>;

export function friendIdOf(row: FriendshipRow, me: string): string {
  return row.user_low === me ? row.user_high : row.user_low;
}

// Ids of everyone the overview needs a profile for.
export function overviewPersonIds(
  me: string,
  friendships: FriendshipRow[],
  requests: FriendRequestRow[],
): string[] {
  const ids = new Set<string>();
  friendships.forEach(row => ids.add(friendIdOf(row, me)));
  requests.forEach(row =>
    ids.add(row.sender_id === me ? row.receiver_id : row.sender_id),
  );
  return Array.from(ids);
}

export type OverviewInput = {
  me: string;
  friendships: FriendshipRow[];
  requests: FriendRequestRow[];
  profiles: Map<string, SocialProfileRow>;
  activity: Map<string, FriendActivity>;
  counts: { active: number; invitations: number };
};

export function buildFriendsOverview(input: OverviewInput): FriendsOverview {
  const { me, friendships, requests, profiles, activity, counts } = input;
  const friends: FriendEntry[] = friendships.map(row => {
    const id = friendIdOf(row, me);
    return {
      profile: profileOrPlaceholder(profiles, id),
      friendsSince: row.created_at,
      lastActivity: activity.get(id) ?? null,
    };
  });
  // Most recent activity first; those without activity keep a stable order.
  friends.sort((a, b) =>
    (b.lastActivity?.created_at ?? '').localeCompare(
      a.lastActivity?.created_at ?? '',
    ),
  );
  const pending = requests.filter(row => row.status === 'pending');
  const received = pending
    .filter(row => row.receiver_id === me)
    .map(request => ({
      request,
      profile: profileOrPlaceholder(profiles, request.sender_id),
    }));
  const sent = pending
    .filter(row => row.sender_id === me)
    .map(request => ({
      request,
      profile: profileOrPlaceholder(profiles, request.receiver_id),
    }));

  return {
    friends,
    received,
    sent,
    activeChallenges: counts.active,
    pendingInvitations: counts.invitations,
  };
}

// ── Blocked list ──────────────────────────────────────────────────────────
export function buildBlocked(
  blocks: UserBlockRow[],
  profiles: Map<string, SocialProfileRow>,
): BlockedEntry[] {
  return blocks.map(block => ({
    block,
    profile: profiles.get(block.blocked_id) ?? null,
  }));
}
