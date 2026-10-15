// Where a tap on a push notification goes (PUSH_SHAPES §4): the app decides
// from `data.type` + `entity_type` / `entity_id`, there is no deep link.

export type PushData = {
  type: string;
  notificationId: string | null;
  entityType: string | null;
  entityId: string | null;
};

export type PushTarget =
  | { kind: 'friends' }
  | { kind: 'profile'; userId: string }
  | { kind: 'post'; postId: string }
  | { kind: 'challenge'; challengeId: string }
  // The notification points to a comment: its post is read from the row of
  // the notification (social_notifications.post_id).
  | { kind: 'comment'; notificationId: string }
  | { kind: 'inbox' };

const str = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null);

// `data` of the payload as it arrives in the notification content. Anything
// that is not an object with a type is not ours: null.
export function parsePushData(value: unknown): PushData | null {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  const type = str(record?.type);
  if (!record || !type) {
    return null;
  }
  return {
    type,
    notificationId: str(record.notification_id),
    entityType: str(record.entity_type),
    entityId: str(record.entity_id),
  };
}

const CHALLENGE_TYPES = new Set([
  'challenge_invite',
  'challenge_started',
  'challenge_completed',
  'challenge_ending',
  'official_completed',
  'official_new',
]);

// A type this version does not know, or one without its entity, opens the
// inbox: it is always a safe place.
export function targetForPush(data: PushData): PushTarget {
  const { type, entityType, entityId } = data;
  switch (type) {
    case 'friend_request':
      return { kind: 'friends' };
    case 'friend_accepted':
      return entityId && (entityType === 'user' || entityType === null)
        ? { kind: 'profile', userId: entityId }
        : { kind: 'friends' };
    case 'post_like':
    case 'post_comment':
      if (entityId && entityType === 'post') {
        return { kind: 'post', postId: entityId };
      }
      return entityType === 'comment' && data.notificationId
        ? { kind: 'comment', notificationId: data.notificationId }
        : { kind: 'inbox' };
    case 'content_removed':
      return { kind: 'inbox' };
    default:
      if (CHALLENGE_TYPES.has(type) && entityId) {
        return { kind: 'challenge', challengeId: entityId };
      }
      return { kind: 'inbox' };
  }
}
