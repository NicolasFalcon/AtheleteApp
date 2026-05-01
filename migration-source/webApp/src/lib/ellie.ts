import { User, HabitChallenge, WorkoutSession, NutritionPlan, DailyNutritionLog, BodyScienceArticle } from './types';
import { bodyScienceArticles } from './bodyScienceData';

export interface EllieDailyInsight {
  text: string;
  type: 'workout' | 'nutrition' | 'challenge' | 'streak' | 'general';
}

export interface EllieRecommendation {
  id: string;
  icon: 'dumbbell' | 'utensils' | 'book' | 'target' | 'sparkles' | 'heart';
  title: string;
  explanation: string;
  action: 'start_workout' | 'log_nutrition' | 'read_article' | 'view_challenge' | 'ask_ellie';
  actionLabel: string;
  articleId?: string;
}

export interface EllieWeeklySummary {
  workoutsCompleted: number;
  workoutsGoal: number;
  nutritionAdherence: number;
  challengeProgress: string | null;
  pointsEarned: number;
  suggestion: string;
}

export interface EllieChatMessage {
  id: string;
  sender: 'user' | 'ellie';
  content: string;
  timestamp: string;
}

export function generateDailyInsight(params: {
  workoutSessions: WorkoutSession[];
  nutritionPlan: NutritionPlan | null;
  todayNutritionLog: DailyNutritionLog | null;
  challenge: HabitChallenge | null;
  challengeDay: number;
  currentStreak: number;
  recentPRExerciseName?: string;
}): EllieDailyInsight {
  const today = new Date().toISOString().split('T')[0];
  const todayWorkout = params.workoutSessions.find(s => s.date === today);
  const hasLoggedNutrition = params.todayNutritionLog && (params.todayNutritionLog.calories > 0);

  // PR insight takes priority when there's a recent PR
  if (params.recentPRExerciseName) {
    return { text: `🏆 Nuevo PR en ${params.recentPRExerciseName}. ¡Tu fuerza está subiendo!`, type: 'general' };
  }

  if (!todayWorkout) {
    return { text: 'Hoy aún no has entrenado. ¿Listo para una sesión?', type: 'workout' };
  }
  if (params.nutritionPlan && !hasLoggedNutrition) {
    return { text: 'Tu meta de nutrición está activa, pero aún no has registrado comida hoy.', type: 'nutrition' };
  }
  if (params.challenge && params.challengeDay > 0 && params.challengeDay <= 33) {
    return { text: `Vas en el día ${params.challengeDay} del Core 33. ¡Sigue así!`, type: 'challenge' };
  }
  if (params.currentStreak > 2) {
    return { text: `Llevas una racha de ${params.currentStreak} días. ¡Gran consistencia!`, type: 'streak' };
  }
  return { text: '¡Vas muy bien hoy! Mantén el ritmo.', type: 'general' };
}

export function generateRecommendations(params: {
  workoutSessions: WorkoutSession[];
  nutritionPlan: NutritionPlan | null;
  todayNutritionLog: DailyNutritionLog | null;
  challenge: HabitChallenge | null;
  challengeDay: number;
}): EllieRecommendation[] {
  const today = new Date().toISOString().split('T')[0];
  const todayWorkout = params.workoutSessions.find(s => s.date === today);
  const hasLoggedNutrition = params.todayNutritionLog && (params.todayNutritionLog.calories > 0);
  const recs: EllieRecommendation[] = [];

  if (!todayWorkout) {
    recs.push({
      id: 'rec-workout',
      icon: 'dumbbell',
      title: 'Comienza tu entreno',
      explanation: 'Hoy no has entrenado. Una sesión ahora mantendrá tu racha activa.',
      action: 'start_workout',
      actionLabel: 'Elegir entreno',
    });
  }

  if (!hasLoggedNutrition) {
    recs.push({
      id: 'rec-nutrition',
      icon: 'utensils',
      title: 'Registra tu primera comida',
      explanation: 'Lleva el control de lo que comes para mantenerte alineado con tus objetivos.',
      action: 'log_nutrition',
      actionLabel: 'Registrar',
    });
  }

  if (params.challenge && params.challengeDay > 0 && params.challengeDay <= 33) {
    recs.push({
      id: 'rec-challenge',
      icon: 'target',
      title: 'Completa los hábitos del Core 33',
      explanation: `Día ${params.challengeDay} de 33 — completa tus hábitos para seguir en camino.`,
      action: 'view_challenge',
      actionLabel: 'Ver reto',
    });
  }

  const categories = ['Recovery', 'Training', 'Nutrition', 'Mindset'] as const;
  const randomCat = categories[Math.floor(Math.random() * categories.length)];
  const article = bodyScienceArticles.find(a => a.category === randomCat);
  if (article) {
    recs.push({
      id: 'rec-article',
      icon: 'book',
      title: `Leer: ${article.title}`,
      explanation: `${article.readTimeMinutes} min de lectura sobre ${article.category.toLowerCase()}`,
      action: 'read_article',
      actionLabel: 'Leer artículo',
      articleId: article.id,
    });
  }

  return recs;
}

export function generateWeeklySummary(params: {
  workoutSessions: WorkoutSession[];
  trainingDaysPerWeek: number;
  dailyNutritionLogs: DailyNutritionLog[];
  challenge: HabitChallenge | null;
  challengeDay: number;
  completedDays: number;
  points: number;
}): EllieWeeklySummary {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const weekWorkouts = params.workoutSessions.filter(s => s.date >= weekStartStr && s.completed);
  const weekLogs = params.dailyNutritionLogs.filter(l => l.date >= weekStartStr);
  const adherence = weekLogs.length > 0
    ? Math.round(weekLogs.filter(l => l.adherence && l.adherence >= 70).length / weekLogs.length * 100)
    : 0;

  let challengeProgress: string | null = null;
  if (params.challenge && params.challengeDay > 0 && params.challengeDay <= 33) {
    challengeProgress = `Día ${params.challengeDay}/33 · ${params.completedDays} días completados`;
  }

  const suggestion = weekWorkouts.length < params.trainingDaysPerWeek
    ? `Intenta completar ${params.trainingDaysPerWeek - weekWorkouts.length} sesiones más esta semana.`
    : '¡Gran semana! Considera una sesión de recuperación o movilidad.';

  return {
    workoutsCompleted: weekWorkouts.length,
    workoutsGoal: params.trainingDaysPerWeek,
    nutritionAdherence: adherence,
    challengeProgress,
    pointsEarned: params.points,
    suggestion,
  };
}

export function generateProgressInsights(params: {
  workoutSessions: WorkoutSession[];
  trainingDaysPerWeek: number;
  currentStreak: number;
  dailyNutritionLogs: DailyNutritionLog[];
  personalRecords?: Array<{
    exerciseId: string;
    exerciseName: string;
    prType: string;
    valueWeight: number | null;
    valueReps: number | null;
    valueDurationSec: number | null;
    valueDistanceM: number | null;
    recordedAt: string;
  }>;
}): string[] {
  const insights: string[] = [];
  const now = new Date();

  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const thisWeek = params.workoutSessions.filter(s => s.date >= thisWeekStart.toISOString().split('T')[0] && s.completed).length;
  const lastWeek = params.workoutSessions.filter(s => {
    const d = s.date;
    return d >= lastWeekStart.toISOString().split('T')[0] && d < thisWeekStart.toISOString().split('T')[0] && s.completed;
  }).length;

  const diff = thisWeek - lastWeek;
  if (diff > 0) {
    insights.push(`Entrenaste ${thisWeek} veces esta semana, +${diff} respecto a la semana pasada.`);
  } else if (diff < 0) {
    insights.push(`Entrenaste ${thisWeek} veces esta semana, ${diff} respecto a la anterior. ¡A darle!`);
  } else {
    insights.push(`Entrenaste ${thisWeek} veces esta semana, igual que la anterior.`);
  }

  if (params.currentStreak > 0) {
    insights.push(`Tu racha actual es de ${params.currentStreak} días. ¡No la rompas!`);
  }

  const eveningMissing = params.dailyNutritionLogs.filter(l => l.calories < 1500).length;
  if (eveningMissing > 3) {
    insights.push('Tiendes a sub-registrar algunos días. Intenta registrar cada comida al momento.');
  }

  if (thisWeek >= params.trainingDaysPerWeek) {
    insights.push('Un día de movilidad o descanso podría ayudarte mañana según tu carga reciente.');
  }

  // PR insights
  if (params.personalRecords && params.personalRecords.length > 0) {
    const prs = params.personalRecords;
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    // Recent PRs
    const recentPRs = prs.filter(r => r.recordedAt >= thirtyDaysAgoStr);
    if (recentPRs.length > 0) {
      const exerciseNames = [...new Set(recentPRs.map(r => r.exerciseName))];
      if (exerciseNames.length <= 2) {
        insights.push(`🏆 Nuevo(s) PR reciente en ${exerciseNames.join(' y ')}.`);
      } else {
        insights.push(`🏆 ${recentPRs.length} récords personales registrados en los últimos 30 días.`);
      }
    }

    // Improvement detection per exercise+type
    const byKey = new Map<string, typeof prs>();
    prs.forEach(r => {
      const key = `${r.exerciseId}::${r.prType}`;
      const arr = byKey.get(key) || [];
      arr.push(r);
      byKey.set(key, arr);
    });

    const improvements: { name: string; pct: number }[] = [];
    byKey.forEach((group) => {
      if (group.length < 2) return;
      const sorted = [...group].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
      const oldest = sorted[0];
      const newest = sorted[sorted.length - 1];
      const getVal = (r: typeof oldest) => {
        switch (r.prType) {
          case 'max_weight': case 'weight_reps': return r.valueWeight ?? 0;
          case 'max_reps': return r.valueReps ?? 0;
          case 'duration': return r.valueDurationSec ?? 0;
          case 'distance': return r.valueDistanceM ?? 0;
          default: return 0;
        }
      };
      const oldVal = getVal(oldest);
      const newVal = getVal(newest);
      if (oldVal > 0 && newVal > oldVal) {
        improvements.push({ name: oldest.exerciseName, pct: Math.round(((newVal - oldVal) / oldVal) * 100) });
      }
    });

    if (improvements.length > 0) {
      const top = improvements.sort((a, b) => b.pct - a.pct)[0];
      insights.push(`Tu ${top.name} mejoró un ${top.pct}% — ¡la sobrecarga progresiva funciona!`);
    }

    // Staleness check
    const allDates = prs.map(r => new Date(r.recordedAt).getTime());
    const latestPR = new Date(Math.max(...allDates));
    const daysSinceLastPR = Math.round((now.getTime() - latestPR.getTime()) / 86400000);
    if (daysSinceLastPR > 14) {
      insights.push(`Hace ${daysSinceLastPR} días no registras un nuevo PR. ¿Hora de intentar superar tu marca?`);
    }
  }

  return insights;
}

export function getEllieResponse(message: string, params: {
  userName: string;
  todayWorkoutDone: boolean;
  nutritionLogged: boolean;
  challengeDay: number;
}): string {
  const lower = message.toLowerCase();

  if (lower.includes('train') || lower.includes('workout') || lower.includes('entreno') || lower.includes('entrenar')) {
    if (params.todayWorkoutDone) {
      return "Ya completaste tu entreno de hoy — ¡buen trabajo! Si quieres más, prueba una sesión de movilidad o estiramientos para la recuperación.";
    }
    return "Te recomiendo empezar con tu entreno planeado para hoy. Ve a la pestaña de Entrenos para elegir uno que se adapte a tu energía. ¡La consistencia le gana a la intensidad!";
  }

  if (lower.includes('nutrition') || lower.includes('nutrición') || lower.includes('comida') || lower.includes('comer') || lower.includes('meal')) {
    if (params.nutritionLogged) {
      return "Ya registraste algunas comidas hoy. ¡Sigue así! Intenta alcanzar tu meta de proteína — es el macro más importante para tus objetivos.";
    }
    return "No has registrado nutrición hoy. Empieza registrando tu comida más reciente — solo toma unos segundos. El registro te ayuda a ser consciente de tu ingesta.";
  }

  if (lower.includes('recovery') || lower.includes('recuperación') || lower.includes('dolor') || lower.includes('sore')) {
    return "Para la recuperación te sugiero: 1) Estiramientos ligeros o movilidad, 2) Mantente hidratado, 3) Duerme lo suficiente. Revisa los artículos de Ciencia del Cuerpo sobre recuperación. Si el dolor es severo o persistente, consulta a un profesional de salud.";
  }

  if (lower.includes('progreso') || lower.includes('semana') || lower.includes('cómo voy') || lower.includes('progress')) {
    return `¡Vas muy bien, ${params.userName}! Revisa tu pestaña de Progreso para gráficas detalladas de volumen de entrenamiento y adherencia nutricional. La consistencia es la clave — cada sesión cuenta.`;
  }

  if (lower.includes('challenge') || lower.includes('core 33') || lower.includes('reto')) {
    if (params.challengeDay > 0 && params.challengeDay <= 33) {
      return `¡Vas en el día ${params.challengeDay} del Core 33! Enfócate en completar tus tres hábitos de hoy. Las pequeñas victorias diarias se acumulan en grandes resultados.`;
    }
    return "El reto Core 33 es una gran forma de construir disciplina. ¡Ve a la sección de retos para comenzar o revisar tu progreso!";
  }

  return `¡Hola ${params.userName}! Estoy aquí para ayudarte con entrenamiento, nutrición, hábitos y progreso. Pregúntame sobre tu plan de entreno, registro de nutrición, tips de recuperación o cómo va tu semana.`;
}

export const ellieQuickSuggestions = [
  '¿Qué debería entrenar hoy?',
  '¿Cómo voy esta semana?',
  'Ayúdame con la nutrición',
  'Consejos de recuperación',
];
