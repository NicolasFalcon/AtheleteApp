import {
  actionFor,
  applyAction,
  optimisticRelation,
  runOptimistic,
  settleRelation,
  shouldRollback,
  type PersonAction,
  type SocialAction,
  type SocialCache,
} from '../src/features/social/relationMachine';
import type {
  BlockedEntry,
  FriendInviteRow,
  FriendsOverview,
  RelationshipState,
  SocialProfileRow,
} from '../src/features/social/socialTypes';
import type { ProfileLookup } from '../src/services/social/socialService';

const person = (id: string): SocialProfileRow => ({
  id,
  username: id,
  name: id.toUpperCase(),
  avatar_key: '',
  profile_photo_url: '',
  goal: '',
  weight: 0,
});

const NOW = new Date('2026-10-07T12:00:00Z');

function overview(): FriendsOverview {
  return {
    friends: [
      { profile: person('ana'), friendsSince: '2026-06-01T00:00:00Z', lastActivity: null },
    ],
    received: [
      {
        request: { id: 'r-in', sender_id: 'bruno', receiver_id: 'me', status: 'pending', created_at: '', responded_at: null },
        profile: person('bruno'),
      },
    ],
    sent: [
      {
        request: { id: 'r-out', sender_id: 'me', receiver_id: 'carla', status: 'pending', created_at: '', responded_at: null },
        profile: person('carla'),
      },
    ],
    activeChallenges: 0,
    pendingInvitations: 0,
  };
}

function lookup(relationship: RelationshipState, requestId: string | null = null): ProfileLookup {
  return {
    profile: person('x'),
    detail:
      relationship === 'blocked'
        ? { relationship: 'none', streak_days: 1, hidden_categories: ['nutrition'] }
        : {
            relationship: relationship,
            streak_days: 1,
            hidden_categories: ['nutrition'],
          },
    acceptsRequests: true,
    blocked: relationship === 'blocked',
    requestId,
  };
}

describe('relationship after each action (optimistic)', () => {
  const cases: [RelationshipState, PersonAction, RelationshipState][] = [
    ['none', 'send', 'request_sent'],
    ['request_received', 'send', 'friends'],
    ['request_received', 'accept', 'friends'],
    ['request_received', 'decline', 'none'],
    ['request_sent', 'cancel', 'none'],
    ['friends', 'remove', 'none'],
    ['friends', 'block', 'blocked'],
    ['none', 'block', 'blocked'],
    ['request_sent', 'block', 'blocked'],
    ['blocked', 'unblock', 'none'],
  ];
  it.each(cases)('%s + %s → %s', (from, action, to) => {
    expect(optimisticRelation(from, action)).toBe(to);
  });

  it('ignores actions that do not apply to the current state', () => {
    expect(optimisticRelation('friends', 'send')).toBe('friends');
    expect(optimisticRelation('none', 'accept')).toBe('none');
    expect(optimisticRelation('none', 'remove')).toBe('none');
    expect(optimisticRelation('friends', 'unblock')).toBe('friends');
    expect(optimisticRelation('self', 'block')).toBe('self');
  });
});

describe('relationship once the server answered', () => {
  it('keeps what the server decided for a request', () => {
    expect(settleRelation('none', 'send', { kind: 'ok', status: 'sent' })).toBe('request_sent');
    expect(settleRelation('none', 'send', { kind: 'ok', status: 'pending' })).toBe('request_sent');
    // The other person had already sent one: it is accepted.
    expect(settleRelation('none', 'send', { kind: 'ok', status: 'accepted' })).toBe('friends');
    expect(settleRelation('none', 'send', { kind: 'ok', status: 'already_friends' })).toBe('friends');
  });

  it('goes back when the server refuses the request', () => {
    ['not_accepting', 'unavailable', 'invalid'].forEach(status => {
      expect(
        settleRelation('none', 'send', {
          kind: 'ok',
          status: status as 'invalid',
        }),
      ).toBe('none');
    });
  });

  it('goes back to the previous state when the request fails', () => {
    const actions: PersonAction[] = ['send', 'accept', 'decline', 'cancel', 'remove', 'block', 'unblock'];
    actions.forEach(action => {
      expect(settleRelation('friends', action, { kind: 'error' })).toBe('friends');
      expect(settleRelation('request_received', action, { kind: 'error' })).toBe('request_received');
    });
  });

  it('handles a request that disappeared meanwhile', () => {
    expect(settleRelation('request_received', 'accept', { kind: 'ok', status: 'not_found' })).toBe('none');
    expect(settleRelation('request_received', 'decline', { kind: 'ok', status: 'declined' })).toBe('none');
    expect(settleRelation('request_received', 'accept', { kind: 'ok', status: 'accepted' })).toBe('friends');
  });

  it('settles the rest of the writes on their target', () => {
    expect(settleRelation('request_sent', 'cancel', { kind: 'ok' })).toBe('none');
    expect(settleRelation('friends', 'remove', { kind: 'ok' })).toBe('none');
    expect(settleRelation('friends', 'block', { kind: 'ok' })).toBe('blocked');
    expect(settleRelation('blocked', 'unblock', { kind: 'ok' })).toBe('none');
  });
});

describe('service calls as actions', () => {
  it('maps each write to its action and ignores the rest', () => {
    expect(actionFor('sendFriendRequest', ['u1'])).toEqual({ type: 'send', target: 'u1' });
    expect(actionFor('respondFriendRequest', ['r1', true])).toEqual({ type: 'accept', requestId: 'r1' });
    expect(actionFor('respondFriendRequest', ['r1', false])).toEqual({ type: 'decline', requestId: 'r1' });
    expect(actionFor('cancelFriendRequest', ['r1'])).toEqual({ type: 'cancel', requestId: 'r1' });
    expect(actionFor('removeFriend', ['u1'])).toEqual({ type: 'remove', friendId: 'u1' });
    expect(actionFor('blockUser', ['u1'])).toEqual({ type: 'block', target: 'u1' });
    expect(actionFor('unblockUser', ['u1'])).toEqual({ type: 'unblock', target: 'u1' });
    expect(actionFor('revokeInvite', ['i1'])).toEqual({ type: 'revokeInvite', inviteId: 'i1' });
    expect(actionFor('createInvite', [])).toBeNull();
    expect(actionFor('sendFriendRequest', [])).toBeNull();
  });

  it('rolls back only a refused result', () => {
    const send: SocialAction = { type: 'send', target: 'u' };
    expect(shouldRollback(send, 'sent')).toBe(false);
    expect(shouldRollback(send, 'accepted')).toBe(false);
    expect(shouldRollback(send, 'not_accepting')).toBe(true);
    expect(shouldRollback(send, 'unavailable')).toBe(true);
    expect(shouldRollback({ type: 'remove', friendId: 'u' }, false)).toBe(true);
    expect(shouldRollback({ type: 'remove', friendId: 'u' }, true)).toBe(false);
    expect(shouldRollback({ type: 'block', target: 'u' }, undefined)).toBe(false);
  });
});

describe('what each action does to the cache', () => {
  it('accepting moves the request to the friends', () => {
    const next = applyAction('getFriendsOverview', [], overview(), { type: 'accept', requestId: 'r-in' }, NOW) as FriendsOverview;
    expect(next.received).toHaveLength(0);
    expect(next.friends.map(item => item.profile.id)).toEqual(['bruno', 'ana']);
    expect(next.friends[0].friendsSince).toBe(NOW.toISOString());
  });

  it('declining, cancelling and removing take the person out of their list', () => {
    const decline = applyAction('getFriendsOverview', [], overview(), { type: 'decline', requestId: 'r-in' }) as FriendsOverview;
    expect(decline.received).toHaveLength(0);
    expect(decline.friends).toHaveLength(1);
    const cancel = applyAction('getFriendsOverview', [], overview(), { type: 'cancel', requestId: 'r-out' }) as FriendsOverview;
    expect(cancel.sent).toHaveLength(0);
    const remove = applyAction('getFriendsOverview', [], overview(), { type: 'remove', friendId: 'ana' }) as FriendsOverview;
    expect(remove.friends).toHaveLength(0);
  });

  it('blocking removes the person from friends, received and sent', () => {
    ['ana', 'bruno', 'carla'].forEach(id => {
      const next = applyAction('getFriendsOverview', [], overview(), { type: 'block', target: id }) as FriendsOverview;
      const ids = [
        ...next.friends.map(item => item.profile.id),
        ...next.received.map(item => item.profile.id),
        ...next.sent.map(item => item.profile.id),
      ];
      expect(ids).not.toContain(id);
      expect(ids).toHaveLength(2);
    });
  });

  it('updates the profile of that person only', () => {
    const none = lookup('none');
    const sent = applyAction('getProfile', ['x'], none, { type: 'send', target: 'x' }) as ProfileLookup;
    expect(sent.detail?.relationship).toBe('request_sent');
    // Another profile is left alone (same reference).
    expect(applyAction('getProfile', ['other'], none, { type: 'send', target: 'x' })).toBe(none);

    const received = lookup('request_received', 'r1');
    const accepted = applyAction('getProfile', ['x'], received, { type: 'accept', requestId: 'r1' }) as ProfileLookup;
    expect(accepted.detail?.relationship).toBe('friends');
    expect(accepted.requestId).toBeNull();
    const declined = applyAction('getProfile', ['x'], received, { type: 'decline', requestId: 'r1' }) as ProfileLookup;
    expect(declined.detail?.relationship).toBe('none');

    const removed = applyAction('getProfile', ['x'], lookup('friends'), { type: 'remove', friendId: 'x' }) as ProfileLookup;
    expect(removed.detail?.relationship).toBe('none');
  });

  it('blocks and unblocks on the profile through the blocked flag', () => {
    const blocked = applyAction('getProfile', ['x'], lookup('friends'), { type: 'block', target: 'x' }) as ProfileLookup;
    expect(blocked.blocked).toBe(true);
    expect(blocked.requestId).toBeNull();
    const unblocked = applyAction('getProfile', ['x'], blocked, { type: 'unblock', target: 'x' }) as ProfileLookup;
    expect(unblocked.blocked).toBe(false);
    expect(unblocked.detail?.relationship).toBe('none');
  });

  it('unblocking removes the entry of the blocked list', () => {
    const entries: BlockedEntry[] = [
      { block: { blocker_id: 'me', blocked_id: 'a', created_at: '' }, profile: null },
      { block: { blocker_id: 'me', blocked_id: 'b', created_at: '' }, profile: null },
    ];
    const next = applyAction('getBlocked', [], entries, { type: 'unblock', target: 'a' }) as BlockedEntry[];
    expect(next.map(entry => entry.block.blocked_id)).toEqual(['b']);
  });

  it('revoking marks the link as revoked, only if it was not used', () => {
    const base = { inviter_id: 'me', created_at: '', expires_at: '', used_by: null };
    const invites: FriendInviteRow[] = [
      { ...base, id: 'i1', token: 't1', used_at: null, revoked_at: null },
      { ...base, id: 'i2', token: 't2', used_at: '2026-10-01T00:00:00Z', revoked_at: null },
    ];
    const next = applyAction('getInvites', [], invites, { type: 'revokeInvite', inviteId: 'i1' }, NOW) as FriendInviteRow[];
    expect(next[0].revoked_at).toBe(NOW.toISOString());
    const used = applyAction('getInvites', [], invites, { type: 'revokeInvite', inviteId: 'i2' }, NOW) as FriendInviteRow[];
    expect(used[1].revoked_at).toBeNull();
  });

  it('does not touch other queries', () => {
    const data = { anything: 1 };
    expect(applyAction('getSettings', [], data, { type: 'block', target: 'x' })).toBe(data);
    expect(applyAction('getFriendsOverview', [], undefined, { type: 'block', target: 'x' })).toBeUndefined();
  });
});

// A plain object standing in for the React Query client.
function fakeCache(initial: [readonly unknown[], unknown][]): SocialCache & {
  read(key: readonly unknown[]): unknown;
} {
  const store = new Map<string, { key: readonly unknown[]; data: unknown }>(
    initial.map(([key, data]) => [JSON.stringify(key), { key, data }]),
  );
  return {
    getQueriesData: () => Array.from(store.values()).map(item => [item.key, item.data] as const),
    setQueryData: (key, data) => {
      store.set(JSON.stringify(key), { key, data });
    },
    read: key => store.get(JSON.stringify(key))?.data,
  };
}

describe('optimistic run with rollback', () => {
  const OVERVIEW_KEY = ['social', 'me', 'getFriendsOverview'];
  const PROFILE_KEY = ['social', 'me', 'getProfile', 'bruno'];

  const setup = () => {
    const before = overview();
    const profile = lookup('request_received', 'r-in');
    return { before, profile, cache: fakeCache([[OVERVIEW_KEY, before], [PROFILE_KEY, profile]]) };
  };

  it('shows the result at once and keeps it when the request works', async () => {
    const { cache } = setup();
    let seenDuringRequest: FriendsOverview | null = null;
    const result = await runOptimistic(cache, { type: 'accept', requestId: 'r-in' }, async () => {
      seenDuringRequest = cache.read(OVERVIEW_KEY) as FriendsOverview;
      return 'accepted';
    }, NOW);
    expect(result).toBe('accepted');
    expect(seenDuringRequest!.received).toHaveLength(0);
    expect((cache.read(OVERVIEW_KEY) as FriendsOverview).friends).toHaveLength(2);
    expect((cache.read(PROFILE_KEY) as ProfileLookup).detail?.relationship).toBe('friends');
  });

  it('puts the previous data back when the request fails', async () => {
    const { before, profile, cache } = setup();
    await expect(
      runOptimistic(cache, { type: 'accept', requestId: 'r-in' }, async () => {
        throw new Error('sin conexión');
      }, NOW),
    ).rejects.toThrow('sin conexión');
    expect(cache.read(OVERVIEW_KEY)).toBe(before);
    expect(cache.read(PROFILE_KEY)).toBe(profile);
  });

  it('puts the previous data back when the server refuses a request', async () => {
    const none = lookup('none');
    const key = ['social', 'me', 'getProfile', 'x'];
    const cache = fakeCache([[key, none]]);
    let during: ProfileLookup | null = null;
    const result = await runOptimistic(cache, { type: 'send', target: 'x' }, async () => {
      during = cache.read(key) as ProfileLookup;
      return 'not_accepting';
    });
    expect(result).toBe('not_accepting');
    expect(during!.detail?.relationship).toBe('request_sent');
    expect(cache.read(key)).toBe(none);
  });

  it('blocking goes back too when it fails', async () => {
    const { before, profile, cache } = setup();
    await expect(
      runOptimistic(cache, { type: 'block', target: 'bruno' }, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(cache.read(OVERVIEW_KEY)).toBe(before);
    expect(cache.read(PROFILE_KEY)).toBe(profile);
  });

  it('only restores what it changed', async () => {
    const cache = fakeCache([[['social', 'me', 'getSettings'], { a: 1 }]]);
    const settings = cache.read(['social', 'me', 'getSettings']);
    await expect(
      runOptimistic(cache, { type: 'block', target: 'u' }, async () => {
        throw new Error('x');
      }),
    ).rejects.toThrow();
    expect(cache.read(['social', 'me', 'getSettings'])).toBe(settings);
  });
});
