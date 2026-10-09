import {
  badgeLabel,
  destinationOf,
  groupNotifications,
  unreadCount,
  unreadIds,
  type SocialNotification,
} from '../src/features/social/notificationModel';
import {
  allowedActions,
  moderatorPermissions,
  parseModeratorRole,
  queueState,
  openQueue,
  serverQueueOrder,
  validateNote,
  type ModerationQueueRow,
} from '../src/features/social/moderationModel';

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 7, 12, 0) - minutes * 60_000).toISOString();
const actor = (id: string, name: string) => ({
  id, name, username: id, avatar_key: '', profile_photo_url: '', goal: '', weight: 0,
});

function note(
  id: string,
  type: SocialNotification['type'],
  minutes: number,
  extra: Partial<SocialNotification> = {},
): SocialNotification {
  return {
    id, type, actor_id: null, post_id: null, comment_id: null, challenge_id: null,
    request_id: null, read_at: null, created_at: at(minutes), actor: null, ...extra,
  };
}

describe('social notifications', () => {
  const items: SocialNotification[] = [
    note('n1', 'friend_request', 5, { actor: actor('d', 'Diego Luna'), actor_id: 'd', request_id: 'r1' }),
    note('n2', 'post_like', 10, { actor: actor('c', 'Carlos Ruiz'), actor_id: 'c', post_id: 'p7' }),
    note('n3', 'post_like', 20, { actor: actor('a', 'Andrea Molina'), actor_id: 'a', post_id: 'p7', read_at: at(1) }),
    note('n4', 'post_like', 30, { actor: actor('m', 'Mateo Vidal'), actor_id: 'm', post_id: 'p7' }),
    note('n5', 'post_like', 40, { actor: actor('s', 'Sofía Pérez'), actor_id: 's', post_id: 'p2' }),
    note('n6', 'challenge_invite', 50, { actor: actor('a', 'Andrea Molina'), actor_id: 'a', challenge_id: 'c9' }),
    note('n7', 'content_removed', 60, { read_at: null }),
    note('n8', 'friend_accepted', 70, { actor: actor('l', 'Lucía Ortega'), actor_id: 'l', read_at: at(5) }),
  ];

  it('groups the likes of one post into one line, newest first', () => {
    const groups = groupNotifications(items);
    expect(groups.map(group => group.key)).toEqual([
      'n1', 'likes-p7', 'likes-p2', 'n6', 'n7', 'n8',
    ]);
    const likes = groups.find(group => group.key === 'likes-p7')!;
    expect(likes.ids).toEqual(['n2', 'n3', 'n4']);
    expect(likes.text).toBe('Carlos, Andrea y 1 más dieron me gusta a tu publicación');
    expect(likes.destination).toEqual({ kind: 'post', postId: 'p7' });
    expect(groups.find(group => group.key === 'likes-p2')!.text).toBe('Sofía dio me gusta a tu publicación');
  });

  it('a grouped line is unread while any of its notifications is', () => {
    const groups = groupNotifications(items);
    expect(groups.find(group => group.key === 'likes-p7')!.unread).toBe(true);
    expect(groups.find(group => group.key === 'n8')!.unread).toBe(false);
    const allRead = groupNotifications(items.map(item => ({ ...item, read_at: at(0) })));
    expect(allRead.some(group => group.unread)).toBe(false);
  });

  it('counts unread notifications (not lines) and labels the badge', () => {
    expect(unreadCount(items)).toBe(6);
    expect(unreadCount([])).toBe(0);
    expect(badgeLabel(0)).toBeNull();
    expect(badgeLabel(6)).toBe('6');
    expect(badgeLabel(12)).toBe('9+');
  });

  it('marking as read covers every unread notification of the lines', () => {
    const groups = groupNotifications(items);
    expect(unreadIds(items).sort()).toEqual(['n1', 'n2', 'n4', 'n5', 'n6', 'n7']);
    // The likes line holds a read notification (n3): it is not marked again.
    const likes = groups.filter(group => group.key === 'likes-p7');
    expect(unreadIds(items, likes).sort()).toEqual(['n2', 'n4']);
    expect(unreadIds([])).toEqual([]);
  });

  it('writes the copy of each type and where it leads', () => {
    const groups = groupNotifications(items);
    const text = (key: string) => groups.find(group => group.key === key)!.text;
    expect(text('n1')).toBe('Diego quiere ser tu amigo');
    expect(text('n6')).toBe('Andrea te invita a un reto');
    expect(text('n7')).toBe('Retiramos una publicación tuya por incumplir las normas');
    expect(text('n8')).toBe('Lucía ya es tu amigo');
    expect(destinationOf(items[0])).toEqual({ kind: 'friends' });
    expect(destinationOf(items[5])).toEqual({ kind: 'challenge', challengeId: 'c9' });
    expect(destinationOf(items[6])).toEqual({ kind: 'none' });
    expect(destinationOf(items[7])).toEqual({ kind: 'profile', userId: 'l' });
  });
});

function row(extra: Partial<ModerationQueueRow>): ModerationQueueRow {
  return {
    author_id: 'u', author_prior_removals: 0, author_username: 'x', body: 'b',
    first_reported_at: at(100), hidden_at: null, last_reported_at: at(10),
    open_reports: 1, photo_path: null, post_id: 'p', post_type: 'workout',
    reasons: ['spam'], removed_at: null, target_id: 't', target_type: 'post', ...extra,
  };
}

describe('moderator permissions', () => {
  it('a normal user has no permission at all', () => {
    expect(moderatorPermissions(null)).toEqual({
      canSeePanel: false, canModerate: false, canManageModerators: false,
    });
    expect(allowedActions(row({}), null)).toEqual([]);
  });

  it('a moderator sees and moderates; only an admin manages moderators', () => {
    expect(moderatorPermissions('moderator')).toEqual({
      canSeePanel: true, canModerate: true, canManageModerators: false,
    });
    expect(moderatorPermissions('admin').canManageModerators).toBe(true);
  });

  it('only known roles count', () => {
    expect(parseModeratorRole('admin')).toBe('admin');
    expect(parseModeratorRole('moderator')).toBe('moderator');
    expect(parseModeratorRole('owner')).toBeNull();
    expect(parseModeratorRole(null)).toBeNull();
  });

  it('offers restore / remove for posts and comments and only dismiss for a user', () => {
    expect(allowedActions(row({}), 'moderator')).toEqual(['restore', 'remove']);
    expect(allowedActions(row({ hidden_at: at(5) }), 'moderator')).toEqual(['restore', 'remove']);
    expect(allowedActions(row({ target_type: 'comment', hidden_at: at(5) }), 'admin')).toEqual(['restore', 'remove']);
    expect(allowedActions(row({ target_type: 'user' }), 'moderator')).toEqual(['dismiss']);
    expect(allowedActions(row({ removed_at: at(1) }), 'moderator')).toEqual([]);
  });

  it('keeps the order of the view and drops what is removed', () => {
    const queue = openQueue([
      row({ target_id: 'x' }),
      row({ target_id: 'y', removed_at: at(1) }),
      row({ target_id: 'a' }),
    ]);
    expect(queue.map(item => item.target_id)).toEqual(['x', 'a']);
  });

  it('the sample data follows the order of the view: not hidden first, more reports, longest waiting', () => {
    const queue = serverQueueOrder([
      row({ target_id: 'a', open_reports: 1, first_reported_at: at(300) }),
      row({ target_id: 'b', open_reports: 3, hidden_at: at(5) }),
      row({ target_id: 'c', open_reports: 2, first_reported_at: at(500) }),
      row({ target_id: 'd', removed_at: at(1) }),
      row({ target_id: 'e', open_reports: 2, first_reported_at: at(900) }),
    ]);
    expect(queue.map(item => item.target_id)).toEqual(['e', 'c', 'a', 'd', 'b']);
    expect(queueState(row({ hidden_at: at(1) }))).toBe('hidden');
    expect(queueState(row({ removed_at: at(1) }))).toBe('removed');
    expect(queueState(row({}))).toBe('open');
  });

  it('limits the internal note to 500 characters', () => {
    expect(validateNote('  ')).toEqual({ ok: true, note: null });
    expect(validateNote(' acoso reiterado ')).toEqual({ ok: true, note: 'acoso reiterado' });
    expect(validateNote('x'.repeat(501))).toEqual({ ok: false });
  });
});
