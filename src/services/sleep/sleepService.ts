import {
  parseSleepNight,
  parseSleepOverview,
  type HealthNight,
  type SleepNight,
  type SleepOverview,
  type WakeFeeling,
} from '@app/features/sleep/sleepModel';
import { expectOk, supabaseRpc, type RoutineRpc } from '@app/services/routines/routinesService';

// Sueño y Respira (docs/backend/V2_15_SHAPES.md §1 and §4). Every RPC goes
// with the user's JWT; errors come as RoutineError (invalid_input + field).

export type BreathingWeek = { weekStart: string | null; weekCount: number };

export function createSleepService(rpc: RoutineRpc = supabaseRpc) {
  return {
    async getSleepOverview(tz: string | null): Promise<SleepOverview> {
      return parseSleepOverview(expectOk(await rpc('get_sleep_overview', { _tz: tz })));
    },

    // Upsert: "Editar" uses the same call.
    async logSleepManual(input: {
      nightDate: string;
      bedtimeAt: string;
      wakeAt: string;
      quality: number | null;
      wakeFeeling: WakeFeeling | null;
    }): Promise<SleepNight | null> {
      const record = expectOk(
        await rpc('log_sleep_manual', {
          _night_date: input.nightDate,
          _bedtime_at: input.bedtimeAt,
          _wake_at: input.wakeAt,
          _quality: input.quality,
          _wake_feeling: input.wakeFeeling,
        }),
      );
      return parseSleepNight(record.night);
    },

    // 1 to 14 nights; idempotent per (night_date, apple_health).
    async upsertSleepFromHealth(nights: HealthNight[]): Promise<number> {
      if (nights.length === 0) {
        return 0;
      }
      const record = expectOk(await rpc('upsert_sleep_from_health', { _nights: nights.slice(0, 14) }));
      return typeof record.upserted === 'number' ? record.upserted : nights.length;
    },

    // Call only when the 60 s are reached.
    async logBreathingSession(durationS = 60): Promise<BreathingWeek & { deduped: boolean }> {
      const record = expectOk(await rpc('log_breathing_session', { _duration_s: durationS }));
      return {
        weekStart: typeof record.week_start === 'string' ? record.week_start : null,
        weekCount: typeof record.week_count === 'number' ? record.week_count : 0,
        deduped: record.deduped === true,
      };
    },

    async getBreathingWeek(tz: string | null): Promise<BreathingWeek> {
      const record = expectOk(await rpc('get_breathing_week', { _tz: tz }));
      return {
        weekStart: typeof record.week_start === 'string' ? record.week_start : null,
        weekCount: typeof record.week_count === 'number' ? record.week_count : 0,
      };
    },
  };
}

export const sleepService = createSleepService();
