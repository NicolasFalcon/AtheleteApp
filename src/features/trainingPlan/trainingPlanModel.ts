import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { libraryCategoryKey } from '@app/features/workouts/workoutsModel';
import type { OnboardingGoal } from '@app/types/auth';
import type { SessionType } from '@app/components/v2/SessionTypeChip';
import {
  isoWeekdayName,
  joinNames,
  trainingPlanText,
  weekdayOf,
  type TrainingPlanCopyKey,
} from '@app/features/trainingPlan/trainingPlanCopy';
import type {
  PlanWeekKind,
  PreviewWeek,
  ReplacedDay,
  SessionMinutes,
  TrainingGoal,
  TrainingPlanProposal,
  TrainingPlanStateName,
  TrainingPlanWeeks,
} from '@app/services/supabase/trainingPlan';

// Pure rules of the training plan, part 1 (handoff v2.21 §31.1–31.4,
// TRAINING_PLAN_SHAPES tp-1.2): which view "Ver semana" opens, the answers
// of Crear plan and the request sent to ELLIE, and what the proposal card and
// the preview show.

// ── "Ver semana" (31.4) ─────────────────────────────────────────────────────
// No plan or finished → the current week as always; active or paused → the
// plan view. Unknown (not loaded yet or failed) → the current week.
export type WeekView = 'current' | 'plan';

export function weekViewFor(state: TrainingPlanStateName | null | undefined): WeekView {
  return state === 'active' || state === 'paused' ? 'plan' : 'current';
}

// Active or paused: the plan owns the week, so Crear plan is hidden.
export const isPlanOn = (state: TrainingPlanStateName | null | undefined) =>
  state === 'active' || state === 'paused';

// ── Crear plan (31.1) ───────────────────────────────────────────────────────
export type PlanTarget = 'none' | 'bench' | 'squat' | 'deadlift' | 'pullups';

export type TargetOption = {
  key: PlanTarget;
  labelKey: TrainingPlanCopyKey;
  unit: 'kg' | 'reps';
  // Stepper start (handoff) and step: ±2.5 kg, pull-ups ±1 rep.
  initial: number;
  step: number;
};

export const TARGETS: readonly TargetOption[] = [
  { key: 'none', labelKey: 'meta.none', unit: 'kg', initial: 0, step: 0 },
  { key: 'bench', labelKey: 'meta.bench', unit: 'kg', initial: 100, step: 2.5 },
  { key: 'squat', labelKey: 'meta.squat', unit: 'kg', initial: 130, step: 2.5 },
  { key: 'deadlift', labelKey: 'meta.deadlift', unit: 'kg', initial: 160, step: 2.5 },
  { key: 'pullups', labelKey: 'meta.pullups', unit: 'reps', initial: 12, step: 1 },
];

export const targetOption = (key: PlanTarget): TargetOption =>
  TARGETS.find(option => option.key === key) ?? TARGETS[0];

export const DURATIONS: readonly TrainingPlanWeeks[] = [4, 8, 12];
export const SESSION_LENGTHS: readonly SessionMinutes[] = [45, 60, 75, 90];
export const MIN_DAYS = 2;
export const MAX_DAYS = 6;

export type CreateAnswers = {
  goal: TrainingGoal;
  weeks: TrainingPlanWeeks;
  // ISO weekdays, 1 = Monday … 7 = Sunday, sorted.
  days: number[];
  minutes: SessionMinutes;
  target: PlanTarget;
  targetValue: number;
  // Library category key (libraryCategoryKey) or null: no style.
  style: string | null;
};

// The default goal of the plan from profiles.goal (§3): gain_muscle,
// lose_weight and performance map as they are (goal_from_profile true);
// maintain and improve_health become performance, not from the profile.
export function goalFromProfile(goal: OnboardingGoal | null | undefined): {
  goal: TrainingGoal;
  fromProfile: boolean;
} {
  if (goal === 'gain_muscle' || goal === 'lose_weight' || goal === 'performance') {
    return { goal, fromProfile: true };
  }
  return { goal: 'performance', fromProfile: false };
}

// §4: 12 weeks for muscle, strength and performance; 8 to lose fat.
export function recommendedWeeks(goal: TrainingGoal): TrainingPlanWeeks {
  return goal === 'lose_weight' ? 8 : 12;
}

const DEFAULT_DAYS: Record<number, number[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 6],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
};

function nearestLength(minutes: number | null | undefined): SessionMinutes {
  if (!minutes) {
    return 60;
  }
  return SESSION_LENGTHS.reduce((best, option) =>
    Math.abs(option - minutes) < Math.abs(best - minutes) ? option : best,
  );
}

// First answers: the profile's goal (recommended duration), its days per week
// spread over the week, and its session length rounded to 45/60/75/90.
export function initialAnswers(profile: {
  goal?: OnboardingGoal | null;
  trainingDaysPerWeek?: number | null;
  preferredSessionMinutes?: number | null;
} | null): CreateAnswers {
  const { goal } = goalFromProfile(profile?.goal);
  const count = Math.min(MAX_DAYS, Math.max(MIN_DAYS, profile?.trainingDaysPerWeek ?? 4));
  return {
    goal,
    weeks: recommendedWeeks(goal),
    days: DEFAULT_DAYS[count] ?? DEFAULT_DAYS[4],
    minutes: nearestLength(profile?.preferredSessionMinutes),
    target: 'none',
    targetValue: 0,
    style: null,
  };
}

// A day on or off; at most 6 (a 7th is ignored).
export function toggleDay(days: number[], isoDay: number): number[] {
  if (days.includes(isoDay)) {
    return days.filter(day => day !== isoDay);
  }
  if (days.length >= MAX_DAYS) {
    return days;
  }
  return [...days, isoDay].sort((a, b) => a - b);
}

export const canContinueDays = (days: number[]) => days.length >= MIN_DAYS && days.length <= MAX_DAYS;

export const totalSessions = (answers: Pick<CreateAnswers, 'days' | 'weeks'>) =>
  answers.days.length * answers.weeks;

export const blocksOf = (weeks: number) => Math.max(1, Math.round(weeks / 4));

export function stepTarget(answers: CreateAnswers, direction: 1 | -1): number {
  const option = targetOption(answers.target);
  const next = answers.targetValue + direction * option.step;
  return Math.max(option.step, Math.round(next * 10) / 10);
}

// "100" / "92,5" (es) · "92.5" (en).
export function formatTarget(language: EllieLanguage, value: number): string {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return language === 'es' ? text.replace('.', ',') : text;
}

// ── Estilo: categories of the library (Entrenos · Por tipo) ─────────────────
export const STYLE_KEYS = ['viejaescuela', 'hipertrofia', 'fuerza', 'funcional', 'calistenia'] as const;

// Without the server's list: the slug the contract names for old school
// (§4.6, 'old_school'); the rest as their key.
const FALLBACK_SLUGS: Record<string, string> = { viejaescuela: 'old_school' };

export type StyleOption = { key: string; slug: string; name: string | null };

// The five styles of the handoff, with the server's slug and localized name
// when the library lists them.
export function styleOptions(
  categories: { slug: string; nameEs: string; nameEn: string; name: string }[],
  language: EllieLanguage,
): StyleOption[] {
  return STYLE_KEYS.map(key => {
    const found = categories.find(item => libraryCategoryKey(item.slug) === key);
    const name = found ? (language === 'es' ? found.nameEs : found.nameEn) || found.name : null;
    return { key, slug: found?.slug ?? FALLBACK_SLUGS[key] ?? key, name };
  });
}

// ── Petición a ELLIE (§4) ───────────────────────────────────────────────────
export type TrainingPlanRequest = {
  type: 'training_plan_request';
  goal: TrainingGoal;
  weeks: TrainingPlanWeeks;
  days_of_week: number[];
  session_minutes: SessionMinutes;
  // The app has no catalog ids for these lifts: it sends the name and the
  // kind; the server resolves the exercise.
  goal_target?: { exercise_name: string; kind: 'kg' | 'reps'; target: number };
  style_category?: string;
};

export function buildPlanRequest(answers: CreateAnswers, styleSlug: string | null): TrainingPlanRequest {
  const option = targetOption(answers.target);
  return {
    type: 'training_plan_request',
    goal: answers.goal,
    weeks: answers.weeks,
    days_of_week: answers.days,
    session_minutes: answers.minutes,
    ...(answers.target !== 'none'
      ? {
          goal_target: {
            // Spanish names: the catalog's language.
            exercise_name: trainingPlanText('es', option.labelKey),
            kind: option.unit,
            target: answers.targetValue,
          },
        }
      : {}),
    ...(styleSlug ? { style_category: styleSlug } : {}),
  };
}

// The athlete's message with what was chosen (31.2): "Crea mi plan: ganar
// músculo, 3 meses, 4 días (lunes, martes, jueves y sábado) de 60 min. Meta:
// press de banca a 100 kg." It also lets ELLIE answer from the text alone.
export function requestMessage(
  language: EllieLanguage,
  answers: CreateAnswers,
  styleName: string | null,
): string {
  const t = (key: TrainingPlanCopyKey, vars?: Record<string, string | number>) =>
    trainingPlanText(language, key, vars);
  const option = targetOption(answers.target);
  const durationKey = `duration.${answers.weeks}` as const;
  let text = t('request.base', {
    goal: t(`request.goal.${answers.goal}`),
    duration: t(durationKey).toLowerCase(),
    days: answers.days.length,
    dayNames: joinNames(language, answers.days.map(day => isoWeekdayName(language, day))),
    min: answers.minutes,
  });
  if (answers.target !== 'none') {
    const name = t(option.labelKey);
    text += t(option.unit === 'kg' ? 'request.targetKg' : 'request.targetReps', {
      name: language === 'es' ? name.toLowerCase() : name.toLowerCase(),
      n: formatTarget(language, answers.targetValue),
    });
  }
  if (styleName) {
    text += t('request.style', { style: styleName });
  }
  return text;
}

// Same answers → same request (the client message id is reused on retry).
export const answersKey = (answers: CreateAnswers) => JSON.stringify(answers);

// ── Propuesta (31.2) ────────────────────────────────────────────────────────
// The kind of each week: the server's week_kinds, or built from the plan's
// rules (§4.1) when it leaves them out.
export function planWeekKinds(proposal: Pick<
  TrainingPlanProposal,
  'weeks' | 'weekKinds' | 'hasTest' | 'calibrationWeek'
>): PlanWeekKind[] {
  if (proposal.weekKinds.length === proposal.weeks && proposal.weeks > 0) {
    return proposal.weekKinds;
  }
  return Array.from({ length: proposal.weeks }, (_, index) => {
    const week = index + 1;
    if (week === proposal.weeks && proposal.hasTest) {
      return 'descarga_test';
    }
    if (week % 4 === 0) {
      return 'descarga';
    }
    return week === 1 && proposal.calibrationWeek ? 'calibracion' : 'carga';
  });
}

// Blocks of 4 weeks for the miniature line.
export function blockLine(kinds: PlanWeekKind[]): PlanWeekKind[][] {
  const blocks: PlanWeekKind[][] = [];
  for (let index = 0; index < kinds.length; index += 4) {
    blocks.push(kinds.slice(index, index + 4));
  }
  return blocks;
}

export const isDeloadWeek = (kind: PlanWeekKind) => kind === 'descarga' || kind === 'descarga_test';

const SPLIT_GROUPS: Record<string, Record<EllieLanguage, string[]>> = {
  full_body_ab: { es: ['Full body A', 'Full body B'], en: ['Full body A', 'Full body B'] },
  full_body_abc: { es: ['Full body A', 'Full body B', 'Full body C'], en: ['Full body A', 'Full body B', 'Full body C'] },
  ppl: { es: ['Empuje', 'Tirón', 'Pierna'], en: ['Push', 'Pull', 'Legs'] },
  torso_pierna: { es: ['Torso', 'Pierna'], en: ['Upper', 'Lower'] },
};

// The group of a session title: "Torso · Pesado" → "Torso".
export const groupOfTitle = (title: string) => title.split(' · ')[0]?.trim() ?? title;

// Chips of the split: the groups of the typical week, in order (the
// server's titles), else the known names of `split`.
export function splitChips(
  proposal: Pick<TrainingPlanProposal, 'typicalWeek' | 'split'>,
  language: EllieLanguage,
): string[] {
  const groups = Array.from(
    new Set(proposal.typicalWeek.map(day => groupOfTitle(day.title)).filter(Boolean)),
  );
  if (groups.length > 0) {
    return groups;
  }
  return proposal.split ? SPLIT_GROUPS[proposal.split]?.[language] ?? [] : [];
}

export type TypicalCell = { isoDay: number; label: string; type: SessionType | null };

// Semana tipo L–D: the group of each training day with its type.
export function typicalWeekCells(proposal: Pick<TrainingPlanProposal, 'typicalWeek'>): TypicalCell[] {
  return Array.from({ length: 7 }, (_, index) => {
    const isoDay = index + 1;
    const session = proposal.typicalWeek.find(day => day.weekday === isoDay);
    return {
      isoDay,
      label: session ? groupOfTitle(session.title) : '',
      type: session?.type ?? null,
    };
  });
}

// Cover of the card (category photo key): the payload's cover when it names
// a category of the library, else by goal.
const GOAL_COVER: Record<TrainingGoal, string> = {
  gain_muscle: 'hipertrofia',
  gain_strength: 'fuerza',
  lose_weight: 'cardio',
  performance: 'funcional',
};

export function planCoverKey(
  proposal: Pick<TrainingPlanProposal, 'cover' | 'goal'>,
  known: (key: string) => boolean,
): string {
  const fromCover = proposal.cover
    ? libraryCategoryKey(proposal.cover.split('/').pop()?.replace(/\.\w+$/, '').replace(/^cat-/, '') ?? '')
    : '';
  if (fromCover && known(fromCover)) {
    return fromCover;
  }
  return GOAL_COVER[proposal.goal ?? 'gain_muscle'];
}

// ── Detalle (31.3) ──────────────────────────────────────────────────────────
export type PreviewBlock = { blockIndex: number; weeks: PreviewWeek[] };

export function groupByBlock(weeks: PreviewWeek[]): PreviewBlock[] {
  const blocks: PreviewBlock[] = [];
  weeks.forEach(week => {
    const last = blocks[blocks.length - 1];
    if (last && last.blockIndex === week.blockIndex) {
      last.weeks.push(week);
    } else {
      blocks.push({ blockIndex: week.blockIndex, weeks: [week] });
    }
  });
  return blocks;
}

// The replacement notice: how many, which names (no repeats) and between
// which dates.
export function replacementSummary(replaces: ReplacedDay[]): {
  count: number;
  names: string[];
  from: string | null;
  to: string | null;
} {
  const dates = replaces.map(item => item.date).sort();
  return {
    count: replaces.length,
    names: Array.from(new Set(replaces.map(item => item.name).filter(Boolean))),
    from: dates[0] ?? null,
    to: dates[dates.length - 1] ?? null,
  };
}

// ── Progreso · Plan de la semana (31.4) ─────────────────────────────────────
// "2 días sin planificar" while days from today on are empty; else "1 de 4
// sesiones · sigue Torso, mañana"; else "Sin sesiones planificadas".
export function weekPlanLine(
  language: EllieLanguage,
  week: {
    today: string;
    days: { date: string; kind: string; status: string; routine: { title: string } | null }[];
  },
): string {
  const t = (key: TrainingPlanCopyKey, vars?: Record<string, string | number>) =>
    trainingPlanText(language, key, vars);
  const empty = week.days.filter(day => day.kind === 'empty' && day.date >= week.today).length;
  if (empty > 0) {
    return empty === 1 ? t('progress.unplanned.one') : t('progress.unplanned.other', { n: empty });
  }
  const sessions = week.days.filter(day => day.kind === 'session');
  if (sessions.length === 0) {
    return t('progress.none');
  }
  const done = sessions.filter(day => day.status === 'done').length;
  let line = t('progress.sessions', { done, n: sessions.length });
  const next = sessions.find(day => day.date >= week.today && day.status !== 'done');
  if (next?.routine?.title) {
    const tomorrow = nextDay(week.today);
    const when =
      next.date === week.today
        ? t('when.today')
        : next.date === tomorrow
          ? t('when.tomorrow')
          : weekdayOf(language, next.date);
    line += t('progress.next', { name: next.routine.title, when });
  }
  return line;
}

function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const value = new Date(Date.UTC(y, m - 1, d + 1, 12));
  return value.toISOString().slice(0, 10);
}
