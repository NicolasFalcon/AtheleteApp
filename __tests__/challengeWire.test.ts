import {
  DURATIONS,
  METRICS,
  challengeActions,
  createErrorMessage,
  createErrorStep,
  friendMetrics,
  initialDraft,
  manualErrorMessage,
  respondErrorMessage,
  selectMetric,
  validateStep,
} from '../src/features/social/challengeModel';
import {
  listedIds,
  manualTodayFrom,
  parseBoard,
  parseCreateChallenge,
  parseJoinOfficial,
  parseManualContribution,
  parseMyChallenges,
  parseOkFlag,
  parseRespondInvite,
  weekFrom,
} from '../src/features/social/challengeMappers';
import { actionFor, applyAction, shouldRollback } from '../src/features/social/relationMachine';
import type { MyChallenges } from '../src/features/social/challengeTypes';

const FRIENDS = ['f1', 'f2'];

describe('create challenge · the ranges the server validates', () => {
  const SERVER: Record<string, [number, number]> = {
    workouts: [1, 14],
    strength_sessions: [1, 10],
    minutes_trained: [30, 900],
    core33_habit_days: [1, 14],
    mobility_minutes: [15, 300],
  };

  it('offers exactly the five metrics of the server with its goal ranges', () => {
    expect(friendMetrics().map(item => item.metric).sort()).toEqual(Object.keys(SERVER).sort());
    friendMetrics().forEach(item => {
      expect([item.min, item.max]).toEqual(SERVER[item.metric]);
    });
    // exercise_reps exists in the app for the official challenge only.
    expect(METRICS.some(item => item.metric === 'exercise_reps')).toBe(true);
  });

  it('accepts the bounds and rejects what is outside of them', () => {
    Object.entries(SERVER).forEach(([metric, [min, max]]) => {
      const base = selectMetric(initialDraft(), metric as never);
      expect(validateStep(1, { ...base, goal: min }, FRIENDS).ok).toBe(true);
      expect(validateStep(1, { ...base, goal: max }, FRIENDS).ok).toBe(true);
      expect(validateStep(1, { ...base, goal: min - 1 }, FRIENDS)).toEqual({
        ok: false,
        error: 'goal_out_of_range',
      });
      expect(validateStep(1, { ...base, goal: max + 1 }, FRIENDS).ok).toBe(false);
    });
  });

  it('rejects repetitions between friends', () => {
    const draft = selectMetric(initialDraft(), 'exercise_reps');
    expect(validateStep(0, draft, FRIENDS)).toEqual({ ok: false, error: 'metric_not_allowed' });
  });

  it('only allows 3, 7 or 14 days', () => {
    expect(DURATIONS.map(item => item.days)).toEqual([3, 7, 14]);
    const draft = selectMetric(initialDraft(), 'workouts');
    [3, 7, 14].forEach(days => {
      expect(validateStep(2, { ...draft, durationDays: days }, FRIENDS).ok).toBe(true);
    });
    [1, 5, 10, 30].forEach(days => {
      expect(validateStep(2, { ...draft, durationDays: days }, FRIENDS).ok).toBe(false);
    });
  });

  it('needs at least one invitee and all of them friends', () => {
    const draft = selectMetric(initialDraft(), 'workouts');
    expect(validateStep(3, draft, FRIENDS)).toEqual({ ok: false, error: 'no_invitees' });
    expect(validateStep(3, { ...draft, inviteeIds: ['f1', 'x'] }, FRIENDS)).toEqual({
      ok: false,
      error: 'not_a_friend',
    });
    expect(validateStep(3, { ...draft, inviteeIds: ['f1', 'f2'] }, FRIENDS).ok).toBe(true);
  });
});

describe('challenge RPC results', () => {
  it('maps create_friend_challenge', () => {
    expect(parseCreateChallenge({ ok: true, challenge_id: 'c1', title: '3 entrenamientos en 1 semana' })).toEqual({
      ok: true,
      challengeId: 'c1',
      title: '3 entrenamientos en 1 semana',
    });
    expect(parseCreateChallenge({ ok: false, error: 'invalid_metric' })).toEqual({
      ok: false,
      error: 'invalid_metric',
    });
    expect(parseCreateChallenge({ ok: false, error: 'goal_out_of_range', min: 1, max: 14 })).toEqual({
      ok: false,
      error: 'goal_out_of_range',
      min: 1,
      max: 14,
    });
    expect(parseCreateChallenge({ ok: false, error: 'invalid_duration' })).toMatchObject({
      error: 'invalid_duration',
    });
    expect(parseCreateChallenge({ ok: false, error: 'no_invitees' })).toMatchObject({ error: 'no_invitees' });
    expect(parseCreateChallenge({ ok: false, error: 'invitee_not_friend', user_id: 'u9' })).toEqual({
      ok: false,
      error: 'invitee_not_friend',
      userId: 'u9',
    });
    expect(parseCreateChallenge({ ok: false, error: 'something_new' })).toMatchObject({ error: 'unknown' });
    expect(parseCreateChallenge(null)).toMatchObject({ ok: false, error: 'unknown' });
  });

  it('writes the range into the message and sends the user to the right step', () => {
    const range = parseCreateChallenge({ ok: false, error: 'goal_out_of_range', min: 30, max: 900 });
    if (range.ok) {
      throw new Error('expected a failure');
    }
    expect(createErrorMessage(range)).toBe('El objetivo debe estar entre 30 y 900.');
    expect(createErrorStep(range)).toBe(1);
    const unknown = parseCreateChallenge({ ok: false });
    if (unknown.ok) {
      throw new Error('expected a failure');
    }
    expect(createErrorStep(unknown)).toBeNull();
    expect(createErrorMessage(unknown)).toMatch(/No se pudo crear/);
  });

  it('maps respond_challenge_invite', () => {
    expect(parseRespondInvite({ ok: true, status: 'active' }, true)).toEqual({ ok: true, status: 'active' });
    expect(parseRespondInvite({ ok: true, status: 'declined' }, false)).toEqual({ ok: true, status: 'declined' });
    expect(parseRespondInvite({ ok: false, error: 'no_invite' }, true)).toEqual({ ok: false, error: 'no_invite' });
    expect(parseRespondInvite({ ok: false, error: 'invite_expired' }, true)).toEqual({
      ok: false,
      error: 'invite_expired',
    });
    expect(parseRespondInvite({ ok: false, error: 'x' }, true)).toEqual({ ok: false, error: 'unknown' });
    expect(respondErrorMessage('invite_expired')).toMatch(/caducó/);
    expect(respondErrorMessage('no_invite')).toMatch(/ya no existe/);
  });

  it('maps join_official_challenge, leave and cancel', () => {
    expect(parseJoinOfficial({ ok: true })).toEqual({ ok: true });
    expect(parseJoinOfficial({ ok: false, error: 'not_available' })).toEqual({ ok: false, error: 'not_available' });
    expect(parseOkFlag({ ok: true })).toBe(true);
    expect(parseOkFlag({ ok: false })).toBe(false);
    expect(parseOkFlag(null)).toBe(false);
  });

  it('maps add_manual_contribution with the remaining of the day', () => {
    expect(parseManualContribution({ ok: true, contribution_id: 'k', progress: 12 })).toEqual({
      ok: true,
      progress: 12,
    });
    expect(parseManualContribution({ ok: false, error: 'amount_out_of_range' })).toEqual({
      ok: false,
      error: 'amount_out_of_range',
    });
    expect(parseManualContribution({ ok: false, error: 'not_allowed' })).toEqual({
      ok: false,
      error: 'not_allowed',
    });
    const limit = parseManualContribution({ ok: false, error: 'daily_limit', remaining: 5 });
    expect(limit).toEqual({ ok: false, error: 'daily_limit', remaining: 5 });
    if (limit.ok) {
      throw new Error('expected a failure');
    }
    expect(manualErrorMessage(limit)).toBe('Hoy solo puedes registrar 5 más');
    expect(manualErrorMessage({ ok: false, error: 'daily_limit', remaining: 0 })).toMatch(/máximo/);
  });
});

const row = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  kind: 'friends',
  title: 'Reto',
  metric: 'workouts',
  goal: 4,
  duration_days: 7,
  status: 'active',
  starts_at: null,
  ends_at: null,
  invite_expires_at: null,
  points: 0,
  badge_id: null,
  allow_manual: false,
  creator_id: 'me',
  ...extra,
});

describe('get_my_challenges and get_challenge_board', () => {
  it('tells which official challenges I joined by comparing with active', () => {
    const parsed = parseMyChallenges({
      active: [row('a1', { my_progress: 3, my_status: 'active' }), row('o1', { kind: 'official', my_progress: 40, my_status: 'active' })],
      invitations: [row('i1', { invited_by: 'f1', status: 'pending' })],
      recently_completed: [],
      official: [row('o1', { kind: 'official' }), row('o2', { kind: 'official' })],
    });
    expect(parsed.active.map(item => item.head.id)).toEqual(['a1']);
    expect(parsed.official.find(item => item.head.id === 'o1')?.mine?.progress).toBe(40);
    expect(parsed.official.find(item => item.head.id === 'o2')?.mine).toBeNull();
    expect(parsed.invitations[0].mine).toMatchObject({ status: 'invited', invited_by: 'f1' });
    expect(listedIds(parsed)).toEqual(['o1', 'o2', 'i1', 'a1']);
  });

  it('survives garbage and empty lists', () => {
    expect(parseMyChallenges(null).active).toEqual([]);
    expect(parseMyChallenges({ active: [{ nope: 1 }], invitations: 'x' }).active).toEqual([]);
  });

  it('returns null for a board that is not there', () => {
    expect(parseBoard(null)).toBeNull();
    expect(parseBoard({ challenge: null, board: [] })).toBeNull();
  });

  it('parses the board with me and my friends', () => {
    const parsed = parseBoard({
      challenge: row('c1'),
      participants_total: 5,
      board: [
        { user_id: 'me', is_me: true, progress: 4, status: 'active', completed_at: null, username: 'falcon', name: 'Nico', avatar_key: 'lion', profile_photo_url: 'p' },
        { user_id: 'f1', is_me: false, progress: 2, status: 'invited', completed_at: null, name: 'Carlos' },
        { is_me: false },
      ],
    });
    expect(parsed?.participants_total).toBe(5);
    expect(parsed?.board).toHaveLength(2);
    expect(parsed?.board[0]).toMatchObject({ isMe: true, relationship: 'self' });
    expect(parsed?.board[1]).toMatchObject({ isMe: false, relationship: 'friends', status: 'invited' });
  });

  it('builds the week bars and what I added by hand today', () => {
    const now = new Date(2026, 9, 7, 12); // Wednesday
    const at = (day: number, hour = 10) => new Date(2026, 9, day, hour).toISOString();
    const rows = [
      { amount: 10, source: 'manual', occurred_at: at(5) },
      { amount: 5, source: 'manual', occurred_at: at(7, 9) },
      { amount: 20, source: 'workout_session', occurred_at: at(7, 8) },
    ];
    expect(weekFrom(rows, now)).toEqual([10, 0, 25, null, null, null, null]);
    expect(manualTodayFrom(rows, now)).toBe(5);
  });
});

describe('challenge actions', () => {
  const friends = { kind: 'friends' as const, allow_manual: false };

  it('leaves only an active challenge', () => {
    expect(challengeActions('active', friends, false).canLeave).toBe(true);
    expect(challengeActions('waiting', friends, false).canLeave).toBe(false);
    expect(challengeActions('waiting', friends, true).canLeave).toBe(false);
  });

  it('cancels only a pending challenge, and only the creator', () => {
    expect(challengeActions('waiting', friends, true).canCancel).toBe(true);
    expect(challengeActions('waiting', friends, false).canCancel).toBe(false);
    // An active challenge shows no cancel option.
    expect(challengeActions('active', friends, true).canCancel).toBe(false);
  });

  it('offers manual contributions only on an official challenge that allows them', () => {
    expect(challengeActions('active', { kind: 'official', allow_manual: true }, false).canAddManual).toBe(true);
    expect(challengeActions('active', { kind: 'official', allow_manual: false }, false).canAddManual).toBe(false);
    expect(challengeActions('active', friends, false).canAddManual).toBe(false);
  });
});

describe('optimistic challenge actions', () => {
  const summary = (id: string, status: 'invited' | 'active') => ({
    challenge: { ...(row(id) as object), kind: 'friends', metric: 'workouts', status: 'pending' } as never,
    mine: { status, progress: 0, invited_by: 'f1', final_rank_among_friends: null, celebrated_at: null },
    people: [],
    inviter: null,
    participants_total: null,
    leader: null,
  });
  const data: MyChallenges = {
    active: [summary('a1', 'active')],
    invitations: [summary('i1', 'invited')],
    recently_completed: [],
    official: null,
  };

  it('maps the service calls to actions', () => {
    expect(actionFor('respondChallengeInvite', ['i1', true])).toEqual({ type: 'respondInvite', challengeId: 'i1', accept: true });
    expect(actionFor('respondChallengeInvite', ['i1', false])).toMatchObject({ accept: false });
    expect(actionFor('leaveChallenge', ['a1'])).toEqual({ type: 'leaveChallenge', challengeId: 'a1' });
    expect(actionFor('cancelFriendChallenge', ['a1'])).toEqual({ type: 'cancelChallenge', challengeId: 'a1' });
    expect(actionFor('addManualContribution', ['o1', 5])).toBeNull();
  });

  it('moves an accepted invitation to active and drops a declined one', () => {
    const accepted = applyAction('getMyChallenges', [], data, { type: 'respondInvite', challengeId: 'i1', accept: true }) as MyChallenges;
    expect(accepted.invitations).toHaveLength(0);
    expect(accepted.active.map(item => item.challenge.id)).toEqual(['i1', 'a1']);
    const declined = applyAction('getMyChallenges', [], data, { type: 'respondInvite', challengeId: 'i1', accept: false }) as MyChallenges;
    expect(declined.invitations).toHaveLength(0);
    expect(declined.active).toHaveLength(1);
  });

  it('removes a challenge I left or cancelled', () => {
    const left = applyAction('getMyChallenges', [], data, { type: 'leaveChallenge', challengeId: 'a1' }) as MyChallenges;
    expect(left.active).toHaveLength(0);
  });

  it('rolls back when the server refuses', () => {
    const respond = { type: 'respondInvite', challengeId: 'i1', accept: true } as const;
    expect(shouldRollback(respond, { ok: false, error: 'invite_expired' })).toBe(true);
    expect(shouldRollback(respond, { ok: true, status: 'active' })).toBe(false);
    expect(shouldRollback({ type: 'leaveChallenge', challengeId: 'a1' }, false)).toBe(true);
    expect(shouldRollback({ type: 'cancelChallenge', challengeId: 'a1' }, true)).toBe(false);
    expect(shouldRollback({ type: 'joinOfficial', challengeId: 'o1' }, { ok: false, error: 'not_available' })).toBe(true);
  });
});
