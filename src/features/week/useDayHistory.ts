import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { useCore33 } from '@app/hooks/useCore33';
import { useSleepOverview } from '@app/hooks/useSleep';
import { nutritionTz } from '@app/features/nutrition/useNutritionToday';
import { fetchNutritionDay } from '@app/services/supabase/nutritionDay';
import { fetchDaySessions } from '@app/services/supabase/session';

// Past days of Tu semana: the completed sessions of a local day and the day
// summary (Core 33, sleep, nutrition, hydration). Only real data: a block
// without data is null, never zeros. Steps are not read by the app.

export function useDaySessions(date: string | null) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['day-sessions', profile?.id, date],
    enabled: Boolean(profile?.id && date),
    staleTime: 60 * 1000,
    queryFn: () => fetchDaySessions(profile!.id, date as string),
  });
}

export type DaySummary = {
  core33: { day: number; habits: { name: string; done: boolean }[] } | null;
  sleep: { durationMin: number; bedtimeAt: string; wakeAt: string } | null;
  nutrition: { kcal: number; proteinG: number | null } | null;
  hydration: { ml: number } | null;
};

function daysBetween(from: string, to: string): number {
  const [ay, am, ad] = from.split('-').map(Number);
  const [by, bm, bd] = to.split('-').map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000,
  );
}

export function useDaySummary(date: string | null) {
  const core33 = useCore33().stateQuery;
  // Sleep: only the last 7 nights exist (get_sleep_overview has no date).
  const sleep = useSleepOverview(Boolean(date));
  const nutrition = useQuery({
    queryKey: ['day-nutrition', date],
    enabled: Boolean(date),
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchNutritionDay(date as string, nutritionTz()),
  });

  const loading =
    Boolean(date) &&
    (core33.isLoading || sleep.isLoading || nutrition.isLoading);
  const failed = Boolean(core33.error && sleep.error && nutrition.error);

  let summary: DaySummary | null = null;
  if (date && !loading) {
    // Core 33: the challenge was running that day (from its start, 33 days).
    const challenge = core33.data?.challenge ?? null;
    const offset = challenge ? daysBetween(challenge.startDate, date) : -1;
    const logs = core33.data?.habitLogs[date] ?? null;
    const core =
      challenge && offset >= 0 && offset < 33 && challenge.habits.length > 0
        ? {
            day: offset + 1,
            habits: challenge.habits.map((habit, index) => ({
              name: habit.name,
              done: Boolean(logs?.[index]),
            })),
          }
        : null;

    const night =
      sleep.data?.nights7.find(item => item.nightDate === date) ?? null;
    const day = nutrition.data ?? null;
    const kcal = day ? Math.round(day.consumed.kcal) : 0;
    const protein = day ? Math.round(day.consumed.p) : 0;
    const ml = day ? Math.round(day.water.ml) : 0;

    summary = {
      core33: core,
      sleep:
        night && night.durationMin > 0
          ? {
              durationMin: night.durationMin,
              bedtimeAt: night.bedtimeAt,
              wakeAt: night.wakeAt,
            }
          : null,
      nutrition:
        kcal > 0 ? { kcal, proteinG: protein > 0 ? protein : null } : null,
      hydration: ml > 0 ? { ml } : null,
    };
  }

  const empty =
    summary !== null &&
    !summary.core33 &&
    !summary.sleep &&
    !summary.nutrition &&
    !summary.hydration;
  const retry = () => {
    core33.refetch().catch(() => undefined);
    sleep.refetch().catch(() => undefined);
    nutrition.refetch().catch(() => undefined);
  };
  return { summary, loading, failed, empty, retry };
}
