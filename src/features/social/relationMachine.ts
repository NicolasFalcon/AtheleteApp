import type {
  BlockedEntry,
  FriendInviteRow,
  FriendsOverview,
  RelationshipState,
  SendFriendRequestStatus,
} from '@app/features/social/socialTypes';
import type {
  ChallengeBoard,
  ChallengeMine,
  ChallengeSummary,
  MyChallenges,
} from '@app/features/social/challengeTypes';
import type {
  NotificationPage,
  SocialNotification,
} from '@app/features/social/notificationModel';
import type { ProfileLookup } from '@app/services/social/socialService';

// State machine of the relationship with another person and the optimistic
// cache updates that follow each action (W2). Blocking is not simulated: the
// server removes the friendship and cancels the requests in both directions
// (shared challenges are untouched), so the app only invalidates the cache. Pure: `useSocialService` applies
// these to the React Query cache before the request, keeps them if it
// succeeds, and puts the previous data back if it fails.

export type PersonAction =
  | 'send'
  | 'accept'
  | 'decline'
  | 'cancel'
  | 'remove'
  | 'unblock';

// What the screen shows right after the tap, before the server answers.
export function optimisticRelation(
  current: RelationshipState,
  action: PersonAction,
): RelationshipState {
  switch (action) {
    case 'send':
      if (current === 'none') {
        return 'request_sent';
      }
      // They had already sent one: the server accepts it (status 'accepted').
      return current === 'request_received' ? 'friends' : current;
    case 'accept':
      return current === 'request_received' ? 'friends' : current;
    case 'decline':
      return current === 'request_received' ? 'none' : current;
    case 'cancel':
      return current === 'request_sent' ? 'none' : current;
    case 'remove':
      return current === 'friends' ? 'none' : current;
    case 'unblock':
      return current === 'blocked' ? 'none' : current;
    default:
      return current;
  }
}

export type RelationOutcome =
  | {
      kind: 'ok';
      // send_friend_request / respond_friend_request answer.
      status?: SendFriendRequestStatus | 'declined' | 'not_found';
    }
  | { kind: 'error' };

// The final state once the server answered. A failure goes back to `before`
// (rollback); a refused request (not_accepting, unavailable, invalid) too.
export function settleRelation(
  before: RelationshipState,
  action: PersonAction,
  outcome: RelationOutcome,
): RelationshipState {
  if (outcome.kind === 'error') {
    return before;
  }
  const status = outcome.status;
  switch (action) {
    case 'send':
      if (status === 'sent' || status === 'pending') {
        return 'request_sent';
      }
      if (status === 'accepted' || status === 'already_friends') {
        return 'friends';
      }
      return before;
    case 'accept':
    case 'decline':
      if (status === 'accepted') {
        return 'friends';
      }
      // declined, or not_found (the request is gone: nobody is a friend).
      return 'none';
    case 'cancel':
    case 'remove':
    case 'unblock':
      return 'none';
    default:
      return before;
  }
}

// ── Actions on the cache ──────────────────────────────────────────────────
export type SocialAction =
  | { type: 'send'; target: string }
  | { type: 'accept'; requestId: string }
  | { type: 'decline'; requestId: string }
  | { type: 'cancel'; requestId: string }
  | { type: 'remove'; friendId: string }
  | { type: 'unblock'; target: string }
  | { type: 'revokeInvite'; inviteId: string }
  // W5 · retos
  | { type: 'respondInvite'; challengeId: string; accept: boolean }
  | { type: 'leaveChallenge'; challengeId: string }
  | { type: 'cancelChallenge'; challengeId: string }
  | { type: 'joinOfficial'; challengeId: string }
  | { type: 'celebrate'; challengeId: string }
  // W6 · notificaciones
  | { type: 'readNotifications'; ids: string[] }
  | { type: 'readAllNotifications' }
  | { type: 'deleteNotifications'; ids: string[] };

// Which service call is which action (the rest of the writes are not
// optimistic: they create things the screen cannot draw yet).
export function actionFor(method: string, args: unknown[]): SocialAction | null {
  const [first, second] = args;
  if (method === 'markNotificationsRead' || method === 'deleteNotifications') {
    const ids = Array.isArray(first) ? first.filter((id): id is string => typeof id === 'string') : [];
    return ids.length > 0
      ? { type: method === 'deleteNotifications' ? 'deleteNotifications' : 'readNotifications', ids }
      : null;
  }
  if (method === 'markAllNotificationsRead') {
    return { type: 'readAllNotifications' };
  }
  if (typeof first !== 'string') {
    return null;
  }
  switch (method) {
    case 'sendFriendRequest':
      return { type: 'send', target: first };
    case 'respondFriendRequest':
      return { type: second === false ? 'decline' : 'accept', requestId: first };
    case 'cancelFriendRequest':
      return { type: 'cancel', requestId: first };
    case 'removeFriend':
      return { type: 'remove', friendId: first };
    case 'unblockUser':
      return { type: 'unblock', target: first };
    case 'revokeInvite':
      return { type: 'revokeInvite', inviteId: first };
    case 'respondChallengeInvite':
      return { type: 'respondInvite', challengeId: first, accept: second !== false };
    case 'leaveChallenge':
      return { type: 'leaveChallenge', challengeId: first };
    case 'cancelFriendChallenge':
      return { type: 'cancelChallenge', challengeId: first };
    case 'joinOfficialChallenge':
      return { type: 'joinOfficial', challengeId: first };
    case 'markChallengeCelebrated':
      return { type: 'celebrate', challengeId: first };
    default:
      return null;
  }
}

// The server answered but refused: bring the screen back.
export function shouldRollback(action: SocialAction, result: unknown): boolean {
  if (action.type === 'send') {
    return result === 'not_accepting' || result === 'unavailable' || result === 'invalid';
  }
  if (action.type === 'remove' || action.type === 'revokeInvite') {
    return result === false;
  }
  // leave_challenge / cancel_friend_challenge answer false when nothing changed.
  if (action.type === 'leaveChallenge' || action.type === 'cancelChallenge') {
    return result === false;
  }
  // Challenge RPCs that refuse answer {ok:false, error}.
  if (action.type === 'respondInvite' || action.type === 'joinOfficial') {
    return (result as { ok?: unknown } | null)?.ok === false;
  }
  return false;
}

// ── Challenges (W5) ───────────────────────────────────────────────────────
function mineWith(mine: ChallengeMine | null, patch: Partial<ChallengeMine>): ChallengeMine | null {
  return mine ? { ...mine, ...patch } : mine;
}

const JOINED: ChallengeMine = {
  status: 'active',
  progress: 0,
  invited_by: null,
  final_rank_among_friends: null,
  celebrated_at: null,
};

function challengesWith(data: MyChallenges, action: SocialAction): MyChallenges {
  switch (action.type) {
    case 'respondInvite': {
      const entry = data.invitations.find(item => item.challenge.id === action.challengeId);
      if (!entry) {
        return data;
      }
      const joined: ChallengeSummary = {
        ...entry,
        challenge: { ...entry.challenge, status: 'active' },
        mine: mineWith(entry.mine, { status: 'active' }),
      };
      return {
        ...data,
        invitations: data.invitations.filter(item => item !== entry),
        active: action.accept ? [joined, ...data.active] : data.active,
      };
    }
    case 'leaveChallenge':
      return {
        ...data,
        active: data.active.filter(item => item.challenge.id !== action.challengeId),
        official:
          data.official && data.official.challenge.id === action.challengeId
            ? { ...data.official, mine: mineWith(data.official.mine, { status: 'left' }) }
            : data.official,
      };
    case 'cancelChallenge':
      return {
        ...data,
        active: data.active.filter(item => item.challenge.id !== action.challengeId),
      };
    case 'joinOfficial':
      return data.official && data.official.challenge.id === action.challengeId
        ? { ...data, official: { ...data.official, mine: JOINED } }
        : data;
    case 'celebrate':
      return {
        ...data,
        recently_completed: data.recently_completed.map(item =>
          item.challenge.id === action.challengeId
            ? { ...item, mine: mineWith(item.mine, { celebrated_at: new Date().toISOString() }) }
            : item,
        ),
      };
    default:
      return data;
  }
}

function boardWith(board: ChallengeBoard, challengeId: string, action: SocialAction): ChallengeBoard {
  if (board.challenge.id !== challengeId) {
    return board;
  }
  switch (action.type) {
    case 'respondInvite':
      return {
        ...board,
        challenge: action.accept ? { ...board.challenge, status: 'active' } : board.challenge,
        mine: mineWith(board.mine, { status: action.accept ? 'active' : 'declined' }),
        board: board.board.map(entry =>
          entry.isMe ? { ...entry, status: action.accept ? 'active' : 'declined' } : entry,
        ),
      };
    case 'leaveChallenge':
      return {
        ...board,
        mine: mineWith(board.mine, { status: 'left' }),
        board: board.board.filter(entry => !entry.isMe),
      };
    case 'cancelChallenge':
      return { ...board, challenge: { ...board.challenge, status: 'cancelled' } };
    case 'joinOfficial':
      return { ...board, mine: board.mine ?? JOINED };
    case 'celebrate':
      return { ...board, mine: mineWith(board.mine, { celebrated_at: new Date().toISOString() }) };
    default:
      return board;
  }
}

// ── Notifications (W6) ────────────────────────────────────────────────────
function notificationsWith(
  items: SocialNotification[],
  action: SocialAction,
  now: Date,
): SocialNotification[] {
  switch (action.type) {
    case 'readNotifications':
      return items.map(item =>
        action.ids.includes(item.id) && item.read_at === null
          ? { ...item, read_at: now.toISOString() }
          : item,
      );
    case 'readAllNotifications':
      return items.map(item =>
        item.read_at === null ? { ...item, read_at: now.toISOString() } : item,
      );
    case 'deleteNotifications':
      return items.filter(item => !action.ids.includes(item.id));
    default:
      return items;
  }
}

function overviewWith(
  overview: FriendsOverview,
  action: SocialAction,
  now: Date,
): FriendsOverview {
  switch (action.type) {
    case 'accept': {
      const entry = overview.received.find(item => item.request.id === action.requestId);
      if (!entry) {
        return overview;
      }
      return {
        ...overview,
        received: overview.received.filter(item => item !== entry),
        friends: [
          { profile: entry.profile, friendsSince: now.toISOString(), lastActivity: null },
          ...overview.friends,
        ],
      };
    }
    case 'decline':
      return {
        ...overview,
        received: overview.received.filter(item => item.request.id !== action.requestId),
      };
    case 'cancel':
      return {
        ...overview,
        sent: overview.sent.filter(item => item.request.id !== action.requestId),
      };
    case 'remove':
      return {
        ...overview,
        friends: overview.friends.filter(item => item.profile.id !== action.friendId),
      };
    default:
      return overview;
  }
}

function lookupWith(
  lookup: ProfileLookup,
  userId: string,
  action: SocialAction,
): ProfileLookup {
  const current: RelationshipState = lookup.blocked
    ? 'blocked'
    : (lookup.detail?.relationship ?? 'none');
  const own = (id: string) => id === userId;
  const byRequest = (id: string) => lookup.requestId !== null && lookup.requestId === id;

  let relation: PersonAction | null = null;
  switch (action.type) {
    case 'send':
    case 'unblock':
      relation = own(action.target) ? action.type : null;
      break;
    case 'remove':
      relation = own(action.friendId) ? 'remove' : null;
      break;
    case 'accept':
    case 'decline':
    case 'cancel':
      relation = byRequest(action.requestId) ? action.type : null;
      break;
    default:
      break;
  }
  if (!relation) {
    return lookup;
  }

  const next = optimisticRelation(current, relation);
  if (next === current) {
    return lookup;
  }
  return {
    ...lookup,
    blocked: next === 'blocked',
    // `blocked` is not a server relationship: the detail keeps the last real one.
    detail:
      lookup.detail && next !== 'blocked'
        ? { ...lookup.detail, relationship: next }
        : lookup.detail,
    requestId: next === 'friends' || next === 'none' ? null : lookup.requestId,
  };
}

function blockedWith(entries: BlockedEntry[], action: SocialAction): BlockedEntry[] {
  return action.type === 'unblock'
    ? entries.filter(entry => entry.block.blocked_id !== action.target)
    : entries;
}

function invitesWith(
  invites: FriendInviteRow[],
  action: SocialAction,
  now: Date,
): FriendInviteRow[] {
  return action.type === 'revokeInvite'
    ? invites.map(invite =>
        invite.id === action.inviteId && invite.used_at === null && invite.revoked_at === null
          ? { ...invite, revoked_at: now.toISOString() }
          : invite,
      )
    : invites;
}

// New data for one cached query (`name` + `keys` as in the query key), or the
// same reference when the action does not touch it.
export function applyAction(
  name: string,
  keys: ReadonlyArray<unknown>,
  data: unknown,
  action: SocialAction,
  now: Date = new Date(),
): unknown {
  if (data === undefined || data === null) {
    return data;
  }
  switch (name) {
    case 'getFriendsOverview':
      return overviewWith(data as FriendsOverview, action, now);
    case 'getProfile':
      return typeof keys[0] === 'string'
        ? lookupWith(data as ProfileLookup, keys[0], action)
        : data;
    case 'getBlocked':
      return blockedWith(data as BlockedEntry[], action);
    case 'getInvites':
      return invitesWith(data as FriendInviteRow[], action, now);
    case 'getMyChallenges':
      return challengesWith(data as MyChallenges, action);
    case 'getChallengeBoard':
      return typeof keys[0] === 'string'
        ? boardWith(data as ChallengeBoard, keys[0], action)
        : data;
    case 'getNotifications': {
      // useInfiniteQuery data: { pages: NotificationPage[], pageParams }.
      const infinite = data as { pages?: NotificationPage[] };
      if (!Array.isArray(infinite.pages)) {
        return data;
      }
      return {
        ...infinite,
        pages: infinite.pages.map(page => ({
          ...page,
          items: notificationsWith(page.items, action, now),
        })),
      };
    }
    case 'getUnreadNotifications':
      return action.type === 'readAllNotifications' ? 0 : data;
    default:
      return data;
  }
}

// ── Optimistic run with rollback ──────────────────────────────────────────
// The part of the React Query client this needs (so it can be tested with a
// plain object).
export type SocialCache = {
  getQueriesData(filter: {
    queryKey: readonly unknown[];
  }): ReadonlyArray<readonly [readonly unknown[], unknown]>;
  setQueryData(key: readonly unknown[], data: unknown): void;
};

const SOCIAL_KEY = 'social';

export async function runOptimistic<T>(
  cache: SocialCache,
  action: SocialAction,
  execute: () => Promise<T>,
  now: Date = new Date(),
): Promise<T> {
  const snapshot = cache.getQueriesData({ queryKey: [SOCIAL_KEY] });
  const changed: (readonly [readonly unknown[], unknown])[] = [];
  snapshot.forEach(([key, data]) => {
    // key = ['social', scope, name, ...keys]
    const next = applyAction(String(key[2]), key.slice(3), data, action, now);
    if (next !== data) {
      cache.setQueryData(key, next);
      changed.push([key, data]);
    }
  });
  const rollback = () => changed.forEach(([key, data]) => cache.setQueryData(key, data));

  try {
    const result = await execute();
    if (shouldRollback(action, result)) {
      rollback();
    }
    return result;
  } catch (error) {
    rollback();
    throw error;
  }
}
