import {
  anchorLine,
  goalVerdict,
  improvedAnchors,
  nextPlan,
  nextWeekStart,
  plannedSessions,
  recordsBetween,
  reportRange,
  reviewAdjustments,
  signedKg,
  stickerAnchors,
  volumeTonnes,
  weekBounds,
} from '../src/features/trainingPlan/planReviewModel';
import { parseTrainingPlanDetail } from '../src/services/supabase/trainingPlan';
import {
  parsePlanReport,
  parsePlanReview,
  type PlanReport,
} from '../src/services/supabase/trainingPlanReview';

const detail = parseTrainingPlanDetail({
  plan: { id: 'p1', weeks: 4, start_date: '2026-10-05', end_date: '2026-11-01' },
  blocks: [
    {
      block_index: 1,
      weeks: [
        { week_index: 1, kind: 'carga', start_date: '2026-10-05', end_date: '2026-10-11' },
        { week_index: 2, kind: 'carga', start_date: '2026-10-12', end_date: '2026-10-18' },
        { week_index: 3, kind: 'carga', start_date: '2026-10-19', end_date: '2026-10-25' },
        { week_index: 4, kind: 'descarga', start_date: '2026-10-26' },
      ],
    },
  ],
  anchors: [
    {
      exercise_id: 'bench',
      name: 'Press de banca',
      e1rm_by_week: [
        { week_index: 1, e1rm: 80 },
        { week_index: 2, e1rm: null },
        { week_index: 3, e1rm: 82.5 },
      ],
    },
    {
      exercise_id: 'squat',
      name: 'Sentadilla',
      e1rm_by_week: [
        { week_index: 2, e1rm: 100 },
        { week_index: 3, e1rm: 100 },
      ],
    },
    { exercise_id: 'dead', name: 'Peso muerto', e1rm_by_week: [{ week_index: 3, e1rm: 120 }] },
    { exercise_id: 'row', name: 'Remo', e1rm_by_week: [{ week_index: 1, e1rm: 60 }] },
  ],
});

describe('parsePlanReview', () => {
  it('reads the review and lifts the plan id into each adjustment', () => {
    const review = parsePlanReview({
      ok: true,
      plan_id: 'p1',
      week_index: 3,
      created_at: '2026-11-08T22:00:00Z',
      review: {
        sessions_done: 3,
        sessions_missed: 1,
        sets: 58,
        volume_kg: 24600,
        adjustments: [
          { id: 'a1', kind: 'deload_early', status: 'open', payload: { week_index: 4, reason: 'Poca recuperación' } },
          { id: 'a2', kind: 'variant_stall', status: 'applied', payload: { before: 'Banca', after: 'Banca inclinada' } },
        ],
      },
    });
    expect(review).toMatchObject({ planId: 'p1', weekIndex: 3, sessionsDone: 3, sets: 58, volumeKg: 24600 });
    expect(review?.adjustments.map(item => [item.id, item.status, item.planId])).toEqual([
      ['a1', 'open', 'p1'],
      ['a2', 'applied', 'p1'],
    ]);
  });
  it('answers null without a review body', () => {
    expect(parsePlanReview({ ok: true })).toBeNull();
  });
});

describe('weeks of the plan', () => {
  it('finds the bounds of a week and the start of the next one', () => {
    expect(weekBounds(detail, 2)).toEqual({ start: '2026-10-12', end: '2026-10-18' });
    // No end date: 6 days after the start.
    expect(weekBounds(detail, 4)).toEqual({ start: '2026-10-26', end: '2026-11-01' });
    expect(weekBounds(detail, 9)).toBeNull();
    expect(nextWeekStart(detail, 3)).toBe('2026-10-26');
    expect(nextWeekStart(detail, 4)).toBeNull();
  });
  it('counts the sessions the plan had that week', () => {
    const week = {
      days: [{ planSession: { status: 'done' } }, { planSession: { status: 'missed' } }, { planSession: { status: 'paused' } }, { planSession: null }],
    } as never;
    expect(plannedSessions(week, 1, 1)).toBe(2);
    expect(plannedSessions(null, 3, 1)).toBe(4);
    // Never fewer than the done ones.
    expect(plannedSessions({ days: [] } as never, 2, 0)).toBe(2);
  });
});

describe('improvedAnchors', () => {
  it('compares the week with the last previous week that has a value', () => {
    const result = improvedAnchors(detail.anchors, 3);
    expect(result.find(item => item.exerciseId === 'bench')).toMatchObject({ e1rm: 82.5, delta: 2.5 });
  });
  it('leaves out what did not go up and anchors without a value that week', () => {
    const ids = improvedAnchors(detail.anchors, 3).map(item => item.exerciseId);
    expect(ids).not.toContain('squat');
    expect(ids).not.toContain('row');
  });
  it('keeps a first record, without delta', () => {
    expect(improvedAnchors(detail.anchors, 3).find(item => item.exerciseId === 'dead')).toMatchObject({
      e1rm: 120,
      delta: null,
    });
  });
});

describe('records and adjustments', () => {
  const record = (id: string, recordedAt: string) => ({ id, recordedAt }) as never;
  it('keeps the records of the dates, newest first', () => {
    const noon = (day: string) => new Date(`${day}T12:00:00`).toISOString();
    const found = recordsBetween(
      [record('a', noon('2026-10-11')), record('b', noon('2026-10-12')), record('c', noon('2026-10-18')), record('d', noon('2026-10-19'))],
      '2026-10-12',
      '2026-10-18',
    );
    expect(found.map(item => item.id)).toEqual(['c', 'b']);
  });
  it('splits applied and open adjustments', () => {
    const split = reviewAdjustments([
      { id: '1', status: 'open' },
      { id: '2', status: 'applied' },
      { id: '3', status: 'reverted' },
    ] as never);
    expect(split.applied.map(item => item.id)).toEqual(['2']);
    expect(split.open.map(item => item.id)).toEqual(['1']);
  });
  it('writes the volume in tonnes', () => {
    expect(volumeTonnes(24600, 'es')).toBe('24,6');
    expect(volumeTonnes(24600, 'en')).toBe('24.6');
  });
});

const report = (patch: Partial<PlanReport> = {}): PlanReport => ({
  planId: 'p1',
  name: 'Plan',
  goal: 'gain_strength',
  goalTarget: { exerciseId: 'bench', exerciseSlug: null, exerciseName: 'Press de banca', kind: 'kg', target: 100, startEstimate: 85 },
  adherencePct: 96,
  sessionsDone: 46,
  sessionsTotal: 48,
  sessionsMissed: 2,
  anchors: [
    { exerciseId: 'bench', name: 'Press de banca', beforeE1rm: 85, afterE1rm: 100.2, deltaKg: 15 },
    { exerciseId: 'squat', name: 'Sentadilla', beforeE1rm: null, afterE1rm: 110, deltaKg: null },
    { exerciseId: 'dead', name: 'Peso muerto', beforeE1rm: 140, afterE1rm: 160, deltaKg: 20 },
  ],
  nextWeeks: 8,
  ...patch,
});

describe('parsePlanReport', () => {
  it('reads the report, also the one inside end_training_plan', () => {
    const parsed = parsePlanReport(
      {
        goal: 'gain_muscle',
        goal_target: { exercise_id: 'bench', kind: 'kg', target: 100 },
        adherence_pct: 96,
        sessions: { done: 46, total: 48, missed: 2 },
        anchors: [{ exercise_id: 'bench', name: 'Press', before_e1rm: 85, after_e1rm: 100, delta_kg: 15 }],
        next_plan: { recommended_weeks: 8 },
      },
      'p9',
    );
    expect(parsed).toMatchObject({ planId: 'p9', goal: 'gain_muscle', sessionsDone: 46, sessionsTotal: 48, nextWeeks: 8 });
    expect(parsed?.goalTarget?.target).toBe(100);
    expect(parsePlanReport(null)).toBeNull();
  });
  it('has no goal target when the server sends null', () => {
    expect(parsePlanReport({ goal_target: null })?.goalTarget).toBeNull();
  });
  it('ignores a recommended duration that is not 4, 8 or 12', () => {
    expect(parsePlanReport({ next_plan: { recommended_weeks: 6 } })?.nextWeeks).toBeNull();
  });
});

describe('final report', () => {
  it('judges a kg goal with the after_e1rm of its anchor', () => {
    expect(goalVerdict(report())).toMatchObject({ kind: 'kg', achieved: true, reached: 100 });
    expect(
      goalVerdict(report({ anchors: [{ exerciseId: 'bench', name: 'Press', beforeE1rm: 85, afterE1rm: 95, deltaKg: 10 }] })),
    ).toMatchObject({ achieved: false, reached: 95 });
  });
  it('cannot tell without the anchor value, and shows nothing without a goal', () => {
    expect(goalVerdict(report({ anchors: [] }))).toMatchObject({ achieved: null, reached: null });
    expect(goalVerdict(report({ goalTarget: null }))).toBeNull();
  });
  it('only states a reps goal', () => {
    const reps = report({
      goalTarget: { exerciseId: 'pull', exerciseSlug: null, exerciseName: 'Dominadas', kind: 'reps', target: 12, startEstimate: null },
    });
    expect(goalVerdict(reps)).toMatchObject({ kind: 'reps', achieved: null });
  });
  it('matches the anchor by name when the id differs', () => {
    const byName = report({
      goalTarget: { exerciseId: null, exerciseSlug: null, exerciseName: 'press de banca', kind: 'kg', target: 100, startEstimate: null },
    });
    expect(goalVerdict(byName)?.achieved).toBe(true);
  });
  it('shows before → after with the delta, or not enough records', () => {
    const [bench, squat] = report().anchors;
    expect(anchorLine(bench)).toEqual({ kind: 'values', name: 'Press de banca', before: 85, after: 100, delta: 15 });
    expect(anchorLine(squat)).toEqual({ kind: 'insufficient', name: 'Sentadilla' });
  });
  it('takes up to 3 anchors for the sticker, the biggest improvement first, without the incomplete ones', () => {
    expect(stickerAnchors(report().anchors).map(item => item.name)).toEqual(['Peso muerto', 'Press de banca']);
  });
  it('limits the records to the plan, never past today', () => {
    expect(reportRange(detail, '2026-12-01')).toEqual({ from: '2026-10-05', to: '2026-11-01' });
    expect(reportRange(detail, '2026-10-20')).toEqual({ from: '2026-10-05', to: '2026-10-20' });
    expect(reportRange(null, '2026-10-20')).toBeNull();
  });
  it('proposes the goal of the plan and the recommended weeks (8 without one)', () => {
    expect(nextPlan(report())).toEqual({ goal: 'gain_strength', weeks: 8 });
    expect(nextPlan(report({ nextWeeks: 12, goal: null }))).toEqual({ goal: null, weeks: 12 });
    expect(nextPlan(report({ nextWeeks: null })).weeks).toBe(8);
  });
  it('writes the chip with its sign', () => {
    expect(signedKg(15, 'es')).toBe('+15');
    expect(signedKg(17.5, 'es')).toBe('+17,5');
    expect(signedKg(-2.5, 'en')).toBe('-2.5');
  });
});
