export interface EllieProfileContext {
  name: string;
  age: number | null;
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
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthOffset = now.getMonth() - birth.getMonth();
  if (monthOffset < 0 || (monthOffset === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function getMainValueRaw(r: {
  prType: string;
  valueWeight: number | null;
  valueReps: number | null;
  valueDurationSec: number | null;
  valueDistanceM: number | null;
}): number {
  switch (r.prType) {
    case 'max_weight':
    case 'weight_reps':
      return r.valueWeight ?? 0;
    case 'max_reps':
      return r.valueReps ?? 0;
    case 'duration':
      return r.valueDurationSec ?? 0;
    case 'distance':
      return r.valueDistanceM ?? 0;
    default:
      return 0;
  }
}

function formatPRValueRaw(r: {
  prType: string;
  valueWeight: number | null;
  valueReps: number | null;
  valueDurationSec: number | null;
  valueDistanceM: number | null;
}): string {
  switch (r.prType) {
    case 'max_weight':
      return `${r.valueWeight ?? 0} kg`;
    case 'weight_reps':
      return `${r.valueWeight ?? 0} kg × ${r.valueReps ?? 0} reps`;
    case 'max_reps':
      return `${r.valueReps ?? 0} reps`;
    case 'duration': {
      const sec = r.valueDurationSec ?? 0;
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return m > 0 ? `${m}m ${s}s` : `${s}s`;
    }
    case 'distance':
      return `${r.valueDistanceM ?? 0} m`;
    default:
      return '';
  }
}

export function buildEllieContext(params: {
  user: {
    id: string;
    name: string;
    birthDate: string;
    weight: number;
    height: number;
    goal: string;
    trainingDaysPerWeek: number;
    trainingEnvironment?: string;
    availableEquipment?: string[];
    restrictionsNotes?: string;
    injuryNotes?: string;
    exercisePreferences?: string[];
    exerciseAvoidances?: string[];
    dietPreferences?: string[];
    foodAvoidances?: string[];
  };
  isPremium: boolean;
  workoutSessions: Array<{ date: string; completed: boolean; workoutId: string }>;
  workoutTitles: Record<string, string>;
  workoutCount: number;
  nutritionPlan: { targetCalories: number; targetProtein: number; targetCarbs?: number; targetFats?: number } | null;
  todayNutritionLog: { calories: number; protein: number } | null;
  dailyNutritionLogs: Array<{ date: string; adherence?: number; calories: number }>;
  challenge: { startDate: string; habits: Array<{ name: string }> } | null;
  habitLogs: Record<string, boolean[]>;
  challengeDay: number;
  currentStreak: number;
  completedDays: number;
  gamification: { points: number; badges: Array<{ id: string; earnedAt?: string }> };
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
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 14);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const completedSessions = params.workoutSessions.filter((session) => session.completed);
  const workoutsThisWeek = completedSessions.filter((session) => session.date >= weekStartStr).length;
  const workoutsLast14 = completedSessions.filter((session) => session.date >= twoWeeksAgo.toISOString().split('T')[0]).length;
  const workoutsLast30 = completedSessions.filter((session) => session.date >= thirtyDaysAgo.toISOString().split('T')[0]).length;
  const todayWorkout = completedSessions.find((session) => session.date === today);
  const sorted = [...completedSessions].sort((a, b) => b.date.localeCompare(a.date));
  const recentTitles = sorted
    .slice(0, 5)
    .map((session) => params.workoutTitles[session.workoutId] || 'Entreno')
    .filter((value, index, array) => array.indexOf(value) === index);

  const weeklyAdherence = params.user.trainingDaysPerWeek > 0
    ? Math.round((workoutsThisWeek / params.user.trainingDaysPerWeek) * 100)
    : 0;

  const weekLogs = params.dailyNutritionLogs.filter((log) => log.date >= weekStartStr);
  const recentAdherence = weekLogs.length > 0
    ? Math.round(weekLogs.filter((log) => (log.adherence ?? 0) >= 70).length / weekLogs.length * 100)
    : 0;

  const todayHabitLogs = params.habitLogs[today];
  const todayCompleted = todayHabitLogs ? todayHabitLogs.every(Boolean) : false;
  const completionRate = params.challengeDay > 0 ? Math.round((params.completedDays / params.challengeDay) * 100) : 0;

  const allBadgeIds = ['first_workout', 'week_consistency', 'core33_finisher', 'streak_7_days', 'nutrition_started', 'first_custom_workout'];
  const unlockedIds = params.gamification.badges.map((badge) => badge.id);
  const nearestUnlocked = allBadgeIds.filter((id) => !unlockedIds.includes(id)).slice(0, 3);
  const recentBadges = params.gamification.badges
    .filter((badge) => badge.earnedAt)
    .sort((a, b) => (b.earnedAt || '').localeCompare(a.earnedAt || ''))
    .slice(0, 3)
    .map((badge) => badge.id);

  const prData = params.personalRecords;
  const prContext: ElliePRContext = { totalPRs: 0, exercisesWithPRs: 0, recentPRs: [], improvements: [] };

  if (prData && prData.records.length > 0) {
    const recs = prData.records;
    prContext.totalPRs = recs.length;
    prContext.exercisesWithPRs = new Set(recs.map((record) => record.exerciseId)).size;

    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
    const recentPRs = recs
      .filter((record) => record.recordedAt >= thirtyDaysAgoStr)
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      .slice(0, 5);

    prContext.recentPRs = recentPRs.map((record) => ({
      exerciseName: prData.exerciseNames[record.exerciseId] || 'Ejercicio',
      prType: record.prType,
      displayValue: formatPRValueRaw(record),
      date: record.recordedAt.split('T')[0],
    }));

    const byKey = new Map<string, typeof recs>();
    recs.forEach((record) => {
      const key = `${record.exerciseId}::${record.prType}`;
      const group = byKey.get(key) || [];
      group.push(record);
      byKey.set(key, group);
    });

    byKey.forEach((group, key) => {
      if (group.length < 2) return;
      const sortedGroup = [...group].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
      const oldest = sortedGroup[0];
      const newest = sortedGroup[sortedGroup.length - 1];
      const oldVal = getMainValueRaw(oldest);
      const newVal = getMainValueRaw(newest);
      if (oldVal > 0 && newVal > oldVal) {
        const percentChange = Math.round(((newVal - oldVal) / oldVal) * 100);
        const periodDays = Math.round((new Date(newest.recordedAt).getTime() - new Date(oldest.recordedAt).getTime()) / 86400000);
        const [exerciseId] = key.split('::');
        prContext.improvements.push({
          exerciseName: prData.exerciseNames[exerciseId] || 'Ejercicio',
          prType: oldest.prType,
          percentChange,
          periodDays,
        });
      }
    });
  }

  return {
    profile: {
      name: params.user.name,
      age: computeAge(params.user.birthDate),
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
      todayWorkoutDone: !!todayWorkout,
      workoutsThisWeek,
      workoutsLast14Days: workoutsLast14,
      workoutsLast30Days: workoutsLast30,
      currentStreak: params.currentStreak,
      lastWorkoutDate: sorted[0]?.date || null,
      recentWorkoutTitles: recentTitles,
      weeklyAdherence,
      availableTemplateCount: params.workoutCount,
    },
    nutrition: {
      hasActivePlan: !!params.nutritionPlan,
      targetCalories: params.nutritionPlan?.targetCalories || 0,
      targetProtein: params.nutritionPlan?.targetProtein || 0,
      targetCarbs: params.nutritionPlan?.targetCarbs || 0,
      targetFats: params.nutritionPlan?.targetFats || 0,
      loggedToday: !!(params.todayNutritionLog && params.todayNutritionLog.calories > 0),
      todayCalories: params.todayNutritionLog?.calories || 0,
      todayProtein: params.todayNutritionLog?.protein || 0,
      recentAdherence,
      hasNoSetup: !params.nutritionPlan,
    },
    challenge: {
      active: !!params.challenge,
      currentDay: params.challengeDay,
      currentStreak: params.currentStreak,
      completedDays: params.completedDays,
      completionRate,
      todayCompleted,
      selectedHabits: params.challenge?.habits.map((habit) => habit.name) || [],
    },
    achievements: {
      totalPoints: params.gamification.points,
      recentBadges,
      unlockedBadgeIds: unlockedIds,
      nearestUnlocked,
    },
    personalRecords: prContext,
    hydration: params.hydration ? {
      goalMl: params.hydration.goalMl,
      todayMl: params.hydration.todayMl,
      todayPercentage: params.hydration.todayPercentage,
      daysMetGoalThisWeek: params.hydration.daysMetGoalThisWeek,
      weeklyAverageMl: params.hydration.weeklyAverageMl,
      hydrationStreak: params.hydration.hydrationStreak ?? 0,
    } : {
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
  const { profile: p, training: t, nutrition: n, challenge: c, achievements: a, personalRecords: pr, hydration: h } = ctx;

  const goalMap: Record<string, string> = {
    lose_weight: 'Perder peso',
    gain_muscle: 'Ganar músculo',
    maintain: 'Mantener',
    improve_health: 'Mejorar salud',
  };

  let s = `ESTADO ACTUAL DEL USUARIO:
— Perfil: ${p.name}${p.age ? `, ${p.age} años` : ''}, ${p.weight}kg, ${p.height}cm
— Objetivo: ${goalMap[p.goal] || p.goal}
— Plan: ${p.trainingDaysPerWeek} días/semana
— Cuenta: ${p.isPremium ? 'Premium' : 'Gratis'}
— Entorno: ${p.trainingEnvironment}`;

  if (p.availableEquipment.length > 0) s += `\n— Equipamiento: ${p.availableEquipment.join(', ')}`;
  if (p.restrictionsNotes) s += `\n— Restricciones: ${p.restrictionsNotes}`;
  if (p.injuryNotes) s += `\n— Lesiones/molestias: ${p.injuryNotes}`;
  if (p.exercisePreferences.length > 0) s += `\n— Ejercicios preferidos: ${p.exercisePreferences.join(', ')}`;
  if (p.exerciseAvoidances.length > 0) s += `\n— Ejercicios a evitar: ${p.exerciseAvoidances.join(', ')}`;
  if (p.dietPreferences.length > 0) s += `\n— Preferencias alimentarias: ${p.dietPreferences.join(', ')}`;
  if (p.foodAvoidances.length > 0) s += `\n— Alimentos a evitar: ${p.foodAvoidances.join(', ')}`;

  s += `\n\nENTRENAMIENTO:
— Hoy entrenado: ${t.todayWorkoutDone ? 'Sí ✓' : 'No'}
— Esta semana: ${t.workoutsThisWeek} entrenos
— Últimos 14 días: ${t.workoutsLast14Days} | 30 días: ${t.workoutsLast30Days}
— Racha: ${t.currentStreak} días
— Adherencia semanal: ${t.weeklyAdherence}%
— Último entreno: ${t.lastWorkoutDate || 'Sin registro'}`;
  if (t.recentWorkoutTitles.length > 0) s += `\n— Recientes: ${t.recentWorkoutTitles.join(', ')}`;
  s += `\n— Rutinas disponibles: ${t.availableTemplateCount}`;

  s += `\n\nNUTRICIÓN:
— Plan activo: ${n.hasActivePlan ? 'Sí' : 'No'}`;
  if (n.hasActivePlan) s += `\n— Objetivos: ${n.targetCalories} kcal, ${n.targetProtein}g prot, ${n.targetCarbs}g carbs, ${n.targetFats}g grasas`;
  s += `\n— Registrado hoy: ${n.loggedToday ? `Sí (${n.todayCalories} kcal, ${n.todayProtein}g prot)` : 'No'}
— Adherencia reciente: ${n.recentAdherence}%`;

  if (c.active) {
    s += `\n\nRETO CORE 33:
— Día ${c.currentDay}/33
— Días completados: ${c.completedDays} (${c.completionRate}%)
— Racha: ${c.currentStreak} días
— Hoy completado: ${c.todayCompleted ? 'Sí' : 'No'}
— Hábitos: ${c.selectedHabits.join(', ')}`;
  }

  s += `\n\nLOGROS:
— Puntos: ${a.totalPoints}
— Insignias: ${a.unlockedBadgeIds.length}/6`;
  if (a.nearestUnlocked.length > 0) s += `\n— Próximas a desbloquear: ${a.nearestUnlocked.join(', ')}`;

  if (pr.totalPRs > 0) {
    s += `\n\nRÉCORDS PERSONALES:
— Total PRs: ${pr.totalPRs} en ${pr.exercisesWithPRs} ejercicios`;
    if (pr.recentPRs.length > 0) {
      s += `\n— PRs recientes:`;
      pr.recentPRs.forEach((record) => {
        s += `\n  · ${record.exerciseName}: ${record.displayValue} (${record.date})`;
      });
    }
    if (pr.improvements.length > 0) {
      s += `\n— Mejoras detectadas:`;
      pr.improvements.forEach((improvement) => {
        s += `\n  · ${improvement.exerciseName}: +${improvement.percentChange}% en ${improvement.periodDays} días`;
      });
    }
  }

  if (h.goalMl > 0) {
    s += `\n\nHIDRATACIÓN:
— Objetivo: ${h.goalMl} ml (${(h.goalMl / 1000).toFixed(1)} L)
— Hoy: ${h.todayMl} ml (${h.todayPercentage}%)
— Días al objetivo esta semana: ${h.daysMetGoalThisWeek}/7
— Promedio semanal: ${(h.weeklyAverageMl / 1000).toFixed(1)} L`;
  }

  return s;
}
