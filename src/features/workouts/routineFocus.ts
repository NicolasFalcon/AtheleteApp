import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { CATEGORY_LABELS } from '@app/features/workouts/workoutsModel';
import {
  ROUTINE_FOCUS_VALUES,
  type RoutineFocus,
  type Workout,
} from '@app/shared/domain/types';

// The focus of a routine (handoff §28.16): the word on its cover and in the
// eyebrow of the detail ("EMPUJE · AVANZADO").

export function parseRoutineFocus(value: unknown): RoutineFocus | null {
  return ROUTINE_FOCUS_VALUES.find(item => item === value) ?? null;
}

// Localization keys of the focus words (§28.16), already in capitals and
// with their accents.
export const ROUTINE_FOCUS_KEYS: Record<RoutineFocus, string> = {
  empuje: 'routine.focus.push',
  tiron: 'routine.focus.pull',
  pierna: 'routine.focus.legs',
  gluteos: 'routine.focus.glutes',
  hombros: 'routine.focus.shoulders',
  brazos: 'routine.focus.arms',
  pecho: 'routine.focus.chest',
  espalda: 'routine.focus.back',
  core: 'routine.focus.core',
  fullbody: 'routine.focus.fullbody',
};

const FOCUS_TEXT: Record<EllieLanguage, Record<string, string>> = {
  es: {
    'routine.focus.push': 'EMPUJE',
    'routine.focus.pull': 'TIRÓN',
    'routine.focus.legs': 'PIERNA',
    'routine.focus.glutes': 'GLÚTEOS',
    'routine.focus.shoulders': 'HOMBROS',
    'routine.focus.arms': 'BRAZOS',
    'routine.focus.chest': 'PECHO',
    'routine.focus.back': 'ESPALDA',
    'routine.focus.core': 'CORE',
    'routine.focus.fullbody': 'FULL BODY',
  },
  en: {
    'routine.focus.push': 'PUSH',
    'routine.focus.pull': 'PULL',
    'routine.focus.legs': 'LEGS',
    'routine.focus.glutes': 'GLUTES',
    'routine.focus.shoulders': 'SHOULDERS',
    'routine.focus.arms': 'ARMS',
    'routine.focus.chest': 'CHEST',
    'routine.focus.back': 'BACK',
    'routine.focus.core': 'CORE',
    'routine.focus.fullbody': 'FULL BODY',
  },
};

export function focusWord(focus: RoutineFocus, language: EllieLanguage): string {
  const key = ROUTINE_FOCUS_KEYS[focus];
  return FOCUS_TEXT[language][key] ?? FOCUS_TEXT.es[key];
}

// Detail of a routine: routine_focus; without it, its category as today;
// without either, no word.
export function routineFocusWord(
  workout: Pick<Workout, 'routineFocus' | 'routineCategory'>,
  language: EllieLanguage,
): string | null {
  if (workout.routineFocus) {
    return focusWord(workout.routineFocus, language);
  }
  return workout.routineCategory
    ? CATEGORY_LABELS[workout.routineCategory].toUpperCase()
    : null;
}

// ── ELLIE: focus from payload.target_groups ─────────────────────────────────
// Muscle slugs (and zone names) → the area they belong to.
type Area = 'pecho' | 'espalda' | 'hombros' | 'brazos' | 'core' | 'pierna' | 'gluteos';

const AREA_OF: Record<string, Area> = {
  chest: 'pecho',
  back: 'espalda',
  'lower-back': 'espalda',
  lower_back: 'espalda',
  lats: 'espalda',
  trapezius: 'espalda',
  shoulders: 'hombros',
  neck: 'hombros',
  biceps: 'brazos',
  triceps: 'brazos',
  forearms: 'brazos',
  arms: 'brazos',
  core: 'core',
  abs: 'core',
  quadriceps: 'pierna',
  hamstrings: 'pierna',
  calves: 'pierna',
  adductors: 'pierna',
  tibialis: 'pierna',
  legs: 'pierna',
  glutes: 'gluteos',
};

const PUSH_MUSCLES = new Set(['chest', 'shoulders', 'triceps']);
const PULL_MUSCLES = new Set(['back', 'lower-back', 'lower_back', 'lats', 'trapezius', 'biceps', 'forearms']);

// One area → that area (pierna + glúteos is still a leg day). Several
// upper-body areas: empuje (pecho · hombros · tríceps) or tirón (espalda ·
// bíceps · antebrazos). Anything else spread over the body: full body.
export function focusFromTargetGroups(groups: readonly string[]): RoutineFocus | null {
  const muscles = groups.map(group => group.trim().toLowerCase()).filter(group => AREA_OF[group]);
  if (muscles.length === 0) {
    return null;
  }
  const areas = new Set(muscles.map(muscle => AREA_OF[muscle]));
  if (areas.size === 1) {
    return [...areas][0];
  }
  if ([...areas].every(area => area === 'pierna' || area === 'gluteos')) {
    return 'pierna';
  }
  if (muscles.every(muscle => PUSH_MUSCLES.has(muscle))) {
    return 'empuje';
  }
  if (muscles.every(muscle => PULL_MUSCLES.has(muscle))) {
    return 'tiron';
  }
  return 'fullbody';
}
