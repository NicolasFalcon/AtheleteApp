import type {
  PersonalRecord,
  WorkoutSession,
  DailyNutritionLog,
  HydrationLog,
} from '@app/shared';
import { getLocalDateKey } from '@app/lib/date';
import type { ProgressChallenge } from '@app/services/supabase/progress';

// Development only: sample data for Progreso when the test account has none
// (athelete://dev/progress?screen=data…). Nothing is read or written.

let seq = 0;

function session(
  date: string,
  minutes: number,
  volumeKg: number | null,
): WorkoutSession {
  seq += 1;
  const start = new Date(`${date}T10:00:00`).getTime();
  return {
    id: `fx${seq}`,
    workoutId: 'fx',
    workoutTitle: 'Total Body Dumbbell',
    userId: 'fx',
    date,
    completed: true,
    duration: minutes,
    caloriesBurned: 280,
    status: 'completed',
    startedAt: new Date(start).toISOString(),
    endedAt: new Date(start + minutes * 60000).toISOString(),
    pausedAt: null,
    pausedTotalSec: 0,
    volumeKg,
    completedExercises: [],
    totalExercises: 6,
  };
}

function pr(
  exerciseId: string,
  patch: Partial<PersonalRecord>,
): PersonalRecord {
  seq += 1;
  return {
    id: `fxpr${seq}`,
    userId: 'fx',
    exerciseId,
    prType: 'weight_reps',
    valueWeight: 100,
    valueReps: 1,
    valueDurationSec: null,
    valueDistanceM: null,
    unit: 'kg',
    notes: null,
    recordedAt: '',
    createdAt: '',
    source: 'manual',
    workoutSessionId: null,
    sessionSetId: null,
    ...patch,
  };
}

export const FIXTURE_EXERCISE_NAMES: Record<string, string> = {
  rdl: 'Peso muerto rumano',
  arnold: 'Arnold press',
  bench: 'Press de banca con mancuernas',
  goblet: 'Sentadilla goblet',
};

export function progressFixture(today: Date) {
  const year = today.getFullYear();
  const key = (offset: number) => {
    const d = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - offset,
      12,
    );
    return getLocalDateKey(d);
  };
  const monday = (today.getDay() + 6) % 7;
  // This week: Monday 42 min, Wednesday 38 min (like the prototype).
  const sessions: WorkoutSession[] = [
    session(key(monday), 42, 8100),
    ...(monday >= 2 ? [session(key(monday - 2), 38, 8130)] : []),
  ];
  // Days of the current month already past (varied minutes for the calendar).
  [
    [1, 25],
    [2, 50],
    [4, 15],
    [5, 45],
    [8, 30],
    [9, 60],
    [11, 20],
    [12, 40],
  ].forEach(([day, minutes]) => {
    if (day < today.getDate()) {
      sessions.push(
        session(
          `${year}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
            day,
          ).padStart(2, '0')}`,
          minutes,
          8000,
        ),
      );
    }
  });
  // Earlier months of the year: volume grows from ~6.890 kg to ~8.130 kg.
  const monthly = [6890, 7010, 7100, 7260, 7420, 7600, 7790, 7960, 8130];
  monthly.forEach((volume, month) => {
    if (month >= today.getMonth()) {
      return;
    }
    [3, 9, 14, 20].forEach(day => {
      sessions.push(
        session(
          `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(
            2,
            '0',
          )}`,
          35 + day,
          volume,
        ),
      );
    });
  });

  const records = [
    pr('rdl', {
      valueWeight: 170,
      valueReps: 3,
      recordedAt: `${year}-01-10T12:00:00`,
    }),
    pr('rdl', {
      valueWeight: 180,
      valueReps: 3,
      recordedAt: `${year}-02-02T12:00:00`,
    }),
    pr('rdl', {
      valueWeight: 190,
      valueReps: 2,
      recordedAt: `${year}-03-12T12:00:00`,
    }),
    pr('rdl', {
      valueWeight: 200,
      valueReps: 1,
      recordedAt: `${year}-04-09T12:00:00`,
      source: 'session',
      sessionSetId: 'fxset',
    }),
    pr('arnold', {
      prType: 'max_weight',
      valueWeight: 32.5,
      valueReps: 8,
      recordedAt: `${year}-05-23T12:00:00`,
    }),
    pr('bench', {
      valueWeight: 30,
      valueReps: 10,
      recordedAt: `${year}-04-02T12:00:00`,
    }),
    pr('goblet', {
      valueWeight: 28,
      valueReps: 12,
      recordedAt: `${year}-03-18T12:00:00`,
    }),
  ];

  const nutrition: DailyNutritionLog[] = [150, 132, 171].map(
    (protein, index) => ({
      id: `fxn${index}`,
      userId: 'fx',
      date: key(monday - index * (monday >= 2 ? 1 : 0)),
      calories: 2400,
      protein,
    }),
  );
  const hydration: HydrationLog[] = [14, 9, 14].map((glasses, index) => ({
    date: key(Math.max(0, monday - index)),
    waterMl: glasses * 250,
  }));

  const challenge: ProgressChallenge = {
    id: 'fxc',
    userId: 'fx',
    status: 'active',
    startDate: key(11),
    habits: [
      { id: 'h1', challengeId: 'fxc', category: 'training', name: 'Entrenar' },
      { id: 'h2', challengeId: 'fxc', category: 'health', name: 'Dormir 7 h' },
      { id: 'h3', challengeId: 'fxc', category: 'mind', name: 'Meditar' },
    ],
    challengeDay: 12,
    completedDays: 11,
    currentStreak: 11,
    progressPct: 33,
    completedToday: 1,
    totalHabits: 3,
  };

  return {
    challenge,
    sessions,
    records,
    nutrition,
    hydration,
    badges: [
      { id: 'first_workout', earnedAt: `${year}-01-12T10:00:00` },
      { id: 'first_pr', earnedAt: `${year}-01-10T10:00:00` },
      { id: 'week_consistency', earnedAt: `${year}-02-04T10:00:00` },
      { id: 'nutrition_started', earnedAt: `${year}-02-19T10:00:00` },
      { id: 'first_quiz', earnedAt: `${year}-06-14T10:00:00` },
      { id: 'hydration_3_days', earnedAt: `${year}-03-02T10:00:00` },
      { id: 'first_custom_workout', earnedAt: `${year}-05-02T10:00:00` },
    ],
  };
}

// Development only: rows like those of rpc('get_badge_progress') (13 badges,
// seven earned) for the Logros / Perfil samples.
export function badgeRowsFixture(now: Date) {
  const year = now.getFullYear();
  const earned = (id: string, category: string, month: number, day: number, title: string, icon: string) => ({
    badgeId: id,
    category,
    current: 1,
    target: 1,
    earned: true,
    earnedAt: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T10:00:00`,
    title,
    description: '',
    icon,
  });
  const locked = (id: string, category: string, current: number, target: number, title: string, icon: string) => ({
    badgeId: id,
    category,
    current,
    target,
    earned: false,
    title,
    description: '',
    icon,
  });
  return [
    earned('first_workout', 'constancia', 1, 12, 'Primer entreno', 'dumbbell'),
    earned('hydration_3_days', 'constancia', 3, 2, 'Hidratación x3', 'droplets'),
    locked('week_consistency', 'constancia', 2, 3, 'Semana constante', 'calendar'),
    locked('streak_7_days', 'constancia', 6, 7, 'Racha de 7 días', 'flame'),
    locked('hydration_7_days', 'constancia', 3, 7, 'Hidratación x7', 'droplets'),
    locked('weekly_hydration_master', 'constancia', 4, 5, 'Semana hidratada', 'waves'),
    locked('core33_finisher', 'retos', 11, 33, 'Core 33 completado', 'trophy'),
    earned('first_pr', 'fuerza', 1, 10, 'Primer récord', 'trophy'),
    earned('first_custom_workout', 'fuerza', 5, 2, 'Primera rutina propia', 'wrench'),
    earned('nutrition_started', 'habitos', 2, 19, 'Nutrición en marcha', 'utensils'),
    earned('nutrition_activated', 'habitos', 2, 20, 'Plan activado', 'utensils'),
    earned('first_quiz', 'habitos', 6, 14, 'Primer Quiz', 'file-pen'),
    locked('quiz_master', 'habitos', 3, 6, 'Quiz Master', 'brain'),
  ];
}
