import {
  buildHydrationWeek,
  buildWeek,
  MONTH_ABBR,
  weekKeys,
} from '@app/features/progress/progressModel';
import { toGlasses } from '@app/features/home/homePriority';
import { getLocalDateKey } from '@app/lib/date';
import {
  ALL_BADGES,
  type BadgeDefinition,
  type BadgeId,
  type HydrationLog,
  type WorkoutSession,
} from '@app/shared';

// Logros (ACHIEVEMENTS_01 / 02): the 12 badges of the app on the four shelves
// of the design, with the progress towards the ones that can be measured.

export type ShelfKey = 'constancia' | 'retos' | 'fuerza' | 'habitos';

export const SHELVES: { key: ShelfKey; title: string; ids: BadgeId[] }[] = [
  {
    key: 'constancia',
    title: 'Constancia',
    ids: [
      'first_workout',
      'week_consistency',
      'streak_7_days',
      'hydration_3_days',
      'hydration_7_days',
      'weekly_hydration_master',
    ],
  },
  { key: 'retos', title: 'Retos', ids: ['core33_finisher'] },
  { key: 'fuerza', title: 'Fuerza', ids: ['first_pr', 'first_custom_workout'] },
  {
    key: 'habitos',
    title: 'Hábitos y conocimiento',
    ids: ['nutrition_started', 'quiz_master', 'first_quiz'],
  },
];

export type BadgeStats = {
  streakDays: number;
  workoutsThisWeek: number;
  challengeDays: number;
  hydrationStreak: number;
  hydrationDaysThisWeek: number;
};

// Consecutive days at the water goal, ending today (or yesterday if today has
// not reached it yet).
export function hydrationStreak(
  logs: HydrationLog[],
  goalGlasses: number,
  today: Date,
): number {
  const goal = Math.max(1, goalGlasses);
  const met = new Set(
    logs.filter(log => toGlasses(log.waterMl) >= goal).map(log => log.date),
  );
  let streak = 0;
  for (let offset = 0; offset < 120; offset += 1) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - offset,
      12,
    );
    if (met.has(getLocalDateKey(date))) {
      streak += 1;
    } else if (offset > 0) {
      break;
    }
  }
  return streak;
}

export function buildBadgeStats(input: {
  sessions: WorkoutSession[];
  streakDays: number;
  hydrationLogs: HydrationLog[];
  goalGlasses: number;
  challengeDays: number;
  today: Date;
}): BadgeStats {
  const week = buildHydrationWeek(
    input.hydrationLogs,
    input.goalGlasses,
    weekKeys(input.today),
    getLocalDateKey(input.today),
  );
  return {
    streakDays: input.streakDays,
    workoutsThisWeek: buildWeek(input.sessions, input.today).sessions,
    challengeDays: input.challengeDays,
    hydrationStreak: hydrationStreak(
      input.hydrationLogs,
      input.goalGlasses,
      input.today,
    ),
    hydrationDaysThisWeek: week.daysMet,
  };
}

export type BadgeProgress = { current: number; target: number; ratio: number };

function progress(current: number, target: number): BadgeProgress {
  const clamped = Math.min(target, Math.max(0, current));
  return { current: clamped, target, ratio: clamped / target };
}

// Progress towards a locked badge; null when it has no measurable goal (it is
// unlocked by doing it once).
export function badgeProgress(
  id: BadgeId,
  stats: BadgeStats,
): BadgeProgress | null {
  switch (id) {
    case 'week_consistency':
      return progress(stats.workoutsThisWeek, 3);
    case 'streak_7_days':
      return progress(stats.streakDays, 7);
    case 'core33_finisher':
      return progress(stats.challengeDays, 33);
    case 'hydration_3_days':
      return progress(stats.hydrationStreak, 3);
    case 'hydration_7_days':
      return progress(stats.hydrationStreak, 7);
    case 'weekly_hydration_master':
      return progress(stats.hydrationDaysThisWeek, 5);
    default:
      return null;
  }
}

export type ShelfItem = {
  badge: BadgeDefinition;
  earned: boolean;
  earnedAt?: string;
  progress: BadgeProgress | null;
  // Under the medal: the date when earned, "6 de 7" when locked with progress.
  sub: string;
};

export type Shelf = {
  key: ShelfKey;
  title: string;
  earnedCount: number;
  items: ShelfItem[];
};

export function shortBadgeDate(iso?: string): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  return `${date.getDate()} ${MONTH_ABBR[date.getMonth()]}`;
}

export function buildShelves(
  earned: { id: string; earnedAt?: string }[],
  stats: BadgeStats,
): { shelves: Shelf[]; earnedCount: number; total: number } {
  const earnedById = new Map(earned.map(item => [item.id, item.earnedAt]));
  const known = new Set(ALL_BADGES.map(badge => badge.id as string));

  const shelves = SHELVES.map<Shelf>(shelf => {
    const items = shelf.ids.map<ShelfItem>(id => {
      const badge = ALL_BADGES.find(item => item.id === id) as BadgeDefinition;
      const isEarned = earnedById.has(id);
      const prog = isEarned ? null : badgeProgress(id, stats);
      return {
        badge,
        earned: isEarned,
        earnedAt: earnedById.get(id),
        progress: prog,
        sub: isEarned
          ? shortBadgeDate(earnedById.get(id))
          : prog
          ? `${prog.current} de ${prog.target}`
          : '',
      };
    });
    return {
      key: shelf.key,
      title: shelf.title,
      earnedCount: items.filter(item => item.earned).length,
      items,
    };
  });

  return {
    shelves,
    earnedCount: [...earnedById.keys()].filter(id => known.has(id)).length,
    total: ALL_BADGES.length,
  };
}
