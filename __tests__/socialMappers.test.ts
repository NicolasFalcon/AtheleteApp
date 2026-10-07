import {
  buildBlocked,
  buildFriendsOverview,
  friendIdOf,
  interpretUsernameRpc,
  overviewPersonIds,
  parseChallengeCounts,
  parseFindUser,
  parseFriendActivity,
  parseProfileDetail,
  profileMap,
  toSetUsernameResult,
  usernameErrorFromPostgres,
  usernameErrorFromText,
  type FriendshipRow,
} from '../src/features/social/socialMappers';
import type {
  FriendRequestRow,
  UserBlockRow,
} from '../src/features/social/socialTypes';

const ME = 'me';

const profileRows = [
  {
    id: 'ana',
    username: 'ana.ruiz',
    name: 'Ana Ruiz',
    avatar_key: 'avatar_female_01',
    profile_photo_url: '',
    goal: 'performance',
    weight: 58,
  },
  { id: 'bruno', username: 'bruno', name: 'Bruno', avatar_key: null, goal: null },
];

describe('username responses', () => {
  it('reads ensure_social_settings and set_username', () => {
    expect(interpretUsernameRpc({ created: true, username: 'ana.ruiz' })).toEqual({
      kind: 'ok',
      username: 'ana.ruiz',
      created: true,
    });
    expect(interpretUsernameRpc({ ok: true, username: 'ana.ruiz' })).toEqual({
      kind: 'ok',
      username: 'ana.ruiz',
      created: null,
    });
  });

  it('maps the server errors of the format and the duplicate', () => {
    expect(interpretUsernameRpc({ error: 'invalid_username' })).toEqual({
      kind: 'error',
      error: 'invalid_username',
    });
    expect(interpretUsernameRpc({ error: 'username_taken' })).toEqual({
      kind: 'error',
      error: 'username_taken',
    });
    expect(usernameErrorFromText('duplicate key value')).toBe('username_taken');
    expect(usernameErrorFromText('violates check constraint')).toBe(
      'invalid_username',
    );
    expect(usernameErrorFromText('boom')).toBeNull();
  });

  it('maps unique and check violations of PostgREST', () => {
    expect(usernameErrorFromPostgres({ code: '23505' })).toBe('username_taken');
    expect(usernameErrorFromPostgres({ code: '23514' })).toBe('invalid_username');
    expect(usernameErrorFromPostgres({ code: '08006', message: 'down' })).toBeNull();
    expect(usernameErrorFromPostgres(null)).toBeNull();
  });

  it('does not invent a result for an unexpected response', () => {
    expect(interpretUsernameRpc(null)).toEqual({ kind: 'unknown' });
    expect(interpretUsernameRpc({ error: 'something_else' })).toEqual({
      kind: 'unknown',
    });
    expect(toSetUsernameResult({ kind: 'unknown' }, 'ana')).toBeNull();
    expect(
      toSetUsernameResult({ kind: 'ok', username: 'ana.ruiz', created: true }, 'x'),
    ).toEqual({ ok: true, username: 'ana.ruiz' });
    expect(
      toSetUsernameResult({ kind: 'error', error: 'username_taken' }, 'x'),
    ).toEqual({ ok: false, error: 'username_taken' });
  });
});

describe('find_user_by_username', () => {
  it('maps the found person', () => {
    expect(
      parseFindUser({
        user_id: 'ana',
        username: 'ana.ruiz',
        name: 'Ana Ruiz',
        avatar_key: 'avatar_female_01',
        accepts_requests: false,
        relationship: 'request_sent',
      }),
    ).toEqual({
      user_id: 'ana',
      username: 'ana.ruiz',
      name: 'Ana Ruiz',
      avatar_key: 'avatar_female_01',
      accepts_requests: false,
      relationship: 'request_sent',
    });
  });

  it('is null when nobody is found or the answer is not a person', () => {
    expect(parseFindUser(null)).toBeNull();
    expect(parseFindUser({})).toBeNull();
    expect(parseFindUser([])).toBeNull();
  });

  it('falls back to safe values for missing fields', () => {
    expect(parseFindUser({ user_id: 'ana', username: 'ana' })).toMatchObject({
      name: 'ana',
      avatar_key: null,
      accepts_requests: true,
      relationship: 'none',
    });
  });
});

describe('get_social_profile', () => {
  it('maps a profile and keeps nutrition hidden', () => {
    const detail = parseProfileDetail({
      relationship: 'friends',
      streak_days: 12,
      hidden_categories: ['photos', 'unknown'],
      friends_since: '2026-05-01T10:00:00Z',
      sessions_total: 40,
      badges_total: 7,
      records: [
        { exercise_name: 'Press banca', value: 100, unit: 'kg', reps: 1, is_new: true },
        { value: 5 },
      ],
      recent_posts: [
        { id: 'p1', type: 'record', title: '100 kg' },
        { post_id: 'p2', type: 'workout', summary: { title: 'Pierna' } },
        { id: 'p3', type: 'invented', title: 'x' },
      ],
    });
    expect(detail).toEqual({
      relationship: 'friends',
      streak_days: 12,
      hidden_categories: ['photos', 'nutrition'],
      friends_since: '2026-05-01T10:00:00Z',
      sessions_total: 40,
      badges_total: 7,
      records: [
        { exercise_name: 'Press banca', value: 100, unit: 'kg', reps: 1, is_new: true },
      ],
      recent_posts: [
        { id: 'p1', type: 'record', title: '100 kg' },
        { id: 'p2', type: 'workout', title: 'Pierna' },
      ],
    });
  });

  it('never returns retos en común, even if the server sent them', () => {
    const detail = parseProfileDetail({
      relationship: 'friends',
      streak_days: 1,
      common_challenges: [{ id: 'c', title: 'x', progress: 1, goal: 2 }],
    });
    expect(detail).not.toHaveProperty('common_challenges');
  });

  it('omits what the viewer may not see', () => {
    expect(
      parseProfileDetail({ relationship: 'none', streak_days: 3, hidden_categories: [] }),
    ).toEqual({
      relationship: 'none',
      streak_days: 3,
      hidden_categories: ['nutrition'],
    });
  });

  it('is null (no disponible) when the answer is not a profile', () => {
    expect(parseProfileDetail(null)).toBeNull();
    expect(parseProfileDetail({ error: 'not_available' })).toBeNull();
    expect(parseProfileDetail({ streak_days: 3 })).toBeNull();
  });
});

describe('get_social_profiles', () => {
  it('indexes the rows by id and tolerates incomplete ones', () => {
    const map = profileMap(profileRows);
    expect(map.get('ana')?.name).toBe('Ana Ruiz');
    expect(map.get('bruno')).toMatchObject({
      name: 'Bruno',
      avatar_key: '',
      goal: '',
      weight: 0,
    });
    expect(profileMap(null).size).toBe(0);
  });
});

describe('friend activity and challenge counts', () => {
  it('keeps the latest line per person', () => {
    const map = parseFriendActivity([
      { user_id: 'ana', kind: 'session', summary: { title: 'Pierna' }, created_at: '2026-10-01T10:00:00Z' },
      { user_id: 'ana', kind: 'record', summary: { title: 'Récord' }, created_at: '2026-10-02T10:00:00Z' },
      { kind: 'x' },
    ]);
    expect(map.size).toBe(1);
    expect(map.get('ana')).toEqual({
      user_id: 'ana',
      kind: 'record',
      summary: { title: 'Récord' },
      created_at: '2026-10-02T10:00:00Z',
    });
    expect(parseFriendActivity(null).size).toBe(0);
  });

  it('counts active challenges and invitations', () => {
    expect(parseChallengeCounts({ active: [{}, {}], invitations: [{}] })).toEqual({
      active: 2,
      invitations: 1,
    });
    expect(parseChallengeCounts(null)).toEqual({ active: 0, invitations: 0 });
  });
});

describe('friends overview', () => {
  const friendships: FriendshipRow[] = [
    { user_low: 'ana', user_high: ME, created_at: '2026-06-01T00:00:00Z', invite_id: null, request_id: null },
    { user_low: ME, user_high: 'zoe', created_at: '2026-07-01T00:00:00Z', invite_id: null, request_id: null },
  ];
  const requests: FriendRequestRow[] = [
    { id: 'r1', sender_id: 'bruno', receiver_id: ME, status: 'pending', created_at: '2026-10-01T00:00:00Z', responded_at: null },
    { id: 'r2', sender_id: ME, receiver_id: 'carla', status: 'pending', created_at: '2026-10-02T00:00:00Z', responded_at: null },
    { id: 'r3', sender_id: 'dani', receiver_id: ME, status: 'declined', created_at: '2026-09-01T00:00:00Z', responded_at: null },
  ];

  it('finds the other person of a friendship and lists everyone once', () => {
    expect(friendIdOf(friendships[0], ME)).toBe('ana');
    expect(friendIdOf(friendships[1], ME)).toBe('zoe');
    expect(overviewPersonIds(ME, friendships, requests).sort()).toEqual([
      'ana',
      'bruno',
      'carla',
      'dani',
      'zoe',
    ]);
  });

  it('builds friends, received and sent, ignoring resolved requests', () => {
    const overview = buildFriendsOverview({
      me: ME,
      friendships,
      requests,
      profiles: profileMap(profileRows),
      activity: parseFriendActivity([
        { user_id: 'zoe', kind: 'session', summary: { title: 'Espalda' }, created_at: '2026-10-05T00:00:00Z' },
      ]),
      counts: { active: 2, invitations: 1 },
    });
    // Most recent activity first.
    expect(overview.friends.map(item => item.profile.id)).toEqual(['zoe', 'ana']);
    expect(overview.friends[1].friendsSince).toBe('2026-06-01T00:00:00Z');
    expect(overview.friends[1].lastActivity).toBeNull();
    expect(overview.received.map(item => item.request.id)).toEqual(['r1']);
    expect(overview.received[0].profile.name).toBe('Bruno');
    expect(overview.sent.map(item => item.request.id)).toEqual(['r2']);
    expect(overview.activeChallenges).toBe(2);
    expect(overview.pendingInvitations).toBe(1);
  });

  it('shows "Usuario" when a profile row is absent instead of hiding the person', () => {
    const overview = buildFriendsOverview({
      me: ME,
      friendships,
      requests: [],
      profiles: new Map(),
      activity: new Map(),
      counts: { active: 0, invitations: 0 },
    });
    expect(overview.friends).toHaveLength(2);
    expect(overview.friends[0].profile.name).toBe('Usuario');
  });
});

describe('blocked list', () => {
  it('keeps the entry when the profile is not readable', () => {
    const blocks: UserBlockRow[] = [
      { blocker_id: ME, blocked_id: 'ana', created_at: '2026-10-01T00:00:00Z' },
      { blocker_id: ME, blocked_id: 'ghost', created_at: '2026-10-02T00:00:00Z' },
    ];
    const entries = buildBlocked(blocks, profileMap(profileRows));
    expect(entries[0].profile?.name).toBe('Ana Ruiz');
    expect(entries[1].profile).toBeNull();
  });
});
