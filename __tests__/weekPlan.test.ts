import {
  addDays,
  availabilityLine,
  dayLabel,
  isEditable,
  isoWeekNumber,
  missedText,
  nextEmptyIndex,
  parseWeekPlan,
  pastNote,
  pillDot,
  previewLine,
  selectableWeekdays,
  stepMinutes,
  stripLine,
  weekRangeLabel,
  weekSummaryLine,
  type WeekDay,
} from '../src/features/week/weekModel';
import { createWeekPlanService } from '../src/services/routines/weekPlanService';
import { RoutineError } from '../src/services/routines/routinesService';
import { routineErrorCopy } from '../src/features/workouts/routineErrors';
import { reminderWeekPlan } from '../src/features/push/localReminders';

const routine = (id: string, title: string) => ({
  id,
  title,
  type: 'strength',
  duration: 35,
  routine_category: 'fuerza',
  exercise_count: 6,
  thumb_key: null,
});

// Week of Mon 21 – Sun 27 Sep 2026; today Tuesday 22. Monday was missed.
const body = {
  ok: true,
  week_start: '2026-09-21',
  today: '2026-09-22',
  plan: { id: 'p1', week_start: '2026-09-21', origin: 'ellie', answers: {}, active: true, activated_at: 'x', has_preview: false },
  days: [
    { date: '2026-09-21', kind: 'session', routine: routine('r1', 'Brazos a fondo'), minutes: 38, status: 'missed', core33: { active: true, day: 32, habits_done: 3 } },
    { date: '2026-09-22', kind: 'session', routine: routine('r2', 'Total Body'), minutes: 35, status: 'today', core33: { active: true, day: 33, habits_done: 1 } },
    { date: '2026-09-23', kind: 'empty', routine: null, minutes: null, status: 'empty', core33: null },
    { date: '2026-09-24', kind: 'session', routine: routine('r3', 'Piernas'), minutes: 50, status: 'planned', core33: null },
    { date: '2026-09-25', kind: 'unavailable', routine: null, minutes: null, status: 'unavailable', core33: null },
    { date: '2026-09-26', kind: 'session', routine: routine('r4', 'Tracción'), minutes: 45, status: 'planned', core33: null },
    { date: '2026-09-27', kind: 'rest', routine: null, minutes: 15, status: 'rest', core33: null },
  ],
  summary: { sessions_done: 0, sessions_planned: 4, rest_days: 1 },
  missed: { date: '2026-09-21', routine_id: 'r1', proposed_date: '2026-09-23' },
};

describe('Tu semana · get_week_plan', () => {
  const week = parseWeekPlan(body);

  it('reads the plan, the days and the missed session', () => {
    expect(week.plan).toMatchObject({ id: 'p1', origin: 'ellie', active: true });
    expect(week.days).toHaveLength(7);
    expect(week.days[1]).toMatchObject({ kind: 'session', minutes: 35, status: 'today', routine: { id: 'r2', exerciseCount: 6 } });
    expect(week.days[0].core33).toEqual({ active: true, day: 32, habitsDone: 3 });
    expect(week.missed).toEqual({ date: '2026-09-21', routineId: 'r1', proposedDate: '2026-09-23' });
  });

  it('builds the header lines', () => {
    expect(isoWeekNumber('2026-09-21')).toBe(39);
    expect(isoWeekNumber('2026-12-28')).toBe(53);
    expect(weekRangeLabel('2026-09-21')).toBe('21 – 27 sep');
    expect(weekRangeLabel('2026-09-28')).toBe('28 sep – 4 oct');
    expect(weekSummaryLine(week)).toBe('0 de 4 sesiones hechas · 1 descanso · 1 sin disponibilidad · 1 sin planificar');
    expect(stripLine(week)).toBe('0 de 4 sesiones');
    expect(dayLabel('2026-09-22', '2026-09-22')).toBe('Martes 22 · Hoy');
  });

  it('dots: missed ring, planned ink, empty grey ring, none for rest and unavailable', () => {
    expect(week.days.map(pillDot)).toEqual(['missed', 'planned', 'empty', 'planned', 'none', 'planned', 'none']);
  });

  it('only today and the days ahead are editable, never a done session', () => {
    expect(isEditable(week.days[0], week.today)).toBe(false);
    expect(isEditable(week.days[1], week.today)).toBe(true);
    expect(isEditable({ ...week.days[1], status: 'done' } as WeekDay, week.today)).toBe(false);
  });

  it('minutes go in steps of 5 between 15 and 90', () => {
    expect(stepMinutes(35, 5)).toBe(40);
    expect(stepMinutes(15, -5)).toBe(15);
    expect(stepMinutes(90, 5)).toBe(90);
    expect(stepMinutes(37, 5)).toBe(40);
  });

  it('ELLIE proposes the free day for the missed session', () => {
    expect(missedText(week)).toBe(
      'Ayer no hiciste Brazos a fondo. Lo paso al miércoles, que tenías libre, y el resto de la semana queda igual.',
    );
    expect(missedText({ ...week, missed: { ...week.missed!, proposedDate: null } })).toBe(
      'Ayer no hiciste Brazos a fondo. Esta semana no queda un día libre para pasarla.',
    );
  });

  it('past notes and the next empty day of "Hazla tú"', () => {
    expect(pastNote({ ...week.days[0], status: 'done' }, null)).toBe('Completada · 38 min');
    expect(pastNote({ ...week.days[0], skippedResolution: 'rescheduled' }, '2026-09-23')).toBe('Se movió al miércoles.');
    expect(pastNote(week.days[0], null)).toBe('Esta sesión quedó sin hacer.');
    expect(nextEmptyIndex(week.days, 1)).toBe(2);
    expect(nextEmptyIndex(week.days, 2)).toBe(-1);
  });

  it('planning with ELLIE: days from today, availability line and preview line', () => {
    expect(selectableWeekdays('2026-09-21', '2026-09-22')).toEqual([2, 3, 4, 5, 6, 7]);
    expect(availabilityLine([2, 3, 4, 6], '2026-09-21', '2026-09-22')).toBe('4 días disponibles desde hoy. El lunes ya pasó.');
    expect(addDays('2026-09-27', 1)).toBe('2026-09-28');
    expect(
      previewLine(
        {
          planId: 'p2',
          weekStart: '2026-09-21',
          days: [
            { date: '2026-09-21', kind: 'empty', minutes: null, routine: null },
            { date: '2026-09-22', kind: 'session', minutes: 45, routine: null },
            { date: '2026-09-23', kind: 'session', minutes: 45, routine: null },
            { date: '2026-09-24', kind: 'rest', minutes: 15, routine: null },
          ],
        },
        '2026-09-22',
        'strength',
      ),
    ).toBe('Listo. 2 sesiones de fuerza y 1 día para recuperar.');
  });

  it('the reminders read only an active plan, with its session days', () => {
    expect(reminderWeekPlan({ ...week, plan: { ...week.plan!, active: false } })).toBeNull();
    const reminder = reminderWeekPlan(week);
    expect(reminder?.dates).toHaveLength(7);
    expect(Object.keys(reminder?.sessions ?? {})).toEqual(['2026-09-21', '2026-09-22', '2026-09-24', '2026-09-26']);
    expect(reminder?.sessions['2026-09-22']).toEqual({ minutes: 35, title: 'Total Body' });
  });
});

describe('Tu semana · RPC', () => {
  it('sends each contract call with its arguments', async () => {
    const rpc = jest.fn(async (name: string) =>
      name === 'get_week_plan'
        ? body
        : name === 'plan_week_with_ellie'
          ? { ok: true, plan_id: 'p2', week_start: '2026-09-21', preview: true, days: [] }
          : name === 'resolve_missed_day'
            ? { ok: true, action: 'reschedule', date: '2026-09-23' }
            : { ok: true },
    );
    const service = createWeekPlanService(rpc);
    await service.getWeekPlan({ tz: 'Europe/Madrid' });
    expect(rpc).toHaveBeenLastCalledWith('get_week_plan', { _week_start: null, _tz: 'Europe/Madrid' });
    await service.setWeekDay('2026-09-23', { kind: 'session', routineId: 'r9' });
    expect(rpc).toHaveBeenLastCalledWith('set_week_day', { _date: '2026-09-23', _patch: { kind: 'session', routine_id: 'r9' } });
    await service.setWeekDay('2026-09-23', { minutes: 40 });
    expect(rpc).toHaveBeenLastCalledWith('set_week_day', { _date: '2026-09-23', _patch: { minutes: 40 } });
    await service.moveWeekDay('2026-09-22', '2026-09-24');
    expect(rpc).toHaveBeenLastCalledWith('move_week_day', { _from: '2026-09-22', _to: '2026-09-24' });
    await service.clearWeek('2026-09-21');
    expect(rpc).toHaveBeenLastCalledWith('clear_week', { _week_start: '2026-09-21' });
    const preview = await service.planWeekWithEllie({ days: [5, 2, 3], focus: 'mixed', minutes: 60, weekStart: '2026-09-21' }, null);
    expect(rpc).toHaveBeenLastCalledWith('plan_week_with_ellie', {
      _answers: { days: [2, 3, 5], focus: 'mixed', minutes: 60, week_start: '2026-09-21' },
      _tz: null,
    });
    expect(preview.planId).toBe('p2');
    await service.activateWeekPlan('p2');
    expect(rpc).toHaveBeenLastCalledWith('activate_week_plan', { _plan_id: 'p2' });
    await service.deactivateWeekPlan('p2');
    expect(rpc).toHaveBeenLastCalledWith('deactivate_week_plan', { _plan_id: 'p2' });
    await service.regenerateWeekDay('2026-09-24');
    expect(rpc).toHaveBeenLastCalledWith('regenerate_week_day', { _date: '2026-09-24' });
    const moved = await service.resolveMissedDay('2026-09-21', 'reschedule', '2026-09-23');
    expect(rpc).toHaveBeenLastCalledWith('resolve_missed_day', { _date: '2026-09-21', _action: 'reschedule', _to: '2026-09-23' });
    expect(moved.date).toBe('2026-09-23');
  });

  it('maps the contract errors to v2 texts in es and en', async () => {
    const codes = ['past_day', 'no_candidates', 'not_missed', 'no_free_day', 'plan_not_found'] as const;
    for (const code of codes) {
      const service = createWeekPlanService(async () => ({ ok: false, error: code }));
      const error = await service.regenerateWeekDay('2026-09-20').catch(e => e);
      expect(error).toBeInstanceOf(RoutineError);
      expect(error.code).toBe(code);
      expect(routineErrorCopy(error, 'es').message).not.toBe(routineErrorCopy(new RoutineError('unknown'), 'es').message);
      expect(routineErrorCopy(error, 'en').title).toMatch(/[A-Za-z]/);
    }
    const invalid = new RoutineError('invalid_input', { field: 'days' });
    expect(routineErrorCopy(invalid, 'es').message).toBe('Elige al menos un día desde hoy.');
    expect(routineErrorCopy(invalid, 'en').message).toBe('Choose at least one day from today.');
  });
});
