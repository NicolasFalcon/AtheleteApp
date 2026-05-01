import { format, subDays } from 'date-fns';

export interface HydrationLog {
  date: string;
  water_ml: number;
}

export function calculateHydrationStreak(
  logs: HydrationLog[],
  goalMl: number,
  today: Date = new Date(),
  lookbackDays = 14,
): number {
  if (goalMl <= 0) return 0;

  const logMap = new Map(logs.map((log) => [log.date, log.water_ml]));
  let streak = 0;

  for (let i = 0; i < lookbackDays; i += 1) {
    const date = format(subDays(today, i), 'yyyy-MM-dd');
    const ml = logMap.get(date) ?? 0;
    if (ml >= goalMl) streak += 1;
    else break;
  }

  return streak;
}

export function buildHydrationChartData(
  logs: HydrationLog[],
  today: Date = new Date(),
  days = 7,
): HydrationLog[] {
  const chart: HydrationLog[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = format(subDays(today, i), 'yyyy-MM-dd');
    const log = logs.find((item) => item.date === date);
    chart.push({ date, water_ml: log?.water_ml ?? 0 });
  }

  return chart;
}

export function summarizeHydrationWeek(chartData: HydrationLog[], goalMl: number) {
  const daysMetGoal = chartData.filter((point) => point.water_ml >= goalMl).length;
  const weeklyAverageMl = Math.round(
    chartData.reduce((sum, point) => sum + point.water_ml, 0) / Math.max(chartData.length, 1),
  );
  return { daysMetGoal, weeklyAverageMl };
}
