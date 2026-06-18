import { getHomePriority } from '../src/features/home/homePriority';
import type { WorkoutSession } from '../src/shared';

function session(status: WorkoutSession['status']): WorkoutSession {
  return {
    id: 'session-1',
    workoutId: 'workout-1',
    workoutTitle: 'Fuerza',
    userId: 'user-1',
    date: '2026-06-12',
    completed: status === 'completed',
    duration: 20,
    caloriesBurned: 100,
    status,
    startedAt: null,
    endedAt: null,
    completedExercises: [],
    totalExercises: 5,
    createdAt: '2026-06-12T12:00:00Z',
  };
}

describe('home priority', () => {
  it('keeps an active workout as the first action', () => {
    expect(
      getHomePriority({
        session: session('in_progress'),
        challenge: {
          status: 'active',
          completedToday: 0,
          totalHabits: 3,
        },
        hasNutritionPlan: true,
        hasNutritionLog: false,
      }),
    ).toBe('workout');
  });

  it('prioritizes pending Core 33 habits before starting a workout', () => {
    expect(
      getHomePriority({
        session: null,
        challenge: {
          status: 'active',
          completedToday: 1,
          totalHabits: 3,
        },
        hasNutritionPlan: true,
        hasNutritionLog: false,
      }),
    ).toBe('core33');
  });

  it('shows nutrition after the workout when the daily log is pending', () => {
    expect(
      getHomePriority({
        session: session('completed'),
        challenge: null,
        hasNutritionPlan: true,
        hasNutritionLog: false,
      }),
    ).toBe('nutrition');
  });
});
