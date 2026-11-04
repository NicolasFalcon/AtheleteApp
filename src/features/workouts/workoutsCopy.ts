import type { EllieLanguage } from '@app/features/ellie/ellieCopy';

// Entrenos · Por tipo copy by i18n key (handoff v2.19 §29.3). The photos
// carry no text: every label on the cards is drawn from here.
const COPY = {
  'workouts.byType.group.goal': { es: 'Por objetivo', en: 'By goal' },
  'workouts.byType.group.format': { es: 'Por formato', en: 'By format' },
  'workouts.byType.group.yours': { es: 'Tus rutinas', en: 'Your workouts' },
  'workouts.quick.favorites': { es: 'Favoritas', en: 'Favorites' },
  'workouts.quick.all': { es: 'Todas', en: 'All' },
  'workouts.search.placeholder': { es: 'Buscar entre {n} rutinas', en: 'Search {n} workouts' },
  'workouts.count.one': { es: '{n} rutina', en: '{n} workout' },
  'workouts.count.other': { es: '{n} rutinas', en: '{n} workouts' },
  'workouts.mine.empty': { es: 'Crea tu primera rutina', en: 'Create your first workout' },
  'workouts.favorites.empty.title': { es: 'Aún no tienes favoritas', en: 'No favorites yet' },
  'workouts.favorites.empty.body': {
    es: 'Toca el corazón de una rutina para guardarla aquí.',
    en: 'Tap the heart on a workout to save it here.',
  },
  'category.fuerza': { es: 'Fuerza', en: 'Strength' },
  'category.hipertrofia': { es: 'Hipertrofia', en: 'Hypertrophy' },
  'category.funcional': { es: 'Funcional', en: 'Functional' },
  'category.fullbody': { es: 'Full Body', en: 'Full Body' },
  'category.cardio': { es: 'Cardio', en: 'Cardio' },
  'category.hiit': { es: 'HIIT', en: 'HIIT' },
  'category.calistenia': { es: 'Calistenia', en: 'Calisthenics' },
  'category.core': { es: 'Core', en: 'Core' },
  'category.movilidad': { es: 'Movilidad', en: 'Mobility' },
  'category.viejaescuela': { es: 'Vieja Escuela', en: 'Old School' },
  'category.encasa': { es: 'En casa', en: 'At Home' },
  'category.misrutinas': { es: 'Mis rutinas', en: 'My Workouts' },
} as const satisfies Record<string, Record<EllieLanguage, string>>;

export type WorkoutsCopyKey = keyof typeof COPY;

export function hasWorkoutsCopy(key: string): key is WorkoutsCopyKey {
  return key in COPY;
}

// "{n}" placeholders are replaced with `vars.n`.
export function workoutsText(
  language: EllieLanguage,
  key: WorkoutsCopyKey,
  vars: Record<string, string | number> = {},
): string {
  return COPY[key][language].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

// "1 rutina" / "28 rutinas" · "1 workout" / "28 workouts".
export function routineCountText(language: EllieLanguage, n: number): string {
  return workoutsText(
    language,
    n === 1 ? 'workouts.count.one' : 'workouts.count.other',
    { n },
  );
}
