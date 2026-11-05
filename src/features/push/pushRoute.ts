// Where a tap on a push notification goes (PUSH_SHAPES §4): the app decides
// from `data.type` + `entity_type` / `entity_id`, there is no deep link.

export type PushData = {
  type: string;
  notificationId: string | null;
  entityType: string | null;
  entityId: string | null;
  // coach-1 payload (coach_notification_data): link_id and, for
  // coach_routine_assigned, student_template_id. No entity_type/entity_id.
  linkId?: string | null;
  templateId?: string | null;
};

export type PushTarget =
  | { kind: 'friends' }
  | { kind: 'profile'; userId: string }
  | { kind: 'post'; postId: string }
  | { kind: 'challenge'; challengeId: string }
  // The notification points to a comment: its post is read from the row of
  // the notification (social_notifications.post_id).
  | { kind: 'comment'; notificationId: string }
  // A new follower without the user in the payload: the follower is the
  // actor of the notification row.
  | { kind: 'follower'; notificationId: string }
  | { kind: 'inbox' }
  // ATHELETE Coach (v2.20 §30.5).
  | { kind: 'coachStudents' }
  | { kind: 'coachStudent'; linkId: string }
  | { kind: 'routine'; workoutId: string }
  | { kind: 'workouts' }
  | { kind: 'nutrition' }
  // The other side ended the link. The payload has no role: the coach goes
  // to Mis alumnos, the student to Perfil (where "Tengo un coach" is back).
  | { kind: 'coachLinkEnded' };

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
    linkId: str(record.link_id),
    templateId: str(record.student_template_id),
  };
}

// coach_* pushes (6 types, COACH_SHAPES §7).
function coachTarget(data: PushData): PushTarget | null {
  const { type, linkId, templateId } = data;
  switch (type) {
    case 'coach_routine_assigned':
      return templateId ? { kind: 'routine', workoutId: templateId } : { kind: 'workouts' };
    case 'coach_nutrition_assigned':
      return { kind: 'nutrition' };
    case 'coach_invite_accepted':
    case 'coach_student_inactive':
      return linkId ? { kind: 'coachStudent', linkId } : { kind: 'coachStudents' };
    case 'coach_daily_digest':
      return { kind: 'coachStudents' };
    case 'coach_link_ended':
      return { kind: 'coachLinkEnded' };
    default:
      return null;
  }
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
  const coach = coachTarget(data);
  if (coach) {
    return coach;
  }
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
    case 'new_follower':
      if (entityId && (entityType === 'user' || entityType === null)) {
        return { kind: 'profile', userId: entityId };
      }
      return data.notificationId
        ? { kind: 'follower', notificationId: data.notificationId }
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
