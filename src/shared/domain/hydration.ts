export type HydrationLog = {
  date: string;
  waterMl: number;
};

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateHydrationStreak(
  logs: HydrationLog[],
  goalMl: number,
  today: Date = new Date(),
  lookbackDays = 14,
): number {
  if (goalMl <= 0) {
    return 0;
  }

  const logMap = new Map(logs.map(log => [log.date, log.waterMl]));
  let streak = 0;

  for (let index = 0; index < lookbackDays; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const ml = logMap.get(toDateKey(date)) ?? 0;

    if (ml >= goalMl) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}
