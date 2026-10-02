import type {
  NotificationDestination,
  ProductNotification,
} from '@app/features/notifications/types';
import {
  ALL_BADGES,
  formatPRValue,
  type PersonalRecord,
  type WorkoutSession,
} from '@app/shared';

// Notificaciones v2 (Home.dc.html · nf): "Para hoy", hitos and recent
// activity built only from data the app already has.

export const NUTRITION_PLAN_MISSING_ID = 'nutrition-plan-missing';

export type TodayTag = 'today' | 'lastDay' | 'ongoing';

export type TodayItem = {
  notification: ProductNotification;
  tag: TodayTag;
};

// Pending reminders for today (the "activate your plan" setup row is shown
// apart, at the bottom).
export function buildTodayItems(
  notifications: ProductNotification[],
  challengeDay: number,
): TodayItem[] {
  return notifications
    .filter(item => item.unread && item.id !== NUTRITION_PLAN_MISSING_ID)
    .map(notification => ({
      notification,
      tag:
        notification.destination === 'hydration'
          ? 'ongoing'
          : notification.destination === 'challenge' && challengeDay >= 33
          ? 'lastDay'
          : 'today',
    }));
}

export const TODAY_TAG_LABEL: Record<TodayTag, string> = {
  today: 'HOY',
  lastDay: 'ÚLTIMO DÍA',
  ongoing: 'EN CURSO',
};

export type PhotoKey = 'core' | 'total' | 'mobility' | 'workout' | 'overhead';

export function photoForDestination(
  destination: NotificationDestination,
): PhotoKey {
  switch (destination) {
    case 'challenge':
      return 'core';
    case 'workouts':
      return 'total';
    case 'hydration':
      return 'mobility';
    case 'nutrition':
      return 'workout';
    default:
      return 'overhead';
  }
}

const MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

// Local "YYYY-MM-DD" or ISO timestamp → Date in local time.
function parseDay(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
}

export function daysAgo(value: string, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(parseDay(value))) / 86400000);
}

export function relativeDay(value: string, now: Date): string {
  const diff = daysAgo(value, now);

  if (diff <= 0) {
    return 'hoy';
  }
  if (diff === 1) {
    return 'ayer';
  }
  if (diff < 7) {
    return `hace ${diff} días`;
  }

  const date = parseDay(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export type Milestone = {
  id: string;
  title: string;
  detail: string;
  icon: string; // badge icon name (gamification.ts) or 'trophy'
  fresh: boolean;
  destination: 'achievements' | 'records';
  sortKey: number;
};

export function buildMilestones(params: {
  badges: Array<{ id: string; earnedAt?: string }>;
  records: PersonalRecord[];
  exerciseNames: Record<string, string>;
  now: Date;
  limit?: number;
}): Milestone[] {
  const { badges, records, exerciseNames, now, limit = 6 } = params;

  const fromBadges: Milestone[] = badges
    .map((badge): Milestone | null => {
      const definition = ALL_BADGES.find(item => item.id === badge.id);

      if (!definition) {
        return null;
      }

      const when = badge.earnedAt;
      return {
        id: `badge-${badge.id}`,
        title: definition.title,
        detail: when ? `Logro · ${relativeDay(when, now)}` : 'Logro',
        icon: definition.icon,
        fresh: when ? daysAgo(when, now) === 0 : false,
        destination: 'achievements',
        sortKey: when ? parseDay(when).getTime() : 0,
      };
    })
    .filter((item): item is Milestone => item !== null);

  const fromRecords: Milestone[] = [...records]
    .sort(
      (left, right) =>
        parseDay(right.recordedAt).getTime() -
        parseDay(left.recordedAt).getTime(),
    )
    .slice(0, 3)
    .map(record => ({
      id: `record-${record.id}`,
      title: `${
        exerciseNames[record.exerciseId] || 'Ejercicio'
      } · ${formatPRValue(record)}`,
      detail: `Récord · ${relativeDay(record.recordedAt, now)}`,
      icon: 'trophy',
      fresh: daysAgo(record.recordedAt, now) === 0,
      destination: 'records' as const,
      sortKey: parseDay(record.recordedAt).getTime(),
    }));

  return [...fromBadges, ...fromRecords]
    .sort((left, right) => right.sortKey - left.sortKey)
    .slice(0, limit);
}

export type ActivityItem = {
  id: string;
  kind: 'workout' | 'water' | 'nutrition';
  text: string;
  when: string;
};

export function buildActivity(params: {
  sessions: WorkoutSession[];
  todayWaterMl: number;
  todayCalories: number;
  now: Date;
  limit?: number;
}): ActivityItem[] {
  const { sessions, todayWaterMl, todayCalories, now, limit = 5 } = params;
  const items: Array<ActivityItem & { order: number }> = [];

  sessions
    .filter(session => session.completed || session.status === 'completed')
    .filter(session => daysAgo(session.date, now) < 7)
    .forEach(session => {
      items.push({
        id: `session-${session.id}`,
        kind: 'workout',
        text: `Completaste ${session.workoutTitle} · ${session.duration} min`,
        when: relativeDay(session.date, now),
        order: daysAgo(session.date, now),
      });
    });

  const glasses = Math.round(todayWaterMl / 250);
  if (glasses > 0) {
    items.push({
      id: 'water-today',
      kind: 'water',
      text: `Registraste ${glasses} ${
        glasses === 1 ? 'vaso' : 'vasos'
      } de agua`,
      when: 'hoy',
      order: 0,
    });
  }

  if (todayCalories > 0) {
    items.push({
      id: 'nutrition-today',
      kind: 'nutrition',
      text: `Registraste ${String(Math.round(todayCalories)).replace(
        /\B(?=(\d{3})+(?!\d))/g,
        '.',
      )} kcal`,
      when: 'hoy',
      order: 0,
    });
  }

  return items
    .sort((left, right) => left.order - right.order)
    .slice(0, limit)
    .map(({ order: _order, ...item }) => item);
}
