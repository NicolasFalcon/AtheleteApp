export type BadgeId =
  | 'first_workout'
  | 'week_consistency'
  | 'core33_finisher'
  | 'streak_7_days'
  | 'nutrition_started'
  | 'first_custom_workout'
  | 'quiz_master'
  | 'first_quiz'
  | 'first_pr'
  | 'hydration_3_days'
  | 'hydration_7_days'
  | 'weekly_hydration_master';

export type BadgeDefinition = {
  id: BadgeId;
  title: string;
  description: string;
  icon: string;
};

export const ALL_BADGES: BadgeDefinition[] = [
  {
    id: 'first_workout',
    title: 'Primer entreno',
    description: 'Completa tu primera sesión de entrenamiento.',
    icon: 'dumbbell',
  },
  {
    id: 'week_consistency',
    title: 'Semana constante',
    description: 'Completa 3 entrenos en una semana.',
    icon: 'calendar',
  },
  {
    id: 'core33_finisher',
    title: 'Core 33 completado',
    description: 'Finaliza el reto Athelete Core · 33.',
    icon: 'trophy',
  },
  {
    id: 'streak_7_days',
    title: 'Racha de 7 días',
    description: 'Mantente activo 7 días seguidos.',
    icon: 'flame',
  },
  {
    id: 'nutrition_started',
    title: 'Nutrición activada',
    description: 'Activa tu primer plan de nutrición.',
    icon: 'utensils',
  },
  {
    id: 'first_custom_workout',
    title: 'Primera rutina propia',
    description: 'Crea tu primera rutina personalizada en Athelete.',
    icon: 'wrench',
  },
  {
    id: 'quiz_master',
    title: 'Quiz Master',
    description: 'Obtén puntuación perfecta en las 3 categorías de quiz.',
    icon: 'brain',
  },
  {
    id: 'first_quiz',
    title: 'Primer Quiz',
    description: 'Completa tu primer quiz de fitness.',
    icon: 'file-pen',
  },
  {
    id: 'first_pr',
    title: 'Primer PR',
    description: 'Registra tu primer récord personal.',
    icon: 'trophy',
  },
  {
    id: 'hydration_3_days',
    title: 'Hidratación x3',
    description: 'Cumple tu meta de agua 3 días seguidos.',
    icon: 'droplets',
  },
  {
    id: 'hydration_7_days',
    title: 'Hidratación x7',
    description: 'Cumple tu meta de agua 7 días seguidos.',
    icon: 'waves',
  },
  {
    id: 'weekly_hydration_master',
    title: 'Semana hidratada',
    description: 'Cumple tu meta de agua 5+ días en una semana.',
    icon: 'medal',
  },
];
