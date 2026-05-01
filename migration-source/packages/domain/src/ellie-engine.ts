import { EllieFullContext } from './ellie-context';

export interface EllieInsight {
  id: string;
  text: string;
  type: 'workout' | 'nutrition' | 'challenge' | 'streak' | 'recovery' | 'achievement' | 'general' | 'hydration';
  priority: number;
}

export type EllieActionType =
  | 'start_workout'
  | 'generate_workout'
  | 'generate_nutrition'
  | 'log_nutrition'
  | 'view_challenge'
  | 'read_article'
  | 'ask_ellie'
  | 'view_progress'
  | 'log_hydration';

export interface EllieSmartRecommendation {
  id: string;
  icon: 'dumbbell' | 'utensils' | 'book' | 'target' | 'sparkles' | 'heart' | 'trending-up' | 'trophy' | 'zap' | 'droplets';
  title: string;
  description: string;
  prompt: string;
  action: EllieActionType;
  actionLabel: string;
  articleId?: string;
}

export interface EllieNudge {
  id: string;
  icon: 'dumbbell' | 'target' | 'droplets' | 'utensils' | 'sparkles' | 'trophy' | 'heart';
  text: string;
  action: EllieActionType | null;
  actionLabel?: string;
  tone: 'reminder' | 'positive' | 'encouragement';
  priority: number;
}

export function generateProactiveNudges(ctx: EllieFullContext): EllieNudge[] {
  const nudges: EllieNudge[] = [];
  const { training: t, nutrition: n, challenge: c, hydration: h, profile: p } = ctx;
  const workoutDone = t.todayWorkoutDone;
  const challengeDone = !c.active || c.todayCompleted;
  const hydrationDone = h.goalMl > 0 && h.todayMl >= h.goalMl;
  const nutritionDone = n.loggedToday;

  if (workoutDone && challengeDone && hydrationDone && nutritionDone) {
    return [{
      id: 'all-done',
      icon: 'trophy',
      text: '¡Día perfecto! Has completado entrenamiento, hábitos, hidratación y nutrición. 💪',
      action: null,
      tone: 'positive',
      priority: 10,
    }];
  }

  if (!t.todayWorkoutDone) {
    const remaining = p.trainingDaysPerWeek - t.workoutsThisWeek;
    nudges.push({
      id: 'nudge-workout',
      icon: 'dumbbell',
      text: remaining <= 1
        ? 'Aún no has entrenado hoy. Un entrenamiento corto también cuenta.'
        : `Te faltan ${remaining} sesiones esta semana. ¿Empezamos hoy?`,
      action: 'start_workout',
      actionLabel: 'Entrenar',
      tone: 'reminder',
      priority: 1,
    });
  }

  if (c.active && !c.todayCompleted) {
    nudges.push({
      id: 'nudge-challenge',
      icon: 'target',
      text: c.currentStreak >= 3
        ? `Llevas ${c.currentStreak} días de racha en Core 33. No la rompas hoy.`
        : `Te faltan hábitos en Core 33 (día ${c.currentDay}/33).`,
      action: 'view_challenge',
      actionLabel: 'Completar',
      tone: c.currentStreak >= 3 ? 'encouragement' : 'reminder',
      priority: 2,
    });
  }

  if (h.goalMl > 0 && h.todayPercentage < 100) {
    nudges.push({
      id: 'nudge-hydration',
      icon: 'droplets',
      text: h.todayMl === 0
        ? 'Todavía no registras agua hoy. Mantente hidratado.'
        : `Hidratación al ${h.todayPercentage}%. Faltan ${Math.ceil((h.goalMl - h.todayMl) / 250)} vasos.`,
      action: 'log_hydration',
      actionLabel: h.todayMl === 0 ? 'Registrar' : '+1 vaso',
      tone: h.todayMl === 0 ? 'reminder' : 'encouragement',
      priority: 3,
    });
  }

  if (n.hasActivePlan && !n.loggedToday) {
    nudges.push({
      id: 'nudge-nutrition',
      icon: 'utensils',
      text: 'Aún no registras tu alimentación de hoy.',
      action: 'log_nutrition',
      actionLabel: 'Registrar',
      tone: 'reminder',
      priority: 4,
    });
  }

  if (h.hydrationStreak >= 3) {
    nudges.push({
      id: 'nudge-hydration-streak',
      icon: h.hydrationStreak >= 7 ? 'trophy' : 'droplets',
      text: h.hydrationStreak >= 7
        ? `🌊 ¡${h.hydrationStreak} días cumpliendo tu meta de agua!`
        : `💧 ${h.hydrationStreak} días de racha de hidratación.`,
      action: null,
      tone: 'positive',
      priority: 6,
    });
  }

  return nudges.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

export function generateSmartInsights(ctx: EllieFullContext): EllieInsight[] {
  const insights: EllieInsight[] = [];
  const { training: t, nutrition: n, challenge: c, achievements: a, profile: p, hydration: h } = ctx;

  if (!t.todayWorkoutDone) {
    const remaining = Math.max(0, p.trainingDaysPerWeek - t.workoutsThisWeek);
    insights.push({
      id: 'no-workout-today',
      text: `Aún no has entrenado hoy. Te faltan ${remaining} sesiones para cumplir tu objetivo semanal.`,
      type: 'workout',
      priority: 1,
    });
  } else {
    insights.push({
      id: 'workout-done',
      text: 'Ya completaste tu entreno de hoy. La consistencia construye resultados.',
      type: 'workout',
      priority: 4,
    });
  }

  if (t.currentStreak >= 3) {
    insights.push({
      id: 'streak',
      text: `${t.currentStreak} días seguidos entrenando. ¡Sigue construyendo tu racha!`,
      type: 'streak',
      priority: 2,
    });
  }

  if (h.goalMl > 0) {
    insights.push({
      id: 'hydration',
      text: h.todayPercentage >= 100
        ? `¡Meta de hidratación alcanzada! ${(h.todayMl / 1000).toFixed(1)} L hoy.`
        : `Llevas ${h.todayPercentage}% de tu meta de agua.`,
      type: 'hydration',
      priority: 3,
    });
  }

  if (!n.hasActivePlan) {
    insights.push({
      id: 'no-nutrition-plan',
      text: 'Aún no tienes un plan de nutrición activo. ELLIE puede ayudarte a crear uno.',
      type: 'nutrition',
      priority: 4,
    });
  } else if (!n.loggedToday) {
    insights.push({
      id: 'no-nutrition-log',
      text: 'Hoy todavía no has registrado tu alimentación.',
      type: 'nutrition',
      priority: 3,
    });
  }

  if (c.active) {
    insights.push({
      id: 'challenge',
      text: c.todayCompleted
        ? `Hoy ya completaste Core 33. Llevas ${c.completedDays} días completos.`
        : `Core 33 sigue activo en el día ${c.currentDay}. Aún puedes completar tus hábitos de hoy.`,
      type: 'challenge',
      priority: c.todayCompleted ? 5 : 2,
    });
  }

  insights.push({
    id: 'points',
    text: `Has acumulado ${a.totalPoints} puntos en Athelete.`,
    type: 'achievement',
    priority: 6,
  });

  return insights.sort((a, b) => a.priority - b.priority).slice(0, 6);
}

export function generatePrimaryInsight(ctx: EllieFullContext): string {
  return generateSmartInsights(ctx)[0]?.text ?? 'ELLIE está lista para ayudarte con tu progreso de hoy.';
}

export function generateSmartRecommendations(ctx: EllieFullContext): EllieSmartRecommendation[] {
  const recs: EllieSmartRecommendation[] = [];
  const { training: t, nutrition: n, challenge: c, profile: p, hydration: h } = ctx;

  if (!t.todayWorkoutDone) {
    recs.push({
      id: 'rec-start-workout',
      icon: 'dumbbell',
      title: 'Entrenar hoy',
      description: 'Completa una sesión para mantenerte cerca de tu meta semanal.',
      prompt: 'Quiero entrenar hoy. Recomiéndame una rutina.',
      action: 'start_workout',
      actionLabel: 'Entrenar',
    });
  }

  if (!n.hasActivePlan) {
    recs.push({
      id: 'rec-generate-nutrition',
      icon: 'utensils',
      title: 'Crear plan nutricional',
      description: 'Activa una guía de calorías y macros adaptada a tu perfil.',
      prompt: 'Créame un plan de nutrición personalizado.',
      action: 'generate_nutrition',
      actionLabel: 'Generar',
    });
  } else if (!n.loggedToday) {
    recs.push({
      id: 'rec-log-nutrition',
      icon: 'utensils',
      title: 'Registrar nutrición',
      description: 'Sumar tu ingesta de hoy mantiene tus datos útiles para ELLIE.',
      prompt: 'Ayúdame a registrar mi nutrición de hoy.',
      action: 'log_nutrition',
      actionLabel: 'Registrar',
    });
  }

  if (c.active && !c.todayCompleted) {
    recs.push({
      id: 'rec-core33',
      icon: 'target',
      title: 'Completar Core 33',
      description: `Aún puedes cerrar el día ${c.currentDay} de tu reto.`,
      prompt: 'Recuérdame qué me falta hoy en Core 33.',
      action: 'view_challenge',
      actionLabel: 'Ver reto',
    });
  }

  if (h.goalMl > 0 && h.todayPercentage < 100) {
    recs.push({
      id: 'rec-hydration',
      icon: 'droplets',
      title: 'Cerrar tu hidratación',
      description: 'Estás cerca de completar tu meta de agua.',
      prompt: 'Recuérdame por qué me conviene terminar mi meta de agua hoy.',
      action: 'log_hydration',
      actionLabel: 'Registrar',
    });
  }

  recs.push({
    id: 'rec-progress-review',
    icon: 'trending-up',
    title: 'Revisar progreso',
    description: 'Pídele a ELLIE una lectura rápida de tu consistencia actual.',
    prompt: 'Analiza mi progreso reciente y dime qué debería priorizar.',
    action: 'view_progress',
    actionLabel: 'Analizar',
  });

  recs.push({
    id: 'rec-generate-workout',
    icon: 'sparkles',
    title: 'Generar nueva rutina',
    description: 'Crea una rutina nueva desde tu contexto actual.',
    prompt: `Genera una rutina para alguien con objetivo de ${p.goal}.`,
    action: 'generate_workout',
    actionLabel: 'Generar',
  });

  return recs.slice(0, 6);
}

export const ellieQuickChips = [
  { label: 'Rutina hoy', prompt: 'Quiero una rutina para hoy.' },
  { label: 'Plan nutricional', prompt: 'Créame un plan de nutrición.' },
  { label: 'Analiza mi progreso', prompt: 'Analiza mi progreso reciente.' },
  { label: 'Motívame', prompt: 'Dame motivación para mantenerme constante.' },
];
