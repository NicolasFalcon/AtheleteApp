import { getLocalDateKey } from '@app/lib/date';

export interface EllieProfileContext {
  name: string;
  age: number | null;
  gender: string | null;
  weight: number;
  height: number;
  goal: string;
  trainingDaysPerWeek: number;
  isPremium: boolean;
  trainingEnvironment: string;
  availableEquipment: string[];
  restrictionsNotes: string;
  injuryNotes: string;
  exercisePreferences: string[];
  exerciseAvoidances: string[];
  dietPreferences: string[];
  foodAvoidances: string[];
}

export interface EllieTrainingContext {
  todayWorkoutDone: boolean;
  workoutsThisWeek: number;
  workoutsLast14Days: number;
  workoutsLast30Days: number;
  currentStreak: number;
  lastWorkoutDate: string | null;
  recentWorkoutTitles: string[];
  weeklyAdherence: number;
  availableTemplateCount: number;
}

export interface EllieNutritionContext {
  hasActivePlan: boolean;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  loggedToday: boolean;
  todayCalories: number;
  todayProtein: number;
  recentAdherence: number;
  hasNoSetup: boolean;
}

export interface EllieChallengeContext {
  active: boolean;
  currentDay: number;
  currentStreak: number;
  completedDays: number;
  completionRate: number;
  todayCompleted: boolean;
  selectedHabits: string[];
}

export interface EllieAchievementContext {
  totalPoints: number;
  recentBadges: string[];
  unlockedBadgeIds: string[];
  nearestUnlocked: string[];
}

export interface ElliePRContext {
  totalPRs: number;
  exercisesWithPRs: number;
  recentPRs: Array<{
    exerciseName: string;
    prType: string;
    displayValue: string;
    date: string;
  }>;
  improvements: Array<{
    exerciseName: string;
    prType: string;
    percentChange: number;
    periodDays: number;
  }>;
}

export interface EllieHydrationContext {
  goalMl: number;
  todayMl: number;
  todayPercentage: number;
  daysMetGoalThisWeek: number;
  weeklyAverageMl: number;
  hydrationStreak: number;
}

export interface EllieFullContext {
  profile: EllieProfileContext;
  training: EllieTrainingContext;
  nutrition: EllieNutritionContext;
  challenge: EllieChallengeContext;
  achievements: EllieAchievementContext;
  personalRecords: ElliePRContext;
  hydration: EllieHydrationContext;
}

function computeAge(birthDate: string | null): number | null {
  if (!birthDate) {
    return null;
  }

  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthOffset = now.getMonth() - birth.getMonth();

  if (
    monthOffset < 0 ||
    (monthOffset === 0 && now.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function getMainValueRaw(record: {
  prType: string;
  valueWeight: number | null;
  valueReps: number | null;
  valueDurationSec: number | null;
  valueDistanceM: number | null;
}): number {
  switch (record.prType) {
    case 'max_weight':
    case 'weight_reps':
      return record.valueWeight ?? 0;
    case 'max_reps':
      return record.valueReps ?? 0;
    case 'duration':
      return record.valueDurationSec ?? 0;
    case 'distance':
      return record.valueDistanceM ?? 0;
    default:
      return 0;
  }
}

function formatPRValueRaw(record: {
  prType: string;
  valueWeight: number | null;
  valueReps: number | null;
  valueDurationSec: number | null;
  valueDistanceM: number | null;
}): string {
  switch (record.prType) {
    case 'max_weight':
      return `${record.valueWeight ?? 0} kg`;
    case 'weight_reps':
      return `${record.valueWeight ?? 0} kg × ${record.valueReps ?? 0} reps`;
    case 'max_reps':
      return `${record.valueReps ?? 0} reps`;
    case 'duration': {
      const seconds = record.valueDurationSec ?? 0;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return minutes > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${remainingSeconds}s`;
    }
    case 'distance':
      return `${record.valueDistanceM ?? 0} m`;
    default:
      return '';
  }
}

function getWeekStartKey(today: Date = new Date()): string {
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  return getLocalDateKey(weekStart);
}

export function buildEllieContext(params: {
  user: {
    id: string;
    name: string;
    birthDate: string | null;
    gender?: string | null;
    weight: number;
    height: number;
    goal: string;
    trainingDaysPerWeek: number;
    trainingEnvironment?: string | null;
    availableEquipment?: string[];
    restrictionsNotes?: string;
    injuryNotes?: string;
    exercisePreferences?: string[];
    exerciseAvoidances?: string[];
    dietPreferences?: string[];
    foodAvoidances?: string[];
  };
  isPremium: boolean;
  workoutSessions: Array<{
    date: string;
    completed: boolean;
    workoutId: string;
  }>;
  workoutTitles: Record<string, string>;
  workoutCount: number;
  nutritionPlan: {
    targetCalories: number;
    targetProtein: number;
    targetCarbs?: number;
    targetFats?: number;
  } | null;
  todayNutritionLog: { calories: number; protein: number } | null;
  dailyNutritionLogs: Array<{
    date: string;
    adherence?: number;
    calories: number;
  }>;
  challenge: { startDate: string; habits: Array<{ name: string }> } | null;
  habitLogs: Record<string, boolean[]>;
  challengeDay: number;
  currentStreak: number;
  completedDays: number;
  gamification: {
    points: number;
    badges: Array<{ id: string; earnedAt?: string }>;
  };
  personalRecords?: {
    records: Array<{
      exerciseId: string;
      prType: string;
      valueWeight: number | null;
      valueReps: number | null;
      valueDurationSec: number | null;
      valueDistanceM: number | null;
      recordedAt: string;
    }>;
    exerciseNames: Record<string, string>;
  };
  hydration?: {
    todayMl: number;
    goalMl: number;
    todayPercentage: number;
    daysMetGoalThisWeek: number;
    weeklyAverageMl: number;
    hydrationStreak?: number;
  };
}): EllieFullContext {
  const today = getLocalDateKey();
  const weekStartKey = getWeekStartKey();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoKey = getLocalDateKey(twoWeeksAgo);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoKey = getLocalDateKey(thirtyDaysAgo);

  const completedSessions = params.workoutSessions.filter(
    session => session.completed,
  );
  const workoutsThisWeek = completedSessions.filter(
    session => session.date >= weekStartKey,
  ).length;
  const workoutsLast14Days = completedSessions.filter(
    session => session.date >= twoWeeksAgoKey,
  ).length;
  const workoutsLast30Days = completedSessions.filter(
    session => session.date >= thirtyDaysAgoKey,
  ).length;
  const todayWorkout = completedSessions.find(
    session => session.date === today,
  );
  const sortedSessions = [...completedSessions].sort((left, right) =>
    right.date.localeCompare(left.date),
  );
  const recentWorkoutTitles = sortedSessions
    .slice(0, 5)
    .map(session => params.workoutTitles[session.workoutId] || 'Entreno')
    .filter((value, index, array) => array.indexOf(value) === index);
  const weeklyAdherence =
    params.user.trainingDaysPerWeek > 0
      ? Math.round((workoutsThisWeek / params.user.trainingDaysPerWeek) * 100)
      : 0;

  const weekLogs = params.dailyNutritionLogs.filter(
    log => log.date >= weekStartKey,
  );
  const recentAdherence =
    weekLogs.length > 0
      ? Math.round(
          (weekLogs.filter(log => (log.adherence ?? 0) >= 70).length /
            weekLogs.length) *
            100,
        )
      : 0;

  const todayHabitLogs = params.habitLogs[today];
  const todayCompleted = todayHabitLogs ? todayHabitLogs.every(Boolean) : false;
  const completionRate =
    params.challengeDay > 0
      ? Math.round((params.completedDays / params.challengeDay) * 100)
      : 0;

  const allBadgeIds = [
    'first_workout',
    'week_consistency',
    'core33_finisher',
    'streak_7_days',
    'nutrition_started',
    'first_custom_workout',
  ];
  const unlockedIds = params.gamification.badges.map(badge => badge.id);
  const nearestUnlocked = allBadgeIds
    .filter(id => !unlockedIds.includes(id))
    .slice(0, 3);
  const recentBadges = params.gamification.badges
    .filter(badge => badge.earnedAt)
    .sort((left, right) =>
      (right.earnedAt || '').localeCompare(left.earnedAt || ''),
    )
    .slice(0, 3)
    .map(badge => badge.id);

  const prContext: ElliePRContext = {
    totalPRs: 0,
    exercisesWithPRs: 0,
    recentPRs: [],
    improvements: [],
  };

  if (params.personalRecords && params.personalRecords.records.length > 0) {
    const records = params.personalRecords.records;
    prContext.totalPRs = records.length;
    prContext.exercisesWithPRs = new Set(
      records.map(record => record.exerciseId),
    ).size;

    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();
    const recentPRs = records
      .filter(record => record.recordedAt >= thirtyDaysAgoIso)
      .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))
      .slice(0, 5);

    prContext.recentPRs = recentPRs.map(record => ({
      exerciseName:
        params.personalRecords?.exerciseNames[record.exerciseId] || 'Ejercicio',
      prType: record.prType,
      displayValue: formatPRValueRaw(record),
      date: record.recordedAt.split('T')[0],
    }));

    const grouped = new Map<string, typeof records>();
    records.forEach(record => {
      const key = `${record.exerciseId}::${record.prType}`;
      const list = grouped.get(key) || [];
      list.push(record);
      grouped.set(key, list);
    });

    grouped.forEach((group, key) => {
      if (group.length < 2) {
        return;
      }

      const sortedGroup = [...group].sort((left, right) =>
        left.recordedAt.localeCompare(right.recordedAt),
      );
      const oldest = sortedGroup[0];
      const newest = sortedGroup[sortedGroup.length - 1];
      const oldValue = getMainValueRaw(oldest);
      const newValue = getMainValueRaw(newest);

      if (oldValue <= 0 || newValue <= oldValue) {
        return;
      }

      const percentChange = Math.round(
        ((newValue - oldValue) / oldValue) * 100,
      );
      const periodDays = Math.round(
        (new Date(newest.recordedAt).getTime() -
          new Date(oldest.recordedAt).getTime()) /
          86400000,
      );
      const [exerciseId] = key.split('::');

      prContext.improvements.push({
        exerciseName:
          params.personalRecords?.exerciseNames[exerciseId] || 'Ejercicio',
        prType: oldest.prType,
        percentChange,
        periodDays,
      });
    });
  }

  return {
    profile: {
      name: params.user.name,
      age: computeAge(params.user.birthDate),
      gender: params.user.gender || null,
      weight: params.user.weight,
      height: params.user.height,
      goal: params.user.goal,
      trainingDaysPerWeek: params.user.trainingDaysPerWeek,
      isPremium: params.isPremium,
      trainingEnvironment: params.user.trainingEnvironment || 'gym',
      availableEquipment: params.user.availableEquipment || [],
      restrictionsNotes: params.user.restrictionsNotes || '',
      injuryNotes: params.user.injuryNotes || '',
      exercisePreferences: params.user.exercisePreferences || [],
      exerciseAvoidances: params.user.exerciseAvoidances || [],
      dietPreferences: params.user.dietPreferences || [],
      foodAvoidances: params.user.foodAvoidances || [],
    },
    training: {
      todayWorkoutDone: Boolean(todayWorkout),
      workoutsThisWeek,
      workoutsLast14Days,
      workoutsLast30Days,
      currentStreak: params.currentStreak,
      lastWorkoutDate: sortedSessions[0]?.date || null,
      recentWorkoutTitles,
      weeklyAdherence,
      availableTemplateCount: params.workoutCount,
    },
    nutrition: {
      hasActivePlan: Boolean(params.nutritionPlan),
      targetCalories: params.nutritionPlan?.targetCalories || 0,
      targetProtein: params.nutritionPlan?.targetProtein || 0,
      targetCarbs: params.nutritionPlan?.targetCarbs || 0,
      targetFats: params.nutritionPlan?.targetFats || 0,
      loggedToday: Boolean(
        params.todayNutritionLog && params.todayNutritionLog.calories > 0,
      ),
      todayCalories: params.todayNutritionLog?.calories || 0,
      todayProtein: params.todayNutritionLog?.protein || 0,
      recentAdherence,
      hasNoSetup: !params.nutritionPlan,
    },
    challenge: {
      active: Boolean(params.challenge),
      currentDay: params.challengeDay,
      currentStreak: params.currentStreak,
      completedDays: params.completedDays,
      completionRate,
      todayCompleted,
      selectedHabits: params.challenge?.habits.map(habit => habit.name) || [],
    },
    achievements: {
      totalPoints: params.gamification.points,
      recentBadges,
      unlockedBadgeIds: unlockedIds,
      nearestUnlocked,
    },
    personalRecords: prContext,
    hydration: params.hydration
      ? {
          goalMl: params.hydration.goalMl,
          todayMl: params.hydration.todayMl,
          todayPercentage: params.hydration.todayPercentage,
          daysMetGoalThisWeek: params.hydration.daysMetGoalThisWeek,
          weeklyAverageMl: params.hydration.weeklyAverageMl,
          hydrationStreak: params.hydration.hydrationStreak ?? 0,
        }
      : {
          goalMl: 0,
          todayMl: 0,
          todayPercentage: 0,
          daysMetGoalThisWeek: 0,
          weeklyAverageMl: 0,
          hydrationStreak: 0,
        },
  };
}

export function serializeEllieContext(ctx: EllieFullContext): string {
  const {
    profile,
    training,
    nutrition,
    challenge,
    achievements,
    personalRecords,
    hydration,
  } = ctx;

  const goalMap: Record<string, string> = {
    lose_weight: 'Perder peso',
    gain_muscle: 'Ganar músculo',
    maintain: 'Mantener',
    improve_health: 'Mejorar salud',
  };

  let serialized = `ESTADO ACTUAL DEL USUARIO:
— Perfil: ${profile.name}${profile.age ? `, ${profile.age} años` : ''}, ${
    profile.weight
  }kg, ${profile.height}cm
— Género declarado: ${
    profile.gender === 'male'
      ? 'Masculino'
      : profile.gender === 'female'
      ? 'Femenino'
      : 'No indicado'
  }
— Objetivo: ${goalMap[profile.goal] || profile.goal}
— Plan: ${profile.trainingDaysPerWeek} días/semana
— Cuenta: ${profile.isPremium ? 'Premium' : 'Gratis'}
— Entorno: ${profile.trainingEnvironment}`;

  if (profile.availableEquipment.length > 0) {
    serialized += `\n— Equipamiento: ${profile.availableEquipment.join(', ')}`;
  }
  if (profile.restrictionsNotes) {
    serialized += `\n— Restricciones: ${profile.restrictionsNotes}`;
  }
  if (profile.injuryNotes) {
    serialized += `\n— Lesiones/molestias: ${profile.injuryNotes}`;
  }
  if (profile.exercisePreferences.length > 0) {
    serialized += `\n— Ejercicios preferidos: ${profile.exercisePreferences.join(
      ', ',
    )}`;
  }
  if (profile.exerciseAvoidances.length > 0) {
    serialized += `\n— Ejercicios a evitar: ${profile.exerciseAvoidances.join(
      ', ',
    )}`;
  }
  if (profile.dietPreferences.length > 0) {
    serialized += `\n— Preferencias alimentarias: ${profile.dietPreferences.join(
      ', ',
    )}`;
  }
  if (profile.foodAvoidances.length > 0) {
    serialized += `\n— Alimentos a evitar: ${profile.foodAvoidances.join(
      ', ',
    )}`;
  }

  serialized += `\n\nENTRENAMIENTO:
— Hoy entrenado: ${training.todayWorkoutDone ? 'Sí ✓' : 'No'}
— Esta semana: ${training.workoutsThisWeek} entrenos
— Últimos 14 días: ${training.workoutsLast14Days} | 30 días: ${
    training.workoutsLast30Days
  }
— Racha: ${training.currentStreak} días
— Adherencia semanal: ${training.weeklyAdherence}%
— Último entreno: ${training.lastWorkoutDate || 'Sin registro'}`;

  if (training.recentWorkoutTitles.length > 0) {
    serialized += `\n— Recientes: ${training.recentWorkoutTitles.join(', ')}`;
  }

  serialized += `\n— Rutinas disponibles: ${training.availableTemplateCount}`;

  serialized += `\n\nNUTRICIÓN:
— Plan activo: ${nutrition.hasActivePlan ? 'Sí' : 'No'}`;

  if (nutrition.hasActivePlan) {
    serialized += `\n— Objetivos: ${nutrition.targetCalories} kcal, ${nutrition.targetProtein}g prot, ${nutrition.targetCarbs}g carbs, ${nutrition.targetFats}g grasas`;
  }

  serialized += `\n— Registrado hoy: ${
    nutrition.loggedToday
      ? `Sí (${nutrition.todayCalories} kcal, ${nutrition.todayProtein}g prot)`
      : 'No'
  }
— Adherencia reciente: ${nutrition.recentAdherence}%`;

  if (challenge.active) {
    serialized += `\n\nRETO CORE 33:
— Día ${challenge.currentDay}/33
— Días completados: ${challenge.completedDays} (${challenge.completionRate}%)
— Racha: ${challenge.currentStreak} días
— Hoy completado: ${challenge.todayCompleted ? 'Sí' : 'No'}
— Hábitos: ${challenge.selectedHabits.join(', ')}`;
  }

  serialized += `\n\nLOGROS:
— Puntos: ${achievements.totalPoints}
— Insignias: ${achievements.unlockedBadgeIds.length}/6`;

  if (achievements.nearestUnlocked.length > 0) {
    serialized += `\n— Próximas a desbloquear: ${achievements.nearestUnlocked.join(
      ', ',
    )}`;
  }

  if (personalRecords.totalPRs > 0) {
    serialized += `\n\nRÉCORDS PERSONALES:
— Total PRs: ${personalRecords.totalPRs} en ${personalRecords.exercisesWithPRs} ejercicios`;

    if (personalRecords.recentPRs.length > 0) {
      serialized += `\n— PRs recientes:`;
      personalRecords.recentPRs.forEach(record => {
        serialized += `\n  · ${record.exerciseName}: ${record.displayValue} (${record.date})`;
      });
    }

    if (personalRecords.improvements.length > 0) {
      serialized += `\n— Mejoras detectadas:`;
      personalRecords.improvements.forEach(improvement => {
        serialized += `\n  · ${improvement.exerciseName}: +${improvement.percentChange}% en ${improvement.periodDays} días`;
      });
    }
  }

  if (hydration.goalMl > 0) {
    serialized += `\n\nHIDRATACIÓN:
— Objetivo: ${hydration.goalMl} ml (${(hydration.goalMl / 1000).toFixed(1)} L)
— Hoy: ${hydration.todayMl} ml (${hydration.todayPercentage}%)
— Días al objetivo esta semana: ${hydration.daysMetGoalThisWeek}/7
— Promedio semanal: ${(hydration.weeklyAverageMl / 1000).toFixed(1)} L`;
  }

  return serialized;
}
