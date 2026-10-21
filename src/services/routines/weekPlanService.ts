import {
  parseWeekDay,
  parseWeekPlan,
  parseWeekPreview,
  type WeekAnswers,
  type WeekDay,
  type WeekDayKind,
  type WeekPlan,
  type WeekPreview,
} from '@app/features/week/weekModel';
import {
  expectOk,
  supabaseRpc,
  type RoutineRpc,
} from '@app/services/routines/routinesService';

// Tu semana (docs/backend/V2_15_SHAPES.md §2). Every RPC goes with the
// user's JWT; errors come as RoutineError (past_day, no_candidates,
// not_missed, no_free_day, plan_not_found, routine_not_found…).

export type WeekDayPatch = {
  kind?: WeekDayKind;
  routineId?: string | null;
  minutes?: number | null;
};

export function buildDayPatch(patch: WeekDayPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.kind) {
    out.kind = patch.kind;
  }
  if (patch.routineId !== undefined) {
    out.routine_id = patch.routineId;
  }
  if (patch.minutes !== undefined && patch.minutes !== null) {
    out.minutes = patch.minutes;
  }
  return out;
}

export function buildAnswers(answers: WeekAnswers): Record<string, unknown> {
  return {
    days: [...answers.days].sort((a, b) => a - b),
    focus: answers.focus,
    minutes: answers.minutes,
    ...(answers.weekStart ? { week_start: answers.weekStart } : {}),
  };
}

export function createWeekPlanService(rpc: RoutineRpc = supabaseRpc) {
  return {
    async getWeekPlan(params: { weekStart?: string | null; tz?: string | null } = {}): Promise<WeekPlan> {
      const record = expectOk(
        await rpc('get_week_plan', { _week_start: params.weekStart ?? null, _tz: params.tz ?? null }),
      );
      return parseWeekPlan(record);
    },

    async setWeekDay(date: string, patch: WeekDayPatch): Promise<WeekDay | null> {
      const record = expectOk(await rpc('set_week_day', { _date: date, _patch: buildDayPatch(patch) }));
      return record.day ? parseWeekDay(record.day) : null;
    },

    async moveWeekDay(from: string, to: string): Promise<void> {
      expectOk(await rpc('move_week_day', { _from: from, _to: to }));
    },

    async clearWeek(weekStart: string): Promise<{ cleared: number }> {
      const record = expectOk(await rpc('clear_week', { _week_start: weekStart }));
      return { cleared: typeof record.cleared === 'number' ? record.cleared : 0 };
    },

    // A preview: the active plan stays as it is until activateWeekPlan.
    async planWeekWithEllie(answers: WeekAnswers, tz: string | null): Promise<WeekPreview> {
      const record = expectOk(
        await rpc('plan_week_with_ellie', { _answers: buildAnswers(answers), _tz: tz }),
      );
      return parseWeekPreview(record);
    },

    async activateWeekPlan(planId: string): Promise<void> {
      expectOk(await rpc('activate_week_plan', { _plan_id: planId }));
    },

    async deactivateWeekPlan(planId: string): Promise<void> {
      expectOk(await rpc('deactivate_week_plan', { _plan_id: planId }));
    },

    async regenerateWeekDay(date: string): Promise<WeekDay | null> {
      const record = expectOk(await rpc('regenerate_week_day', { _date: date }));
      return record.day ? parseWeekDay(record.day) : null;
    },

    // ELLIE proposes, the user confirms: 'reschedule' moves the session to
    // `to` (or the proposed day), 'keep' leaves it as missed.
    async resolveMissedDay(
      date: string,
      action: 'reschedule' | 'keep',
      to: string | null = null,
    ): Promise<{ date: string | null }> {
      const record = expectOk(
        await rpc('resolve_missed_day', { _date: date, _action: action, _to: to }),
      );
      return { date: typeof record.date === 'string' ? record.date : null };
    },
  };
}

export const weekPlanService = createWeekPlanService();
