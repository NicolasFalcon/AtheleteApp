import {
  CREATE_STEPS,
  MANUAL_MAX_PER_DAY,
  METRICS,
  canCreate,
  challengeActions,
  challengeTitle,
  challengeViewState,
  clampGoal,
  daysLeftLabel,
  distanceLine,
  friendMetrics,
  initialDraft,
  inviteExpiresAt,
  progressPct,
  rowLine,
  STATE_TAG,
  rankBoard,
  selectMetric,
  stepGoal,
  toggleInvitee,
  validateManualAmount,
  validateStep,
  weekBarHeight,
} from '../src/features/social/challengeModel';
import type {
  BoardEntry,
  ChallengeHead,
  ChallengeMine,
} from '../src/features/social/challengeTypes';

const NOW = new Date('2026-10-07T12:00:00Z');
const FRIENDS = ['f1', 'f2', 'f3'];
const inDays = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString();

describe('create challenge · step validation', () => {
  it('has five steps', () => {
    expect(CREATE_STEPS.map(step => step.key)).toEqual(['type', 'goal', 'duration', 'friends', 'review']);
  });

  it('step 1 needs a type, and not the repetitions one between friends', () => {
    const draft = initialDraft();
    expect(validateStep(0, draft, FRIENDS)).toEqual({ ok: false, error: 'no_metric' });
    expect(validateStep(0, selectMetric(draft, 'workouts'), FRIENDS)).toEqual({ ok: true });
    expect(validateStep(0, selectMetric(draft, 'exercise_reps'), FRIENDS)).toEqual({ ok: false, error: 'metric_not_allowed' });
    expect(friendMetrics().map(item => item.metric)).not.toContain('exercise_reps');
    expect(friendMetrics()).toHaveLength(METRICS.length - 1);
  });

  it('step 2 keeps the goal inside the range of the type', () => {
    const draft = selectMetric(initialDraft(), 'workouts');
    expect(draft.goal).toBe(4);
    expect(validateStep(1, draft, FRIENDS)).toEqual({ ok: true });
    expect(validateStep(1, { ...draft, goal: 0 }, FRIENDS)).toEqual({ ok: false, error: 'goal_out_of_range' });
    expect(validateStep(1, { ...draft, goal: 15 }, FRIENDS)).toEqual({ ok: false, error: 'goal_out_of_range' });
    expect(validateStep(1, { ...draft, goal: 2.5 }, FRIENDS)).toEqual({ ok: false, error: 'goal_out_of_range' });
    const minutes = selectMetric(initialDraft(), 'minutes_trained');
    expect(minutes.goal).toBe(150);
    expect(validateStep(1, { ...minutes, goal: 900 }, FRIENDS).ok).toBe(true);
    expect(validateStep(1, { ...minutes, goal: 901 }, FRIENDS).ok).toBe(false);
    expect(validateStep(1, initialDraft(), FRIENDS)).toEqual({ ok: false, error: 'no_metric' });
  });

  it('steps the goal by the step of each type and clamps it', () => {
    expect(stepGoal('minutes_trained', 150, 1)).toBe(180);
    expect(stepGoal('minutes_trained', 30, -1)).toBe(30);
    expect(stepGoal('workouts', 14, 1)).toBe(14);
    expect(stepGoal('mobility_minutes', 60, -1)).toBe(45);
    expect(clampGoal('workouts', 99)).toBe(14);
  });

  it('step 3 (dates) accepts only 3 days, 1 week or 2 weeks', () => {
    const draft = initialDraft();
    expect(validateStep(2, draft, FRIENDS)).toEqual({ ok: false, error: 'no_duration' });
    for (const days of [3, 7, 14]) {
      expect(validateStep(2, { ...draft, durationDays: days }, FRIENDS)).toEqual({ ok: true });
    }
    expect(validateStep(2, { ...draft, durationDays: 5 }, FRIENDS)).toEqual({ ok: false, error: 'no_duration' });
  });

  it('the invitation expires 7 days after it is created', () => {
    expect(inviteExpiresAt(NOW).toISOString()).toBe(inDays(7));
  });

  it('step 4 needs at least one friend, only friends and a maximum', () => {
    const draft = initialDraft();
    expect(validateStep(3, draft, FRIENDS)).toEqual({ ok: false, error: 'no_invitees' });
    const one = toggleInvitee(draft, 'f1');
    expect(validateStep(3, one, FRIENDS)).toEqual({ ok: true });
    expect(toggleInvitee(one, 'f1').inviteeIds).toEqual([]);
    expect(validateStep(3, toggleInvitee(one, 'stranger'), FRIENDS)).toEqual({ ok: false, error: 'not_a_friend' });
    const many = Array.from({ length: 11 }, (_, index) => `f${index}`);
    expect(validateStep(3, { ...draft, inviteeIds: many }, many)).toEqual({ ok: false, error: 'too_many_invitees' });
  });

  it('the review passes only when every step does; a friend can be preselected', () => {
    let draft = initialDraft('f2');
    expect(draft.inviteeIds).toEqual(['f2']);
    expect(canCreate(draft, FRIENDS)).toBe(false);
    draft = { ...selectMetric(draft, 'mobility_minutes'), durationDays: 7 };
    expect(canCreate(draft, FRIENDS)).toBe(true);
    expect(canCreate({ ...draft, inviteeIds: [] }, FRIENDS)).toBe(false);
  });

  it('writes the generated title', () => {
    expect(challengeTitle('workouts', 4, 7)).toBe('4 entrenamientos esta semana');
    expect(challengeTitle('mobility_minutes', 60, 3)).toBe('60 min de movilidad en 3 días');
    expect(challengeTitle('minutes_trained', 150, 14)).toBe('150 min entrenados en 2 semanas');
  });
});

function entry(id: string, name: string, progress: number, extra: Partial<BoardEntry> = {}): BoardEntry {
  return {
    user_id: id,
    profile: { id, name, username: id, avatar_key: '', profile_photo_url: '', goal: '', weight: 0 },
    progress,
    status: 'active',
    completed_at: null,
    isMe: false,
    relationship: 'friends',
    ...extra,
  };
}

describe('ranking and ties', () => {
  it('orders by progress, most first', () => {
    const ranked = rankBoard(
      [entry('a', 'Andrea', 2), entry('me', 'Tú', 3, { isMe: true }), entry('c', 'Carlos', 4)],
      4,
    );
    expect(ranked.map(item => item.user_id)).toEqual(['c', 'me', 'a']);
    expect(ranked.map(item => item.position)).toEqual([1, 2, 3]);
    expect(ranked.map(item => item.done)).toEqual([true, false, false]);
  });

  it('a tie shares its position and the next one skips (1, 1, 3)', () => {
    const ranked = rankBoard(
      [entry('a', 'Andrea', 3), entry('b', 'Bea', 3), entry('c', 'Carlos', 1)],
      4,
    );
    expect(ranked.map(item => item.position)).toEqual([1, 1, 3]);
  });

  it('inside a tie, who finished first goes first, then the user', () => {
    const finished = rankBoard(
      [
        entry('late', 'Zoe', 4, { completed_at: '2026-10-07T10:00:00Z' }),
        entry('early', 'Ana', 4, { completed_at: '2026-10-06T10:00:00Z' }),
      ],
      4,
    );
    expect(finished.map(item => item.user_id)).toEqual(['early', 'late']);
    const user = rankBoard([entry('a', 'Andrea', 2), entry('me', 'Tú', 2, { isMe: true })], 4);
    expect(user[0].user_id).toBe('me');
    expect(user.map(item => item.position)).toEqual([1, 1]);
  });

  it('writes the distance line without pressure', () => {
    const ahead = rankBoard([entry('c', 'Carlos Ruiz', 4), entry('me', 'Tú', 3, { isMe: true })], 4);
    expect(distanceLine(ahead, 4, 'workouts', false)).toBe('Carlos ya terminó. Te falta 1 entreno para completarlo.');
    const leading = rankBoard([entry('me', 'Tú', 3, { isMe: true }), entry('a', 'Andrea', 2)], 4);
    expect(distanceLine(leading, 4, 'workouts', false)).toBe('Vas en cabeza. Te falta 1 entreno.');
    const done = rankBoard([entry('me', 'Tú', 4, { isMe: true }), entry('a', 'Andrea', 2)], 4);
    expect(distanceLine(done, 4, 'workouts', false)).toBe('Completado. Eres el primero.');
    const together = rankBoard([entry('me', 'Tú', 4, { isMe: true }), entry('c', 'Carlos Ruiz', 4)], 4);
    expect(distanceLine(together, 4, 'workouts', false)).toBe('Completado. Carlos también lo terminó.');
    expect(distanceLine(ahead, 4, 'workouts', true)).toBe('Invitaciones enviadas. El reto empieza cuando acepte alguien.');
    const minutes = rankBoard([entry('a', 'Andrea', 15), entry('me', 'Tú', 0, { isMe: true })], 60);
    expect(distanceLine(minutes, 60, 'mobility_minutes', false)).toBe('Andrea va por delante. Te faltan 60 min para completarlo.');
  });

  it('computes the progress percentage', () => {
    expect(progressPct(74, 100)).toBe(74);
    expect(progressPct(120, 100)).toBe(100);
    expect(progressPct(1, 0)).toBe(0);
  });
});

const head = (extra: Partial<ChallengeHead> = {}): ChallengeHead => ({
  id: 'c1',
  title: '4 entrenamientos esta semana',
  goal: 4,
  duration_days: 7,
  starts_at: null,
  ends_at: null,
  invite_expires_at: inDays(5),
  points: 0,
  badge_id: null,
  allow_manual: false,
  creator_id: 'me',
  kind: 'friends',
  metric: 'workouts',
  status: 'active',
  ...extra,
});
const mine = (extra: Partial<ChallengeMine> = {}): ChallengeMine => ({
  status: 'active',
  progress: 1,
  invited_by: null,
  final_rank_among_friends: null,
  celebrated_at: null,
  ...extra,
});

describe('state of a challenge', () => {
  it('invited → active → completed', () => {
    expect(challengeViewState(head({ status: 'pending' }), mine({ status: 'invited' }), NOW)).toBe('invited');
    expect(challengeViewState(head(), mine(), NOW)).toBe('active');
    expect(challengeViewState(head(), mine({ progress: 4 }), NOW)).toBe('completed');
    expect(challengeViewState(head(), mine({ status: 'completed', progress: 4 }), NOW)).toBe('completed');
  });

  it('the creator waits until somebody accepts', () => {
    expect(challengeViewState(head({ status: 'pending' }), mine({ progress: 0 }), NOW)).toBe('waiting');
  });

  it('expires when the invitation or the challenge runs out', () => {
    expect(challengeViewState(head({ status: 'expired' }), mine(), NOW)).toBe('expired');
    expect(challengeViewState(head({ status: 'pending', invite_expires_at: inDays(-1) }), mine({ status: 'invited' }), NOW)).toBe('expired');
    expect(challengeViewState(head({ ends_at: inDays(-1) }), mine(), NOW)).toBe('expired');
    expect(challengeViewState(head(), mine({ status: 'expired' }), NOW)).toBe('expired');
  });

  it('a completed challenge does not expire afterwards', () => {
    expect(challengeViewState(head({ ends_at: inDays(-1) }), mine({ progress: 4 }), NOW)).toBe('completed');
  });

  it('cancelled, declined, left and not joined', () => {
    expect(challengeViewState(head({ status: 'cancelled' }), mine(), NOW)).toBe('cancelled');
    expect(challengeViewState(head(), mine({ status: 'declined' }), NOW)).toBe('declined');
    expect(challengeViewState(head(), mine({ status: 'left' }), NOW)).toBe('left');
    expect(challengeViewState(head({ kind: 'official' }), null, NOW)).toBe('notJoined');
  });

  it('offers the right actions in each state', () => {
    const friends = head();
    const official = head({ kind: 'official', allow_manual: true });
    expect(challengeActions('invited', friends, false)).toMatchObject({ canAccept: true, canDecline: true, canLeave: false });
    expect(challengeActions('active', friends, false)).toMatchObject({ canLeave: true, canAddManual: false, canCancel: false });
    expect(challengeActions('active', official, false)).toMatchObject({ canLeave: true, canAddManual: true });
    expect(challengeActions('notJoined', official, false)).toMatchObject({ canJoin: true });
    expect(challengeActions('waiting', friends, true)).toMatchObject({ canCancel: true, canLeave: false });
    // W5: leave_challenge only works on an active participation.
    expect(challengeActions('waiting', friends, false)).toMatchObject({ canCancel: false, canLeave: false });
    expect(challengeActions('completed', friends, false)).toMatchObject({ canShare: true, canLeave: false });
    const none = challengeActions('expired', friends, true);
    expect(Object.values(none).some(Boolean)).toBe(false);
  });

  it('labels the days left', () => {
    expect(daysLeftLabel(inDays(3), 7, NOW)).toBe('3 días restantes');
    expect(daysLeftLabel(inDays(1), 7, NOW)).toBe('Último día');
    expect(daysLeftLabel(inDays(-1), 7, NOW)).toBe('Terminado');
    expect(daysLeftLabel(null, 7, NOW)).toBe('7 días');
  });
});

describe('official challenge', () => {
  it('limits manual entries to 1–100 each and 300 a day', () => {
    expect(validateManualAmount(5, 0)).toEqual({ ok: true });
    expect(validateManualAmount(100, 0)).toEqual({ ok: true });
    expect(validateManualAmount(0, 0)).toEqual({ ok: false, error: 'amount_out_of_range' });
    expect(validateManualAmount(101, 0)).toEqual({ ok: false, error: 'amount_out_of_range' });
    expect(validateManualAmount(10, MANUAL_MAX_PER_DAY - 10)).toEqual({ ok: true });
    expect(validateManualAmount(15, MANUAL_MAX_PER_DAY - 10)).toEqual({ ok: false, error: 'daily_limit' });
  });

  it('draws the week bars', () => {
    expect(weekBarHeight(null)).toBe(6);
    expect(weekBarHeight(0)).toBe(4);
    expect(weekBarHeight(18)).toBeCloseTo(36.8);
    expect(weekBarHeight(500)).toBe(60);
  });
});

describe('line of a challenge in the list', () => {
  it('says who goes ahead, or that you lead', () => {
    const leader = { name: 'Carlos Ruiz', progress: 81 };
    expect(rowLine({ state: 'active', metric: 'exercise_reps', goal: 100, progress: 74, leader })).toBe(
      'Carlos va 7 repeticiones por delante',
    );
    expect(rowLine({ state: 'active', metric: 'workouts', goal: 4, progress: 3, leader: { name: 'Carlos', progress: 4 } })).toBe(
      'Carlos va 1 entreno por delante',
    );
    expect(rowLine({ state: 'active', metric: 'workouts', goal: 4, progress: 3, leader: { name: 'Andrea', progress: 2 } })).toBe('Vas en cabeza');
    expect(rowLine({ state: 'active', metric: 'workouts', goal: 4, progress: 3, leader: null })).toBe('Vas en cabeza');
  });

  it('writes the waiting, expired and completed lines and their tags', () => {
    const base = { metric: 'workouts' as const, goal: 4, progress: 0, leader: null };
    expect(rowLine({ ...base, state: 'waiting' })).toBe('Esperando a que acepten');
    expect(rowLine({ ...base, state: 'expired' })).toBe('Nadie aceptó a tiempo');
    expect(rowLine({ ...base, state: 'completed', progress: 4 })).toBe('Completado');
    expect(STATE_TAG.expired).toBe('EXPIRADO');
    expect(STATE_TAG.waiting).toBe('ENTRE AMIGOS · NUEVO');
  });
});
