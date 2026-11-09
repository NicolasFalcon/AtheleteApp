import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import type { SessionType } from '@app/components/v2/SessionTypeChip';
import {
  dayName,
  sessionTypeKey,
  shortDate,
  trainingPlanText,
  weekdayOf,
} from '@app/features/trainingPlan/trainingPlanCopy';
import {
  planDayViews,
  sessionsCount,
  type PlanContext,
  type PlanDayView,
  type PlanSessionRef,
} from '@app/features/trainingPlan/planViewModel';
import { addDays, type WeekPlan } from '@app/features/week/weekModel';
import type { TrainingPlanState } from '@app/services/supabase/trainingPlan';

// Inicio and Entrenos with an active or paused plan (handoff v2.21 §31.4):
// the plan's next session for the hero, the week strip of "Tu día" and the
// workout ring. Pure: the screens pass what usePlanToday read.

export type PlanHomeInput = {
  today: string;
  state: TrainingPlanState | null;
  ctx: PlanContext;
  week: WeekPlan | null;
  next: PlanSessionRef | null;
  language: EllieLanguage;
};

const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

export type PlanHeroInfo = {
  // "Hoy · Semana 6 de 12" · "Mañana · Semana 6 de 12" · "Jueves · Semana 6
  // de 12" · "Plan en pausa · hasta el 20 nov".
  eyebrow: string;
  type: SessionType | null;
  typeLabel: string | null;
  title: string;
  minutes: number | null;
  exercises: number | null;
  // Empezar (today) · Ver sesión (another day) · Retomar plan (paused).
  cta: 'start' | 'view' | 'resume';
  ctaLabel: string;
  paused: boolean;
  routineId: string | null;
};

export function planHeroInfo(input: PlanHomeInput): PlanHeroInfo | null {
  const { today, state, ctx, next, language } = input;
  const t = (key: Parameters<typeof trainingPlanText>[1], vars?: Record<string, string | number>) =>
    trainingPlanText(language, key, vars);
  const view = next?.view ?? null;
  const type = view?.type ?? null;
  const base = {
    type,
    typeLabel: type ? t(sessionTypeKey(type)) : null,
    title: view?.title ?? state?.name ?? '',
    minutes: view?.minutes ?? null,
    exercises: view?.exerciseCount ?? null,
    routineId: view?.routineId ?? null,
  };
  if (ctx.paused && ctx.pausedUntil) {
    return {
      ...base,
      eyebrow: t('home.hero.paused', { date: shortDate(language, ctx.pausedUntil) }),
      cta: 'resume',
      ctaLabel: t('home.hero.resume'),
      paused: true,
    };
  }
  if (!view || !next) {
    return null;
  }
  const weekIndex = next.weekIndex ?? 1;
  const vars = { n: weekIndex, weeks: next.weeks };
  const isToday = view.date === today;
  const eyebrow =
    next.weeks > 0
      ? isToday
        ? t('home.hero.today', vars)
        : view.date === addDays(today, 1)
          ? t('home.hero.tomorrow', vars)
          : t('home.hero.day', { ...vars, day: capitalize(weekdayOf(language, view.date)) })
      : isToday
        ? t('state.today')
        : dayName(language, view.date);
  return {
    ...base,
    eyebrow,
    cta: isToday ? 'start' : 'view',
    ctaLabel: t(isToday ? 'home.hero.start' : 'home.hero.view'),
    paused: false,
  };
}

// "Tu día": the seven days of the plan's week with "Semana 6 de 12 · 2 de 4
// sesiones" under them (paused: "Plan en pausa hasta el 20 nov").
export function planStripInfo(input: PlanHomeInput): { views: PlanDayView[]; line: string } | null {
  const { week, ctx, language, state } = input;
  const header = week?.trainingPlan;
  if (!week || !header) {
    return null;
  }
  const t = (key: Parameters<typeof trainingPlanText>[1], vars?: Record<string, string | number>) =>
    trainingPlanText(language, key, vars);
  const views = planDayViews(week, ctx);
  if (ctx.paused && ctx.pausedUntil) {
    return { views, line: t('home.pausedLine', { date: shortDate(language, ctx.pausedUntil) }) };
  }
  if (header.weekIndex === null || state?.weekIndex === null) {
    return null;
  }
  const { done, total } = sessionsCount(views);
  return {
    views,
    line: t(total === 1 ? 'home.weekLineOne' : 'home.weekLine', {
      n: header.weekIndex,
      weeks: header.weeks,
      done,
      total,
    }),
  };
}

// Today's day of the plan's week.
export function planToday(input: PlanHomeInput): PlanDayView | null {
  const { week, ctx, today } = input;
  return week ? planDayViews(week, ctx).find(view => view.date === today) ?? null : null;
}
