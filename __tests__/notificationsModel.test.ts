import {
  buildActivity,
  buildMilestones,
  buildTodayItems,
  relativeDay,
} from '../src/features/notifications/notificationsModel';
import type { ProductNotification } from '../src/features/notifications/types';
import type { PersonalRecord, WorkoutSession } from '../src/shared';

const now = new Date(2026, 9, 1, 18, 0); // 1 Oct 2026

function notification(
  id: string,
  destination: ProductNotification['destination'],
  unread = true,
): ProductNotification {
  return {
    id,
    icon: 'dumbbell',
    title: id,
    summary: '',
    contextLabel: 'Para hoy',
    actionLabel: 'Ver',
    priority: 1,
    unread,
    tone: 'reminder',
    destination,
  };
}

describe('notifications model', () => {
  it('keeps unread reminders for today and tags them', () => {
    const items = buildTodayItems(
      [
        notification('nudge-challenge', 'challenge'),
        notification('nudge-hydration', 'hydration'),
        notification('nutrition-plan-missing', 'ellie'),
        notification('weekly', 'progress', false),
      ],
      33,
    );

    expect(items.map(item => [item.notification.id, item.tag])).toEqual([
      ['nudge-challenge', 'lastDay'],
      ['nudge-hydration', 'ongoing'],
    ]);
    expect(
      buildTodayItems([notification('nudge-challenge', 'challenge')], 12)[0]
        .tag,
    ).toBe('today');
  });

  it('formats relative days', () => {
    expect(relativeDay('2026-10-01', now)).toBe('hoy');
    expect(relativeDay('2026-09-30', now)).toBe('ayer');
    expect(relativeDay('2026-09-27', now)).toBe('hace 4 días');
    expect(relativeDay('2026-09-23', now)).toBe('23 sep');
  });

  it('merges badges and records into milestones, newest first', () => {
    const record: PersonalRecord = {
      id: 'pr-1',
      userId: 'u',
      exerciseId: 'ex-1',
      prType: 'max_weight',
      valueWeight: 32.5,
      valueReps: 1,
      valueDurationSec: null,
      valueDistanceM: null,
      unit: 'kg',
      notes: null,
      recordedAt: new Date(2026, 8, 23, 10).toISOString(),
      createdAt: '',
    };

    const milestones = buildMilestones({
      badges: [
        {
          id: 'first_workout',
          earnedAt: new Date(2026, 9, 1, 9).toISOString(),
        },
        { id: 'unknown_badge' },
      ],
      records: [record],
      exerciseNames: { 'ex-1': 'Arnold press' },
      now,
    });

    expect(milestones.map(item => item.id)).toEqual([
      'badge-first_workout',
      'record-pr-1',
    ]);
    expect(milestones[0]).toMatchObject({
      fresh: true,
      title: 'Primer entreno',
    });
    expect(milestones[1]).toMatchObject({
      fresh: false,
      title: 'Arnold press · 32.5 kg',
      detail: 'Récord · 23 sep',
    });
  });

  it('lists recent activity from sessions, water and nutrition', () => {
    const session = (id: string, date: string): WorkoutSession => ({
      id,
      workoutId: 'w',
      workoutTitle: 'Total Body',
      userId: 'u',
      date,
      completed: true,
      duration: 42,
      caloriesBurned: 300,
      status: 'completed',
      startedAt: null,
      endedAt: null,
      completedExercises: [],
      totalExercises: 6,
    });

    const activity = buildActivity({
      sessions: [session('old', '2026-09-20'), session('s1', '2026-09-30')],
      todayWaterMl: 1500,
      todayCalories: 1240,
      now,
    });

    expect(activity.map(item => [item.text, item.when])).toEqual([
      ['Registraste 6 vasos de agua', 'hoy'],
      ['Registraste 1.240 kcal', 'hoy'],
      ['Completaste Total Body · 42 min', 'ayer'],
    ]);
  });
});
