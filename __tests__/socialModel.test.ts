import {
  activityLine,
  buildFriendGroups,
  canCreateInvite,
  canShowRealPhoto,
  exactLookupQuery,
  firstName,
  friendsSinceLabel,
  hubSubtitle,
  initialsOf,
  inviteExpiryLabel,
  inviteUrl,
  isInviteActive,
  isTodayActivity,
  mapSendRequestStatus,
  nextRelationship,
  normalizeUsername,
  privacyLine,
  privacyPreview,
  profileSections,
  relationActions,
  validateUsername,
  type RelationAction,
} from '../src/features/social/socialModel';
import {
  buildFixtureState,
  buildPeople,
} from '../src/dev/socialFixtures';
import type {
  FriendInviteRow,
  RelationshipState,
} from '../src/features/social/socialTypes';

const NOW = new Date('2026-10-06T12:00:00');

describe('username', () => {
  it('normalizes: trim, leading @ and lower case', () => {
    expect(normalizeUsername('  @Carlos.Ruiz ')).toBe('carlos.ruiz');
  });

  it('accepts the backend format ^[a-z0-9_.]{3,24}$', () => {
    expect(validateUsername('abc')).toEqual({ ok: true, value: 'abc' });
    expect(validateUsername('Nicolas_F.89')).toEqual({
      ok: true,
      value: 'nicolas_f.89',
    });
    expect(validateUsername('a'.repeat(24)).ok).toBe(true);
  });

  it('rejects empty, short and long names', () => {
    expect(validateUsername('   ')).toEqual({ ok: false, error: 'empty' });
    expect(validateUsername('@')).toEqual({ ok: false, error: 'empty' });
    expect(validateUsername('ab')).toEqual({ ok: false, error: 'too_short' });
    expect(validateUsername('a'.repeat(25))).toEqual({
      ok: false,
      error: 'too_long',
    });
  });

  it('rejects characters outside the format', () => {
    for (const bad of ['con espacio', 'ñandú', 'a-b-c', 'user!', 'a@b.c', 'héctor']) {
      expect(validateUsername(bad)).toEqual({
        ok: false,
        error: 'invalid_chars',
      });
    }
  });

  it('rejects reserved names, in any case', () => {
    expect(validateUsername('admin')).toEqual({ ok: false, error: 'reserved' });
    expect(validateUsername('ATHELETE')).toEqual({
      ok: false,
      error: 'reserved',
    });
    expect(validateUsername('@ellie')).toEqual({
      ok: false,
      error: 'reserved',
    });
    expect(validateUsername('ellie.fan').ok).toBe(true);
  });

  it('only searches by an exact valid username', () => {
    expect(exactLookupQuery('@Irene.Castro')).toBe('irene.castro');
    expect(exactLookupQuery('Irene Castro')).toBeNull();
    expect(exactLookupQuery('ir')).toBeNull();
  });
});

describe('relationship and allowed actions', () => {
  const STATES: RelationshipState[] = [
    'none',
    'request_sent',
    'request_received',
    'friends',
    'blocked',
  ];

  it('none: can send a request, only if they accept requests', () => {
    expect(relationActions('none').canSendRequest).toBe(true);
    expect(relationActions('none', { acceptsRequests: false })).toMatchObject({
      canSendRequest: false,
      requestsClosed: true,
      canBlock: true,
    });
  });

  it('request_sent: can cancel, not send again', () => {
    expect(relationActions('request_sent')).toMatchObject({
      canCancelRequest: true,
      canSendRequest: false,
      canAccept: false,
      canBlock: true,
    });
  });

  it('request_received: can accept or decline', () => {
    expect(relationActions('request_received')).toMatchObject({
      canAccept: true,
      canDecline: true,
      canSendRequest: false,
      canCancelRequest: false,
    });
  });

  it('friends: can challenge and block, nothing to request', () => {
    expect(relationActions('friends')).toMatchObject({
      canChallenge: true,
      canBlock: true,
      canSendRequest: false,
      canAccept: false,
    });
  });

  it('blocked: the only action is to unblock', () => {
    expect(relationActions('blocked')).toEqual({
      canSendRequest: false,
      canCancelRequest: false,
      canAccept: false,
      canDecline: false,
      canChallenge: false,
      canBlock: false,
      canUnblock: true,
      requestsClosed: false,
    });
  });

  it('self: no social action at all', () => {
    expect(Object.values(relationActions('self')).some(Boolean)).toBe(false);
  });

  it('moves between states and refuses the actions that are not allowed', () => {
    expect(nextRelationship('none', 'send_request')).toBe('request_sent');
    expect(nextRelationship('none', 'send_request', { acceptsRequests: false })).toBeNull();
    expect(nextRelationship('request_sent', 'cancel_request')).toBe('none');
    expect(nextRelationship('request_received', 'accept')).toBe('friends');
    expect(nextRelationship('request_received', 'decline')).toBe('none');
    expect(nextRelationship('friends', 'block')).toBe('blocked');
    expect(nextRelationship('blocked', 'unblock')).toBe('none');
    expect(nextRelationship('friends', 'accept')).toBeNull();
    expect(nextRelationship('blocked', 'send_request')).toBeNull();
    expect(nextRelationship('self', 'block')).toBeNull();
  });

  it('every state can only reach states that make sense', () => {
    const actions: RelationAction[] = [
      'send_request',
      'cancel_request',
      'accept',
      'decline',
      'block',
      'unblock',
    ];
    for (const state of STATES) {
      for (const action of actions) {
        const next = nextRelationship(state, action);
        if (next !== null) {
          // "friends" only comes from accepting; "blocked" only from block.
          expect(next === 'friends').toBe(action === 'accept');
          expect(next === 'blocked').toBe(action === 'block');
        }
      }
    }
  });

  it('maps send_friend_request statuses with neutral wording', () => {
    expect(mapSendRequestStatus('sent', 'Irene')).toMatchObject({
      ok: true,
      relationship: 'request_sent',
    });
    expect(mapSendRequestStatus('accepted', 'Diego')).toMatchObject({
      ok: true,
      relationship: 'friends',
    });
    expect(mapSendRequestStatus('already_friends', 'Diego').relationship).toBe(
      'friends',
    );
    expect(mapSendRequestStatus('pending', 'Irene').relationship).toBe(
      'request_sent',
    );
    expect(mapSendRequestStatus('not_accepting', 'Hugo')).toEqual({
      ok: false,
      relationship: 'none',
      message: 'Hugo no acepta solicitudes ahora',
    });
    expect(mapSendRequestStatus('unavailable', 'X').ok).toBe(false);
    expect(mapSendRequestStatus('invalid', 'X').ok).toBe(false);
  });
});

describe('real photo only for friends (DA-119)', () => {
  it('shows the photo to the owner and to friends only', () => {
    expect(canShowRealPhoto('self')).toBe(true);
    expect(canShowRealPhoto('friends')).toBe(true);
    expect(canShowRealPhoto('none')).toBe(false);
    expect(canShowRealPhoto('request_sent')).toBe(false);
    expect(canShowRealPhoto('request_received')).toBe(false);
    expect(canShowRealPhoto('blocked')).toBe(false);
  });

  it('builds initials and first names', () => {
    expect(initialsOf('Carlos Ruiz')).toBe('CR');
    expect(initialsOf('  andrea ')).toBe('AN');
    expect(initialsOf('')).toBe('?');
    expect(firstName('Lucía Ortega')).toBe('Lucía');
  });
});

describe('profile of another user', () => {
  const people = buildPeople(NOW);

  it('does not show "amigos desde" to non-friends', () => {
    const detail = { ...people.carlos.detail, relationship: 'none' as const };
    const sections = profileSections('none', detail);
    expect(sections.friendsSince).toBe(false);
    expect(sections.records).toBe(true);
    expect(profileSections('friends', people.carlos.detail)).toMatchObject({
      friendsSince: true,
      sessions: true,
      badges: true,
      records: true,
      recentPosts: true,
    });
  });

  it('shows only the streak when the server returns nothing else', () => {
    const sections = profileSections('none', {
      relationship: 'none',
      streak_days: 3,
      hidden_categories: [],
    });
    expect(sections).toEqual({
      stats: true,
      sessions: false,
      badges: false,
      records: false,
      recentPosts: false,
      friendsSince: false,
    });
    expect(profileSections('none', null).stats).toBe(false);
  });

  it('writes the privacy line; nutrition is never shared', () => {
    expect(privacyLine('Carlos Ruiz', ['body_weight'], 'friends')).toBe(
      'Carlos no comparte peso corporal ni nutrición.',
    );
    expect(privacyLine('Carlos Ruiz', [], 'friends')).toBe(
      'Carlos no comparte nutrición.',
    );
    expect(privacyLine('Irene Castro', [], 'none')).toBe(
      'Solo los amigos de Irene ven su actividad.',
    );
    // Public profile: a non-friend also sees activity, so the line lists what
    // is not shared instead of saying "only friends".
    expect(privacyLine('Elena Cruz', ['body_weight'], 'none', true)).toBe(
      'Elena no comparte peso corporal ni nutrición.',
    );
  });

  it('labels the friendship date', () => {
    expect(friendsSinceLabel('2026-03-14T10:00:00', NOW)).toBe(
      'Amigos desde marzo',
    );
    expect(friendsSinceLabel('2025-11-02T10:00:00', NOW)).toBe(
      'Amigos desde noviembre de 2025',
    );
    expect(friendsSinceLabel('nope', NOW)).toBe('');
  });
});

describe('friends list', () => {
  const state = buildFixtureState('default', NOW);
  const profileById = (id: string) =>
    Object.values(state.people).find(item => item.profile.id === id)!.profile;
  const overview = {
    friends: ['carlos', 'andrea', 'mateo'].map(key => ({
      profile: state.people[key].profile,
      friendsSince: NOW.toISOString(),
      lastActivity: null,
    })),
    received: state.requests
      .filter(item => item.receiver_id === state.me.id)
      .map(request => ({ request, profile: profileById(request.sender_id) })),
    sent: state.requests
      .filter(item => item.sender_id === state.me.id)
      .map(request => ({ request, profile: profileById(request.receiver_id) })),
  };

  it('groups received, friends and sent in that order, hiding empty groups', () => {
    expect(buildFriendGroups(overview, '').map(group => group.key)).toEqual([
      'received',
      'friends',
      'sent',
    ]);
    expect(
      buildFriendGroups({ ...overview, received: [], sent: [] }, '').map(
        group => group.key,
      ),
    ).toEqual(['friends']);
  });

  it('filters the people you already have by name or username', () => {
    const groups = buildFriendGroups(overview, 'ruiz');
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('friends');
    expect(groups[0].items).toHaveLength(1);
    expect(buildFriendGroups(overview, '@pablo.ibanez')[0].key).toBe('sent');
    expect(buildFriendGroups(overview, 'zzz')).toEqual([]);
  });

  it('writes the hub subtitle', () => {
    expect(hubSubtitle(5, 2)).toBe('5 amigos · 2 retos activos');
    expect(hubSubtitle(1, 1)).toBe('1 amigo · 1 reto activo');
    expect(hubSubtitle(0, 0)).toBe('0 amigos · 0 retos activos');
  });

  it('writes the last activity of a friend', () => {
    const at = (hours: number) =>
      new Date(NOW.getTime() - hours * 3_600_000).toISOString();
    const workout = { kind: 'workout_completed', summary: { title: 'Pierna' } };
    expect(activityLine({ ...workout, created_at: at(2) }, NOW)).toBe(
      'Entrenó hoy · Pierna',
    );
    expect(activityLine({ ...workout, created_at: at(30) }, NOW)).toBe(
      'Entrenó ayer · Pierna',
    );
    expect(activityLine({ ...workout, created_at: at(80) }, NOW)).toBe(
      'Entrenó hace 3 días · Pierna',
    );
    expect(
      activityLine(
        { kind: 'core33_completed', summary: { title: 'Core 33' }, created_at: at(5) },
        NOW,
      ),
    ).toBe('Terminó Core 33');
    expect(isTodayActivity({ kind: 'workout_completed', created_at: at(2) }, NOW)).toBe(true);
    expect(isTodayActivity({ kind: 'workout_completed', created_at: at(30) }, NOW)).toBe(false);
  });
});

describe('privacy and invitations', () => {
  const base = {
    share_workouts: true,
    share_records: true,
    share_achievements: true,
    share_photos: true,
    share_routines: true,
    share_body_weight: false,
    allow_friend_requests: true,
  };

  it('previews what friends see', () => {
    expect(privacyPreview(base)).toBe(
      'Tu nombre, tu objetivo, tu racha y entrenamientos, récords personales, logros, fotos y rutinas.',
    );
    expect(privacyPreview({ ...base, share_body_weight: true }).endsWith('rutinas y peso corporal.')).toBe(true);
    expect(
      privacyPreview({
        ...base,
        share_workouts: false,
        share_records: false,
        share_achievements: false,
        share_photos: false,
        share_routines: false,
      }),
    ).toBe('Tu nombre, tu objetivo y tu racha. Nada más.');
  });

  const invite = (
    id: number,
    patch: Partial<FriendInviteRow> = {},
  ): FriendInviteRow => ({
    id: `i${id}`,
    inviter_id: 'me',
    token: `t${id}`,
    created_at: NOW.toISOString(),
    expires_at: new Date(NOW.getTime() + 3 * 86_400_000).toISOString(),
    used_at: null,
    used_by: null,
    revoked_at: null,
    ...patch,
  });

  it('counts only active links (not used, revoked or expired) up to 5', () => {
    const invites = [
      invite(1),
      invite(2, { used_at: NOW.toISOString(), used_by: 'x' }),
      invite(3, { revoked_at: NOW.toISOString() }),
      invite(4, { expires_at: new Date(NOW.getTime() - 1000).toISOString() }),
    ];
    expect(invites.filter(item => isInviteActive(item, NOW))).toHaveLength(1);
    expect(canCreateInvite(invites, NOW)).toBe(true);
    expect(canCreateInvite([1, 2, 3, 4, 5].map(n => invite(n)), NOW)).toBe(false);
  });

  it('builds the link and its expiry text', () => {
    expect(inviteUrl('abc')).toBe('athelete://amigo/abc');
    expect(
      inviteExpiryLabel(new Date(NOW.getTime() + 3 * 86_400_000).toISOString(), NOW),
    ).toBe('Caduca en 3 días');
    expect(
      inviteExpiryLabel(new Date(NOW.getTime() + 3_600_000).toISOString(), NOW),
    ).toBe('Caduca mañana');
    expect(
      inviteExpiryLabel(new Date(NOW.getTime() - 1).toISOString(), NOW),
    ).toBe('Caducado');
  });
});
