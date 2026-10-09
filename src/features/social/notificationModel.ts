import { firstName } from '@app/features/social/socialModel';
import { timeAgo } from '@app/features/social/postModel';
import type { Tables } from '@app/types/supabase';
import type { SocialProfileRow } from '@app/features/social/socialTypes';

// Pure model of the social notifications (tanda C). Table:
// `social_notifications` (SOCIAL_SCHEMA_PROPOSAL §4.11); in-app only, no push
// (Q10). The copy is built here from the type and the actor.

export type SocialNotificationRow = Tables<'social_notifications'>;

// The seven types the server writes (SOCIAL_RPC_SHAPES, W6). Any other value
// is ignored, never an error: a newer server can add types.
export const NOTIFICATION_TYPES = [
  'friend_request',
  'friend_accepted',
  'post_like',
  'post_comment',
  'challenge_invite',
  'challenge_started',
  'content_removed',
] as const;

export type SocialNotificationType = (typeof NOTIFICATION_TYPES)[number];

// The one spelling the sample payload of the docs uses for a like.
const TYPE_ALIASES: Record<string, SocialNotificationType> = { post_liked: 'post_like' };

export function parseNotificationType(value: unknown): SocialNotificationType | null {
  if (typeof value !== 'string') {
    return null;
  }
  const known = (NOTIFICATION_TYPES as readonly string[]).includes(value)
    ? (value as SocialNotificationType)
    : null;
  return known ?? TYPE_ALIASES[value] ?? null;
}

export type SocialNotification = Pick<
  SocialNotificationRow,
  | 'id'
  | 'actor_id'
  | 'post_id'
  | 'comment_id'
  | 'challenge_id'
  | 'request_id'
  | 'read_at'
  | 'created_at'
> & {
  type: SocialNotificationType;
  actor: SocialProfileRow | null;
};

export type NotificationPage = {
  items: SocialNotification[];
  // `created_at` of the last row when there may be more; null at the end.
  nextCursor: string | null;
};

export type NotificationDestination =
  | { kind: 'friends' }
  | { kind: 'profile'; userId: string }
  | { kind: 'post'; postId: string }
  | { kind: 'challenge'; challengeId: string }
  | { kind: 'none' };

export type NotificationGroup = {
  key: string;
  type: SocialNotificationType;
  // Every notification the line stands for (likes on one post share a line).
  ids: string[];
  actors: SocialProfileRow[];
  text: string;
  unread: boolean;
  createdAt: string;
  destination: NotificationDestination;
};

export function isUnread(item: Pick<SocialNotification, 'read_at'>): boolean {
  return item.read_at === null;
}

// Number of unread notifications (not of lines) for the bell badge.
export function unreadCount(items: SocialNotification[]): number {
  return items.filter(isUnread).length;
}

// "9+" past nine; nothing at zero.
export function badgeLabel(count: number): string | null {
  return count <= 0 ? null : count > 9 ? '9+' : String(count);
}

function names(actors: SocialProfileRow[]): string {
  const first = actors.slice(0, 2).map(actor => firstName(actor.name));
  const rest = actors.length - first.length;
  if (rest > 0) {
    return `${first.join(', ')} y ${rest} más`;
  }
  return first.length === 2 ? `${first[0]} y ${first[1]}` : first[0] ?? 'Alguien';
}

function textFor(
  type: SocialNotificationType,
  actors: SocialProfileRow[],
): string {
  const who = names(actors);
  const many = actors.length > 1;

  switch (type) {
    case 'friend_request':
      return `${who} quiere ser tu amigo`;
    case 'friend_accepted':
      return `${who} ya es tu amigo`;
    case 'post_like':
      return `${who} ${many ? 'dieron' : 'dio'} me gusta a tu publicación`;
    case 'post_comment':
      return `${who} comentó tu publicación`;
    case 'challenge_invite':
      return `${who} te invita a un reto`;
    case 'challenge_started':
      return 'Tu reto entre amigos ha empezado';
    case 'content_removed':
      return 'Retiramos una publicación tuya por incumplir las normas';
  }
}

export function destinationOf(item: SocialNotification): NotificationDestination {
  switch (item.type) {
    case 'friend_request':
      return { kind: 'friends' };
    case 'friend_accepted':
      return item.actor_id ? { kind: 'profile', userId: item.actor_id } : { kind: 'friends' };
    case 'post_like':
    case 'post_comment':
      return item.post_id ? { kind: 'post', postId: item.post_id } : { kind: 'none' };
    case 'challenge_invite':
    case 'challenge_started':
      return item.challenge_id
        ? { kind: 'challenge', challengeId: item.challenge_id }
        : { kind: 'none' };
    // Moderation removed something of mine: there is no actor and no
    // destination (the content is gone).
    case 'content_removed':
      return { kind: 'none' };
    default:
      return { kind: 'none' };
  }
}

// Newest first. Likes on the same post collapse into one line ("Carlos y 2
// más…"); everything else is one line per notification. A line is unread while
// any of its notifications is.
export function groupNotifications(items: SocialNotification[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  const likes = new Map<string, SocialNotification[]>();

  items.forEach(item => {
    // A type this version does not know is skipped without failing.
    if (parseNotificationType(item.type) === null) {
      return;
    }
    if (item.type === 'post_like' && item.post_id) {
      likes.set(item.post_id, [...(likes.get(item.post_id) ?? []), item]);
      return;
    }
    const actors = item.actor ? [item.actor] : [];
    groups.push({
      key: item.id,
      type: item.type,
      ids: [item.id],
      actors,
      text: textFor(item.type, actors),
      unread: isUnread(item),
      createdAt: item.created_at,
      destination: destinationOf(item),
    });
  });

  likes.forEach((rows, postId) => {
    const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const actors = sorted
      .map(row => row.actor)
      .filter((actor): actor is SocialProfileRow => Boolean(actor))
      .filter((actor, index, all) => all.findIndex(a => a.id === actor.id) === index);
    groups.push({
      key: `likes-${postId}`,
      type: 'post_like',
      ids: sorted.map(row => row.id),
      actors,
      text: textFor('post_like', actors),
      unread: sorted.some(isUnread),
      createdAt: sorted[0].created_at,
      destination: { kind: 'post', postId },
    });
  });

  return groups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function notificationWhen(group: NotificationGroup, now: Date = new Date()): string {
  return timeAgo(group.createdAt, now);
}

// Ids to mark as read: the unread notifications, optionally only those of the
// given lines (a grouped line also holds notifications that were already read).
export function unreadIds(
  items: SocialNotification[],
  groups?: NotificationGroup[],
): string[] {
  const scope = groups ? new Set(groups.flatMap(group => group.ids)) : null;
  return items
    .filter(item => isUnread(item) && (!scope || scope.has(item.id)))
    .map(item => item.id);
}

// ── Rows of the table → models ─────────────────────────────────────────────
const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

// The ids of the actors that need a profile.
export function notificationActorIds(rows: unknown): string[] {
  const ids = new Set<string>();
  (Array.isArray(rows) ? rows : []).forEach(row => {
    const id = asString((row as { actor_id?: unknown } | null)?.actor_id);
    if (id) {
      ids.add(id);
    }
  });
  return Array.from(ids);
}

// Rows of `social_notifications` (newest first) to the models. A row with an
// unknown type or no id/date is dropped; an actor without profile stays null.
export function parseNotifications(
  rows: unknown,
  profiles: Map<string, SocialProfileRow>,
): SocialNotification[] {
  return (Array.isArray(rows) ? rows : []).flatMap((value): SocialNotification[] => {
    const row = (value ?? {}) as Record<string, unknown>;
    const type = parseNotificationType(row.type);
    const id = asString(row.id);
    const createdAt = asString(row.created_at);
    if (!type || !id || !createdAt) {
      return [];
    }
    const actorId = asString(row.actor_id);
    return [
      {
        id,
        type,
        actor_id: actorId,
        post_id: asString(row.post_id),
        comment_id: asString(row.comment_id),
        challenge_id: asString(row.challenge_id),
        request_id: asString(row.request_id),
        read_at: asString(row.read_at),
        created_at: createdAt,
        // content_removed has no actor.
        actor: type === 'content_removed' || !actorId ? null : (profiles.get(actorId) ?? null),
      },
    ];
  });
}

export const NOTIFICATIONS_PAGE_SIZE = 30;

// The cursor of the next page: the date of the last row, or null when the
// page was not full (there is nothing else). Counts the dropped rows too.
export function nextNotificationCursor(rows: unknown, limit: number): string | null {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length < limit) {
    return null;
  }
  return asString((list[list.length - 1] as { created_at?: unknown } | null)?.created_at);
}

// Pages already loaded + a new one, without repeating a notification.
export function mergeNotificationPages(pages: NotificationPage[]): SocialNotification[] {
  const seen = new Set<string>();
  return pages
    .flatMap(page => page.items)
    .filter(item => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}
