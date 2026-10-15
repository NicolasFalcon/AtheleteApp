import { apnsEnvironment } from '../src/features/push/pushEnv';
import {
  isAlreadyThere,
  navigateToTarget,
  resolveTarget,
  type TargetChecks,
} from '../src/features/push/pushNavigation';
import { parsePushData, targetForPush, type PushData } from '../src/features/push/pushRoute';

const data = (type: string, entityType: string | null, entityId: string | null, notificationId: string | null = 'n1'): PushData => ({
  type, entityType, entityId, notificationId,
});

describe('type → screen of a tapped push', () => {
  it.each([
    ['friend_request', 'friend_request', 'r1', { kind: 'friends' }],
    ['friend_accepted', 'user', 'u1', { kind: 'profile', userId: 'u1' }],
    ['post_like', 'post', 'p1', { kind: 'post', postId: 'p1' }],
    ['post_comment', 'post', 'p1', { kind: 'post', postId: 'p1' }],
    ['post_comment', 'comment', 'c1', { kind: 'comment', notificationId: 'n1' }],
    ['challenge_invite', 'challenge', 'ch1', { kind: 'challenge', challengeId: 'ch1' }],
    ['challenge_started', 'challenge', 'ch1', { kind: 'challenge', challengeId: 'ch1' }],
    ['challenge_completed', 'challenge', 'ch1', { kind: 'challenge', challengeId: 'ch1' }],
    ['challenge_ending', 'challenge', 'ch1', { kind: 'challenge', challengeId: 'ch1' }],
    ['official_completed', 'challenge', 'ch2', { kind: 'challenge', challengeId: 'ch2' }],
    ['official_new', 'challenge', 'ch2', { kind: 'challenge', challengeId: 'ch2' }],
    ['content_removed', null, null, { kind: 'inbox' }],
  ])('%s (%s) → %j', (type, entityType, entityId, expected) => {
    expect(targetForPush(data(type, entityType, entityId))).toEqual(expected);
  });

  it('a type it does not know, or an entity that is missing, opens the inbox', () => {
    expect(targetForPush(data('brand_new', 'post', 'p1'))).toEqual({ kind: 'inbox' });
    expect(targetForPush(data('post_like', 'post', null))).toEqual({ kind: 'inbox' });
    expect(targetForPush(data('challenge_invite', 'challenge', null))).toEqual({ kind: 'inbox' });
  });

  it('reads the data of the payload, and ignores anything that is not ours', () => {
    expect(parsePushData({ type: 'post_like', notification_id: 'n', entity_type: 'post', entity_id: 'p' })).toEqual({
      type: 'post_like', notificationId: 'n', entityType: 'post', entityId: 'p',
    });
    expect(parsePushData({ foo: 1 })).toBeNull();
    expect(parsePushData(null)).toBeNull();
  });
});

describe('entity that no longer exists', () => {
  const checks = (overrides: Partial<TargetChecks>): TargetChecks => ({
    postExists: async () => true,
    challengeExists: async () => true,
    postOfNotification: async () => 'p9',
    ...overrides,
  });

  it('keeps the target when it is there', async () => {
    const target = { kind: 'post', postId: 'p1' } as const;
    expect(await resolveTarget(target, checks({}))).toEqual(target);
  });

  it('a deleted post or challenge opens the inbox', async () => {
    expect(await resolveTarget({ kind: 'post', postId: 'p1' }, checks({ postExists: async () => false }))).toEqual({ kind: 'inbox' });
    expect(
      await resolveTarget({ kind: 'challenge', challengeId: 'c' }, checks({ challengeExists: async () => false })),
    ).toEqual({ kind: 'inbox' });
  });

  it('a comment goes to its post; offline goes to the inbox', async () => {
    expect(await resolveTarget({ kind: 'comment', notificationId: 'n' }, checks({}))).toEqual({ kind: 'post', postId: 'p9' });
    const offline = checks({ postExists: async () => { throw new Error('offline'); } });
    expect(await resolveTarget({ kind: 'post', postId: 'p1' }, offline)).toEqual({ kind: 'inbox' });
  });
});

describe('navigation and banner', () => {
  it('navigates to the right route', () => {
    const calls: [string, object | undefined][] = [];
    const go = (name: string, params?: object) => calls.push([name, params]);
    navigateToTarget(go, { kind: 'post', postId: 'p1' });
    navigateToTarget(go, { kind: 'challenge', challengeId: 'c1' });
    navigateToTarget(go, { kind: 'profile', userId: 'u1' });
    navigateToTarget(go, { kind: 'inbox' });
    expect(calls).toEqual([
      ['SocialPost', { postId: 'p1' }],
      ['SocialChallenge', { challengeId: 'c1' }],
      ['SocialProfile', { userId: 'u1' }],
      ['SocialNotifications', undefined],
    ]);
  });

  it('no banner when the person is already on that screen', () => {
    expect(isAlreadyThere({ name: 'SocialPost', params: { postId: 'p1' } }, { kind: 'post', postId: 'p1' })).toBe(true);
    expect(isAlreadyThere({ name: 'SocialPost', params: { postId: 'p2' } }, { kind: 'post', postId: 'p1' })).toBe(false);
    expect(isAlreadyThere({ name: 'SocialNotifications' }, { kind: 'inbox' })).toBe(true);
    expect(isAlreadyThere({ name: 'SocialNotifications' }, { kind: 'post', postId: 'p1' })).toBe(false);
    expect(isAlreadyThere(undefined, { kind: 'inbox' })).toBe(false);
  });
});

describe('apns_env', () => {
  it('Debug is sandbox; production only in Release with APP_ENV=production', () => {
    expect(apnsEnvironment('development', true)).toBe('sandbox');
    expect(apnsEnvironment('production', true)).toBe('sandbox');
    expect(apnsEnvironment('development', false)).toBe('sandbox');
    expect(apnsEnvironment('production', false)).toBe('production');
  });
});

describe('inbox: the new challenge types', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { destinationOf, groupNotifications, parseNotificationType } = require('../src/features/social/notificationModel');
  const row = (type: string) => ({
    id: type, type, actor_id: null, actor: null, post_id: null, comment_id: null, challenge_id: 'ch1', request_id: null,
    read_at: null, created_at: '2026-10-14T10:00:00Z',
  });

  it.each(['challenge_completed', 'challenge_ending', 'official_completed', 'official_new'])('%s opens the challenge', type => {
    expect(parseNotificationType(type)).toBe(type);
    expect(destinationOf(row(type))).toEqual({ kind: 'challenge', challengeId: 'ch1' });
    expect(groupNotifications([row(type)])).toHaveLength(1);
  });
});
