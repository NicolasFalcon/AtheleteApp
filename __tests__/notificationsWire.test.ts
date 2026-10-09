import {
  badgeLabel,
  destinationOf,
  groupNotifications,
  mergeNotificationPages,
  nextNotificationCursor,
  notificationActorIds,
  parseNotificationType,
  parseNotifications,
  unreadCount,
  unreadIds,
  type SocialNotification,
} from '../src/features/social/notificationModel';
import { actionFor, applyAction } from '../src/features/social/relationMachine';
import type { SocialProfileRow } from '../src/features/social/socialTypes';

const profile = (id: string, name: string): SocialProfileRow => ({
  id,
  username: id,
  name,
  avatar_key: '',
  profile_photo_url: '',
  goal: '',
  weight: 0,
});
const PROFILES = new Map([
  ['carlos', profile('carlos', 'Carlos Ruiz')],
  ['andrea', profile('andrea', 'Andrea Mora')],
  ['diego', profile('diego', 'Diego Paz')],
]);

const row = (id: string, type: string, extra: Record<string, unknown> = {}) => ({
  id,
  recipient_id: 'me',
  actor_id: null,
  type,
  post_id: null,
  comment_id: null,
  challenge_id: null,
  request_id: null,
  dedupe_key: id,
  read_at: null,
  created_at: `2026-10-07T12:0${id.length}:00Z`,
  ...extra,
});

describe('notification types and their destination', () => {
  const rows = [
    row('n1', 'post_like', { actor_id: 'carlos', post_id: 'p1' }),
    row('n22', 'post_comment', { actor_id: 'andrea', post_id: 'p1', comment_id: 'c1' }),
    row('n333', 'friend_request', { actor_id: 'diego', request_id: 'r1' }),
    row('n4444', 'friend_accepted', { actor_id: 'carlos' }),
    row('n55555', 'challenge_invite', { actor_id: 'andrea', challenge_id: 'ch1' }),
    row('n666666', 'challenge_started', { actor_id: 'carlos', challenge_id: 'ch1' }),
    row('n7777777', 'content_removed'),
  ];
  const parsed = parseNotifications(rows, PROFILES);
  const dest = (type: string) => destinationOf(parsed.find(item => item.type === type) as SocialNotification);

  it('opens the right place for each of the seven types', () => {
    expect(parsed).toHaveLength(7);
    expect(dest('post_like')).toEqual({ kind: 'post', postId: 'p1' });
    expect(dest('post_comment')).toEqual({ kind: 'post', postId: 'p1' });
    expect(dest('friend_request')).toEqual({ kind: 'friends' });
    expect(dest('friend_accepted')).toEqual({ kind: 'profile', userId: 'carlos' });
    expect(dest('challenge_invite')).toEqual({ kind: 'challenge', challengeId: 'ch1' });
    expect(dest('challenge_started')).toEqual({ kind: 'challenge', challengeId: 'ch1' });
    expect(dest('content_removed')).toEqual({ kind: 'none' });
  });

  it('has no actor for content_removed, even if the row carried one', () => {
    const [removed] = parseNotifications([row('n8', 'content_removed', { actor_id: 'carlos' })], PROFILES);
    expect(removed.actor).toBeNull();
    expect(groupNotifications([removed])[0].actors).toEqual([]);
  });

  it('falls back when the target is missing', () => {
    const [like] = parseNotifications([row('n9', 'post_like', { actor_id: 'carlos' })], PROFILES);
    expect(destinationOf(like)).toEqual({ kind: 'none' });
    const [accepted] = parseNotifications([row('n10', 'friend_accepted')], PROFILES);
    expect(destinationOf(accepted)).toEqual({ kind: 'friends' });
  });

  it('ignores unknown types without failing', () => {
    expect(parseNotificationType('brand_new')).toBeNull();
    expect(parseNotificationType(undefined)).toBeNull();
    expect(parseNotificationType('post_liked')).toBe('post_like');
    const list = parseNotifications(
      [row('a1', 'brand_new', { actor_id: 'carlos' }), null, { id: 'x' }, row('a22', 'post_like', { post_id: 'p', actor_id: 'carlos' })],
      PROFILES,
    );
    expect(list.map(item => item.id)).toEqual(['a22']);
    expect(parseNotifications(null, PROFILES)).toEqual([]);
    // A type that slipped into the model is skipped by the grouping too.
    const forged = { ...list[0], id: 'z', type: 'future_type' } as unknown as SocialNotification;
    expect(groupNotifications([forged, list[0]])).toHaveLength(1);
  });

  it('collects the actors to ask for', () => {
    expect(notificationActorIds(rows).sort()).toEqual(['andrea', 'carlos', 'diego']);
  });
});

describe('grouping of likes', () => {
  const items = parseNotifications(
    [
      row('l1', 'post_like', { actor_id: 'carlos', post_id: 'p1', created_at: '2026-10-07T10:00:00Z' }),
      row('l2', 'post_like', { actor_id: 'andrea', post_id: 'p1', created_at: '2026-10-07T11:00:00Z', read_at: '2026-10-07T12:00:00Z' }),
      row('l3', 'post_like', { actor_id: 'diego', post_id: 'p1', created_at: '2026-10-07T09:00:00Z' }),
      row('l4', 'post_like', { actor_id: 'carlos', post_id: 'p2', created_at: '2026-10-07T08:00:00Z' }),
      row('c1', 'post_comment', { actor_id: 'carlos', post_id: 'p1', comment_id: 'k', created_at: '2026-10-07T13:00:00Z' }),
    ],
    PROFILES,
  );

  it('collapses the likes of one post into one line, newest first', () => {
    const groups = groupNotifications(items);
    expect(groups.map(group => group.key)).toEqual(['c1', 'likes-p1', 'likes-p2']);
    const likes = groups[1];
    expect(likes.ids.sort()).toEqual(['l1', 'l2', 'l3']);
    expect(likes.actors.map(actor => actor.id)).toEqual(['andrea', 'carlos', 'diego']);
    expect(likes.text).toBe('Andrea, Carlos y 1 más dieron me gusta a tu publicación');
    expect(likes.unread).toBe(true);
    expect(likes.destination).toEqual({ kind: 'post', postId: 'p1' });
  });

  it('counts unread notifications, not lines', () => {
    expect(unreadCount(items)).toBe(4);
    expect(unreadIds(items).sort()).toEqual(['c1', 'l1', 'l3', 'l4']);
    expect(badgeLabel(0)).toBeNull();
    expect(badgeLabel(4)).toBe('4');
    expect(badgeLabel(12)).toBe('9+');
  });
});

describe('paging', () => {
  it('has a next cursor only when the page was full', () => {
    const rows = [row('a1', 'post_like'), row('a2', 'post_like')];
    expect(nextNotificationCursor(rows, 2)).toBe(rows[1].created_at);
    expect(nextNotificationCursor(rows, 3)).toBeNull();
    expect(nextNotificationCursor(null, 3)).toBeNull();
  });

  it('merges pages without repeating a notification', () => {
    const a = parseNotifications([row('a1', 'post_like', { post_id: 'p' }), row('a2', 'post_like', { post_id: 'p' })], PROFILES);
    const b = parseNotifications([row('a2', 'post_like', { post_id: 'p' }), row('a3', 'post_like', { post_id: 'p' })], PROFILES);
    expect(mergeNotificationPages([{ items: a, nextCursor: 'x' }, { items: b, nextCursor: null }]).map(i => i.id)).toEqual(['a1', 'a2', 'a3']);
  });
});

describe('optimistic read and delete', () => {
  const items = parseNotifications(
    [row('a1', 'post_like', { post_id: 'p' }), row('a22', 'post_like', { post_id: 'p', read_at: '2026-10-07T00:00:00Z' })],
    PROFILES,
  );
  const cache = { pages: [{ items, nextCursor: null }], pageParams: [null] };
  const now = new Date('2026-10-08T00:00:00Z');

  it('maps the service calls', () => {
    expect(actionFor('markNotificationsRead', [['a1']])).toEqual({ type: 'readNotifications', ids: ['a1'] });
    expect(actionFor('markNotificationsRead', [[]])).toBeNull();
    expect(actionFor('markAllNotificationsRead', [])).toEqual({ type: 'readAllNotifications' });
    expect(actionFor('deleteNotifications', [['a1']])).toEqual({ type: 'deleteNotifications', ids: ['a1'] });
  });

  it('marks one, all, and deletes inside the cached pages', () => {
    const read = applyAction('getNotifications', [], cache, { type: 'readNotifications', ids: ['a1'] }, now) as typeof cache;
    expect(read.pages[0].items[0].read_at).toBe(now.toISOString());
    // An already read one keeps its date.
    expect(read.pages[0].items[1].read_at).toBe('2026-10-07T00:00:00Z');
    const all = applyAction('getNotifications', [], cache, { type: 'readAllNotifications' }, now) as typeof cache;
    expect(unreadCount(all.pages[0].items)).toBe(0);
    const removed = applyAction('getNotifications', [], cache, { type: 'deleteNotifications', ids: ['a1'] }, now) as typeof cache;
    expect(removed.pages[0].items.map(item => item.id)).toEqual(['a22']);
  });

  it('zeroes the bell when everything is read', () => {
    expect(applyAction('getUnreadNotifications', [], 4, { type: 'readAllNotifications' }, now)).toBe(0);
    expect(applyAction('getUnreadNotifications', [], 4, { type: 'deleteNotifications', ids: ['a1'] }, now)).toBe(4);
  });
});
